/* eslint-disable */
/* global WebImporter */

// Nav is default-content only, 6 logical groups (brand, utility, title, phone,
// sections, give-now). The sections transformer splits the 6 source <section>s
// into 6 top-level divs; header.js composes them into the 3-row Northwell layout.
import sectionsTransformer from './transformers/northwell-sections.js';

const PAGE_TEMPLATE = {
  name: 'Nav',
  description: 'Northwell Orthopaedic Institute header/nav fragment (3-row layout).',
  urls: ['http://localhost:8899/nav.html'],
  sections: [
    { id: 'nav-brand', name: 'Brand', selector: 'section.nav-src-brand', style: null, blocks: [], defaultContent: ['section.nav-src-brand > p'] },
    { id: 'nav-utility', name: 'Utility', selector: 'section.nav-src-utility', style: null, blocks: [], defaultContent: ['section.nav-src-utility > p'] },
    { id: 'nav-title', name: 'Title', selector: 'section.nav-src-title', style: null, blocks: [], defaultContent: ['section.nav-src-title > p'] },
    { id: 'nav-phone', name: 'Phone', selector: 'section.nav-src-phone', style: null, blocks: [], defaultContent: ['section.nav-src-phone > p'] },
    { id: 'nav-sections', name: 'Sections', selector: 'section.nav-src-sections', style: null, blocks: [], defaultContent: ['section.nav-src-sections > ul'] },
    { id: 'nav-givenow', name: 'Give now', selector: 'section.nav-src-givenow', style: null, blocks: [], defaultContent: ['section.nav-src-givenow > p'] },
  ],
  blocks: [],
};

const transformers = [sectionsTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn.call(null, hookName, element, enhancedPayload); } catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);
    executeTransformers('afterTransform', main, payload);

    // Nav is a FRAGMENT — no page-metadata block (header.js composes children).
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, payload.url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{ element: main, path, report: { title: document.title, template: PAGE_TEMPLATE.name } }];
  },
};
