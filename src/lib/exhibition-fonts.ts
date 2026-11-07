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
};

/**
 * Mobile detail hero — extra caption `margin-top` offset vs 어스름 (inline headline flow).
 * Desktop uses grid row gap; deltas are injected only under `html:not([data-viewport='web'])`.
 */
export const EXHIBITION_DETAIL_CAPTION_GAP_DELTA: Partial<Record<string, string>> = {
  byeokjomok: 'calc(-8.5 * var(--vf))',
  doldol: 'calc(-4 * var(--vf))',
};

export function exhibitionGlyphsScale(fontId: string): number {
  return EXHIBITION_GLYPHS_SCALE[fontId] ?? 1;
}

export function exhibitionDetailTitleComp(fontId: string): ExhibitionDetailTitleComp | null {
  return EXHIBITION_DETAIL_TITLE_COMP[fontId] ?? null;
}

export function exhibitionDetailCaptionGapDelta(fontId: string): string | null {
  return EXHIBITION_DETAIL_CAPTION_GAP_DELTA[fontId] ?? null;
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
  return `'${entry.family}', '${EXHIBITION_BLANK_FAMILY}'`;
}

/** @font-face blocks + detail / list / guestbook preview bindings. */
export function exhibitionFontFaceCss(baseUrl: string): string {
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
      faces.push(`@font-face {
  font-family: '${entry.family}';
  src: url('${url}') format('woff2');
  font-weight: ${face.weight};
  font-style: normal;
  font-display: block;
}`);
    }

    const family = exhibitionFontFamily(id)!;
    apply.push(`body.page-detail.page-font-${id} {
  --font-specimen: ${family};
}`);
    apply.push(`.font-list-item[data-font-id='${id}'] .font-list-item__preview,
.guestbook-entry[data-font-id='${id}'] .font-list-item__preview {
  font-family: ${family};
}`);

    const glyphScale = exhibitionGlyphsScale(id);
    if (glyphScale !== 1) {
      apply.push(`.font-list-item:not(.guestbook-entry)[data-font-id='${id}'] {
  --exhibition-glyphs-scale: ${glyphScale};
}`);
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
        `html:not([data-viewport='web']) body.page-detail.page-font-${id} {\n  --detail-caption-gap-delta: ${captionGapDelta};\n}`,
      );
    }
  }

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
