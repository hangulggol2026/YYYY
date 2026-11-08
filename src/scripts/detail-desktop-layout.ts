/**
 * Desktop detail — partition rhythm (Seopung 25:4, canvas px).
 * Equal --dd-partition-gap (header logo → rule): rule→meta | caption→controls rule | rule→sliders.
 */

function bottomInPanel(el: HTMLElement, panel: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== panel) {
    top += node.offsetTop;
    const parent = node.offsetParent;
    node = parent instanceof HTMLElement && panel.contains(parent) ? parent : null;
  }
  return top + el.offsetHeight;
}

function syncDetailDesktopLeftSpacing() {
  if (document.documentElement.dataset.viewport !== 'web') return;

  const canvas = document.querySelector<HTMLElement>('.detail-desktop__canvas');
  const left = document.querySelector<HTMLElement>('.detail-desktop__left');
  const meta = document.querySelector<HTMLElement>('.detail-desktop__meta');
  const caption = document.querySelector<HTMLElement>('.detail-desktop__caption');
  const headerRule = document.querySelector<HTMLElement>('.detail-desktop__rule--header');
  const controlsRule = document.querySelector<HTMLElement>('.detail-desktop__rule--controls');
  if (
    !canvas ||
    !left ||
    !meta ||
    !caption ||
    !headerRule ||
    !controlsRule
  ) {
    return;
  }

  const headerRuleBottom = headerRule.offsetTop + 2;
  const partitionGap = meta.offsetTop - headerRuleBottom;
  if (!Number.isFinite(partitionGap) || partitionGap < 1) return;

  const captionBottom = bottomInPanel(caption, left);
  const controlsRuleTop = captionBottom + partitionGap;
  controlsRule.style.top = `${controlsRuleTop}px`;

  const controlsRuleBottom = controlsRuleTop + 2;
  canvas.style.setProperty('--dd-controls-top', `${controlsRuleBottom + partitionGap}px`);
}

function initDetailDesktopLayout() {
  if (document.documentElement.dataset.viewport !== 'web') return;
  if (!document.body.classList.contains('page-detail')) return;

  const meta = document.querySelector<HTMLElement>('.detail-desktop__meta');
  const caption = document.querySelector<HTMLElement>('.detail-desktop__caption');
  const controls = document.querySelector<HTMLElement>('.detail-desktop__left .detail-typo-controls');
  if (!meta || !caption) return;

  const run = () => {
    syncDetailDesktopLeftSpacing();
    syncDetailDesktopLeftSpacing();
  };

  run();
  document.fonts?.ready.then(run).catch(() => {});
  window.addEventListener('resize', run);
  window.visualViewport?.addEventListener('resize', run);
  window.matchMedia('(hover: hover) and (pointer: fine)').addEventListener('change', run);

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(run);
    for (const el of [meta, caption, controls].filter(Boolean)) {
      if (el) ro.observe(el);
    }
    const scaler = document.querySelector<HTMLElement>('.detail-desktop-scaler');
    if (scaler) ro.observe(scaler);
  }

  document.documentElement.addEventListener('desktop-viewport-scale', run);
}

initDetailDesktopLayout();
