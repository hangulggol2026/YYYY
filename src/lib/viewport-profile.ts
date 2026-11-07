/** Desktop layout: fine pointer + hover (not window width). Phones/tablets-touch → mobile. */
export const DESKTOP_LAYOUT_MQ = '(hover: hover) and (pointer: fine)';

export type ViewportProfile = 'web' | 'mobile';

export function readViewportProfile(): ViewportProfile {
  if (typeof window === 'undefined') return 'mobile';
  return window.matchMedia(DESKTOP_LAYOUT_MQ).matches ? 'web' : 'mobile';
}
