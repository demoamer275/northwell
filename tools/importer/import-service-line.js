/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import cardsParser from './parsers/cards.js';
import carouselParser from './parsers/carousel.js';
import columnsParser from './parsers/columns.js';
import videoParser from './parsers/video.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/northwell-cleanup.js';
import sectionsTransformer from './transformers/northwell-sections.js';

// PARSER REGISTRY
const parsers = {
  hero: heroParser,
  cards: cardsParser,
  carousel: carouselParser,
  columns: columnsParser,
  video: videoParser,
};

// PAGE TEMPLATE CONFIGURATION — embedded from page-templates.json ("Service Line")
const PAGE_TEMPLATE = {
  name: 'Service Line',
  description: 'Northwell service-line landing page (Orthopaedic Institute).',
  urls: [
    'http://localhost:8899/orthopaedic-institute.html',
  ],
  sections: [
    { id: 'section-cta-hero', name: 'CTA hero', selector: 'section.cta-hero:first-of-type', style: null, blocks: ['hero'], defaultContent: [] },
    { id: 'section-approach', name: 'Our approach to care', selector: 'section.approach', style: null, blocks: ['cards'], defaultContent: ['section.approach > h3', 'section.approach > p'] },
    { id: 'section-ranked', name: 'Ranked among the best', selector: 'section.ranked', style: null, blocks: [], defaultContent: ['section.ranked > h2', 'section.ranked > p'] },
    { id: 'section-awards', name: 'Awards & accolades', selector: 'section.awards', style: null, blocks: ['carousel'], defaultContent: ['section.awards > h3'] },
    { id: 'section-islanders-hero', name: 'Islanders standard hero', selector: 'section.standard-hero', style: 'light', blocks: ['hero'], defaultContent: [] },
    { id: 'section-expert-care', name: 'Expert care for excellent results', selector: 'section.expert-care', style: null, blocks: ['columns', 'video'], defaultContent: ['section.expert-care .main-column > h2', 'section.expert-care .main-column > p'] },
    { id: 'section-related-services', name: 'Related services', selector: 'section.related-services', style: null, blocks: ['cards'], defaultContent: ['section.related-services > h3', 'section.related-services > p'] },
    { id: 'section-limb-care', name: 'Amputation support', selector: 'section.limb-care', style: null, blocks: ['cards'], defaultContent: [] },
    { id: 'section-testimonials', name: 'Patient testimonials', selector: 'section.testimonials', style: null, blocks: ['carousel'], defaultContent: ['section.testimonials > h3'] },
    { id: 'section-resources', name: 'Helpful resources', selector: 'section.resources', style: null, blocks: ['cards'], defaultContent: ['section.resources > h3'] },
    { id: 'section-team-hero', name: 'Our team is here for you', selector: 'section.cta-hero:last-of-type', style: 'light', blocks: ['hero'], defaultContent: [] },
  ],
  blocks: [
    {
      name: 'hero',
      section: 'hero',
      instances: [
        'section.cta-hero:first-of-type',
        'section.standard-hero',
        'section.cta-hero:last-of-type',
      ],
    },
    {
      name: 'cards',
      instances: [
        'section.approach',
        'section.related-services',
        'section.limb-care .card-single',
        'section.resources',
      ],
    },
    {
      name: 'carousel',
      instances: [
        'section.awards',
        'section.testimonials',
      ],
    },
    {
      name: 'columns',
      instances: [
        'section.expert-care',
      ],
    },
    {
      name: 'video',
      instances: [
        'section.expert-care .video-card',
      ],
    },
  ],
};

// TRANSFORMER REGISTRY — section transformer runs after cleanup (afterTransform hook)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook.
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on the page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block; skip elements already replaced by an earlier parser.
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    // createMetadata appends a metadata <table> to main (it returns nothing, so
    // grab the last table). Add nav/footer rows so scripts.js renders
    // <meta name="nav|footer"> tags — pages live under /content/, so the default
    // root /nav & /footer would resolve to the wrong (boilerplate) fragments.
    // header.js/footer.js read these via getMetadata().
    WebImporter.rules.createMetadata(main, document);
    const tables = main.querySelectorAll('table');
    const metaTable = tables[tables.length - 1];
    if (metaTable) {
      const body = metaTable.querySelector('tbody') || metaTable;
      [['nav', '/content/nav'], ['footer', '/content/footer']].forEach(([key, value]) => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = key;
        const td2 = document.createElement('td');
        td2.textContent = value;
        tr.append(td1, td2);
        body.append(tr);
      });
    }

    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized document path (map root → /index).
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
