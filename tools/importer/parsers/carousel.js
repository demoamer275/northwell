/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `carousel` block variant. Base block: carousel.
 * Project type: xwalk (field hints required — UE model `carousel-item`:
 *   backgroundImage (reference), backgroundImageAlt (collapsed → <img alt>), text (richtext)).
 * Source: http://localhost:8899/orthopaedic-institute.html
 * Instances (page-templates.json):
 *   - section.awards       (5 slides:  img + h3 + p)
 *   - section.testimonials (many slides: img + linked h3 + p)
 * Generated: 2026-08-10
 *
 * Block-library convention (migration-work/block-context/carousel/library-description.txt):
 *   2 columns, multiple rows. Row 1 = block name. Each subsequent row = one slide:
 *   cell 1 = image (mandatory, image only), cell 2 = text (heading + description + CTA).
 *
 * Field hints: cell 1 = field:backgroundImage (backgroundImageAlt collapses into <img alt>,
 *   so no hint for it); cell 2 = field:text.
 *
 * Default-content handling: both instances are whole SECTIONS that also carry
 * section-level default content — an <h3> section heading and (testimonials) a
 * standalone "View all" link paragraph — which per David's model stays as default
 * content siblings, NOT inside the block. So we keep the section element in place,
 * remove only the `.carousel-slide` items, and insert the carousel block where the
 * first slide was. The heading / "View all" link survive as siblings and the
 * section wrapper survives for the section transformer.
 *
 * data-video note: on the live origin, ONE testimonials slide (86—and still playing
 * baseball, YouTube dSBbWYfy9ws) carries a `data-video` attribute; awards has none.
 * The `carousel-item` UE model has no video field, and the carousel block is not a
 * video embed — so the slide is imported as its thumbnail image + heading + text
 * like every other slide (no video URL is injected, which would not map to any model
 * field). The dedicated `video` block handles the page's actual embedded video.
 */
export default function parse(element, { document }) {
  const slides = Array.from(element.querySelectorAll(':scope > .carousel-slide'));

  // Empty-block guard.
  if (slides.length === 0) {
    return; // nothing carousel-shaped to build; leave the DOM untouched
  }

  const cells = [];

  slides.forEach((slide) => {
    // Cell 1 — image (field:backgroundImage). backgroundImageAlt collapses into <img alt>.
    const img = slide.querySelector('img');
    const imageFrag = document.createDocumentFragment();
    if (img) {
      imageFrag.appendChild(document.createComment(' field:backgroundImage '));
      imageFrag.appendChild(img);
    }

    // Cell 2 — text (field:text): heading (h2–h6, possibly a linked heading) + description paragraphs.
    const heading = slide.querySelector('h2, h3, h4, h5, h6');
    const paragraphs = Array.from(slide.querySelectorAll(':scope > p'));
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    if (heading) textFrag.appendChild(heading);
    paragraphs.forEach((p) => textFrag.appendChild(p));

    cells.push([imageFrag, textFrag]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel', cells });

  // Keep the section + default content; swap only the slide items for the block.
  const firstSlide = slides[0];
  firstSlide.parentNode.insertBefore(block, firstSlide);
  slides.forEach((slide) => slide.remove());
}
