/** Exhibition faces under public/fonts/exhibition — id → CSS family + woff2 file(s). */
export type ExhibitionFontFaceFile = { weight: number; file: string };

export type ExhibitionFontFace = {
  family: string;
  files: ExhibitionFontFaceFile[];
};

/** Invisible fallback so missing glyphs do not pull system fonts. */
export const EXHIBITION_BLANK_FAMILY = 'ExhibitionBlank';
export const EXHIBITION_BLANK_FILE = 'ExhibitionBlank.woff2';

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
  faces.push(`@font-face {
  font-family: '${EXHIBITION_BLANK_FAMILY}';
  src: url('${blankUrl}') format('woff2');
  font-style: normal;
  font-weight: 400;
  font-display: block;
}`);

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
  }

  return `${faces.join('\n')}\n${apply.join('\n')}`;
}

/** CSS font shorthand list for document.fonts.load (family + weights). */
export function exhibitionFontLoadDescriptors(): { family: string; weight: number }[] {
  const list: { family: string; weight: number }[] = [
    { family: EXHIBITION_BLANK_FAMILY, weight: 400 },
  ];
  for (const entry of Object.values(EXHIBITION_FONTS)) {
    for (const face of entry.files) {
      list.push({ family: entry.family, weight: face.weight });
    }
  }
  return list;
}
