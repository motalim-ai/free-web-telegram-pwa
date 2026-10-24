"""Draws the demo store pictures (public/demo/*.svg): coffee bags, tools, category tiles and banners.
Run: python3 scripts/demo-art.py   (only needed if you change the drawings)."""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'demo'
OUT.mkdir(parents=True, exist_ok=True)
FONT = "font-family='Helvetica Neue, Helvetica, Arial, sans-serif'"


def svg(w, h, body, defs=''):
    return f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' width='{w}' height='{h}'><defs>{defs}</defs>{body}</svg>"


def shade(prefix):
    """Shared gradients: soft floor shadow and the cylindrical light on bags."""
    return f"""
    <radialGradient id='{prefix}sh' cx='50%' cy='50%' r='50%'><stop offset='0' stop-color='#000' stop-opacity='.28'/><stop offset='1' stop-color='#000' stop-opacity='0'/></radialGradient>
    <linearGradient id='{prefix}lt' x1='0' x2='1'><stop offset='0' stop-color='#000' stop-opacity='.28'/><stop offset='.18' stop-color='#fff' stop-opacity='.10'/><stop offset='.32' stop-color='#fff' stop-opacity='.22'/><stop offset='.55' stop-color='#fff' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.32'/></linearGradient>
    <linearGradient id='{prefix}bgv' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.35'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></linearGradient>"""


def bean(x, y, s, rot, color='#5b3520', line='#2c170c', opacity=1):
    return (f"<g transform='translate({x} {y}) rotate({rot}) scale({s})' opacity='{opacity}'>"
            f"<ellipse rx='20' ry='28' fill='{color}'/>"
            f"<ellipse rx='20' ry='28' fill='url(#beanhl)'/>"
            f"<path d='M2,-26 C-10,-10 12,8 -2,26' fill='none' stroke='{line}' stroke-width='4' stroke-linecap='round'/></g>")


BEAN_DEFS = "<radialGradient id='beanhl' cx='35%' cy='30%' r='70%'><stop offset='0' stop-color='#fff' stop-opacity='.35'/><stop offset='.6' stop-color='#fff' stop-opacity='0'/></radialGradient>"


