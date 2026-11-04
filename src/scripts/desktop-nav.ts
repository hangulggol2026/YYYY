import { sitePath } from '../lib/site-path';

/** Desktop landing → main (same destination as partition reveal, no phone animation). */
export function initDesktopNav() {
  document.querySelectorAll<HTMLElement>('[data-desktop-enter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (document.documentElement.dataset.viewport !== 'web') return;
      window.location.assign(sitePath('main'));
    });
  });
}

initDesktopNav();
