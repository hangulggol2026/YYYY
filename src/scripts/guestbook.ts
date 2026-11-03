import { appendGuestbookEntry } from '../lib/guestbook-storage';
import { isSitePath, normalizePathname, sitePath } from '../lib/site-path';

const OPEN_CLASS = 'is-open';
const IDLE_CLASS = 'guestbook-panel--idle';
const BODY_CLASS = 'guestbook-open';
const PICKER_OPEN_CLASS = 'is-open';
const HEADER_PIN_CLASS = 'guestbook-header-pin';
const HEADER_MOTION_CLASS = 'guestbook-header-pin--motion';
const HEADER_SETTLED_CLASS = 'guestbook-header-pin--settled';
const SWIPE_CLOSE_PX = 72;
const SWIPE_RATIO = 1.2;
const BODY_HEADER_STATIC_CLASS = 'guestbook-open--header-static';
const SCROLL_TOP_PX = 8;
const MOTION_MS = 900;

function motionDurationMs(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MOTION_MS;
}

function getPageHeader(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.main-header') ?? document.querySelector<HTMLElement>('.detail-hero');
}

const HEADER_SPACER_CLASS = 'guestbook-header-spacer';

function insertHeaderSpacer(header: HTMLElement, height: number) {
  removeHeaderSpacer(header);
  const spacer = document.createElement('div');
  spacer.className = HEADER_SPACER_CLASS;
  spacer.setAttribute('aria-hidden', 'true');
  spacer.style.height = `${height}px`;
  header.insertAdjacentElement('beforebegin', spacer);
}

function removeHeaderSpacer(header: HTMLElement | null) {
  if (!header) return;
  const prev = header.previousElementSibling;
  if (prev instanceof HTMLElement && prev.classList.contains(HEADER_SPACER_CLASS)) {
    prev.remove();
  }
}

function measurePanelTop(pinnedHeader: HTMLElement | null): number {
  if (pinnedHeader) {
    if (document.body.classList.contains('page-detail')) {
      return Math.max(0, pinnedHeader.getBoundingClientRect().bottom);
    }
    return pinnedHeader.offsetHeight;
  }

  const header = getPageHeader();
  if (header) {
    return Math.max(0, header.getBoundingClientRect().bottom);
  }

  return 0;
}

function defaultFontId(): string {
  const specimen = document.querySelector<HTMLTextAreaElement>('[data-specimen-input]');
  if (specimen?.dataset.fontId) return specimen.dataset.fontId;

  const match = normalizePathname(window.location.pathname).match(/^\/fonts\/([^/]+)\/?$/);
  if (match?.[1]) return match[1];

  return 'seopung';
}

