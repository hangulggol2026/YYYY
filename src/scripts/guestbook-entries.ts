import { readGuestbookEntries } from '../lib/guestbook-storage';

function renderEntries() {
  const root = document.querySelector('[data-guestbook-entries]');
  if (!root) return;

  const entries = readGuestbookEntries().sort((a, b) => b.createdAt - a.createdAt);
  root.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'guestbook-entries__empty';
    empty.textContent = '아직 남겨진 방명이 없습니다.';
    root.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const article = document.createElement('article');
    article.className = 'font-list-item guestbook-entry';
    article.dataset.fontId = entry.fontId;

    const carousel = document.createElement('div');
    carousel.className = 'font-list-item__carousel';
    carousel.setAttribute('aria-label', entry.text);

    const track = document.createElement('div');
    track.className = 'font-list-item__carousel-track';

    for (let i = 0; i < 2; i += 1) {
      const span = document.createElement('span');
      span.className = 'font-list-item__preview specimen-text';
      span.textContent = entry.text;
      if (i === 1) span.setAttribute('aria-hidden', 'true');
      track.append(span);
    }

    carousel.append(track);
    article.append(carousel);

    const rule = document.createElement('hr');
    rule.className = 'font-list-item__rule';
    article.append(rule);

    root.append(article);
  });
}

renderEntries();

window.addEventListener('pageshow', (event) => {
  if (event.persisted) renderEntries();
});
