import { appendGuestbookEntry } from '../lib/guestbook-storage';
import { exhibitionFontFamily } from '../lib/exhibition-fonts';
import { isSitePath, normalizePathname, sitePath, sitePathMainList } from '../lib/site-path';
import { GUESTBOOK_SKIP_ENTER_KEY, playGuestbookPartitionClose } from './guestbook-partition';
import { syncViewportScale } from './viewport-scale';

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
const DEFAULT_GUESTBOOK_PLACEHOLDER = '방명을 남겨 주세요.';
const DESKTOP_INLINE_PLACEHOLDER = '글꼴을 선택하고 방명을 남겨주세요.';

function isWebLayout(): boolean {
  return (
    document.documentElement.dataset.viewport === 'web' ||
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

async function navigateToGuestbook(fontId: string) {
  // Always land on the full guestbook (no per-font filter), whichever font was used.
  void fontId;
  const path = sitePath('guestbook/');

  if (isWebLayout() && !document.body.classList.contains('page-guestbook')) {
    const played = await playGuestbookPartitionClose();
    if (played) {
      try {
        sessionStorage.setItem(GUESTBOOK_SKIP_ENTER_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }

  window.location.assign(path);
}

/** e.g. 서풍 → 서풍으로 / 놀이 → 놀이로 */
function guestbookPlaceholderForFont(fontName: string): string {
  const trimmed = fontName.trim();
  if (!trimmed) return DEFAULT_GUESTBOOK_PLACEHOLDER;
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    const josa = jong === 0 || jong === 8 ? '로' : '으로';
    return `${trimmed}${josa} 방명을 남겨보세요.`;
  }
  return `${trimmed}으로 방명을 남겨보세요.`;
}

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
    /* Stable while header slides in (transform does not affect offsetHeight) */
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

function initDesktopInlineGuestbook(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-guestbook-form]');
  const fontInput = root.querySelector<HTMLInputElement>('[data-guestbook-font]');
  const fontPicker = root.querySelector<HTMLElement>('[data-guestbook-font-picker]');
  const fontTrigger = root.querySelector<HTMLButtonElement>('[data-guestbook-font-trigger]');
  const fontList = root.querySelector<HTMLElement>('[data-guestbook-font-list]');
  const fontLabelText = root.querySelector<HTMLElement>('[data-guestbook-font-label-text]');
  const messageInput = root.querySelector<HTMLTextAreaElement>('[data-guestbook-message]');
  if (
    !form ||
    !fontInput ||
    !fontPicker ||
    !fontTrigger ||
    !fontList ||
    !fontLabelText ||
    !messageInput
  ) {
    return;
  }

  const closeFontPicker = () => {
    fontPicker.classList.remove(PICKER_OPEN_CLASS);
    fontTrigger.setAttribute('aria-expanded', 'false');
    fontList.hidden = true;
  };

  const defaultTriggerLabel = () =>
    fontLabelText.dataset.guestbookTriggerDefault?.trim() ?? DESKTOP_INLINE_PLACEHOLDER;

  const applyGuestbookMessageFont = (fontId: string) => {
    const family = exhibitionFontFamily(fontId);
    if (family) messageInput.style.setProperty('font-family', family);
    else messageInput.style.removeProperty('font-family');
  };

  const applyTriggerLabelFont = (fontId: string) => {
    const family = exhibitionFontFamily(fontId);
    if (family) fontLabelText.style.setProperty('font-family', family);
    else fontLabelText.style.removeProperty('font-family');
  };

  const syncMessagePlaceholder = () => {
    if (!fontInput.value.trim()) {
      messageInput.placeholder = DESKTOP_INLINE_PLACEHOLDER;
      return;
    }
    const name = fontLabelText.textContent?.trim() ?? '';
    messageInput.placeholder = name
      ? guestbookPlaceholderForFont(name)
      : DESKTOP_INLINE_PLACEHOLDER;
  };

  const syncMessageInputEnabled = () => {
    const hasFont = Boolean(fontInput.value.trim());
    messageInput.disabled = !hasFont;
    messageInput.setAttribute('aria-disabled', hasFont ? 'false' : 'true');
    const submitBtn = form.querySelector<HTMLButtonElement>('.main-desktop-guestbook__submit');
    if (submitBtn) submitBtn.disabled = !hasFont;
  };

  const setFontId = (fontId: string, label: string) => {
    fontInput.value = fontId;
    if (fontId && label) {
      fontPicker.dataset.selectedFont = fontId;
      fontLabelText.textContent = label;
      applyTriggerLabelFont(fontId);
      applyGuestbookMessageFont(fontId);
    } else {
      delete fontPicker.dataset.selectedFont;
      fontLabelText.textContent = defaultTriggerLabel();
      fontLabelText.style.removeProperty('font-family');
      messageInput.style.removeProperty('font-family');
    }
    fontList.querySelectorAll<HTMLElement>('[role="option"]').forEach((option) => {
      option.setAttribute('aria-selected', option.dataset.fontId === fontId ? 'true' : 'false');
    });
    syncMessagePlaceholder();
    syncMessageInputEnabled();
  };

  const toggleFontPicker = () => {
    if (fontPicker.classList.contains(PICKER_OPEN_CLASS)) closeFontPicker();
    else {
      fontPicker.classList.add(PICKER_OPEN_CLASS);
      fontTrigger.setAttribute('aria-expanded', 'true');
      fontList.hidden = false;
    }
  };

  fontLabelText.style.removeProperty('font-family');
  messageInput.style.removeProperty('font-family');
  syncMessagePlaceholder();
  syncMessageInputEnabled();
  closeFontPicker();

  fontTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleFontPicker();
  });

  fontList.querySelectorAll<HTMLButtonElement>('.guestbook-font-picker__option-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pick = btn.closest<HTMLElement>('[data-font-id]');
      const fontId = pick?.dataset.fontId;
      if (!fontId) return;
      setFontId(fontId, btn.textContent?.trim() ?? fontId);
      closeFontPicker();
    });
  });

  document.addEventListener('click', (e) => {
    if (!fontPicker.classList.contains(PICKER_OPEN_CLASS)) return;
    if (e.target instanceof Element && fontPicker.contains(e.target)) return;
    closeFontPicker();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fontId = fontInput.value.trim();
    const text = messageInput.value.trim();
    if (!fontId) {
      window.alert('서체를 선택해 주세요.');
      toggleFontPicker();
      return;
    }
    if (!text) return;
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');
    void appendGuestbookEntry({ fontId, text })
      .then(() => {
        messageInput.value = '';
        void navigateToGuestbook(fontId);
      })
      .catch(() => {
        submitBtn?.removeAttribute('disabled');
        window.alert('방명을 저장하지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
      });
  });
}