def bag(cx, top, w, h, color, label, ink, origin, weight, pattern, p='b', seal=None):
    """A stand-up coffee pouch centred on cx. Returns SVG markup."""
    l, r = cx - w / 2, cx + w / 2
    bottom = top + h
    seal = seal or color
    flare = w * 0.05
    body = (f"M{l+10},{top+38} L{r-10},{top+38} Q{r},{top+38} {r+2},{top+50} L{r+flare},{bottom-22} "
            f"Q{r+flare+1},{bottom} {r+flare-22},{bottom} L{l-flare+22},{bottom} Q{l-flare-1},{bottom} {l-flare},{bottom-22} "
            f"L{l-2},{top+50} Q{l},{top+38} {l+10},{top+38} Z")
    teeth = ''.join(f"L{l + 4 + i * (w - 8) / 24 + (w - 8) / 48},{top - 6 if i % 2 == 0 else top} " for i in range(24))
    top_seal = f"M{l+4},{top+2} {teeth} L{r-4},{top+2} L{r-4},{top+44} L{l+4},{top+44} Z"
    lw, lh = w * 0.74, h * 0.46
    lx, ly = cx - lw / 2, top + h * 0.34
    pat = ''
    if pattern == 'flowers':
        for i, (fx, fy) in enumerate([(-0.3, 0.16), (0, 0.11), (0.3, 0.16)]):
            px, py = cx + fx * lw, ly + fy * lh
            pat += ''.join(f"<ellipse cx='{px}' cy='{py-11}' rx='6' ry='11' fill='{ink}' opacity='.75' transform='rotate({a} {px} {py})'/>" for a in range(0, 360, 60))
            pat += f"<circle cx='{px}' cy='{py}' r='5' fill='{color}'/>"
    elif pattern == 'mountains':
        pat = (f"<path d='M{lx+14},{ly+lh*0.27} L{lx+lw*0.32},{ly+lh*0.07} L{lx+lw*0.5},{ly+lh*0.2} L{lx+lw*0.68},{ly+lh*0.04} L{lx+lw-14},{ly+lh*0.27} Z' fill='{ink}' opacity='.8'/>"
               f"<circle cx='{lx+lw*0.72}' cy='{ly+lh*0.1}' r='9' fill='{color}' opacity='.9'/>")
    elif pattern == 'waves':
        for k in range(3):
            yy = ly + lh * (0.08 + k * 0.08)
            pat += f"<path d='M{lx+16},{yy} q{lw/8},-12 {lw/4},0 t{lw/4},0 t{lw/4},0 t{lw/4-32},0' fill='none' stroke='{ink}' stroke-width='4' opacity='.75'/>"
    elif pattern == 'stars':
        for fx, fy in [(-0.28, 0.12), (0, 0.1), (0.28, 0.12)]:
            px, py = cx + fx * lw, ly + fy * lh
            pat += f"<path d='M{px},{py-13} L{px+4},{py-4} L{px+13},{py} L{px+4},{py+4} L{px},{py+13} L{px-4},{py+4} L{px-13},{py} L{px-4},{py-4} Z' fill='{ink}'/>"
    elif pattern == 'cardamom':
        for fx, rot in [(-0.25, -30), (0, 0), (0.25, 30)]:
            px, py = cx + fx * lw, ly + lh * 0.14
            pat += f"<ellipse cx='{px}' cy='{py}' rx='9' ry='17' fill='{ink}' opacity='.8' transform='rotate({rot} {px} {py})'/><path d='M{px},{py-15} L{px},{py+15}' stroke='{color}' stroke-width='2' transform='rotate({rot} {px} {py})'/>"
    elif pattern == 'palm':
        px, py = cx, ly + lh * 0.2
        pat = f"<path d='M{px},{py+18} L{px},{py-6}' stroke='{ink}' stroke-width='5'/>" + ''.join(
            f"<path d='M{px},{py-6} q{dx*0.5},{-18} {dx},{-4}' fill='none' stroke='{ink}' stroke-width='5' stroke-linecap='round'/>" for dx in (-34, -20, 20, 34))
    size = min(30, lw / max(len(origin), 1) * 1.55)
    label_svg = (f"<rect x='{lx}' y='{ly}' width='{lw}' height='{lh}' rx='14' fill='{label}'/>{pat}"
                 f"<text x='{cx}' y='{ly+lh*0.47}' text-anchor='middle' {FONT} font-size='{size}' font-weight='800' letter-spacing='2' fill='{ink}'>{origin}</text>"
                 f"<line x1='{cx-lw*0.28}' x2='{cx+lw*0.28}' y1='{ly+lh*0.58}' y2='{ly+lh*0.58}' stroke='{ink}' stroke-width='2' opacity='.5'/>"
                 f"<text x='{cx}' y='{ly+lh*0.72}' text-anchor='middle' {FONT} font-size='13' font-weight='600' letter-spacing='4' fill='{ink}' opacity='.8'>BAYT ALBUN</text>"
                 f"<text x='{cx}' y='{ly+lh*0.88}' text-anchor='middle' {FONT} font-size='15' font-weight='700' fill='{ink}'>{weight}</text>")
    return (f"<ellipse cx='{cx}' cy='{bottom+4}' rx='{w*0.68}' ry='{w*0.08}' fill='url(#{p}sh)'/>"
            f"<path d='{body}' fill='{color}'/>"
            f"<path d='{body}' fill='url(#{p}lt)'/>"
            f"<path d='{top_seal}' fill='{seal}'/><path d='{top_seal}' fill='url(#{p}lt)'/>"
            f"<rect x='{l+4}' y='{top+40}' width='{w-8}' height='5' fill='#000' opacity='.18'/>"
            f"<circle cx='{cx}' cy='{top+h*0.18}' r='{w*0.045}' fill='#000' opacity='.18'/><circle cx='{cx}' cy='{top+h*0.18}' r='{w*0.028}' fill='#fff' opacity='.35'/>"
            f"{label_svg}")