function initGuestbook() {
  const panel = document.querySelector<HTMLElement>('[data-guestbook-panel]');
  const form = document.querySelector<HTMLFormElement>('[data-guestbook-form]');
  const fontInput = document.querySelector<HTMLInputElement>('[data-guestbook-font]');
  const fontPicker = document.querySelector<HTMLElement>('[data-guestbook-font-picker]');
  const fontTrigger = document.querySelector<HTMLButtonElement>('[data-guestbook-font-trigger]');
  const fontList = document.querySelector<HTMLElement>('[data-guestbook-font-list]');
  const fontLabelText = document.querySelector<HTMLElement>('[data-guestbook-font-label-text]');
  const messageInput = document.querySelector<HTMLTextAreaElement>('[data-guestbook-message]');
  const headerHit = document.querySelector<HTMLButtonElement>('[data-guestbook-close-header]');
  const sheet = document.querySelector<HTMLElement>('[data-guestbook-sheet]');

  if (
    !panel ||
    !form ||
    !fontInput ||
    !fontPicker ||
    !fontTrigger ||
    !fontList ||
    !fontLabelText ||
    !messageInput ||
    !headerHit ||
    !sheet
  ) {
    return;
  }

  let previousFocus: HTMLElement | null = null;
  let swipeStartY = 0;
  let swipeStartX = 0;
  let swipeTracking = false;
  let pinnedHeader: HTMLElement | null = null;
  let isClosing = false;
  let openHeaderMotion = false;
  let openSheetMotion = false;
  let lockedScrollY = 0;
  let lockedSpecimenScrollTop = 0;
  const specimenInput = document.querySelector<HTMLTextAreaElement>('[data-specimen-input]');

  const isDetailPage = () => document.body.classList.contains('page-detail');

  const restoreSpecimenScroll = () => {
    if (!isDetailPage() || !specimenInput) return;
    const y = lockedSpecimenScrollTop;
    specimenInput.scrollTop = y;
    requestAnimationFrame(() => {
      specimenInput.scrollTop = y;
    });
  };

  const waitFrames = (count = 2): Promise<void> =>
    new Promise((resolve) => {
      let left = count;
      const step = () => {
        left -= 1;
        if (left <= 0) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

  const lockScroll = () => {
    lockedScrollY = window.scrollY;
    lockedSpecimenScrollTop = specimenInput?.scrollTop ?? 0;
    const scrollbarPadding = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.setProperty(
      '--guestbook-scroll-lock-padding',
      `${scrollbarPadding}px`,
    );
    document.body.classList.add(BODY_CLASS);

    if (isDetailPage()) {
      if (specimenInput) specimenInput.style.overflow = 'hidden';
      return;
    }

    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  };

  const unlockScroll = () => {
    const restoreY = lockedScrollY;
    document.body.classList.remove(BODY_CLASS);

    if (isDetailPage()) {
      if (specimenInput) specimenInput.style.overflow = '';
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, restoreY);
    }

    document.documentElement.style.removeProperty('--guestbook-scroll-lock-padding');
    lockedScrollY = 0;
    restoreSpecimenScroll();
  };

  const isAtScrollTop = () => window.scrollY <= SCROLL_TOP_PX;

  const syncPanelTop = () => {
    document.documentElement.style.setProperty(
      '--guestbook-panel-top',
      `${measurePanelTop(pinnedHeader)}px`,
    );
  };

  const syncHeaderEnterY = (forMotion: boolean) => {
    if (!pinnedHeader) return;
    if (!forMotion) {
      pinnedHeader.style.setProperty('--guestbook-header-enter-y', '0px');
      return;
    }
    const fromY =
      lockedScrollY > SCROLL_TOP_PX
        ? pinnedHeader.getBoundingClientRect().top
        : -pinnedHeader.offsetHeight;
    pinnedHeader.style.setProperty('--guestbook-header-enter-y', `${fromY}px`);
  };

  const armHeaderPin = (header: HTMLElement) => {
    pinnedHeader = header;
    header.classList.remove(HEADER_MOTION_CLASS, HEADER_SETTLED_CLASS);
    const flowHeight = header.offsetHeight;
    header.classList.add(HEADER_PIN_CLASS);
    if (!isDetailPage()) {
      insertHeaderSpacer(header, flowHeight);
    }
    syncPanelTop();
  };

  const releasePinnedHeader = () => {
    if (!pinnedHeader) return;
    removeHeaderSpacer(pinnedHeader);
    pinnedHeader.classList.remove(HEADER_PIN_CLASS, HEADER_MOTION_CLASS, HEADER_SETTLED_CLASS);
    pinnedHeader.style.removeProperty('--guestbook-header-enter-y');
    pinnedHeader = null;
  };

  const closeFontPicker = () => {
    fontPicker.classList.remove(PICKER_OPEN_CLASS);
    fontTrigger.setAttribute('aria-expanded', 'false');
    fontList.hidden = true;
  };

  const setFontId = (fontId: string, label: string) => {
    fontInput.value = fontId;
    fontLabelText.textContent = label;
    fontList.querySelectorAll<HTMLElement>('[role="option"]').forEach((option) => {
      const selected = option.dataset.fontId === fontId;
      option.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  };

  const openFontPicker = () => {
    fontPicker.classList.add(PICKER_OPEN_CLASS);
    fontTrigger.setAttribute('aria-expanded', 'true');
    fontList.hidden = false;
  };

  const toggleFontPicker = () => {
    if (fontPicker.classList.contains(PICKER_OPEN_CLASS)) closeFontPicker();
    else openFontPicker();
  };

  const finishClose = () => {
    releasePinnedHeader();
    unlockScroll();
    document.body.classList.remove(BODY_HEADER_STATIC_CLASS);
    panel.classList.add(IDLE_CLASS);
    panel.setAttribute('aria-hidden', 'true');
    isClosing = false;
    openHeaderMotion = false;
    openSheetMotion = false;
    previousFocus?.focus();
    previousFocus = null;
  };

  const animateClose = (onComplete?: () => void) => {
    if (isClosing || !panel.classList.contains(OPEN_CLASS)) return;

    isClosing = true;
    closeFontPicker();

    const ms = motionDurationMs();
    if (ms === 0 || (!openSheetMotion && !openHeaderMotion)) {
      panel.classList.remove(OPEN_CLASS);
      pinnedHeader?.classList.remove(HEADER_SETTLED_CLASS, HEADER_MOTION_CLASS);
      finishClose();
      onComplete?.();
      return;
    }

    panel.classList.remove(OPEN_CLASS);
    if (openHeaderMotion) pinnedHeader?.classList.remove(HEADER_SETTLED_CLASS);

    window.setTimeout(() => {
      finishClose();
      onComplete?.();
    }, ms);
  };

  const open = async () => {
    if (isClosing) return;

    const ms = motionDurationMs();
    const atTop = isAtScrollTop();
    openHeaderMotion = !atTop && ms > 0;
    openSheetMotion = ms > 0;

    panel.classList.remove(IDLE_CLASS, OPEN_CLASS);
    panel.setAttribute('aria-hidden', 'false');
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockScroll();

    const header = getPageHeader();
    if (header) {
      armHeaderPin(header);
    } else {
      releasePinnedHeader();
      syncPanelTop();
    }

    restoreSpecimenScroll();

    document.body.classList.toggle(BODY_HEADER_STATIC_CLASS, Boolean(pinnedHeader && !openHeaderMotion));

    const id = defaultFontId();
    const option = fontList.querySelector<HTMLElement>(`[data-font-id="${CSS.escape(id)}"]`);
    const label =
      option?.querySelector('button')?.textContent?.trim() ??
      fontLabelText.textContent ??
      id;
    setFontId(id, label);
    closeFontPicker();
    syncPanelTop();
    syncHeaderEnterY(openHeaderMotion);

    if (pinnedHeader) void pinnedHeader.offsetHeight;
    void sheet.offsetHeight;

    if (ms === 0) {
      pinnedHeader?.classList.add(HEADER_MOTION_CLASS, HEADER_SETTLED_CLASS);
      panel.classList.add(OPEN_CLASS);
      syncPanelTop();
      restoreSpecimenScroll();
      return;
    }

    await waitFrames(2);

    if (openHeaderMotion) {
      pinnedHeader?.classList.add(HEADER_MOTION_CLASS);
      pinnedHeader?.classList.add(HEADER_SETTLED_CLASS);
    }

    panel.classList.add(OPEN_CLASS);
    syncPanelTop();
    restoreSpecimenScroll();
  };

  const isSwipeExcluded = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return true;
    return Boolean(
      target.closest('[data-guestbook-message]') ||
        target.closest('[data-guestbook-font-list]') ||
        target.closest('[data-guestbook-font-trigger]'),
    );
  };

  const isGuestbookListPage = () => isSitePath('guestbook');

  document.querySelectorAll('[data-guestbook-open]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (panel.classList.contains(OPEN_CLASS)) {
        animateClose();
        return;
      }
      void open();
    });
  });

  headerHit.addEventListener('click', () => {
    if (panel.classList.contains(OPEN_CLASS)) animateClose();
  });

  document.querySelectorAll('.main-header, .detail-hero').forEach((headerEl) => {
    headerEl.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      if (!headerEl.contains(e.target)) return;

      if (panel.classList.contains(OPEN_CLASS) && !isClosing) {
        e.preventDefault();
        animateClose();
        return;
      }

      if (isGuestbookListPage()) {
        e.preventDefault();
        window.location.assign(sitePath('main'));
      }
    });
  });

  fontTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleFontPicker();
  });

  fontList.querySelectorAll<HTMLButtonElement>('.guestbook-font-picker__option-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const option = btn.closest<HTMLElement>('[data-font-id]');
      const fontId = option?.dataset.fontId;
      if (!fontId) return;
      setFontId(fontId, btn.textContent?.trim() ?? fontId);
      closeFontPicker();
      fontTrigger.focus();
    });
  });

  document.addEventListener('click', (e) => {
    if (!fontPicker.classList.contains(PICKER_OPEN_CLASS)) return;
    if (e.target instanceof Element && fontPicker.contains(e.target)) return;
    closeFontPicker();
  });

  sheet.addEventListener(
    'touchstart',
    (e) => {
      if (!panel.classList.contains(OPEN_CLASS) || isSwipeExcluded(e.target)) return;
      swipeStartY = e.touches[0]?.clientY ?? 0;
      swipeStartX = e.touches[0]?.clientX ?? 0;
      swipeTracking = true;
    },
    { passive: true },
  );

  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (!swipeTracking || !panel.classList.contains(OPEN_CLASS)) return;
      const y = e.touches[0]?.clientY ?? 0;
      const x = e.touches[0]?.clientX ?? 0;
      const dy = y - swipeStartY;
      const dx = x - swipeStartX;
      if (dy > SWIPE_CLOSE_PX && dy > Math.abs(dx) * SWIPE_RATIO) {
        swipeTracking = false;
        animateClose();
      }
    },
    { passive: true },
  );

  sheet.addEventListener(
    'touchend',
    () => {
      swipeTracking = false;
    },
    { passive: true },
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fontId = fontInput.value;
    const text = messageInput.value.trim();
    if (!text) return;

    appendGuestbookEntry({ fontId, text });
    messageInput.value = '';

    animateClose(() => {
      window.location.assign(sitePath('guestbook/'));
    });
  });

  window.addEventListener('keydown', (e) => {
    if (!panel.classList.contains(OPEN_CLASS)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (fontPicker.classList.contains(PICKER_OPEN_CLASS)) closeFontPicker();
      else animateClose();
    }
  });

  window.addEventListener('resize', () => {
    if (panel.classList.contains(OPEN_CLASS)) {
      syncPanelTop();
      syncHeaderEnterY(openHeaderMotion);
    }
  });

  window.visualViewport?.addEventListener('resize', () => {
    if (panel.classList.contains(OPEN_CLASS)) {
      syncPanelTop();
      syncHeaderEnterY(openHeaderMotion);
    }
  });
}

initGuestbook();