function initGuestbook() {
  const desktopRoot = document.querySelector<HTMLElement>('[data-guestbook-desktop-inline]');
  if (isWebLayout() && desktopRoot) {
    initDesktopInlineGuestbook(desktopRoot);
    return;
  }

  const panel = document.querySelector<HTMLElement>('[data-guestbook-panel]');
  if (!panel) return;

  const form = panel.querySelector<HTMLFormElement>('[data-guestbook-form]');
  const fontInput = panel.querySelector<HTMLInputElement>('[data-guestbook-font]');
  const fontPicker = panel.querySelector<HTMLElement>('[data-guestbook-font-picker]');
  const fontTrigger = panel.querySelector<HTMLButtonElement>('[data-guestbook-font-trigger]');
  const fontList = panel.querySelector<HTMLElement>('[data-guestbook-font-list]');
  const fontLabelText = panel.querySelector<HTMLElement>('[data-guestbook-font-label-text]');
  const messageInput = panel.querySelector<HTMLTextAreaElement>('[data-guestbook-message]');
  const headerHit = panel.querySelector<HTMLButtonElement>('[data-guestbook-close-header]');
  const sheet = panel.querySelector<HTMLElement>('[data-guestbook-sheet]');

  if (
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

  const fontNameForPlaceholder = (): string => {
    if (isDetailPage()) {
      return (
        specimenInput?.dataset.fontName?.trim() ||
        document.querySelector<HTMLElement>('.detail-hero__title')?.textContent?.trim() ||
        ''
      );
    }
    return fontLabelText.textContent?.trim() ?? '';
  };

  const syncMessagePlaceholder = () => {
    const name = fontNameForPlaceholder();
    messageInput.placeholder = name
      ? guestbookPlaceholderForFont(name)
      : DEFAULT_GUESTBOOK_PLACEHOLDER;
  };

  const applyGuestbookMessageFont = (fontId: string) => {
    const family = exhibitionFontFamily(fontId);
    if (family) {
      messageInput.style.setProperty('font-family', family);
    } else {
      messageInput.style.removeProperty('font-family');
    }
  };

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

  const syncGuestbookViewport = () => {
    syncViewportScale();
    if (!panel.classList.contains(OPEN_CLASS)) return;
    syncPanelTop();
    syncHeaderEnterY(openHeaderMotion);
  };

  const scrollMessageInputIntoView = () => {
    requestAnimationFrame(() => {
      const vv = window.visualViewport;
      if (vv && document.documentElement.dataset.viewport !== 'web') {
        const rect = messageInput.getBoundingClientRect();
        const vvBottom = vv.offsetTop + vv.height;
        const padding = 12;
        if (rect.bottom > vvBottom - padding) {
          sheet.scrollTop += rect.bottom - (vvBottom - padding);
        }
        if (rect.top < vv.offsetTop + padding) {
          sheet.scrollTop -= vv.offsetTop + padding - rect.top;
        }
      }
      messageInput.scrollTop = messageInput.scrollHeight;
    });
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

  const applyTriggerLabelFont = (fontId: string) => {
    const family = exhibitionFontFamily(fontId);
    if (family) fontLabelText.style.setProperty('font-family', family);
    else fontLabelText.style.removeProperty('font-family');
  };

  const setFontId = (fontId: string, label: string) => {
    fontInput.value = fontId;
    fontPicker.dataset.selectedFont = fontId;
    fontLabelText.textContent = label;
    fontList.querySelectorAll<HTMLElement>('[role="option"]').forEach((option) => {
      const selected = option.dataset.fontId === fontId;
      option.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    applyTriggerLabelFont(fontId);
    applyGuestbookMessageFont(fontId);
    syncMessagePlaceholder();
  };

  const openFontPicker = () => {
    if (isDetailPage()) return;
    fontPicker.classList.add(PICKER_OPEN_CLASS);
    fontTrigger.setAttribute('aria-expanded', 'true');
    fontList.hidden = false;
  };

  const toggleFontPicker = () => {
    if (isDetailPage()) return;
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
    syncMessagePlaceholder();
    syncPanelTop();
    syncHeaderEnterY(openHeaderMotion);

    if (pinnedHeader) void pinnedHeader.offsetHeight;
    void sheet.offsetHeight;

    if (ms === 0) {
      pinnedHeader?.classList.add(HEADER_MOTION_CLASS, HEADER_SETTLED_CLASS);
      panel.classList.add(OPEN_CLASS);
      syncGuestbookViewport();
      restoreSpecimenScroll();
      return;
    }

    await waitFrames(2);

    if (openHeaderMotion) {
      pinnedHeader?.classList.add(HEADER_MOTION_CLASS);
      pinnedHeader?.classList.add(HEADER_SETTLED_CLASS);
    }

    panel.classList.add(OPEN_CLASS);
    syncGuestbookViewport();
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
      if (e.target.closest('.detail-back')) return;

      if (panel.classList.contains(OPEN_CLASS) && !isClosing) {
        e.preventDefault();
        animateClose();
        return;
      }

      if (isGuestbookListPage()) {
        e.preventDefault();
        window.location.assign(sitePathMainList());
      }
    });
  });

  fontTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleFontPicker();
  });

  messageInput.addEventListener('focus', () => {
    syncGuestbookViewport();
    scrollMessageInputIntoView();
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

    const submitBtn = form.querySelector<HTMLButtonElement>('.guestbook-panel__submit');
    submitBtn?.setAttribute('disabled', 'true');

    void appendGuestbookEntry({ fontId, text })
      .then(() => {
        messageInput.value = '';
        animateClose(() => {
          void navigateToGuestbook(fontId);
        });
      })
      .catch(() => {
        submitBtn?.removeAttribute('disabled');
        window.alert('방명을 저장하지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
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
    syncGuestbookViewport();
  });

  window.visualViewport?.addEventListener('resize', () => {
    syncGuestbookViewport();
  });

  window.visualViewport?.addEventListener('scroll', () => {
    syncGuestbookViewport();
  });
}

function bindDetailDesktopGuestbookSend() {
  if (!document.body.classList.contains('page-detail')) return;

  const root = document.querySelector<HTMLElement>('[data-detail-desktop]');
  const btn = root?.querySelector<HTMLButtonElement>('[data-detail-guestbook-send]');
  const textarea = root?.querySelector<HTMLTextAreaElement>('[data-specimen-input]');
  if (!btn || !textarea) return;

  const syncDisabled = () => {
    btn.disabled = !textarea.value.trim();
  };

  syncDisabled();
  textarea.addEventListener('input', syncDisabled);

  btn.addEventListener('click', () => {
    const fontId = textarea.dataset.fontId?.trim() || defaultFontId();
    const text = textarea.value.trim();
    if (!text) return;

    btn.disabled = true;
    void appendGuestbookEntry({ fontId, text })
      .then(() => {
        void navigateToGuestbook(fontId);
      })
      .catch(() => {
        syncDisabled();
        window.alert('방명을 저장하지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.');
      });
  });
}

function initDetailDesktopGuestbookSend() {
  if (!document.body.classList.contains('page-detail')) return;
  if (isWebLayout()) {
    bindDetailDesktopGuestbookSend();
    return;
  }
  const onReady = () => {
    if (!isWebLayout()) return;
    document.documentElement.removeEventListener('desktop-viewport-scale', onReady);
    bindDetailDesktopGuestbookSend();
  };
  document.documentElement.addEventListener('desktop-viewport-scale', onReady);
}

initGuestbook();
initDetailDesktopGuestbookSend();
