/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `hero` block variant. Base block: hero.
 * Project type: xwalk (field hints required — see UE model `hero` in component-models.json).
 * Source: http://localhost:8899/orthopaedic-institute.html
 * Instances (page-templates.json):
 *   - section.cta-hero:first-of-type   (h1 + intro + CTA button)
 *   - section.standard-hero            (h2 + intro, no CTA)
 *   - section.cta-hero:last-of-type    (h2 + intro + tel: CTA button)
 * Generated: 2026-08-10
 *
 * Block-library convention (migration-work/block-context/hero/library-description.txt):
 *   1 column, 3 rows. Row 1 = block name. Row 2 = background image (optional).
 *   Row 3 = title + subheading + CTA (optional).
 *
 * UE model `hero` fields: image (reference), imageAlt (collapsed → <img alt>), text (richtext).
 * Field hints: `field:image` on the image cell, `field:text` on the content cell.
 * `imageAlt` ends with "Alt" so it collapses into the <img>'s alt attribute — no hint.
 */
export default function parse(element, { document }) {
  // The hero section is a flat list of: img, heading, one or more paragraphs
  // (intro), and an optional CTA paragraph (a.button / tel link). Validate against
  // migration-work/block-context/hero/source.html.
  const image = element.querySelector(':scope > img, img');
  const heading = element.querySelector(':scope > h1, :scope > h2, h1, h2');
  // All paragraphs in document order (intro copy + CTA paragraph). Keep them as-is
  // so the CTA anchor (a.button / tel:) is preserved inside its paragraph.
  const paragraphs = Array.from(element.querySelectorAll(':scope > p'));

  // Empty-block guard: nothing hero-worthy to build.
  if (!heading && !image && paragraphs.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2 — background image cell (field:image). imageAlt collapses into <img alt>.
  if (image) {
    const imageFrag = document.createDocumentFragment();
    imageFrag.appendChild(document.createComment(' field:image '));
    imageFrag.appendChild(image);
    cells.push([imageFrag]);
  }

  // Row 3 — text cell (field:text): heading + intro paragraph(s) + CTA paragraph.
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));
  if (heading) textFrag.appendChild(heading);
  paragraphs.forEach((p) => textFrag.appendChild(p));
  cells.push([textFrag]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  // Keep the <section> wrapper in place. createBlock has already moved the image,
  // heading and paragraphs into the block table, so the section is now empty of
  // them; replace whatever remains with the block. Preserving the section element
  // is REQUIRED so the afterTransform section transformer can still resolve this
  // section's selector to place its <hr> boundary and any Section Metadata
  // (sections 5 "standard-hero" and 11 "cta-hero:last-of-type" carry style "light").
  element.replaceChildren(block);
}
