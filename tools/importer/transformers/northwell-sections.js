/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Northwell section boundaries + section metadata.
 *
 * Template-agnostic: it consumes `payload.template.sections` (populated from
 * tools/importer/page-templates.json) rather than hard-coding this page's
 * structure, so it works for any Northwell template that defines sections.
 *
 * For the "Service Line" template (Orthopaedic Institute) the template defines
 * 11 sections. Every section selector below is taken verbatim from
 * page-templates.json and was verified against the captured DOM
 * (migration-work/cleaned.html — the same markup the local origin serves):
 *
 *   1  section.cta-hero:first-of-type   style null
 *   2  section.approach                 style null
 *   3  section.ranked                   style null
 *   4  section.awards                   style null
 *   5  section.standard-hero            style "light"  (source data-color primary)
 *   6  section.expert-care              style null
 *   7  section.related-services         style null
 *   8  section.limb-care                style null
 *   9  section.testimonials             style null
 *   10 section.resources                style null
 *   11 section.cta-hero:last-of-type    style "light"  (source data-color light-gray)
 *
 * Behaviour (per generate-import-transformer.md, Section Transformers):
 *   - Insert an <hr> before every section except the first  → 11 - 1 = 10 breaks.
 *   - For every section that declares a `style`, append a Section Metadata
 *     block (key "style") inside that section so it lands in the correct
 *     section region → 2 metadata blocks (sections 5 and 11).
 *
 * Section 1 (cta-hero:first-of-type) has data-color accent-2 in the source but
 * the validated template maps it to style null, so no metadata is emitted for
 * it. We honour the template, not the raw data-color, exactly as instructed;
 * the block→section mapping is not modified here.
 *
 * Runs in afterTransform only: block parsers run between the two hooks and
 * build their block tables from the section content first; we then add the
 * structural <hr> dividers and Section Metadata around that content.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  // Section breaks/metadata only make sense with 2+ sections.
  if (sections.length < 2) return;

  const doc = element.ownerDocument;

  // Resolve each section config to its boundary element BEFORE any mutation.
  // The template uses positional selectors (`section.cta-hero:first-of-type`
  // and `:last-of-type`); resolving up front means later inserts of <hr>
  // siblings and appended metadata tables can never shift which <section> is
  // first/last of its type mid-loop. querySelector returns the first match in
  // document order, so each positional selector still resolves to exactly one
  // element.
  const resolved = sections.map((section) => ({
    section,
    el: element.querySelector(section.selector),
  }));

  // Process in reverse order — the documented convention. Every insert here is
  // relative to a specific resolved element reference (el.before / el.append),
  // so ordering is not strictly load-bearing, but reverse iteration matches the
  // reference implementation and is safe against any positional drift.
  for (let i = resolved.length - 1; i >= 0; i -= 1) {
    const { section, el } = resolved[i];

    if (!el) {
      // A selector matched nothing. All 11 selectors were verified against the
      // captured DOM, so this should not fire; log for review instead of
      // throwing, so one bad selector can't abort the whole transform.
      // eslint-disable-next-line no-console
      console.warn('Section selector matched no element, skipped:', section.selector);
      continue;
    }

    // Section Metadata for styled sections. Appended as the section's last
    // child so the table stays inside this section's content region (before
    // the <hr> that opens the next section). createBlock builds a table whose
    // header cell is "Section Metadata" and whose body row is | style | <value> |.
    if (section.style) {
      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      el.append(metadataBlock);
    }

    // Section divider before every section except the first, inserted as a
    // sibling at the section's own level so it serialises to a markdown `---`.
    if (i > 0) {
      const hr = doc.createElement('hr');
      el.before(hr);
    }
  }
}
