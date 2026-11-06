#!/usr/bin/env python3
"""Convert Fonts/*.otf → public/fonts/exhibition/*.woff2 (+ ExhibitionBlank).

Large CFF sources are subroutinized so browser-decoded SFNT stays ~2MB, not 14–21MB.
"""
from __future__ import annotations

from pathlib import Path

import cffsubr
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "Fonts"
EXHIBITION = ROOT / "public" / "fonts" / "exhibition"

# Source filename in Fonts/ → public id (matches exhibition-fonts.ts)
SOURCE_MAP: dict[str, str] = {
    "OneAndAQuarter-Regular.otf": "ilgwasa",
    "nori-Regular.otf": "nori",
    "mangul-Regular.otf": "mangul",
    "Bunhaeneung_Regular.otf": "gamtu",
    "Hapum-Regular.otf": "yawp",
    "허당_박혜원-Regular.otf": "heodang",
    "Eoseureum-Regular.otf": "eoseureum",
    "doldol-Regular.otf": "doldol",
    "dragonfly-Regular.otf": "jamjari",
    "ulmeok-Regular.otf": "ulmeok",
    "GuGu-Regular.otf": "bidul",
    "Byeokjomok-Regular.otf": "byeokjomok",
    "Haetsal_Regular.otf": "haetsal",
    "Seonyu-Regular.otf": "seonyu",
    "popcorn-Regular.otf": "popcorn",
    "seopung-Regular.otf": "seopung",
    "seopung-Medium.otf": "seopung-medium",
}


def empty_glyph():
    return TTGlyphPen(None).glyph()


def build_blank_woff2(out: Path) -> None:
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder([".notdef", "blank"])
    blank = empty_glyph()
    fb.setupGlyf({".notdef": blank, "blank": blank})
    metrics = {".notdef": (500, 0), "blank": (500, 0)}
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    cmap: dict[int, str] = {}
    for start, end in (
        (0x20, 0x7E),
        (0xA0, 0xFF),
        (0x1100, 0x11FF),
        (0x3000, 0x303F),
        (0x3130, 0x318F),
        (0xAC00, 0xD7A3),
        (0xFF00, 0xFFEF),
    ):
        for cp in range(start, end + 1):
            cmap[cp] = "blank"
    fb.setupCharacterMap(cmap)
    fb.setupNameTable(
        {
            "familyName": "ExhibitionBlank",
            "styleName": "Regular",
            "uniqueFontIdentifier": "ExhibitionBlank-Regular",
            "fullName": "ExhibitionBlank Regular",
            "psName": "ExhibitionBlank-Regular",
            "version": "Version 1.000",
        }
    )
    fb.setupOS2(sTypoAscender=800, usWinAscent=800, usWinDescent=200)
    fb.setupPost()
    font = fb.font
    font.flavor = "woff2"
    out.parent.mkdir(parents=True, exist_ok=True)
    font.save(out)
    print(f"wrote {out.name} ({out.stat().st_size} bytes)")


def convert_otf(src: Path, dst: Path) -> None:
    font = TTFont(src, recalcBBoxes=False, recalcTimestamp=False)
    cff_before = len(font.getTableData("CFF ")) if "CFF " in font else 0
    if "CFF " in font and cff_before > 1_500_000:
        cffsubr.subroutinize(font)
        cff_after = len(font.getTableData("CFF "))
        print(f"  subroutinize CFF {cff_before:,} → {cff_after:,}")
    font.flavor = "woff2"
    dst.parent.mkdir(parents=True, exist_ok=True)
    font.save(dst)
    font.close()
    print(f"{src.name} → {dst.name} ({src.stat().st_size:,} → {dst.stat().st_size:,})")


def main() -> None:
    EXHIBITION.mkdir(parents=True, exist_ok=True)
    build_blank_woff2(EXHIBITION / "ExhibitionBlank.woff2")

    for src_name, out_id in SOURCE_MAP.items():
        src = SRC_DIR / src_name
        if not src.exists():
            print(f"skip missing {src_name}")
            continue
        convert_otf(src, EXHIBITION / f"{out_id}.woff2")

    # Remove stale otf in exhibition dir if any
    for otf in EXHIBITION.glob("*.otf"):
        otf.unlink()
        print(f"removed {otf.name}")


if __name__ == "__main__":
    main()
