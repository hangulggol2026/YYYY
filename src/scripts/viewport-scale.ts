import {
  DESKTOP_LANDING_H,
  DESKTOP_LANDING_W,
  DEVICE_REF_W,
  FRAME_H,
  FRAME_W,
  WEB_FRAME_W,
} from '../lib/design-frame';
import { DESKTOP_LAYOUT_MQ, readViewportProfile } from '../lib/viewport-profile';

/** Sync --vb / --vbh / visualViewport vars; --vf comes from CSS (length), not unitless JS. */
export { DEVICE_REF_W, FRAME_H, FRAME_W };

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
  const profile = readViewportProfile();
  const exhibitionFrameW = profile === 'web' ? WEB_FRAME_W : FRAME_W;
  const vb = Math.min(w, exhibitionFrameW);
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
  root.dataset.viewport = profile;

  const desktopLandingScale =
    profile === 'web' ? Math.min(w / DESKTOP_LANDING_W, h / DESKTOP_LANDING_H) : 1;
  root.style.setProperty('--desktop-landing-scale', String(desktopLandingScale));
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
  window.matchMedia(DESKTOP_LAYOUT_MQ).addEventListener('change', onViewportChange);
}

init();
