/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Northwell site-wide DOM cleanup.
 *
 * Selectors below are all verified against the captured DOM:
 *   - migration-work/cleaned.html
 *   - migration-work/source/orthopaedic-institute.html (the file the local
 *     http://localhost:8899 origin actually serves, which still carries the
 *     data-* attributes the scraper stripped from cleaned.html)
 *
 * NOTE ON SCOPE: the source for this migration was pre-cleaned before capture
 * (see the leading comment in orthopaedic-institute.html) — global chrome
 * (header nav, footer, GTM/analytics, Font Awesome kit, cookie banners,
 * nwhlit-* web components) was already removed and the shadow-DOM wrappers
 * flattened to semantic HTML. So there is very little non-authorable content
 * left to strip on THIS page. The site-chrome removals here are therefore
 * defensive: they are standard EDS landmark selectors that (a) match nothing
 * on this page and are safe no-ops, and (b) make this transformer reusable
 * for other Northwell service-line pages captured directly from the live
 * origin, where the chrome would still be present.
 *
 * IMPORTANT — DO NOT strip data-* attributes here. The section transformer
 * (northwell-sections.js) reads section boundaries by class, and the block
 * parsers (generated separately) read data-color / data-icon / data-video to
 * recover section styling, icon-promo glyphs (award, phone-alt, location-dot,
 * chart-network) and the two YouTube video IDs. Removing those attributes
 * would silently drop authorable intent, so no attribute stripping is done.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Non-authorable overlays / widgets that would block block parsing if the
    // page were captured from the live origin. All are no-ops on the
    // pre-cleaned local source (none of these exist in the captured DOM);
    // kept as defensive, reusable selectors for other captures of this site.
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk', // OneTrust cookie consent (Northwell live origin)
      '#onetrust-banner-sdk',
      '.ot-sdk-container',
      '[id^="CybotCookiebot"]', // Cookiebot fallback
      '.modal-backdrop',
      '.skip-link', // "skip to main content" a11y jump link
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome. On this page the captured DOM is only the
    // <main id="main-content"> article, so these match nothing (safe no-ops);
    // they remove the shell if this transformer is reused on a live-origin
    // capture where header/nav/footer are present.
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      'nav',
      'aside',
      '[class*="breadcrumb"]',
      '[class*="site-search"]',
      '[class*="global-nav"]',
      '[class*="skip"]',
      // Elements that are never authorable content and only add noise to the
      // markdown output. <img> is intentionally NOT listed — images (even the
      // ones whose bytes 404 locally) are kept with their alt text and
      // relative filenames so downstream block parsers can build image cells.
      'script',
      'style',
      'link',
      'noscript',
      'iframe',
    ]);
  }
}
