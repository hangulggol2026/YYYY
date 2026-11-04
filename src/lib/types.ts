export interface FontEntry {
  id: string;
  name: string;
  designer: string;
  instagram: string;
  caption: string;
}

export interface FontsData {
  specimenFontFile: string;
  cssFamily: string;
  fonts: FontEntry[];
}

export function getFontById(data: FontsData, id: string): FontEntry | undefined {
  return data.fonts.find((f) => f.id === id);
}
