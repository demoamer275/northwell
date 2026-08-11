/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `columns` block variant. Base block: columns.
 * Project type: xwalk — BUT columns is the one block type that gets NO field hints
 *   (see resources/hinting.md Rule 4 & "Columns Blocks": columns cells hold only
 *   default content and must NOT carry `<!-- field:x -->` comments). The UE model
 *   `columns` has only a `columns` count field, no content fields.
 * Source: http://localhost:8899/orthopaedic-institute.html
 * Instances (page-templates.json):
 *   - section.expert-care  (2 columns: left = h2 + p + <ul> specialty links; right = video card)
 * Generated: 2026-08-10
 *
 * Block-library convention (migration-work/block-context/columns/library-description.txt):
 *   Multiple columns/rows. Row 1 = block name. Second row's cell count = number of
 *   columns from the visual layout. Each cell holds text/images/inline elements.
 *
 * Layout: this section is a 2-column grid — `.main-column` (heading + intro + specialty
 * link list) and `.aside-column` (the video card). One content row, two cells.
 *
 * Default content note: page-templates.json marks `section.expert-care .main-column > h2`
 * and `> p` as section default content. Those, however, are the natural lead of the LEFT
 * column and are the columns block's own content here — the columns block IS the section's
 * primary structure (a side-by-side layout), so we keep them inside the left cell rather
 * than hoisting them out (unlike cards/carousel, whose sections wrap a heading ABOVE the
 * repeating block). The section transformer still finds the section wrapper because we
 * replace the section's inner columns, not the section itself.
 *
 * Video card: the right column contains `.video-card`, which the dedicated `video` block
 * parses at its own selector (`section.expert-care .video-card`). Blocks must not nest, so
 * here we place the video card's TEXT (thumbnail img + heading + intro) into the right cell
 * as plain default content; the video block handles the actual embed separately.
 */
export default function parse(element, { document }) {
  const mainColumn = element.querySelector(':scope > .main-column, .main-column');
  const asideColumn = element.querySelector(':scope > .aside-column, .aside-column');

  // Empty-block guard: need at least one column to build a columns row.
  if (!mainColumn && !asideColumn) {
    return;
  }

  // Left cell — move the main column's children (heading, intro, specialty <ul>).
  const leftCell = [];
  if (mainColumn) {
    Array.from(mainColumn.childNodes).forEach((node) => leftCell.push(node));
  }

  // Right cell — the video card's content (thumbnail image, heading, intro paragraph).
  // Pull from inside .video-card so the columns cell holds clean default content and no
  // wrapper divs (blocks must not nest inside the columns cell).
  const rightCell = [];
  const videoCard = asideColumn ? asideColumn.querySelector('.video-card') : null;
  const rightSource = videoCard || asideColumn;
  if (rightSource) {
    // The YouTube URL lives in data-video on .video-card (V7TMAlVvx2Q on the live
    // origin; stripped from cleaned.html but present when the importer loads the
    // live URL). The `video` block can't nest inside this columns cell, so surface
    // the video as a link ON the card's heading — this preserves the URL on the page
    // (previously it was dropped entirely) and lets the design layer render a play
    // affordance. If the heading is already a link, leave it; otherwise wrap it.
    const dataVideo = videoCard ? videoCard.getAttribute('data-video') : null;
    if (dataVideo) {
      const vHeading = rightSource.querySelector('h2, h3, h4, h5, h6');
      if (vHeading && !vHeading.querySelector('a')) {
        const a = document.createElement('a');
        a.setAttribute('href', dataVideo);
        while (vHeading.firstChild) a.appendChild(vHeading.firstChild);
        vHeading.appendChild(a);
      }
    }
    Array.from(rightSource.childNodes).forEach((node) => rightCell.push(node));
  }

  // Columns blocks get NO field-hint comments (hinting.md). One row, two cells.
  const cells = [[leftCell, rightCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  // Preserve the <section> wrapper so the afterTransform section transformer can
  // still resolve `section.expert-care` for its <hr> boundary. createBlock has
  // already relocated the column children into the block table; replace whatever
  // remains of the section with the block.
  element.replaceChildren(block);
}
