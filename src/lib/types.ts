export interface FontEntry {
  id: string;
  name: string;
  designer: string;
  instagram: string;
  caption: string;
  /** Detail specimen default leading (slider %, 185 = line-height 1.85). */
  specimenLeading?: number;
}

export interface FontsData {
  specimenFontFile: string;
  cssFamily: string;
  fonts: FontEntry[];
}
