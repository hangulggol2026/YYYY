import { FRAME_H } from '../lib/design-frame';
import { syncViewportScale } from './viewport-scale';

export function updateLandingScale() {
  if (!document.body.classList.contains('page-landing')) return;
  syncViewportScale();
  syncLandingPartitionGaps();
  syncLandingCanvasHeight();
}

/** Match mirror gap below partition to flex gap above partition (intro → seam). */
export function syncLandingPartitionGaps() {
  const topGap = document.querySelector<HTMLElement>('[data-landing-partition-gap]');
  if (!topGap) return;
  const h = topGap.offsetHeight;
  document.documentElement.style.setProperty('--landing-partition-gap-sync', `${h}px`);
}

/** Reserve scroll height for scaled landing canvas (design px × scale). */
export function syncLandingCanvasHeight() {
  const canvas = document.querySelector<HTMLElement>('.landing-canvas');
  if (!canvas) return;
  const designH = Math.max(canvas.offsetHeight, FRAME_H);
  document.documentElement.style.setProperty('--landing-canvas-h', `${designH}`);
}

/** Called when landing opens into main — legacy hook (wheel lock removed). */
export function releaseLandingScrollLock() {}

function onViewportChange() {
  updateLandingScale();
}

function init() {
  if (!document.body.classList.contains('page-landing')) return;
  updateLandingScale();
  requestAnimationFrame(() => updateLandingScale());
  if (document.fonts?.ready) {
    void document.fonts.ready.then(() => updateLandingScale());
  }
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('scroll', onViewportChange);
}

init();
