import { syncViewportScale } from './viewport-scale';

const STORAGE_PREFIX = 'specimen:';
const SPECIMEN_EDIT_CLASS = 'specimen-editing';

type SpecimenWeight = 400 | 500;

function applyVars(scope: HTMLElement, size: number, tracking: number, leading: number) {
  scope.style.setProperty('--specimen-size', `${size}px`);
  scope.style.setProperty('--specimen-letter-spacing', `${tracking / 100}em`);
  scope.style.setProperty('--specimen-line-height', `${leading / 100}`);
}

function applyWeight(scope: HTMLElement, weight: SpecimenWeight) {
  scope.style.setProperty('--specimen-font-weight', String(weight));
}

function resetSlidersToDefault(controls: ParentNode) {
  controls.querySelectorAll<HTMLInputElement>('[data-slider]').forEach((input) => {
    input.value = input.defaultValue;
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Reliable horizontal drag on mobile (native range thumb was ~1px wide). */
function bindSliderPointerDrag(input: HTMLInputElement, onChange: () => void) {
  const setFromClientX = (clientX: number) => {
    const rect = input.getBoundingClientRect();
    if (rect.width <= 0) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const step = Number(input.step) || 1;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    let value = min + ratio * (max - min);
    if (step >= 1) value = Math.round(value);
    else value = Math.round(value / step) * step;
    input.value = String(clamp(value, min, max));
    onChange();
  };

  input.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    input.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  });

  input.addEventListener(
    'pointermove',
    (e) => {
      if (!input.hasPointerCapture(e.pointerId)) return;
      e.preventDefault();
      setFromClientX(e.clientX);
    },
    { passive: false },
  );

  const release = (e: PointerEvent) => {
    if (input.hasPointerCapture(e.pointerId)) {
      input.releasePointerCapture(e.pointerId);
    }
  };
  input.addEventListener('pointerup', release);
  input.addEventListener('pointercancel', release);
}

/** Mobile keyboard: reflow detail layout (do not reserve guestbook bar while typing). */
function bindSpecimenMobileEditing(textarea: HTMLTextAreaElement) {
  const sync = () => syncViewportScale();

  const setEditing = (on: boolean) => {
    document.body.classList.toggle(SPECIMEN_EDIT_CLASS, on);
    sync();
  };

  textarea.addEventListener('focus', () => setEditing(true));
  textarea.addEventListener('blur', () => setEditing(false));

  window.visualViewport?.addEventListener('resize', () => {
    if (document.activeElement === textarea) sync();
  });
  window.visualViewport?.addEventListener('scroll', () => {
    if (document.activeElement === textarea) sync();
  });
}

function init() {
  const textarea = document.querySelector<HTMLTextAreaElement>('[data-specimen-input]');
  const controls = document.querySelector('[data-specimen-controls]');
  const scope = document.querySelector<HTMLElement>('[data-specimen-scope]');
  if (!textarea || !controls || !scope) return;

  const fontId = textarea.dataset.fontId ?? 'default';
  const storageKey = `${STORAGE_PREFIX}${fontId}`;

  const sizeInput = controls.querySelector<HTMLInputElement>('[data-slider="size"]');
  const trackingInput = controls.querySelector<HTMLInputElement>('[data-slider="tracking"]');
  const leadingInput = controls.querySelector<HTMLInputElement>('[data-slider="leading"]');
  const weightButtons = document.querySelectorAll<HTMLButtonElement>('[data-specimen-weight]');

  resetSlidersToDefault(controls);

  let activeWeight: SpecimenWeight = 400;

  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const data = JSON.parse(saved) as { text?: string; weight?: number };
      if (data.text) textarea.value = data.text;
      if (data.weight === 400 || data.weight === 500) activeWeight = data.weight;
    } catch {
      /* ignore */
    }
  }

  const persist = () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        text: textarea.value,
        ...(weightButtons.length ? { weight: activeWeight } : {}),
      }),
    );
  };

  const syncWeightButtons = () => {
    weightButtons.forEach((btn) => {
      const w = Number(btn.dataset.specimenWeight) as SpecimenWeight;
      const on = w === activeWeight;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  const syncSliderReadouts = (size: number, tracking: number, leading: number) => {
    const set = (name: string, text: string) => {
      const el = controls.querySelector<HTMLElement>(`[data-slider-value="${name}"]`);
      if (el) el.textContent = text;
    };
    set('size', `${Math.round(size)}px`);
    const track = Math.round(tracking);
    set('tracking', `${track}%`);
    set('leading', `${Math.round(leading)}%`);
  };

  const update = () => {
    const size = sizeInput ? Number(sizeInput.value) : 52;
    const tracking = trackingInput ? Number(trackingInput.value) : 0;
    const leading = leadingInput ? Number(leadingInput.value) : 185;
    applyVars(scope, size, tracking, leading);
    applyWeight(scope, activeWeight);
    syncSliderReadouts(size, tracking, leading);
  };

  sizeInput?.addEventListener('input', update);
  trackingInput?.addEventListener('input', update);
  leadingInput?.addEventListener('input', update);
  [sizeInput, trackingInput, leadingInput].forEach((input) => {
    if (input) bindSliderPointerDrag(input, update);
  });
  textarea.addEventListener('input', persist);
  bindSpecimenMobileEditing(textarea);

  weightButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const w = Number(btn.dataset.specimenWeight);
      if (w !== 400 && w !== 500) return;
      activeWeight = w;
      syncWeightButtons();
      update();
      persist();
    });
  });

  syncWeightButtons();
  update();

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      resetSlidersToDefault(controls);
      update();
    }
  });
}

init();
