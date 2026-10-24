"""Draws a simple identity for the app: a coloured tile with a white symbol.

    python3 scripts/brand-art.py --color "#0f5c4d" --glyph bag
    node scripts/pwa-icons.mjs

Writes public/brand/mark.svg (store logo), public/favicon.svg (browser tab) and the app-icon sources
public/brand/icon-any.svg + icon-maskable.svg, which pwa-icons.mjs turns into the PNGs phones need.
If the user has a real logo, put it in public/brand instead and point settings.logo_key at it.
"""
import argparse
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public'

# White line symbols on a 24-unit grid; pick the one closest to the idea.
GLYPHS = {
    'bag': "<path d='M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z'/><path d='M9 8V7a3 3 0 0 1 6 0v1'/>",
    'cup': "<path d='M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z'/><path d='M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M11 3v3'/>",
    'calendar': "<rect x='4' y='5' width='16' height='15' rx='2'/><path d='M4 10h16M9 3v4M15 3v4'/>",
    'book': "<path d='M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z'/><path d='M5 17a3 3 0 0 1 3-3h9'/>",
    'star': "<path d='M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 16.6l-5.4 3 1.2-6.1-4.5-4.2 6.1-.7z'/>",
    'chat': "<path d='M5 5h14v10H10l-5 4z'/>",
    'heart': "<path d='M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'/>",
}


def tile(color, glyph, glyph_share, radius):
    """A square tile of the brand colour with the symbol centred, `glyph_share` of its width."""
    scale = 100 * glyph_share / 24
    offset = 50 - 12 * scale
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='512' height='512'>"
            f"<rect width='100' height='100' rx='{radius}' fill='{color}'/>"
            f"<g transform='translate({offset} {offset}) scale({scale})' fill='none' stroke='#fff' stroke-width='2' "
            f"stroke-linecap='round' stroke-linejoin='round'>{GLYPHS[glyph]}</g></svg>")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--color', default='#0f5c4d', help='brand colour, e.g. "#0f5c4d"')
    parser.add_argument('--glyph', default='bag', choices=sorted(GLYPHS))
    args = parser.parse_args()

    (OUT / 'brand').mkdir(parents=True, exist_ok=True)
    (OUT / 'brand' / 'mark.svg').write_text(tile(args.color, args.glyph, 0.6, 22))
    (OUT / 'favicon.svg').write_text(tile(args.color, args.glyph, 0.62, 22))
    # Phones round or crop app icons themselves, so these are full squares; maskable keeps a wider margin.
    (OUT / 'brand' / 'icon-any.svg').write_text(tile(args.color, args.glyph, 0.58, 0))
    (OUT / 'brand' / 'icon-maskable.svg').write_text(tile(args.color, args.glyph, 0.46, 0))
    print(f'wrote mark.svg, favicon.svg and app-icon sources ({args.glyph}, {args.color}). Next: node scripts/pwa-icons.mjs')


if __name__ == '__main__':
    main()
