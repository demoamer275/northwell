/*
 * Hero (Content Fragment) block — "herocf"
 *
 * Renders the same look as the LIGHT variation of the standard hero block, but
 * instead of authoring the image / heading / body inline, the author enters the
 * path of an AEM Content Fragment. That path is appended to the GraphQL
 * persisted query below, which retrieves the fragment's elements from the
 * publish server. The block pulls three elements from the response:
 *   - "image" -> image reference (rendered as the hero picture)
 *   - "title" -> heading (rendered as an <h2>)
 *   - "body"  -> body copy (rendered as a <p>)
 *
 * Authoring: place the Content Fragment path (as a link or plain text) in the
 * first row of the block, e.g.
 *   | herocf |
 *   | /content/dam/wehealthcare/heroes/my-hero |
 */

// GraphQL persisted query on the publish server. The Content Fragment path
// authored in the block is URL-encoded and appended to this endpoint.
const GRAPHQL_ENDPOINT = 'https://publish-p182083-e1919654.adobeaemcloud.com/graphql/execute.json/wehealthcare/getHeroByPath;path=';

/**
 * Normalize an AEM Content Fragment JSON payload into a flat map of
 * element name -> { value, type }. Supports the Assets HTTP API shape
 * (properties.elements.<name>.value) and the GraphQL shape (data.<model>.item).
 * @param {object} json The parsed Content Fragment response
 * @returns {Object<string, {value: *, type: string}>}
 */
function extractElements(json) {
  const elements = {};
  const add = (name, value, type) => {
    if (name && value !== undefined && value !== null && elements[name] === undefined) {
      elements[name] = { value, type: type || '' };
    }
  };

  // Assets HTTP API: { properties: { elements: { title: { value, ":type" } } } }
  const apiElements = json?.properties?.elements;
  if (apiElements && typeof apiElements === 'object') {
    Object.entries(apiElements).forEach(([name, el]) => {
      if (el && typeof el === 'object' && 'value' in el) add(name, el.value, el[':type']);
      else add(name, el);
    });
  }

  // GraphQL: { data: { <model>: { item | items[] } } }
  const dataNode = json?.data;
  if (dataNode && typeof dataNode === 'object') {
    Object.values(dataNode).forEach((model) => {
      const item = model?.item || (Array.isArray(model?.items) ? model.items[0] : null);
      if (item && typeof item === 'object') {
        Object.entries(item).forEach(([name, value]) => {
          // GraphQL multiline fields come back as { html, plaintext }
          if (value && typeof value === 'object' && 'html' in value) add(name, value.html, 'text/html');
          else add(name, value);
        });
      }
    });
  }

  return elements;
}

/**
 * Resolve a (possibly relative) DAM asset path against the Content Fragment URL
 * so the image loads from the publish server.
 * @param {*} value The raw "image" element value
 * @param {string} baseUrl The Content Fragment URL
 * @returns {string} An absolute image URL
 */
function resolveImageUrl(value, baseUrl) {
  let path = value;
  if (Array.isArray(path)) [path] = path;
  // GraphQL image references expose absolute publish/dynamic URLs directly.
  if (path && typeof path === 'object') {
    path = path._publishUrl || path._dynamicUrl || path._path
      || path.value || path.path || path.src || '';
  }
  if (typeof path !== 'string' || !path) return '';
  try {
    return new URL(path, baseUrl).href;
  } catch (e) {
    return path;
  }
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const cfPath = (link ? link.getAttribute('href') : block.textContent).trim();
  block.textContent = '';

  if (!cfPath) return;

  // Append the authored Content Fragment path to the GraphQL persisted query.
  const queryUrl = `${GRAPHQL_ENDPOINT}${cfPath}`;

  let elements;
  try {
    const resp = await fetch(queryUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    elements = extractElements(await resp.json());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('herocf: could not load Content Fragment', queryUrl, e);
    return;
  }

  const imageEl = elements.image;
  const titleEl = elements.title;
  const bodyEl = elements.body;

  // Content column (heading + body) mirrors the light hero layout.
  const content = document.createElement('div');
  content.className = 'herocf-content';

  if (titleEl && titleEl.value) {
    const h2 = document.createElement('h2');
    h2.textContent = String(titleEl.value);
    content.append(h2);
  }

  if (bodyEl && bodyEl.value) {
    const isHtml = (bodyEl.type || '').includes('html') || /<[a-z][\s\S]*>/i.test(String(bodyEl.value));
    if (isHtml) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = String(bodyEl.value);
      wrapper.querySelectorAll('p').forEach((p) => content.append(p));
      if (!wrapper.querySelector('p')) {
        const p = document.createElement('p');
        p.textContent = wrapper.textContent.trim();
        content.append(p);
      }
    } else {
      const p = document.createElement('p');
      p.textContent = String(bodyEl.value);
      content.append(p);
    }
  }

  // Image column.
  const imageUrl = imageEl ? resolveImageUrl(imageEl.value, queryUrl) : '';
  const row = document.createElement('div');
  row.className = 'herocf-row';

  if (imageUrl) {
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = titleEl && titleEl.value ? String(titleEl.value) : '';
    img.loading = 'eager';
    picture.append(img);
    row.append(picture);
  }

  row.append(content);
  block.append(row);
}
