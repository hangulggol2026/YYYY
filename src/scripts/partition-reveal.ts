import { releaseLandingScrollLock } from './landing-fit';

const DURATION_MS = 900;
const EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** Figma 1:20 landing + 1:25 main — design px on 1277×2776 */
const FRAME_H = 2776;
const LANDING_HEADER_Y = 113;
const MAIN_HEADER_Y = 72;
const PARTITION_Y = 1658;
const PARTITION_H = 8;
const PARTITION_X = 58;
const PARTITION_W = 1157;
const FRAME_W = 1277;
const MAIN_WHITE_TOP = 345;
const MAIN_GUESTBOOK_TOP = 2604;

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

async function openPartition(root: HTMLElement) {
  if (root.classList.contains('is-open') || root.classList.contains('is-revealing')) return;

  const overlay = root.querySelector<HTMLElement>('[data-partition-overlay]');
  const main = root.querySelector<HTMLElement>('[data-partition-main]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? 0 : DURATION_MS;

  if (!overlay || !main) return;

  if (!liftPanels(root, overlay)) return;

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
    if (window.location.pathname !== '/main') {
      window.history.replaceState({}, '', '/main');
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

  if (window.location.pathname !== '/main') {
    window.history.replaceState({}, '', '/main');
  }
  unlockPageScroll();
}

function init() {
  const root = document.querySelector<HTMLElement>('[data-partition-root]');
  if (!root) return;

  if (window.location.pathname === '/main') {
    root.classList.add('is-open');
    root.querySelector('[data-partition-main]')?.setAttribute('aria-hidden', 'false');
    unlockPageScroll();
    return;
  }

  const interact = root.querySelector<HTMLElement>('[data-landing-interaction]');
  let activated = false;
  let touchStartY = 0;
  let touchStartX = 0;
  let touchMoved = false;
  const TAP_SLOP_PX = 12;

  const onActivate = (e?: Event) => {
    if (activated) return;
    activated = true;
    e?.preventDefault();
    void openPartition(root);
  };

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
}

init();
