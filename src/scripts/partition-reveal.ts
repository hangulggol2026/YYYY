import { releaseLandingScrollLock, syncLandingCanvasHeight } from './landing-fit';
import { readViewportProfile } from '../lib/viewport-profile';
import { isSitePath, sitePath } from '../lib/site-path';
import {
  FRAME_H,
  FRAME_W,
  LANDING_HEADER_Y,
  LANDING_PARTITION_H,
  LANDING_PARTITION_Y,
  MAIN_GUESTBOOK_TOP,
  MAIN_HEADER_Y,
  MAIN_WHITE_TOP,
  PARTITION_W,
  PARTITION_X,
} from '../lib/design-frame';

const DURATION_MS = 900;
const EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

const PARTITION_Y = LANDING_PARTITION_Y;
const PARTITION_H = LANDING_PARTITION_H;

function readLandingScale(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--landing-scale').trim();
  const scale = parseFloat(raw);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function liftPanels(root: HTMLElement, overlay: HTMLElement) {
  const header = overlay.querySelector<HTMLElement>('.landing-canvas__header');
  const top = overlay.querySelector<HTMLElement>('.landing-top');
  const bottom = overlay.querySelector<HTMLElement>('.landing-bottom');
  const gap = overlay.querySelector<HTMLElement>('[data-landing-partition]');
  if (!header || !top || !bottom || !gap) return false;

  root.append(header, top, gap, bottom);
  return true;
}

function unlockPageScroll() {
  document.body.classList.remove('page-landing');
  document.documentElement.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('height');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('height');
  releaseLandingScrollLock();
}

function waitFrames(count = 2) {
  return new Promise<void>((resolve) => {
    let left = count;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function runRevealAnimations(
  root: HTMLElement,
  overlay: HTMLElement,
  main: HTMLElement,
  duration: number,
) {
  const scale = readLandingScale();
  const canvasRect = overlay.getBoundingClientRect();
  const top = canvasRect.top;
  const left = canvasRect.left;

  const whiteFill = root.querySelector<HTMLElement>('.partition-white-fill');
  const mainWrap = main.querySelector<HTMLElement>('.main-scaled-wrap');
  const landingHeader = root.querySelector<HTMLElement>('.landing-canvas__header');
  const landingIntro = root.querySelector<HTMLElement>('.landing-canvas__intro');
  const landingBottom = root.querySelector<HTMLElement>('.landing-bottom');
  const landingTop = root.querySelector<HTMLElement>('.landing-top');
  const guestbook = main.querySelector<HTMLElement>('.guestbook-sticky');

  if (!whiteFill || !mainWrap || !landingHeader) return;

  const whiteEndTop = top + MAIN_WHITE_TOP * scale;
  const whiteEndHeight = (MAIN_GUESTBOOK_TOP - MAIN_WHITE_TOP) * scale;
  const slitInsetTop = (PARTITION_Y - MAIN_WHITE_TOP) * scale;
  const slitHeight = PARTITION_H * scale;
  const slitInsetBottom = Math.max(whiteEndHeight - slitInsetTop - slitHeight, 0);
  const panelLiftDesign = PARTITION_Y - MAIN_WHITE_TOP;
  const panelDropDesign = MAIN_GUESTBOOK_TOP - (PARTITION_Y + PARTITION_H);

  const headerStartTop = top + LANDING_HEADER_Y * scale;
  const headerEndTop = top + MAIN_HEADER_Y * scale;
  const headerLeft = left + 60 * scale;
  const headerWidth = 1157 * scale;
  const headerHeight = 200 * scale;

  Object.assign(landingHeader.style, {
    position: 'fixed',
    zIndex: '8',
    left: `${headerLeft}px`,
    top: `${headerStartTop}px`,
    width: `${headerWidth}px`,
    height: `${headerHeight}px`,
    margin: '0',
  });

  Object.assign(whiteFill.style, {
    position: 'fixed',
    zIndex: '5',
    background: '#ffffff',
    left: `${left}px`,
    width: `${FRAME_W * scale}px`,
    top: `${whiteEndTop}px`,
    height: `${whiteEndHeight}px`,
    clipPath: `inset(${slitInsetTop}px 0 ${slitInsetBottom}px 0)`,
  });

  main.style.visibility = 'visible';
  main.style.opacity = '1';

  if (guestbook) {
    guestbook.style.visibility = 'visible';
    guestbook.style.transform = 'translateY(100%)';
  }

  await waitFrames(2);

  const motion = { duration, easing: EASING, fill: 'forwards' as FillMode };

  const animations: Animation[] = [
    whiteFill.animate(
      [
        { clipPath: `inset(${slitInsetTop}px 0 ${slitInsetBottom}px 0)` },
        { clipPath: 'inset(0px 0 0px 0px)' },
      ],
      motion,
    ),
    landingHeader.animate(
      [{ top: `${headerStartTop}px` }, { top: `${headerEndTop}px` }],
      motion,
    ),
  ];

  if (landingTop) {
    animations.push(
      landingTop.animate(
        [
          { transform: `scale(${scale}) translateY(0px)` },
          { transform: `scale(${scale}) translateY(${-panelLiftDesign}px)` },
        ],
        motion,
      ),
    );
  }

  if (landingBottom) {
    animations.push(
      landingBottom.animate(
        [
          { transform: `scale(${scale}) translateY(0px)` },
          { transform: `scale(${scale}) translateY(${panelDropDesign}px)` },
        ],
        motion,
      ),
    );
  }

  if (landingIntro) {
    animations.push(
      landingIntro.animate([{ opacity: '1' }, { opacity: '0' }], {
        duration: duration * 0.55,
        easing: EASING,
        fill: 'forwards',
      }),
    );
  }

  if (landingBottom) {
    animations.push(
      landingBottom.animate([{ opacity: '1' }, { opacity: '0' }], {
        duration: duration * 0.6,
        easing: EASING,
        fill: 'forwards',
      }),
    );
  }

  if (guestbook) {
    animations.push(
      guestbook.animate(
        [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
        motion,
      ),
    );
  }

  await Promise.all(
    animations.map(
      (anim) =>
        new Promise<void>((resolve) => {
          anim.addEventListener('finish', () => resolve(), { once: true });
          anim.addEventListener('cancel', () => resolve(), { once: true });
        }),
    ),
  );

  animations.forEach((anim) => anim.cancel());
}

function cleanupRevealInlineStyles(root: HTMLElement, main: HTMLElement | null) {
  const landingHeader = root.querySelector<HTMLElement>('.landing-canvas__header');
  const whiteFill = root.querySelector<HTMLElement>('.partition-white-fill');
  const landingTop = root.querySelector<HTMLElement>('.landing-top');
  const landingBottom = root.querySelector<HTMLElement>('.landing-bottom');
  const guestbook = main?.querySelector<HTMLElement>('.guestbook-sticky');

  landingHeader?.removeAttribute('style');
  whiteFill?.removeAttribute('style');
  landingTop?.removeAttribute('style');
  landingBottom?.removeAttribute('style');
  main?.removeAttribute('style');
  main?.querySelector<HTMLElement>('.main-scaled-wrap')?.removeAttribute('style');
  guestbook?.style.removeProperty('transform');
  guestbook?.style.removeProperty('visibility');
  root.style.removeProperty('--reveal-canvas-top');
  root.style.removeProperty('--reveal-canvas-left');
}

type OpenPartitionOptions = { instant?: boolean };

function usesDesktopLanding(root: HTMLElement): boolean {
  return readViewportProfile() === 'web' && !!root.querySelector('[data-landing-desktop]');
}

function finishDesktopOpen(root: HTMLElement, main: HTMLElement, landing: HTMLElement | null) {
  root.classList.remove('is-revealing');
  landing?.classList.remove('is-revealing');
  landing?.closest('.landing-desktop-viewport')?.classList.remove('is-revealing');
  landing?.querySelector<HTMLElement>('[data-landing-desktop-partition]')?.removeAttribute('style');
  landing?.querySelector<HTMLElement>('[data-landing-desktop-right]')?.style.removeProperty('opacity');
  root.classList.add('is-open');
  main.setAttribute('aria-hidden', 'false');
  main.style.removeProperty('visibility');
  main.style.removeProperty('opacity');
  if (!isSitePath('main')) {
    window.history.replaceState({}, '', sitePath('main'));
  }
  unlockPageScroll();
}

async function runDesktopRevealAnimations(
  root: HTMLElement,
  landing: HTMLElement,
  main: HTMLElement,
  duration: number,
) {
  const partition = landing.querySelector<HTMLElement>('[data-landing-desktop-partition]');
  const right = landing.querySelector<HTMLElement>('[data-landing-desktop-right]');
  if (!partition || !right) return;

  main.style.visibility = 'visible';
  main.style.opacity = '1';

  await waitFrames(2);

  const motion = { duration, easing: EASING, fill: 'forwards' as FillMode };
  const slitW = 10;
  const slitLeft = 620;
  const openW = 1290;

  Object.assign(partition.style, {
    position: 'absolute',
    left: `${slitLeft}px`,
    top: '0',
    height: '100%',
    width: `${slitW}px`,
    background: '#ffffff',
    zIndex: '6',
  });

  const animations: Animation[] = [
    partition.animate(
      [
        { width: `${slitW}px`, offset: 0 },
        { width: `${openW}px`, offset: 1 },
      ],
      motion,
    ),
    right.animate([{ opacity: '1' }, { opacity: '0' }], {
      duration: duration * 0.85,
      easing: EASING,
      fill: 'forwards',
    }),
  ];

  await Promise.all(
    animations.map(
      (anim) =>
        new Promise<void>((resolve) => {
          anim.addEventListener('finish', () => resolve(), { once: true });
          anim.addEventListener('cancel', () => resolve(), { once: true });
        }),
    ),
  );

  animations.forEach((anim) => anim.cancel());
}

async function openPartitionDesktop(root: HTMLElement, options?: OpenPartitionOptions) {
  if (root.classList.contains('is-open') || root.classList.contains('is-revealing')) return;

  const main = root.querySelector<HTMLElement>('[data-partition-main]');
  const landing = root.querySelector<HTMLElement>('[data-landing-desktop]');
  if (!main || !landing) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = options?.instant || reduced ? 0 : DURATION_MS;

  root.classList.add('is-revealing');
  landing.classList.add('is-revealing');
  landing.closest('.landing-desktop-viewport')?.classList.add('is-revealing');

  if (duration === 0) {
    finishDesktopOpen(root, main, landing);
    return;
  }

  try {
    await runDesktopRevealAnimations(root, landing, main, duration);
  } catch {
    /* fall through */
  }

  finishDesktopOpen(root, main, landing);
}

async function openPartition(root: HTMLElement, options?: OpenPartitionOptions) {
  if (root.classList.contains('is-open') || root.classList.contains('is-revealing')) return;

  if (usesDesktopLanding(root)) {
    await openPartitionDesktop(root, options);
    return;
  }

  const overlay = root.querySelector<HTMLElement>('[data-partition-overlay]');
  const main = root.querySelector<HTMLElement>('[data-partition-main]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = options?.instant || reduced ? 0 : DURATION_MS;

  if (!overlay || !main) return;

  if (!liftPanels(root, overlay)) return;

  syncLandingCanvasHeight();
  const landingBottomEl = overlay.querySelector<HTMLElement>('.landing-bottom');
  if (landingBottomEl) {
    root.style.setProperty('--reveal-landing-bottom-h', `${landingBottomEl.offsetHeight}px`);
  }

  const canvasRect = overlay.getBoundingClientRect();
  root.style.setProperty('--reveal-canvas-top', `${canvasRect.top}px`);
  root.style.setProperty('--reveal-canvas-left', `${canvasRect.left}px`);

  root.classList.add('is-revealing');
  overlay.classList.add('is-revealing');

  if (duration === 0) {
    root.classList.remove('is-revealing');
    overlay.classList.remove('is-revealing');
    root.classList.add('is-open');
    main.setAttribute('aria-hidden', 'false');
    if (!isSitePath('main')) {
      window.history.replaceState({}, '', sitePath('main'));
    }
    unlockPageScroll();
    return;
  }

  try {
    await runRevealAnimations(root, overlay, main, duration);
  } catch {
    /* fall through to finish */
  }

  root.classList.remove('is-revealing');
  overlay.classList.remove('is-revealing');
  root.classList.add('is-open');
  main.setAttribute('aria-hidden', 'false');
  cleanupRevealInlineStyles(root, main);

  if (!isSitePath('main')) {
    window.history.replaceState({}, '', sitePath('main'));
  }
  unlockPageScroll();
}

function consumeEnterMainQuery(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('enter') !== 'main') return false;
  params.delete('enter');
  const qs = params.toString();
  const next = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState({}, '', next);
  return true;
}

function init() {
  const root = document.querySelector<HTMLElement>('[data-partition-root]');
  if (!root) return;

  if (isSitePath('main')) {
    window.history.replaceState({}, '', sitePath(''));
  }

  let activated = consumeEnterMainQuery();
  if (activated) {
    void openPartition(root, { instant: true });
  }

  const onActivate = (e?: Event) => {
    if (activated) return;
    activated = true;
    e?.preventDefault();
    void openPartition(root);
  };

  const desktopInteract = root.querySelector<HTMLElement>('[data-landing-desktop-interaction]');
  const mobileInteract = root.querySelector<HTMLElement>('[data-landing-interaction]');

  if (desktopInteract && usesDesktopLanding(root)) {
    desktopInteract.addEventListener('click', (e) => onActivate(e));
    desktopInteract.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') onActivate(e);
    });
  } else if (!mobileInteract) {
    return;
  }

  if (!mobileInteract || usesDesktopLanding(root)) {
    window.addEventListener('landing:enter-main', (e) => {
      const instant = (e as CustomEvent<{ instant?: boolean }>).detail?.instant === true;
      void openPartition(root, instant ? { instant: true } : undefined);
    });
    return;
  }

  const interact = mobileInteract;
  let touchStartY = 0;
  let touchStartX = 0;
  let touchMoved = false;
  const TAP_SLOP_PX = 12;

  const isCoarseTouch = () =>
    window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  interact?.addEventListener('click', (e) => {
    if (isCoarseTouch()) return;
    onActivate(e);
  });
  interact?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') onActivate(e);
  });

  interact?.addEventListener(
    'touchstart',
    (e) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
      touchStartX = e.touches[0]?.clientX ?? 0;
      touchMoved = false;
    },
    { passive: true },
  );

  interact?.addEventListener(
    'touchmove',
    (e) => {
      const y = e.touches[0]?.clientY ?? 0;
      const x = e.touches[0]?.clientX ?? 0;
      if (
        Math.abs(y - touchStartY) > TAP_SLOP_PX ||
        Math.abs(x - touchStartX) > TAP_SLOP_PX
      ) {
        touchMoved = true;
      }
    },
    { passive: true },
  );

  interact?.addEventListener(
    'touchend',
    (e) => {
      if (touchMoved) return;
      const t = e.changedTouches[0];
      if (!t) return;
      if (
        Math.abs(t.clientY - touchStartY) > TAP_SLOP_PX ||
        Math.abs(t.clientX - touchStartX) > TAP_SLOP_PX
      ) {
        return;
      }
      onActivate(e);
    },
    { passive: true },
  );

  window.addEventListener('landing:enter-main', (e) => {
    const instant = (e as CustomEvent<{ instant?: boolean }>).detail?.instant === true;
    void openPartition(root, instant ? { instant: true } : undefined);
  });
}

init();