def product(name, bg, art, extra_defs=''):
    body = (f"<rect width='800' height='800' fill='{bg}'/>"
            f"<rect width='800' height='800' fill='url(#pbgv)'/>{art}")
    (OUT / f'{name}.svg').write_text(svg(800, 800, body, shade('p') + BEAN_DEFS + extra_defs))


def scatter_beans(seed, n, box, color='#5b3520', opacity=1):
    import random
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    return ''.join(bean(rnd.uniform(x0, x1), rnd.uniform(y0, y1), rnd.uniform(0.7, 1.1), rnd.uniform(0, 360), color, opacity=opacity) for _ in range(n))


# ---------- Product bags ----------
BAGS = [
    ('bag-ethiopia', '#f6e7b8', '#f2c94c', '#fffaf0', '#7a4b12', 'ETHIOPIA', '250 g', 'flowers'),
    ('bag-colombia', '#dcebdc', '#2f7d4f', '#f3f7ef', '#1d4d31', 'COLOMBIA', '250 g', 'mountains'),
    ('bag-brazil', '#dce7f3', '#2b5aa0', '#f2f6fb', '#173763', 'BRAZIL', '250 g', 'waves'),
    ('bag-khawlani', '#efe1d2', '#7b4a2d', '#f8efe6', '#4a2814', 'KHAWLANI', '250 g', 'palm'),
]
for name, bg, color, label, ink, origin, weight, pattern in BAGS:
    art = scatter_beans(sum(map(ord, name)), 5, (130, 660, 670, 740)) + bag(400, 130, 340, 530, color, label, ink, origin, weight, pattern, 'p')
    product(name, bg, art)

# Espresso 1 kg: bigger, black and gold.
product('bag-espresso', '#e7e1d6',
        scatter_beans(7, 6, (110, 690, 690, 750)) + bag(400, 100, 390, 580, '#1f1b18', '#1f1b18', '#d6a84e', 'ESPRESSO', '1 kg', 'stars', 'p', seal='#2c2622'))
# Saudi blonde coffee with cardamom.
product('bag-saudi', '#f3ead8',
        bag(400, 130, 340, 530, '#e9d3a6', '#fbf5e9', '#8a5a1c', 'SAUDI BLEND', '500 g', 'cardamom', 'p', seal='#d8bb83'))

# Tasting bundle: three small bags.
bundle = ''.join(bag(cx, top, 190, 300, c, '#fffaf2', ink, o, '100 g', pat, 'p') for cx, top, c, ink, o, pat in [
    (230, 330, '#2f7d4f', '#1d4d31', 'COLOMBIA', 'mountains'),
    (570, 330, '#2b5aa0', '#173763', 'BRAZIL', 'waves'),
    (400, 280, '#f2c94c', '#7a4b12', 'ETHIOPIA', 'flowers')])
product('bundle-tasting', '#f4dfe0',
        "<rect x='120' y='600' width='560' height='22' rx='11' fill='#000' opacity='.06'/>" + bundle +
        "<path d='M380,262 q20,-40 40,0 q-20,10 -40,0 z' fill='#c0392b'/><path d='M400,262 l-26,40 M400,262 l26,40' stroke='#c0392b' stroke-width='10' stroke-linecap='round'/>")

# V60 ceramic dripper.
v60 = """
<ellipse cx='400' cy='650' rx='200' ry='26' fill='url(#psh)'/>
<path d='M250,560 h300 l-14,40 h-272 z' fill='#e9e4dc'/><path d='M250,560 h300 l-14,40 h-272 z' fill='url(#plt)'/>
<path d='M210,250 h380 l-120,300 h-140 z' fill='#fbfaf7'/><path d='M210,250 h380 l-120,300 h-140 z' fill='url(#plt)'/>
<ellipse cx='400' cy='250' rx='190' ry='34' fill='#efebe4'/><ellipse cx='400' cy='254' rx='162' ry='24' fill='#d9d2c6'/>
<path d='M300,300 l70,230 M350,300 l40,230 M450,300 l-40,230 M500,300 l-70,230' stroke='#000' stroke-opacity='.06' stroke-width='6'/>
<path d='M586,300 q90,10 70,90 q-14,50 -110,70' fill='none' stroke='#fbfaf7' stroke-width='34' stroke-linecap='round'/>
<path d='M586,300 q90,10 70,90 q-14,50 -110,70' fill='none' stroke='#000' stroke-opacity='.08' stroke-width='34' stroke-linecap='round'/>
"""
product('v60', '#d9e8ee', v60)

