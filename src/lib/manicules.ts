/** Main list: designer manicule PNGs under public/assets/manicule/{fontId}.png */
import { EXHIBITION_FONT_IDS } from './exhibition-fonts';

const MANICULE_FONT_IDS = new Set<string>(EXHIBITION_FONT_IDS);

export function maniculeImagePath(fontId: string): string | null {
  if (!MANICULE_FONT_IDS.has(fontId)) return null;
  return `assets/manicule/${fontId}.png`;
}
