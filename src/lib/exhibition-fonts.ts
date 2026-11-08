import { EXHIBITION_FACE_UNICODE_RANGES } from './exhibition-font-unicode-ranges.generated';

/** Exhibition faces under public/fonts/exhibition — id → CSS family + woff2 file(s). */
export type ExhibitionFontFaceFile = { weight: number; file: string };

export type ExhibitionFontFace = {
  family: string;
  files: ExhibitionFontFaceFile[];
};

/** Invisible fallback so missing glyphs do not pull system fonts. */
export const EXHIBITION_BLANK_FAMILY = 'ExhibitionBlank';
export const EXHIBITION_BLANK_FILE = 'ExhibitionBlank.woff2';

/** Blank face matches medium specimen weight (서풍). */
const EXHIBITION_BLANK_WEIGHTS = [400, 500] as const;

/**
 * Main list marquee only — compensate ink that extends beyond the em box at the same CSS font-size.
 * 1 = no change.
 */
export const EXHIBITION_GLYPHS_SCALE: Partial<Record<string, number>> = {
  byeokjomok: 0.5,
  popcorn: 0.88,
  ulmeok: 0.92,
};

/** 방명록 서체 드롭다운·트리거 — 잉크가 작게 보이는 face만 미세 확대 (1 = 동일). */
export const EXHIBITION_GUESTBOOK_UI_GLYPHS_SCALE: Partial<Record<string, number>> = {
  haetsal: 1.14,
  jamjari: 1.12,
};

/**
 * Detail hero title compensation (ink / OS² metrics vs peers at --detail-title-size).
 * `scale` ≈ median peer ink height ÷ this face’s title ink height (e.g. 벽조목 ≈ 0.88/1.71).
 */
export type ExhibitionDetailTitleComp = {
  scale: number;
  lineHeight?: number;
  padBlock?: string;
};

export const EXHIBITION_DETAIL_TITLE_COMP: Partial<Record<string, ExhibitionDetailTitleComp>> = {
  byeokjomok: {
    scale: 0.52,
    lineHeight: 1,
    padBlock: 'calc(10 * var(--vf))',
  },
  ilgwasa: {
    scale: 0.62,
    lineHeight: 1.05,
  },
  gamtu: {
    scale: 0.72,
    lineHeight: 1.05,
  },
};

/**
 * Mobile detail hero — extra caption `margin-top` offset vs 어스름 (inline headline flow).
 * Per-face caption offset vs 어스름; applied on all viewports when set.
 */
export const EXHIBITION_DETAIL_CAPTION_GAP_DELTA: Partial<Record<string, string>> = {
  byeokjomok: 'calc(-8.5 * var(--vf))',
  doldol: 'calc(-4 * var(--vf))',
};

export function exhibitionGlyphsScale(fontId: string): number {
  return EXHIBITION_GLYPHS_SCALE[fontId] ?? 1;
}

export function exhibitionGuestbookUiGlyphsScale(fontId: string): number {
  return EXHIBITION_GUESTBOOK_UI_GLYPHS_SCALE[fontId] ?? 1;
}

export function exhibitionDetailTitleComp(fontId: string): ExhibitionDetailTitleComp | null {
  return EXHIBITION_DETAIL_TITLE_COMP[fontId] ?? null;
}

export function exhibitionDetailCaptionGapDelta(fontId: string): string | null {
  return EXHIBITION_DETAIL_CAPTION_GAP_DELTA[fontId] ?? null;
}

const UNICODE_RANGE_MAX = 0x10ffff;

