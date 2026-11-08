import { readGuestbookEntries, type GuestbookEntry } from '../lib/guestbook-storage';
import {
  GUESTBOOK_SKIP_ENTER_KEY,
  playGuestbookPartitionCloseOnCanvas,
} from './guestbook-partition';

const HIGHLIGHT_KEY = 'guestbook:highlight-font';

function isWebLayout(): boolean {
  return (
    document.documentElement.dataset.viewport === 'web' ||
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

function whenWebLayout(run: () => void) {
  if (isWebLayout()) {
    run();
    return;
  }
  const onReady = () => {
    if (!isWebLayout()) return;
    document.documentElement.removeEventListener('desktop-viewport-scale', onReady);
    run();
  };
  document.documentElement.addEventListener('desktop-viewport-scale', onReady);
}

function readHighlightFontId(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('font');
    if (fromUrl) return fromUrl;
    return sessionStorage.getItem(HIGHLIGHT_KEY);
  } catch {
    return null;
  }
}

function consumeSkipEnterAnim(): boolean {
  try {
    const skip = sessionStorage.getItem(GUESTBOOK_SKIP_ENTER_KEY) === '1';
    if (skip) sessionStorage.removeItem(GUESTBOOK_SKIP_ENTER_KEY);
    return skip;
  } catch {
    return false;
  }
}

function setActiveFont(fontId: string | null) {
  document.querySelectorAll<HTMLButtonElement>('[data-guestbook-desktop-font]').forEach((btn) => {
    const on = fontId != null && btn.dataset.fontId === fontId;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function hashSeed(parts: string): number {
  let h = 2166136261;
  for (let i = 0; i < parts.length; i += 1) {
    h ^= parts.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function renderEntry(entry: GuestbookEntry, index: number) {
  const wrap = document.createElement('article');
  wrap.className = 'guestbook-desktop__entry';
  wrap.dataset.fontId = entry.fontId;

  const float = document.createElement('div');
  float.className = 'guestbook-desktop__entry-float';
  const seed = hashSeed(`${entry.createdAt}:${entry.text}:${index}`);
  const duration = 52 + (seed % 28);
  const delay = (seed % 24) * 0.45;
  const rtl = seed % 2 === 0;
  float.style.setProperty('--guestbook-float-duration', `${duration}s`);
  float.style.setProperty('--guestbook-float-delay', `${delay}s`);
  if (rtl) float.dataset.direction = 'rtl';
  else float.dataset.direction = 'ltr';

  const text = document.createElement('p');
  text.className = 'guestbook-desktop__entry-text specimen-text';
  text.textContent = entry.text;

  float.append(text);
  wrap.append(float);
  return wrap;
}

function renderEntries(entries: GuestbookEntry[], filterFontId: string | null) {
  const root = document.querySelector<HTMLElement>('[data-guestbook-desktop-entries]');
  if (!root) return;

  root.replaceChildren();
  const list = filterFontId ? entries.filter((e) => e.fontId === filterFontId) : entries;

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'guestbook-desktop__empty specimen-text';
    if (filterFontId) {
      empty.dataset.fontId = filterFontId;
      empty.textContent = '이 서체로 남긴 방명이 아직 없습니다.';
    } else {
      empty.textContent = '아직 남겨진 방명이 없습니다.';
    }
    root.append(empty);
    return;
  }

  list.forEach((entry, index) => {
    root.append(renderEntry(entry, index));
  });
}

async function loadAndRender(filterFontId: string | null) {
  try {
    const entries = await readGuestbookEntries();
    renderEntries(entries, filterFontId);
  } catch {
    const root = document.querySelector('[data-guestbook-desktop-entries]');
    if (!root) return;
    root.replaceChildren();
    const err = document.createElement('p');
    err.className = 'guestbook-desktop__empty';
    err.textContent = '방명록을 불러오지 못했습니다.';
    root.append(err);
  }
}

function initFontFilter() {
  const highlightFontId = readHighlightFontId();
  let filterFontId: string | null = highlightFontId;
  setActiveFont(filterFontId);

  document.querySelectorAll<HTMLButtonElement>('[data-guestbook-desktop-font]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.fontId;
      if (!id) return;
      filterFontId = filterFontId === id ? null : id;
      setActiveFont(filterFontId);
      void loadAndRender(filterFontId);
    });
  });

  void loadAndRender(filterFontId);
}

async function initGuestbookDesktop() {
  const root = document.querySelector<HTMLElement>('[data-guestbook-desktop]');
  const canvas = document.querySelector<HTMLElement>('.guestbook-desktop__canvas');
  const partition = document.querySelector<HTMLElement>('[data-guestbook-desktop-partition]');
  const right = document.querySelector<HTMLElement>('[data-guestbook-desktop-right]');
  if (!root || !canvas || !partition || !right) return;

  initFontFilter();

  const skipAnim = consumeSkipEnterAnim();
  root.classList.add('is-ready');

  if (!skipAnim) {
    root.classList.add('is-entering');
    await playGuestbookPartitionCloseOnCanvas(canvas, right);
    root.classList.remove('is-entering');
  }
}

whenWebLayout(() => {
  void initGuestbookDesktop();
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted && isWebLayout()) {
    void loadAndRender(readHighlightFontId());
  }
});
