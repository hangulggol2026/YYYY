import { syncViewportScale } from './viewport-scale';

export function updateLandingScale() {
  if (!document.body.classList.contains('page-landing')) return;
  syncViewportScale();
}

/** Called when landing opens into main — legacy hook (wheel lock removed). */
export function releaseLandingScrollLock() {}

function onViewportChange() {
  updateLandingScale();
}

function init() {
  if (!document.body.classList.contains('page-landing')) return;
  updateLandingScale();
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('scroll', onViewportChange);
}

init();