function parseUnicodeRangeList(css: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const part of css.split(',')) {
    const token = part.trim();
    if (!token.toUpperCase().startsWith('U+')) continue;
    const body = token.slice(2);
    const dash = body.indexOf('-');
    if (dash === -1) {
      const cp = Number.parseInt(body, 16);
      if (!Number.isNaN(cp)) ranges.push([cp, cp]);
    } else {
      const start = Number.parseInt(body.slice(0, dash), 16);
      const end = Number.parseInt(body.slice(dash + 1), 16);
      if (!Number.isNaN(start) && !Number.isNaN(end)) ranges.push([start, end]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

function formatCodepoint(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

export type ExhibitionFontFaceCssOptions = {
  /**
   * Safari / WebKit: skip unicode-range splitting + blank twin faces (glyph matching + long ranges).
   */
  compactForWebKit?: boolean;
};

/** Blank fallback face must not overlap primary unicode-range (WebKit textarea doubles glyphs otherwise). */
function complementUnicodeRange(primaryCss: string | undefined): string | null {
  if (!primaryCss) return null;
  const primary = parseUnicodeRangeList(primaryCss);
  if (primary.length === 0) return null;

  const gaps: Array<[number, number]> = [];
  let cursor = 0;
  for (const [start, end] of primary) {
    if (cursor < start) gaps.push([cursor, start - 1]);
    cursor = Math.max(cursor, end + 1);
  }
  if (cursor <= UNICODE_RANGE_MAX) gaps.push([cursor, UNICODE_RANGE_MAX]);
  if (gaps.length === 0) return null;

  return gaps
    .map(([start, end]) =>
      start === end ? formatCodepoint(start) : `${formatCodepoint(start)}-${formatCodepoint(end)}`,
    )
    .join(', ');
}

export const EXHIBITION_FONTS: Record<string, ExhibitionFontFace> = {
  ilgwasa: { family: 'Ilgwasa', files: [{ weight: 400, file: 'ilgwasa.woff2' }] },
  nori: { family: 'Nori', files: [{ weight: 400, file: 'nori.woff2' }] },
  mangul: { family: 'Mangul', files: [{ weight: 400, file: 'mangul.woff2' }] },
  gamtu: { family: 'Bunhaeneung', files: [{ weight: 400, file: 'gamtu.woff2' }] },
  yawp: { family: 'Hapum', files: [{ weight: 400, file: 'yawp.woff2' }] },
  heodang: { family: 'Heodang', files: [{ weight: 400, file: 'heodang.woff2' }] },
  eoseureum: { family: 'Eoseureum', files: [{ weight: 400, file: 'eoseureum.woff2' }] },
  doldol: { family: 'Doldol', files: [{ weight: 400, file: 'doldol.woff2' }] },
  jamjari: { family: 'Jamjari', files: [{ weight: 400, file: 'jamjari.woff2' }] },
  ulmeok: { family: 'Ulmeok', files: [{ weight: 400, file: 'ulmeok.woff2' }] },
  bidul: { family: 'Bidul', files: [{ weight: 400, file: 'bidul.woff2' }] },
  byeokjomok: { family: 'Byeokjomok', files: [{ weight: 400, file: 'byeokjomok.woff2' }] },
  haetsal: { family: 'Haetsal', files: [{ weight: 400, file: 'haetsal.woff2' }] },
  seonyu: { family: 'Seonyu', files: [{ weight: 400, file: 'seonyu.woff2' }] },
  popcorn: { family: 'Popcorn', files: [{ weight: 400, file: 'popcorn.woff2' }] },
  seopung: {
    family: 'Seopung',
    files: [
      { weight: 400, file: 'seopung.woff2' },
      { weight: 500, file: 'seopung-medium.woff2' },
    ],
  },
};

export const EXHIBITION_FONT_IDS = Object.keys(EXHIBITION_FONTS) as readonly string[];

export type ExhibitionFontId = keyof typeof EXHIBITION_FONTS;

export function isExhibitionFontId(fontId: string): fontId is ExhibitionFontId {
  return fontId in EXHIBITION_FONTS;
}

export function exhibitionFontFamily(fontId: string): string | null {
  const entry = EXHIBITION_FONTS[fontId];
  if (!entry) return null;
  /* Missing glyphs use Blank via a second @font-face on the same family (no system fallback). */
  return `'${entry.family}'`;
}

/** @font-face blocks + detail / list / guestbook preview bindings. */
export function exhibitionFontFaceCss(baseUrl: string, options: ExhibitionFontFaceCssOptions = {}): string {
  const compact = options.compactForWebKit === true;
  const faces: string[] = [];
  const apply: string[] = [];

  const blankUrl = `${baseUrl}fonts/exhibition/${EXHIBITION_BLANK_FILE}`;
  for (const weight of EXHIBITION_BLANK_WEIGHTS) {
    faces.push(`@font-face {
  font-family: '${EXHIBITION_BLANK_FAMILY}';
  src: url('${blankUrl}') format('woff2');
  font-style: normal;
  font-weight: ${weight};
  font-display: block;
}`);
  }

  for (const [id, entry] of Object.entries(EXHIBITION_FONTS)) {
    for (const face of entry.files) {
      const url = `${baseUrl}fonts/exhibition/${face.file}`;
      const unicodeRange = EXHIBITION_FACE_UNICODE_RANGES[face.file];
      const rangeLine = !compact && unicodeRange ? `\n  unicode-range: ${unicodeRange};` : '';
      faces.push(`@font-face {
  font-family: '${entry.family}';
  src: url('${url}') format('woff2');
  font-weight: ${face.weight};
  font-style: normal;
  font-display: block;${rangeLine}
}`);
      if (!compact) {
        const blankRange = complementUnicodeRange(unicodeRange);
        const blankRangeLine = blankRange ? `\n  unicode-range: ${blankRange};` : '';
        faces.push(`@font-face {
  font-family: '${entry.family}';
  src: url('${blankUrl}') format('woff2');
  font-weight: ${face.weight};
  font-style: normal;
  font-display: block;${blankRangeLine}
}`);
      }
    }

    const family = exhibitionFontFamily(id)!;
    apply.push(`body.page-detail.page-font-${id} {
  --font-specimen: ${family};
}`);
    apply.push(`.font-list-item[data-font-id='${id}'] .font-list-item__preview,
.guestbook-entry[data-font-id='${id}'] .font-list-item__preview,
.guestbook-desktop__font-cell[data-font-id='${id}'] .guestbook-desktop__font-label,
.guestbook-desktop__empty[data-font-id='${id}'],
.guestbook-desktop__entry[data-font-id='${id}'] .guestbook-desktop__entry-text {
  font-family: ${family};
}`);
    apply.push(
      `.guestbook-font-picker__option[data-font-id='${id}'] .guestbook-font-picker__option-btn,
[data-viewport='web'] .main-desktop-guestbook .guestbook-font-picker__option[data-font-id='${id}'] .guestbook-font-picker__option-btn {
  font-family: ${family};
}`,
      `.guestbook-font-picker[data-selected-font='${id}'] [data-guestbook-font-label-text] {
  font-family: ${family};
}`,
      `.guestbook-panel__grid:has(.guestbook-font-picker[data-selected-font='${id}']) .guestbook-panel__input,
[data-viewport='web'] .main-desktop-guestbook__form:has(.guestbook-font-picker[data-selected-font='${id}']) .main-desktop-guestbook__input {
  font-family: ${family};
}`,
    );

    const glyphScale = exhibitionGlyphsScale(id);
    if (glyphScale !== 1) {
      apply.push(`.font-list-item:not(.guestbook-entry)[data-font-id='${id}'] {
  --exhibition-glyphs-scale: ${glyphScale};
}`);
    }

    const guestbookUiScale = exhibitionGuestbookUiGlyphsScale(id);
    if (guestbookUiScale !== 1) {
      apply.push(
        `.guestbook-font-picker__option[data-font-id='${id}'] .guestbook-font-picker__option-btn,
.guestbook-font-picker[data-selected-font='${id}'] [data-guestbook-font-label-text] {
  font-size: calc(54 * var(--vf) * ${guestbookUiScale});
}`,
        `[data-viewport='web'] .main-desktop-guestbook .guestbook-font-picker__option[data-font-id='${id}'] .guestbook-font-picker__option-btn,
[data-viewport='web'] .main-desktop-guestbook .guestbook-font-picker[data-selected-font='${id}'] .main-desktop-guestbook__trigger-label {
  font-size: calc(var(--dl-ui-type) * ${guestbookUiScale});
}`,
      );
    }

    const titleComp = exhibitionDetailTitleComp(id);
    if (titleComp) {
      const vars = [`  --detail-title-scale: ${titleComp.scale};`];
      if (titleComp.lineHeight != null) {
        vars.push(`  --detail-title-line-height: ${titleComp.lineHeight};`);
      }
      if (titleComp.padBlock) {
        vars.push(`  --detail-title-pad-block: ${titleComp.padBlock};`);
      }
      apply.push(`body.page-detail.page-font-${id} {\n${vars.join('\n')}\n}`);
    }

    const captionGapDelta = exhibitionDetailCaptionGapDelta(id);
    if (captionGapDelta) {
      apply.push(
        `body.page-detail.page-font-${id} {\n  --detail-caption-gap-delta: ${captionGapDelta};\n}`,
      );
    }
  }

  apply.push(`.font-list-item__preview,
.guestbook-entry .font-list-item__preview,
.specimen-text,
.detail-hero__title,
.detail-desktop__title,
.detail-desktop__specimen,
.guestbook-font-picker__option-btn,
.guestbook-panel__input,
.main-desktop-guestbook__input,
.detail-specimen textarea,
[data-guestbook-font-label-text] {
  font-synthesis: none;
}`);

  return `${faces.join('\n')}\n${apply.join('\n')}`;
}

/** CSS font shorthand list for document.fonts.load (family + weights). */
export function exhibitionFontLoadDescriptors(): { family: string; weight: number }[] {
  const list: { family: string; weight: number }[] = EXHIBITION_BLANK_WEIGHTS.map((weight) => ({
    family: EXHIBITION_BLANK_FAMILY,
    weight,
  }));
  for (const entry of Object.values(EXHIBITION_FONTS)) {
    for (const face of entry.files) {
      list.push({ family: entry.family, weight: face.weight });
    }
  }
  return list;
}
