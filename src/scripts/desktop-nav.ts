/** Desktop landing → main (handled on index by partition-reveal). */
export function initDesktopNav() {
  document.querySelectorAll<HTMLElement>('[data-desktop-enter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (document.documentElement.dataset.viewport !== 'web') return;
      window.dispatchEvent(new CustomEvent('landing:enter-main', { detail: { instant: true } }));
    });
  });
}

initDesktopNav();
