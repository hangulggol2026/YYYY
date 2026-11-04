/** Fonts with files under public/fonts/exhibition (others fall back to UI / default specimen). */
export const EXHIBITION_FONT_IDS = ['seopung', 'seonyu'] as const;

export type ExhibitionFontId = (typeof EXHIBITION_FONT_IDS)[number];

const FAMILY: Record<ExhibitionFontId, string> = {
  seopung: 'Seopung',
  seonyu: 'Seonyu',
};

export function isExhibitionFontId(fontId: string): fontId is ExhibitionFontId {
  return (EXHIBITION_FONT_IDS as readonly string[]).includes(fontId);
}

export function exhibitionFontFamily(fontId: string): string | null {
  if (!isExhibitionFontId(fontId)) return null;
  return `'${FAMILY[fontId]}', serif`;
}

export function exhibitionFontFaceCss(baseUrl: string): string {
  const seopungRegular = `${baseUrl}fonts/exhibition/seopung-Regular.otf`;
  const seopungMedium = `${baseUrl}fonts/exhibition/seopung-Medium.otf`;
  const seonyuRegular = `${baseUrl}fonts/exhibition/seonyu-Regular.otf`;

  return `@font-face {
  font-family: 'Seopung';
  src: url('${seopungRegular}') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Seopung';
  src: url('${seopungMedium}') format('opentype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Seonyu';
  src: url('${seonyuRegular}') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`;
}
