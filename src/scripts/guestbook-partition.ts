/** Desktop — reverse of landing→main partition (slit closes over the right panel). */

import { DESKTOP_LANDING_LEFT_W, DESKTOP_LANDING_RIGHT_W } from '../lib/design-frame';

export const GUESTBOOK_PARTITION_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';
export const GUESTBOOK_PARTITION_MS = 900;
export const GUESTBOOK_SKIP_ENTER_KEY = 'guestbook:skip-enter-anim';

export function guestbookPartitionDurationMs(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : GUESTBOOK_PARTITION_MS;
}

function waitFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function readDesktopScale(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--desktop-main-scale').trim();
  const scale = Number.parseFloat(raw);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function findTransitionTargets() {
  const canvas = document.querySelector<HTMLElement>(
    '.main-desktop__canvas, .detail-desktop__canvas',
  );
  const right = canvas?.querySelector<HTMLElement>('.main-desktop__right, .detail-desktop__right');
  return { canvas, right };
}

function partitionScreenGeometry(canvas: HTMLElement) {
  const scale = readDesktopScale();
  const rect = canvas.getBoundingClientRect();
  const slitW = 10 * scale;
  const openW = DESKTOP_LANDING_RIGHT_W * scale;
  const left = rect.left + DESKTOP_LANDING_LEFT_W * scale;
  const top = rect.top;
  const height = rect.height;

  return { scale, rect, slitW, openW, left, top, height };
}

/**
 * Main → guestbook: a black panel slides in from the right edge and covers the
 * right-hand list (reverse of landing → main). The panel is intentionally left in
 * place when this resolves so the caller can navigate without a white flash; the
 * guestbook page's right side is black too. No reload happens here.
 */
export async function playGuestbookPartitionClose(): Promise<boolean> {
  const { canvas, right } = findTransitionTargets();
  if (!canvas || !right) return false;

  const duration = guestbookPartitionDurationMs();
  const { left, slitW } = partitionScreenGeometry(canvas);
  // Stop at the right edge of the 10px slit so the white partition line stays visible.
  const coverLeft = Math.max(0, Math.round(left + slitW));
  const coverW = Math.max(0, window.innerWidth - coverLeft);

  document.querySelectorAll('.guestbook-transition-partition').forEach((el) => el.remove());
  const cover = document.createElement('div');
  cover.className = 'guestbook-transition-partition';
  cover.setAttribute('aria-hidden', 'true');
  Object.assign(cover.style, {
    position: 'fixed',
    left: `${coverLeft}px`,
    top: '0',
    width: `${coverW}px`,
    height: '100vh',
    background: '#000000',
    zIndex: '20000',
    pointerEvents: 'none',
    transform: duration === 0 ? 'none' : 'translateX(100%)',
  });
  document.body.append(cover);

  // bfcache back-navigation must not resurrect the cover.
  window.addEventListener('pageshow', () => cover.remove(), { once: true });

  if (duration === 0) return true;

  await waitFrames(2);
  const anim = cover.animate(
    [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }],
    { duration, easing: GUESTBOOK_PARTITION_EASING, fill: 'forwards' },
  );
  await anim.finished.catch(() => {});
  cover.style.transform = 'none';
  anim.cancel();
  return true;
}

export async function playGuestbookPartitionCloseOnCanvas(
  canvas: HTMLElement,
  right: HTMLElement,
): Promise<void> {
  const duration = guestbookPartitionDurationMs();
  const partition = canvas.querySelector<HTMLElement>('[data-guestbook-desktop-partition]');
  if (!partition) return;

  const slitW = 10;
  const openW = DESKTOP_LANDING_RIGHT_W;

  Object.assign(partition.style, {
    position: 'absolute',
    left: `${DESKTOP_LANDING_LEFT_W}px`,
    top: '0',
    height: '100%',
    width: `${openW}px`,
    background: '#fff',
    zIndex: '20',
    pointerEvents: 'none',
  });

  if (duration === 0) {
    partition.style.width = `${slitW}px`;
    return;
  }

  right.style.opacity = '0';
  await waitFrames(2);

  const motion = { duration, easing: GUESTBOOK_PARTITION_EASING, fill: 'forwards' as FillMode };

  const partitionAnim = partition.animate(
    [{ width: `${openW}px` }, { width: `${slitW}px` }],
    motion,
  );

  const rightAnim = right.animate([{ opacity: '0' }, { opacity: '1' }], {
    duration: duration * 0.85,
    easing: GUESTBOOK_PARTITION_EASING,
    fill: 'forwards',
    delay: duration * 0.15,
  });

  await Promise.all([
    partitionAnim.finished.catch(() => {}),
    rightAnim.finished.catch(() => {}),
  ]);

  partitionAnim.cancel();
  rightAnim.cancel();
  partition.style.width = `${slitW}px`;
  right.style.opacity = '';
}

/**
 * Guestbook → main: the black cover (created in index.astro before first paint) slides
 * back out to the right, uncovering the list. Mirror of playGuestbookPartitionClose().
 */
export async function playGuestbookRevealOpen(): Promise<void> {
  const cover = document.querySelector<HTMLElement>('.guestbook-reveal-cover');
  if (!cover) return;
  const duration = guestbookPartitionDurationMs();
  // Hold until the right list (fonts + eager preview images; lazy ones load on scroll and are skipped) is ready, then show the left
  // panel's content and open the cover together. Capped so a slow asset can't trap the page.
  await waitForMainListReady(4000);
  document.documentElement.classList.remove('reveal-pending');
  if (duration > 0) {
    await waitFrames(2);
    const anim = cover.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
      { duration, easing: GUESTBOOK_PARTITION_EASING, fill: 'forwards' },
    );
    await anim.finished.catch(() => {});
  }
  cover.remove();
}

function waitForMainListReady(timeoutMs: number): Promise<void> {
  const root = document.documentElement;
  const fonts = new Promise<void>((resolve) => {
    if (root.classList.contains('fonts-ready')) return resolve();
    const mo = new MutationObserver(() => {
      if (root.classList.contains('fonts-ready')) {
        mo.disconnect();
        resolve();
      }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  });
  const images = Promise.all(
    Array.from(document.querySelectorAll<HTMLImageElement>('.main-desktop__right img')).map((img) =>
      img.complete || img.loading === 'lazy' ? Promise.resolve() : img.decode().catch(() => {}),
    ),
  ).then(() => {});
  const cap = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([Promise.all([fonts, images]).then(() => {}), cap]);
}
