import {
  EXHIBITION_BLANK_FAMILY,
  EXHIBITION_FONTS,
  exhibitionFontLoadDescriptors,
} from '../lib/exhibition-fonts';

const READY_CLASS = 'fonts-ready';

function pageFontIds(): string[] {
  const body = document.body;
  if (!body) return Object.keys(EXHIBITION_FONTS);

  // Detail: only the active specimen (+ blank handled separately)
  for (const cls of body.classList) {
    if (cls.startsWith('page-font-')) {
      const id = cls.slice('page-font-'.length);
      if (id in EXHIBITION_FONTS) return [id];
    }
  }

  // Main / guestbook list: every exhibition face
  if (body.classList.contains('page-detail')) {
    const fromInput = document.querySelector<HTMLElement>('[data-font-id]')?.dataset.fontId;
    if (fromInput && fromInput in EXHIBITION_FONTS) return [fromInput];
  }

  return Object.keys(EXHIBITION_FONTS);
}

function descriptorsForPage() {
  const all = exhibitionFontLoadDescriptors();
  const ids = new Set(pageFontIds());
  const families = new Set<string>();
  for (const id of ids) {
    const entry = EXHIBITION_FONTS[id];
    if (entry) families.add(entry.family);
  }
  // Always include blank fallback
  return all.filter(
    (d) => d.family === 'ExhibitionBlank' || families.has(d.family) || ids.size === Object.keys(EXHIBITION_FONTS).length,
  );
}

async function loadOne(family: string, weight: number) {
  const spec = `${weight} 48px "${family}"`;
  try {
    await document.fonts.load(spec);
  } catch {
    /* continue */
  }
  return document.fonts.check(spec);
}

async function loadExhibitionFonts() {
  if (!document.fonts?.load) {
    document.documentElement.classList.add(READY_CLASS);
    return;
  }

  const descriptors = descriptorsForPage();
  const blankDescriptors = descriptors.filter((d) => d.family === EXHIBITION_BLANK_FAMILY);
  const faceDescriptors = descriptors.filter((d) => d.family !== EXHIBITION_BLANK_FAMILY);

  for (const { family, weight } of blankDescriptors) {
    await loadOne(family, weight);
  }

  // Sequential for heavy faces (avoids decoding 여러 거대 CFF at once)
  for (const { family, weight } of faceDescriptors) {
    await loadOne(family, weight);
  }

  await document.fonts.ready;
  document.documentElement.classList.add(READY_CLASS);
}

void loadExhibitionFonts();
