/* eslint-disable */
/* global WebImporter */

// Footer is default-content only (columns of links + contact + social + legal).
// No block parsers; the sections transformer splits the source <section>s into
// top-level divs the EDS footer block renders and footer.css lays out.
import sectionsTransformer from './transformers/northwell-sections.js';

const PAGE_TEMPLATE = {
  name: 'Footer',
  description: 'Northwell footer fragment.',
  urls: ['http://localhost:8899/footer.html'],
  sections: [
    { id: 'footer-contact', name: 'Contact', selector: 'section.footer-contact', style: null, blocks: [], defaultContent: ['section.footer-contact > p'] },
    { id: 'footer-links', name: 'Links', selector: 'section.footer-links', style: null, blocks: [], defaultContent: ['section.footer-links > h3', 'section.footer-links > ul'] },
    { id: 'footer-employees', name: 'Employees', selector: 'section.footer-employees', style: null, blocks: [], defaultContent: ['section.footer-employees > h3', 'section.footer-employees > p'] },
    { id: 'footer-social', name: 'Social', selector: 'section.footer-social', style: null, blocks: [], defaultContent: ['section.footer-social > p'] },
    { id: 'footer-legal', name: 'Legal', selector: 'section.footer-legal', style: null, blocks: [], defaultContent: ['section.footer-legal > p'] },
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

    // Footer is a FRAGMENT, not a page — skip the page-metadata block so no stray
    // "Title footer" div is appended. Keep image handling.
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, payload.url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{ element: main, path, report: { title: document.title, template: PAGE_TEMPLATE.name } }];
  },
};
