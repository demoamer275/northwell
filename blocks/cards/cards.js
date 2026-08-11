import { createOptimizedPicture } from '../../scripts/aem.js';

// Map the Northwell icon-promo glyph tokens (emitted by the cards parser as
// ":award:" style text) to inline icon spans the EDS icon system decorates.
const ICON_TOKEN_RE = /^\s*:([a-z0-9-]+):\s*$/i;

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });

  // Convert leading ":icon:" tokens into icon spans and flag icon-promo cards.
  let iconCards = 0;
  ul.querySelectorAll('li').forEach((li) => {
    const firstP = li.querySelector('.cards-card-body > p:first-child');
    const match = firstP && firstP.textContent.match(ICON_TOKEN_RE);
    if (match) {
      const span = document.createElement('span');
      span.className = `icon icon-${match[1]}`;
      firstP.replaceChildren(span);
      firstP.classList.add('cards-card-icon');
      li.classList.add('cards-card-icon-promo');
      iconCards += 1;
    }
  });
  if (iconCards && iconCards === ul.children.length) block.classList.add('cards-icons');

  // Flag single-card layout (e.g. Northwell Limb Care) for wide treatment.
  if (ul.children.length === 1) block.classList.add('cards-single');

  // replace images with optimized versions
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));

  block.replaceChildren(ul);

  // Decorate any icon spans we just inserted (loads /icons/{name}.svg).
  if (iconCards) {
    // eslint-disable-next-line import/no-unresolved, global-require
    import('../../scripts/aem.js').then(({ decorateIcons }) => decorateIcons(block));
  }
}
