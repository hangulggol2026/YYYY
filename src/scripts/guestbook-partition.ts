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

export async function playGuestbookPartitionClose(): Promise<boolean> {
  const { canvas, right } = findTransitionTargets();
  if (!canvas || !right) return false;

  const duration = guestbookPartitionDurationMs();
  const { slitW, openW, left, top, height } = partitionScreenGeometry(canvas);

  const partition = document.createElement('div');
  partition.className = 'guestbook-transition-partition';
  partition.setAttribute('aria-hidden', 'true');
  Object.assign(partition.style, {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    width: `${openW}px`,
    height: `${height}px`,
    background: '#ffffff',
    zIndex: '20000',
    pointerEvents: 'none',
  });
  document.body.append(partition);

  if (duration === 0) {
    partition.remove();
    return true;
  }

  right.style.willChange = 'opacity';
  await waitFrames(2);

  const motion = { duration, easing: GUESTBOOK_PARTITION_EASING, fill: 'forwards' as FillMode };

  const partitionAnim = partition.animate(
    [{ width: `${openW}px` }, { width: `${slitW}px` }],
    motion,
  );

  const rightAnim = right.animate([{ opacity: '1' }, { opacity: '0' }], {
    duration: duration * 0.85,
    easing: GUESTBOOK_PARTITION_EASING,
    fill: 'forwards',
  });

  await Promise.all([
    partitionAnim.finished.catch(() => {}),
    rightAnim.finished.catch(() => {}),
  ]);

  partitionAnim.cancel();
  rightAnim.cancel();
  partition.style.width = `${slitW}px`;
  partition.remove();
  right.style.opacity = '';
  right.style.willChange = '';
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