# Filters: a kraft box with paper cones peeking out.
filters = '''
<ellipse cx='400' cy='668' rx='240' ry='26' fill='url(#psh)'/>
<path d='M300,170 h200 l-70,260 h-60 z' fill='#fbf7ee' stroke='#e2d6bf' stroke-width='3' transform='rotate(-8 400 300)'/>
<path d='M330,150 h200 l-70,260 h-60 z' fill='#fffdf8' stroke='#e2d6bf' stroke-width='3' transform='rotate(6 430 280)'/>
<rect x='220' y='330' width='360' height='330' rx='12' fill='#c9a46b'/><rect x='220' y='330' width='360' height='330' rx='12' fill='url(#plt)'/>
<rect x='208' y='310' width='384' height='50' rx='10' fill='#b48e55'/>
<rect x='270' y='420' width='260' height='170' rx='10' fill='#fbf5e9'/>
<text x='400' y='488' text-anchor='middle' '''+ FONT +''' font-size='40' font-weight='800' letter-spacing='3' fill='#4a2814'>FILTERS</text>
<line x1='320' x2='480' y1='510' y2='510' stroke='#4a2814' stroke-width='2' opacity='.5'/>
<text x='400' y='552' text-anchor='middle' '''+ FONT +''' font-size='24' font-weight='700' fill='#4a2814'>V60 - 100 pcs</text>
'''
product('filters', '#ece6f3', filters)

# Hand grinder.
grinder = """
<ellipse cx='400' cy='672' rx='150' ry='22' fill='url(#psh)'/>
<rect x='300' y='330' width='200' height='330' rx='24' fill='#2b2b2e'/><rect x='300' y='330' width='200' height='330' rx='24' fill='url(#plt)'/>
<rect x='300' y='470' width='200' height='70' fill='#8a5a36'/><rect x='300' y='470' width='200' height='70' fill='url(#plt)'/>
<rect x='292' y='300' width='216' height='44' rx='14' fill='#3a3a3e'/><rect x='292' y='300' width='216' height='44' rx='14' fill='url(#plt)'/>
<rect x='390' y='200' width='20' height='104' rx='8' fill='#bfc3c8'/>
<path d='M400,206 h190' stroke='#bfc3c8' stroke-width='18' stroke-linecap='round'/>
<circle cx='590' cy='206' r='30' fill='#8a5a36'/><circle cx='590' cy='206' r='30' fill='url(#plt)'/>
<circle cx='400' cy='206' r='22' fill='#d9dce0'/>
"""
product('grinder', '#e6e6e2', grinder)

# Saudi dallah (coffee pot).
DALLAH = """
<linearGradient id='brass' x1='0' x2='1'><stop offset='0' stop-color='#8c6a2a'/><stop offset='.35' stop-color='#f3d27a'/><stop offset='.55' stop-color='#d9ae4e'/><stop offset='1' stop-color='#7a5a20'/></linearGradient>"""


def dallah(cx, base, s, p='p'):
    def T(x, y):
        return f"{cx + x * s},{base + y * s}"
    return (f"<ellipse cx='{cx}' cy='{base+6*s}' rx='{150*s}' ry='{20*s}' fill='url(#{p}sh)'/>"
            f"<path d='M{T(-120,0)} Q{T(-130,-150)} {T(-60,-210)} L{T(-40,-300)} Q{T(0,-320)} {T(40,-300)} L{T(60,-210)} Q{T(130,-150)} {T(120,0)} Z' fill='url(#brass)'/>"
            f"<path d='M{T(-40,-300)} Q{T(0,-380)} {T(40,-300)} Z' fill='url(#brass)'/>"
            f"<circle cx='{cx}' cy='{base-392*s}' r='{14*s}' fill='#d9ae4e'/><path d='M{T(0,-378)} L{T(0,-360)}' stroke='#8c6a2a' stroke-width='{6*s}'/>"
            f"<path d='M{T(-75,-150)} Q{T(-170,-210)} {T(-225,-330)} L{T(-200,-340)} Q{T(-150,-240)} {T(-70,-200)} Z' fill='url(#brass)'/>"
            f"<path d='M{T(80,-60)} Q{T(190,-90)} {T(150,-240)} Q{T(120,-300)} {T(48,-270)}' fill='none' stroke='#b08a3a' stroke-width='{16*s}' stroke-linecap='round'/>"
            f"<rect x='{cx-124*s}' y='{base-16*s}' width='{248*s}' height='{16*s}' rx='{8*s}' fill='#8c6a2a'/>"
            f"<path d='M{T(-118,-60)} Q{T(0,-40)} {T(118,-60)}' fill='none' stroke='#7a5a20' stroke-width='{4*s}' opacity='.6'/>")


