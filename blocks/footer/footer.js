import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// Social link label → icon name (SVGs live in /icons/).
const SOCIAL_ICONS = {
  facebook: 'facebook',
  x: 'x-twitter',
  twitter: 'x-twitter',
  instagram: 'instagram',
  linkedin: 'linkedin',
  youtube: 'youtube',
};

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // The fragment yields 5 groups in order:
  // 0 contact · 1 links (3 heading+list columns) · 2 employees · 3 social · 4 legal
  const groups = [...footer.children];
  const groupClasses = ['footer-contact', 'footer-links', 'footer-employees', 'footer-social', 'footer-legal'];
  groups.forEach((g, i) => { if (groupClasses[i]) g.classList.add(groupClasses[i]); });
  const [contact, links, employees, social, legal] = groups;

  // Split the links group's default-content-wrapper (h3 + ul, h3 + ul, ...) into
  // one .footer-col per heading so they render as separate columns.
  if (links) {
    const wrapper = links.querySelector('.default-content-wrapper') || links;
    let currentCol = null;
    [...wrapper.children].forEach((el) => {
      if (el.tagName === 'H3') {
        currentCol = document.createElement('div');
        currentCol.className = 'footer-col';
        wrapper.insertBefore(currentCol, el);
      }
      if (currentCol) currentCol.append(el);
    });
  }

  // Contact phone (first link) gets emphasis; ambulance note stays italic via CSS.
  contact?.classList.add('footer-contact');

  // Employees CTA — make the "For employees" link a button.
  if (employees) {
    const cta = [...employees.querySelectorAll('a')].pop();
    if (cta) cta.classList.add('button');
  }

  // Social links → icon glyphs.
  if (social) {
    social.querySelectorAll('a').forEach((a) => {
      const key = a.textContent.trim().toLowerCase();
      const iconName = SOCIAL_ICONS[key];
      if (iconName) {
        a.setAttribute('aria-label', a.textContent.trim());
        a.textContent = '';
        const span = document.createElement('span');
        span.className = `icon icon-${iconName}`;
        a.append(span);
      }
    });
    decorateIcons(social);
  }

  // Compose the two structural rows.
  const topRow = document.createElement('div');
  topRow.className = 'footer-top';
  [contact, links, employees].forEach((g) => g && topRow.append(g));

  const bottomRow = document.createElement('div');
  bottomRow.className = 'footer-bottom';
  [social, legal].forEach((g) => g && bottomRow.append(g));

  footer.textContent = '';
  footer.append(topRow, bottomRow);

  block.append(footer);
}
