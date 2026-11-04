/** Sync --vb / --vbh / visualViewport vars; --vf comes from CSS (length), not unitless JS. */
export const FRAME_W = 1277;
export const FRAME_H = 2776;

export function readViewportSize() {
  const vv = window.visualViewport;
  return {
    w: vv?.width ?? window.innerWidth,
    h: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
    offsetLeft: vv?.offsetLeft ?? 0,
  };
}

/** Phone: fill width (matches main --vf-w). Desktop: letterbox contain. */
export function computeLandingScale(w: number, h: number): number {
  if (w <= FRAME_W) return w / FRAME_W;
  return Math.min(w / FRAME_W, h / FRAME_H);
}

export function landingFitMode(w: number): 'width-scroll' | 'contain' {
  return w <= FRAME_W ? 'width-scroll' : 'contain';
}

export function exhibitionFitMode(w: number): 'width' | 'contain' {
  return w <= FRAME_W ? 'width' : 'contain';
}

export function applyViewportScale(root: HTMLElement, w: number, h: number, offsetTop: number, offsetLeft: number) {
  const vb = Math.min(w, FRAME_W);
  const vbh = Math.min(h, FRAME_H);
  const landingScale = computeLandingScale(w, h);

  root.style.setProperty('--vb', `${vb}px`);
  root.style.setProperty('--vbh', `${vbh}px`);
  root.style.setProperty('--landing-scale', String(landingScale));
  root.style.setProperty('--vv-top', `${offsetTop}px`);
  root.style.setProperty('--vv-left', `${offsetLeft}px`);
  root.style.setProperty('--vv-width', `${w}px`);
  root.style.setProperty('--vv-height', `${h}px`);
  root.dataset.landingFit = landingFitMode(w);
  root.dataset.exhibitionFit = exhibitionFitMode(w);
  root.dataset.viewport = w >= 1280 ? 'web' : 'mobile';
}

export function syncViewportScale() {
  const { w, h, offsetTop, offsetLeft } = readViewportSize();
  applyViewportScale(document.documentElement, w, h, offsetTop, offsetLeft);
}

function onViewportChange() {
  syncViewportScale();
}

function init() {
  syncViewportScale();
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('scroll', onViewportChange);
}

init();