product('dallah', '#f0e6d6', dallah(400, 640, 1.15), DALLAH)

# ---------- Category tiles ----------
def tile(name, bg, art, defs=''):
    (OUT / f'{name}.svg').write_text(svg(400, 400, f"<rect width='400' height='400' fill='{bg}'/>{art}", shade('p') + BEAN_DEFS + defs))


tile('cat-beans', '#efe3d3', ''.join(bean(x, y, 2.1, r) for x, y, r in [(150, 170, -30), (250, 150, 20), (200, 260, 70), (290, 260, -10), (120, 280, 40)]))
tile('cat-saudi', '#f3ead8', dallah(200, 340, 0.62), DALLAH)
tile('cat-tools', '#dfeaee', "<g transform='translate(-25 -55) scale(.56)'>" + v60 + "</g>")
tile('cat-gifts', '#f4dfe0', """
<ellipse cx='200' cy='330' rx='130' ry='16' fill='url(#psh)'/>
<rect x='90' y='170' width='220' height='160' rx='10' fill='#a3202b'/><rect x='90' y='170' width='220' height='160' rx='10' fill='url(#plt)'/>
<rect x='76' y='140' width='248' height='46' rx='10' fill='#c0392b'/>
<rect x='186' y='140' width='28' height='190' fill='#f2c94c'/>
<path d='M200,140 q-70,-70 -80,-10 q10,20 80,10 z M200,140 q70,-70 80,-10 q-10,20 -80,10 z' fill='#f2c94c'/>""")

# ---------- Banners (3:1; art sits in the left third so phones can crop to 2:1 and keep it) ----------
def banner(name, c1, c2, art, defs=''):
    defs += f"<linearGradient id='bg' x1='1' y1='0' x2='0' y2='1'><stop offset='0' stop-color='{c1}'/><stop offset='1' stop-color='{c2}'/></linearGradient>"
    body = f"<rect width='1500' height='500' fill='url(#bg)'/>{art}"
    (OUT / f'{name}.svg').write_text(svg(1500, 500, body, shade('p') + BEAN_DEFS + defs))


banner('banner-roast', '#0f5c4d', '#0a3d33',
       scatter_beans(3, 16, (20, 20, 760, 480), '#14775f', 0.5) +
       "<circle cx='280' cy='260' r='210' fill='#fff' opacity='.06'/>" + bag(280, 60, 240, 380, '#f2c94c', '#fffaf0', '#7a4b12', 'ETHIOPIA', '250 g', 'flowers', 'p'))
banner('banner-saudi', '#6b3f1f', '#3b2010',
       scatter_beans(11, 14, (20, 20, 760, 480), '#8a5530', 0.45) +
       "<circle cx='280' cy='250' r='215' fill='#f3d27a' opacity='.08'/>" + dallah(280, 450, 0.88), DALLAH)
banner('banner-gift', '#a3202b', '#5e0f17',
       scatter_beans(21, 14, (20, 20, 760, 480), '#c0392b', 0.4) +
       "<circle cx='290' cy='260' r='215' fill='#fff' opacity='.06'/><g transform='translate(-50 -130) scale(.85)'>" + bundle + "</g>")

print('wrote', len(list(OUT.glob('*.svg'))), 'files to', OUT)
