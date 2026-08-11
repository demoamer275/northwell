/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `cards` block variant. Base block: cards.
 * Project type: xwalk (field hints required — UE model `card`: image (reference),
 *   imageAlt (collapsed → <img alt>), text (richtext)).
 * Source: http://localhost:8899/orthopaedic-institute.html
 * Instances (page-templates.json):
 *   - section.approach              (icon promos: h4 + p, NO image  → "Cards (no images)" 1-col)
 *   - section.related-services      (photo cards: img + linked h3 + p            → 2-col)
 *   - section.limb-care .card-single (single photo card: img + linked h3 + p + CTA → 2-col)
 *   - section.resources             (photo cards: img + linked h3 + p            → 2-col)
 * Generated: 2026-08-10
 *
 * Block-library convention (migration-work/block-context/cards/library-description.txt):
 *   Photo cards  → 2 columns: cell 1 = image, cell 2 = text (heading + description + CTA).
 *   Icon/no-image cards → "Cards (no images)" 1 column: cell = text (heading + description + CTA).
 *
 * Default-content handling: `section.approach`, `section.related-services` and
 * `section.resources` are whole SECTIONS that also carry section-level default
 * content (an <h3> heading, an intro <p>, and a standalone link <p>) which per
 * David's model stays as default content siblings — NOT inside the block. So for
 * a matched SECTION we keep the section element in place, remove only the card
 * items, and insert the cards block where the first card was. The default content
 * therefore survives as siblings and the section wrapper survives for the section
 * transformer. When the matched element is itself a card (`.card-single`), the
 * element IS the block, so we replace it outright.
 *
 * Icons: icon-promo cards have no photo — the glyph lives in the source `data-icon`
 * attribute (award / phone-alt / location-dot / chart-network on the live origin).
 * We preserve it as an EDS icon token `:glyph:` at the start of the text cell so
 * authorable intent round-trips.
 */
export default function parse(element, { document }) {
  // Identify the card items and whether the matched element is itself a single card.
  const elementIsCard = element.matches('.card, .card-single, .icon-promo');
  const cardEls = elementIsCard
    ? [element]
    : Array.from(element.querySelectorAll(':scope > .card, :scope > .icon-promo, :scope > .card-single'));

  // Empty-block guard.
  if (cardEls.length === 0) {
    return; // leave the DOM untouched — nothing card-shaped to build
  }

  // Per-instance column count: photo cards → 2 cols (image + text); icon/no-image cards → 1 col (text).
  const hasImages = cardEls.some((card) => card.querySelector('img'));

  const cells = [];

  cardEls.forEach((card) => {
    // Text content: heading (h2–h4, possibly a linked heading) + description/CTA paragraphs.
    const heading = card.querySelector('h2, h3, h4, h5, h6');
    const paragraphs = Array.from(card.querySelectorAll(':scope > p'));

    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));

    // Preserve the icon glyph for no-image (icon-promo) cards as an EDS icon token.
    if (!hasImages) {
      const glyph = card.getAttribute('data-icon');
      if (glyph) {
        const iconP = document.createElement('p');
        iconP.textContent = `:${glyph}:`;
        textFrag.appendChild(iconP);
      }
    }

    if (heading) textFrag.appendChild(heading);
    paragraphs.forEach((p) => textFrag.appendChild(p));

    if (hasImages) {
      // Column 1: image (field:image); imageAlt collapses into the <img alt> attribute.
      const img = card.querySelector('img');
      const imageFrag = document.createDocumentFragment();
      if (img) {
        imageFrag.appendChild(document.createComment(' field:image '));
        imageFrag.appendChild(img);
      }
      cells.push([imageFrag, textFrag]);
    } else {
      // "Cards (no images)" — single text column.
      cells.push([textFrag]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });

  if (elementIsCard) {
    // The matched element IS the block — replace it.
    element.replaceWith(block);
  } else {
    // The matched element is a section that also holds default content: keep the
    // section and its default content, swap only the card items for the block.
    const firstCard = cardEls[0];
    firstCard.parentNode.insertBefore(block, firstCard);
    cardEls.forEach((card) => card.remove());
  }
}
