"""Lakay marks, round 2: (1) Kay, a house-shaped gem cut in facets on a dawn tile; (2) Boutik, a gingerbread storefront
under an arched doorway at dawn. Each in depth layers, day and night."""
import math, os
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "node_modules", "@fontsource").replace("\\", "/")

def lerp(a, b, t): return a + (b - a) * t
def hx(c): return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
def mix(c1, c2, t):
    a, b = hx(c1), hx(c2); return "#%02x%02x%02x" % tuple(int(round(lerp(a[i], b[i], max(0, min(1, t))))) for i in range(3))
def poly(pts): return "M" + "L".join("%.2f %.2f" % p for p in pts) + "Z"
def scale(pts, c, s): return [(c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s) for x, y in pts]
def lg(id_, stops, x2=0, y2=1, x1=0, y1=0):
    return '<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s">%s</linearGradient>' % (id_, x1, y1, x2, y2, "".join(
        '<stop offset="%s" stop-color="%s"%s/>' % (o, c, (' stop-opacity="%s"' % op) if op is not None else "") for o, c, op in stops))
def rg(id_, stops, cx=.5, cy=.5, r=.5):
    return '<radialGradient id="%s" cx="%s" cy="%s" r="%s">%s</radialGradient>' % (id_, cx, cy, r, "".join(
        '<stop offset="%s" stop-color="%s"%s/>' % (o, c, (' stop-opacity="%s"' % op) if op is not None else "") for o, c, op in stops))
SHADOW = '<filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.2"/><feOffset dx="2" dy="5"/><feComponentTransfer><feFuncA type="linear" slope=".38"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
SHADOW_S = '<filter id="shs" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.6"/><feOffset dx="1" dy="2.4"/><feComponentTransfer><feFuncA type="linear" slope=".34"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>'

GOLD = {"day": ("#fff0c2", "#f1c869", "#d09a3c", "#a26f22"), "night": ("#fff5d6", "#f6d482", "#dcaa50", "#aa7a2c")}
def goldg(id_, th, vertical=True):
    a, b, c, d = GOLD[th]
    return lg(id_, [(0, a, None), (.32, b, None), (.68, c, None), (.86, b, None), (1, d, None)], x2=0 if vertical else 1, y2=1 if vertical else 0)

# ======================= 1. KAY: the house-shaped gem =======================
HOUSE = [(200, 84), (296, 170), (282, 170), (282, 308), (118, 308), (118, 170), (104, 170)]
CEN = (200, 222)
LIGHT = (-.55, -.83)

def kay_layers(th):
    night = th == "night"
    gem_lo, gem_hi = ("#3a3f9c", "#d9dcff") if not night else ("#2c3088", "#dfe2ff")
    tile0, tile1, tile2 = ("#ffd2b4", "#e4dcf8", "#a9b2f0") if not night else ("#3a2c56", "#22244e", "#16173a")
    defs = "<defs>" + goldg("gd", th) + goldg("gdh", th, False) + SHADOW + SHADOW_S
    defs += lg("tile", [(0, tile2, None), (.55, tile1, None), (1, tile0, None)], x1=1, y1=0, x2=0, y2=1)
    defs += rg("tglow", [(0, "#fff3dd" if not night else "#ffcf8a", ".9" if not night else ".32"), (1, "#fff3dd", "0")], cx=.5, cy=.62, r=.55)
    defs += lg("spec", [(0, "#ffffff", ".95"), (.5, "#ffffff", "0")], x1=0, y1=0, x2=1, y2=1)
    defs += "</defs>"
    # --- layer 0: the tile (a soft squircle at dawn, its own engraved rays) ---
    R = 186
    sq = "M200 14C352 14 386 48 386 200C386 352 352 386 200 386C48 386 14 352 14 200C14 48 48 14 200 14Z"
    sq_in = "M200 28C340 28 372 60 372 200C372 340 340 372 200 372C60 372 28 340 28 200C28 60 60 28 200 28Z"
    rays = []
    for i in range(36):
        a = math.radians(i * 10 + 5)
        r0, r1 = 120, 176
        rays.append("M%.1f %.1fL%.1f %.1f" % (200 + r0 * math.cos(a), 214 + r0 * math.sin(a), 200 + r1 * math.cos(a), 214 + r1 * math.sin(a)))
    base = (defs + '<path d="%s" fill="url(#tile)"/>' % sq +
            '<path d="%s" fill="url(#tglow)"/>' % sq +
            '<clipPath id="tc"><path d="%s"/></clipPath><g clip-path="url(#tc)"><path d="%s" stroke="%s" stroke-opacity="%s" stroke-width="1.2"/></g>' % (
                sq_in, "".join(rays), "#ffffff" if not night else "#b8bdff", ".55" if not night else ".14") +
            '<path d="%s" fill="none" stroke="url(#gd)" stroke-width="2.6"/>' % sq_in +
            '<path d="%s" fill="none" stroke="%s" stroke-opacity=".5" stroke-width="1.5"/>' % (sq, "#ffffff" if not night else "#8f9cec"))
    # --- layer 1: the gold setting (a bezel following the house, with four claws) ---
    bez = scale(HOUSE, CEN, 1.075)
    claws = "".join('<circle cx="%.1f" cy="%.1f" r="6.5"/>' % p for p in [(200, 76), (112, 316), (288, 316), (96, 172), (304, 172)])
    setting = (defs + '<g filter="url(#sh)"><path d="%s" fill="url(#gd)"/>' % poly(bez) +
               '<g fill="url(#gd)">%s</g></g>' % claws +
               '<path d="%s" fill="none" stroke="%s" stroke-opacity=".6" stroke-width="1"/>' % (poly(bez), GOLD[th][3]) +
               '<path d="%s" fill="%s" opacity=".55"/>' % (poly(scale(HOUSE, CEN, 1.012)), GOLD[th][3]))
    # --- layer 2: the gem, step-cut: an outer row and an inner row of facets around a flat table ---
    tab = scale(HOUSE, CEN, .46)
    out = [defs]
    n = len(HOUSE)
    out.append(rg("tab", [(0, mix(gem_lo, gem_hi, .55), None), (1, mix(gem_lo, "#1a1c55", .35), None)], cx=.4, cy=.35, r=.8))
    for i in range(n):
        j = (i + 1) % n
        p1, p2, q2, q1 = HOUSE[i], HOUSE[j], tab[j], tab[i]
        m = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)          # the facet's ridge meets the outline here
        mq = ((q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2)
        dx, dy = p2[0] - p1[0], p2[1] - p1[1]; L = math.hypot(dx, dy) or 1
        nx, ny = dy / L, -dx / L
        lit = nx * LIGHT[0] + ny * LIGHT[1]
        base_t = .5 + .48 * lit
        # each side facet is cut into four triangles: two lit, two shaded, like a jewel's crown
        tris = [((p1, m, mq), base_t + .16), ((p1, mq, q1), base_t - .02), ((m, p2, q2), base_t - .14), ((m, q2, mq), base_t + .04)]
        for k, (tri, tt) in enumerate(tris):
            gid = "g%d_%d" % (i, k)
            out.append(lg(gid, [(0, mix(gem_lo, gem_hi, tt + .1), None), (1, mix(gem_lo, gem_hi, tt - .12), None)], x1=.5 - nx / 2, y1=.5 - ny / 2, x2=.5 + nx / 2, y2=.5 + ny / 2))
            out.append('<path d="%s" fill="url(#%s)"/>' % (poly(tri), gid))
        out.append('<path d="M%.2f %.2fL%.2f %.2fM%.2f %.2fL%.2f %.2f" stroke="#ffffff" stroke-opacity="%.2f" stroke-width=".9"/>' % (p1[0], p1[1], q1[0], q1[1], m[0], m[1], mq[0], mq[1], .25 + .35 * max(0, lit)))
    out.append('<path d="%s" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.2" stroke-linejoin="round"/>' % poly(HOUSE))
    out.append('<path d="%s" fill="url(#tab)" stroke="#ffffff" stroke-opacity=".75" stroke-width="1.1" stroke-linejoin="round"/>' % poly(tab))
    out.append('<path d="%s" fill="url(#spec)" opacity=".35"/>' % poly(tab))
    # glints: a bright edge on the lit roof, and two stars of light
    out.append('<path d="M200 86L106 170" stroke="#ffffff" stroke-opacity=".95" stroke-width="1.8" stroke-linecap="round"/>')
    out.append('<path d="M120 172L120 300" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round"/>')
    for (sx, sy, r) in ((150, 128, 9), (262, 286, 5.5)):
        k = r * .2
        out.append('<path d="M%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fZ" fill="#ffffff" opacity=".95"/>' % (
            sx, sy - r, sx + k, sy - k, sx + r, sy, sx + k, sy + k, sx, sy + r, sx - k, sy + k, sx - r, sy, sx - k, sy - k))
    gem = "".join(out)
    # --- layer 3: the gold sunrise set in the table, with a door-shaped light beneath ---
    sunr = 24
    sun = (defs + rg("sunf", [(0, GOLD[th][0], None), (.6, GOLD[th][1], None), (1, GOLD[th][2], None)], cx=.45, cy=.85, r=.95) +
           '<g filter="url(#shs)"><path d="M%.1f 258A%d %d 0 0 1 %.1f 258Z" fill="url(#sunf)"/>' % (200 - sunr, sunr, sunr, 200 + sunr) +
           "".join('<path d="M%.1f %.1fL%.1f %.1f" stroke="url(#gd)" stroke-width="3.6" stroke-linecap="round"/>' % (
               200 + 31 * math.cos(math.radians(a)), 258 + 31 * math.sin(math.radians(a)), 200 + 42 * math.cos(math.radians(a)), 258 + 42 * math.sin(math.radians(a)))
               for a in (-160, -130, -105, -75, -50, -20)) +
           '<path d="M170 266H230" stroke="url(#gdh)" stroke-width="3.8" stroke-linecap="round"/>' +
           '<path d="M182 275H218" stroke="url(#gdh)" stroke-width="3.2" stroke-linecap="round"/></g>' +
           '<path d="M182 255A18 18 0 0 1 200 237" fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>')
    return [("base", 0, base), ("setting", .06, setting), ("gem", .13, gem), ("sun", .22, sun)]

# ======================= 2. BOUTIK: the storefront under an arched doorway =======================
ARCH = "M70 372V172A130 130 0 0 1 330 172V372Z"
ARCH_IN = "M84 360V174A116 116 0 0 1 316 174V360Z"

def boutik_layers(th):
    night = th == "night"
    if not night:
        sky = [(0, "#aeb6f1", None), (.45, "#d9d5f6", None), (.72, "#ffd9bf", None), (1, "#ffe8cc", None)]
        mtn = ("#9aa2e6", "#b8bdf0", "#d1cff3")
        wall0, wall1, trim, trimd, roof0, roof1 = "#fffaf2", "#f3e6d4", "#6f78d8", "#4b50ad", "#7d86e2", "#4b50ad"
        inside0, inside1, palm0, palm1, step0, step1 = "#ffe2a0", "#e7a957", "#3f458f", "#2a2e6c", "#efe4d6", "#cdbba6"
        leaf, flower, pot = "#4f7f68", "#e8866a", "#c9774e"
    else:
        sky = [(0, "#0f1030", None), (.5, "#25275a", None), (.8, "#4a3a6e", None), (1, "#6a4a72", None)]
        mtn = ("#1c1e48", "#262958", "#31336a")
        wall0, wall1, trim, trimd, roof0, roof1 = "#cfc8de", "#a79fbd", "#8f9cec", "#5c63c6", "#5a62c8", "#2f3380"
        inside0, inside1, palm0, palm1, step0, step1 = "#ffe7a8", "#f0a94a", "#0c0d2a", "#06071c", "#8d86a6", "#6c6688"
        leaf, flower, pot = "#3c6655", "#e0876e", "#a2603f"
    d = "<defs>" + goldg("gd", th) + goldg("gdh", th, False) + SHADOW + SHADOW_S
    d += lg("sky", sky) + lg("wall", [(0, wall0, None), (1, wall1, None)]) + lg("roof", [(0, roof0, None), (1, roof1, None)])
    d += lg("trim", [(0, trim, None), (1, trimd, None)]) + lg("inside", [(0, inside0, None), (1, inside1, None)], x1=.5, y1=0, x2=.5, y2=1)
    d += lg("palm", [(0, palm0, None), (1, palm1, None)]) + lg("step", [(0, step0, None), (1, step1, None)])
    d += rg("sun", [(0, "#fff6dc" if not night else "#fff2c8", None), (.55, "#ffd890" if not night else "#f5e2b0", None), (1, "#f4b763" if not night else "#d9c08a", ".0")], r=.5)
    d += lg("spec", [(0, "#ffffff", ".9"), (1, "#ffffff", "0")]) + '<clipPath id="ai"><path d="%s"/></clipPath>' % ARCH_IN + "</defs>"
    # ---- layer 0: the arch, the dawn (or the night) sky, the sun, the mountains ----
    stars = "" if not night else "".join('<circle cx="%d" cy="%d" r="%.1f" fill="#ffffff" opacity="%.2f"/>' % (x, y, r, o) for x, y, r, o in
                                         ((120, 120, 1.2, .8), (150, 86, .9, .6), (262, 102, 1.3, .85), (290, 140, .9, .6), (230, 74, 1, .7), (176, 130, .8, .5), (106, 170, .8, .5)))
    sunc = '<circle cx="200" cy="232" r="96" fill="url(#sun)"/>' + ('<circle cx="200" cy="232" r="34" fill="#ffe7ad" opacity=".9"/>' if not night else
                                                                      '<circle cx="262" cy="96" r="13" fill="#fff4d6"/><circle cx="268" cy="92" r="11" fill="url(#sky)"/>')
    mountains = ('<path d="M84 272C104 258 116 246 132 250C150 240 160 226 178 232C196 236 204 246 220 240C238 232 252 230 270 240C290 246 300 250 316 246V310H84Z" fill="%s" opacity=".75"/>' % mtn[0] +
                 '<path d="M84 286C110 276 128 266 150 272C172 264 188 258 210 266C232 272 252 262 276 268C294 272 306 276 316 274V310H84Z" fill="%s"/>' % mtn[1] +
                 '<path d="M84 300C130 292 170 296 200 293C240 290 280 296 316 292V320H84Z" fill="%s"/>' % mtn[2] +
                 '<path d="M84 318H316V372H84Z" fill="%s"/>' % ("#f2dfc6" if not night else "#2a2347"))
    base = (d + '<g filter="url(#sh)"><path d="%s" fill="url(#trim)"/></g>' % ARCH +
            '<path d="%s" fill="none" stroke="#ffffff" stroke-opacity="%s" stroke-width="1.4"/>' % ("M73 370V172A127 127 0 0 1 327 172V370", ".55" if not night else ".2") +
            '<g clip-path="url(#ai)"><path d="%s" fill="url(#sky)"/>%s%s%s</g>' % (ARCH_IN, stars, sunc, mountains) +
            '<path d="%s" fill="none" stroke="url(#gd)" stroke-width="3"/>' % ARCH_IN)
    # keystone on the arch
    base += '<path d="M190 38H210L214 58H186Z" fill="url(#gd)"/><path d="M190 38H210L214 58H186Z" fill="none" stroke="%s" stroke-opacity=".6"/>' % GOLD[th][3]
    # ---- layer 1: two palms framing the shop ----
    def palm(x, y, h, lean):
        # a tapered, gently curved trunk with rings, and a crown of smooth two-tone fronds
        tx, ty = x + lean, y - h
        cx1, cy1 = x + lean * .15, y - h * .55
        def bez(t): return ((1 - t) ** 2 * x + 2 * (1 - t) * t * cx1 + t * t * tx, (1 - t) ** 2 * y + 2 * (1 - t) * t * cy1 + t * t * ty)
        L, R = [], []
        for k in range(13):
            t = k / 12.0; px, py = bez(t); w = lerp(6.5, 3.6, t)
            L.append((px - w, py)); R.append((px + w, py))
        trunk = poly(L + R[::-1])
        rings = "".join('<path d="M%.1f %.1fh%.1f" stroke="#ffffff" stroke-opacity=".28" stroke-width="1.1" stroke-linecap="round"/>' % (
            bez(t)[0] - lerp(6, 3.4, t), bez(t)[1], 2 * lerp(6, 3.4, t)) for t in (.12, .24, .36, .48, .6, .72, .84))
        fr, rib = [], []
        for ang, ln, dr in ((-178, 52, 26), (-152, 50, 16), (-124, 40, 6), (-95, 34, 0), (-66, 40, 6), (-36, 50, 16), (-8, 54, 26)):
            a_ = math.radians(ang)
            ex, ey = tx + ln * math.cos(a_), ty + ln * math.sin(a_) + dr
            mx, my = (tx + ex) / 2, (ty + ey) / 2
            nx, ny = -(ey - ty), (ex - tx); nl = math.hypot(nx, ny) or 1; nx, ny = nx / nl, ny / nl
            up = -12
            fr.append("M%.1f %.1fQ%.1f %.1f %.1f %.1fQ%.1f %.1f %.1f %.1fZ" % (tx, ty, mx + nx * 8, my + ny * 8 + up, ex, ey, mx - nx * 3, my - ny * 3 + up + 6, tx, ty))
            rib.append("M%.1f %.1fQ%.1f %.1f %.1f %.1f" % (tx, ty, mx + nx * 2, my + ny * 2 + up + 2, ex, ey))
        return ('<path d="%s" fill="url(#palm)"/>%s<path d="%s" fill="url(#palm)"/>' % (trunk, rings, "".join(fr)) +
                '<path d="%s" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="1"/>' % "".join(rib) +
                '<circle cx="%.1f" cy="%.1f" r="4" fill="url(#palm)"/>' % (tx, ty))
    palms = d + '<g clip-path="url(#ai)" filter="url(#shs)">' + palm(112, 330, 150, 14) + palm(290, 330, 138, -12) + "</g>"
    # ---- layer 2: the storefront ----
    sf = [d, '<g filter="url(#sh)">']
    # roof (tin, pitched) with gingerbread fretwork under the eaves
    sf.append('<path d="M118 196L200 132L282 196Z" fill="url(#roof)"/>')
    sf.append('<path d="M200 138V192M184 150V194M168 163V195M152 175V196M216 150V194M232 163V195M248 175V196" stroke="#ffffff" stroke-opacity=".22" stroke-width="1.4"/>')
    sf.append('<path d="M114 197L200 129L286 197" fill="none" stroke="url(#gd)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
    sf.append('<path d="M200 112L204 124L200 130L196 124Z" fill="url(#gd)"/>')
    # walls
    sf.append('<path d="M128 196H272V300H128Z" fill="url(#wall)"/>')
    sf.append('<path d="M128 196H272V203H128Z" fill="%s" opacity=".18"/>' % trimd)
    # fretwork band
    fret = "".join('<path d="M%.1f 198a5 5 0 0 0 10 0Z" fill="url(#gd)"/><circle cx="%.1f" cy="197.5" r="1.2" fill="%s"/>' % (130 + i * 10, 135 + i * 10, GOLD[th][3]) for i in range(14))
    sf.append(fret)
    # the sign
    sf.append('<rect x="160" y="208" width="80" height="20" rx="3" fill="url(#gd)"/><rect x="163" y="211" width="74" height="14" rx="2" fill="none" stroke="%s" stroke-opacity=".55"/>' % GOLD[th][3])
    sf.append('<text x="200" y="223" font-family="Cinzel" font-weight="700" font-size="12.5" letter-spacing="3" text-anchor="middle" fill="%s">LAKAY</text>' % ("#3d4299" if not night else "#2a2e78"))
    # awning, striped and scalloped
    aw = ['<clipPath id="awc"><path d="M138 232H262L268 248%s Z"/></clipPath>' % "".join("a%.2f 6 0 0 1 -%.2f 0" % (130 / 16.0, 130 / 8.0) for _ in range(8))]
    stripes = "".join('<rect x="%.1f" y="228" width="%.2f" height="30" fill="%s"/>' % (132 + i * 130 / 8.0, 130 / 16.0, "url(#trim)") for i in range(9))
    aw.append('<g clip-path="url(#awc)"><rect x="128" y="228" width="150" height="30" fill="%s"/>%s<rect x="128" y="228" width="150" height="30" fill="url(#spec)" opacity=".25"/></g>' % ("#fffaf2" if not night else "#ddd6ea", stripes))
    sf.append('<g filter="url(#shs)">%s</g>' % "".join(aw))
    sf.append('<path d="M136 232H264" stroke="url(#gdh)" stroke-width="3" stroke-linecap="round"/>')
    # windows with louvred shutters
    for x in (138, 242):
        sf.append('<rect x="%d" y="262" width="20" height="30" rx="2" fill="url(#trim)"/>' % x)
        sf.append("".join('<path d="M%d %.1fH%d" stroke="#ffffff" stroke-opacity=".45" stroke-width="1.3"/>' % (x + 3, 266 + k * 4.6, x + 17) for k in range(6)))
        sf.append('<rect x="%d" y="262" width="20" height="30" rx="2" fill="none" stroke="url(#gd)" stroke-width="1.6"/>' % x)
    # the open double doors and the warm room inside, with shelves of goods
    sf.append('<path d="M172 300V268A28 14 0 0 1 228 268V300Z" fill="url(#inside)"/>')
    for yy in (276, 288):
        sf.append('<path d="M176 %dH224" stroke="%s" stroke-opacity=".55" stroke-width="1.6"/>' % (yy, GOLD[th][3]))
    goods = []
    for k, xx in enumerate(range(179, 222, 6)):
        hgt = (7, 5, 8, 6, 7, 5, 8, 6)[k % 8]
        goods.append('<rect x="%d" y="%d" width="4" height="%d" rx="1" fill="%s"/>' % (xx, 276 - hgt, hgt, ("#6f78d8", "#e8866a", "#d09a3c", "#4f7f68")[k % 4]))
        goods.append('<rect x="%d" y="%d" width="4" height="%d" rx="1" fill="%s"/>' % (xx + 1, 288 - hgt + 1, hgt - 1, ("#d09a3c", "#6f78d8", "#4f7f68", "#e8866a")[k % 4]))
    sf.append("".join(goods))
    sf.append('<path d="M162 300V266L172 268V300Z" fill="url(#trim)"/><path d="M238 300V266L228 268V300Z" fill="url(#trim)"/>')
    sf.append('<path d="M172 300V268A28 14 0 0 1 228 268V300" fill="none" stroke="url(#gd)" stroke-width="2.2"/>')
    sf.append('</g>')
    store = "".join(sf)
    # ---- layer 3: the steps and the potted flowers in front ----
    fg = [d, '<g filter="url(#sh)">']
    fg.append('<path d="M150 300H250L256 312H144Z" fill="url(#step)"/><path d="M138 312H262L268 324H132Z" fill="url(#step)"/>')
    fg.append('<path d="M150 300H250M144 312H256" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.2"/>')
    for x in (126, 274):
        fg.append('<path d="M%d 300H%dL%d 324H%dZ" fill="%s"/>' % (x - 13, x + 13, x + 9, x - 9, pot))
        fg.append('<path d="M%d 300H%d" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/>' % (x - 13, x + 13))
        leaves = "".join('<path d="M%d 300Q%.1f %.1f %.1f %.1fQ%.1f %.1f %d 300Z" fill="%s"/>' % (
            x, x + dx * .4 - 4, 300 - dy * .7, x + dx, 300 - dy, x + dx * .6 + 4, 300 - dy * .3, x, leaf) for dx, dy in ((-18, 22), (-8, 30), (6, 31), (17, 22)))
        fg.append(leaves)
        fg.append("".join('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (x + dx, 300 - dy, r, flower) for dx, dy, r in ((-12, 24, 4.6), (4, 31, 5), (14, 20, 4.2))))
        fg.append("".join('<circle cx="%.1f" cy="%.1f" r="1.4" fill="%s"/>' % (x + dx, 300 - dy, GOLD[th][1]) for dx, dy in ((-12, 24), (4, 31), (14, 20))))
    fg.append('</g>')
    front = "".join(fg)
    return [("base", 0, base), ("palms", .05, palms), ("store", .12, store), ("front", .21, front)]

MARKS = {"kay": kay_layers, "boutik": boutik_layers}

def page(mark, th):
    css = ('@font-face{font-family:Cinzel;font-weight:700;src:url("file://%s/cinzel/files/cinzel-latin-700-normal.woff2")}'
           'html,body{margin:0;background:transparent}svg{position:absolute;left:0;top:0;width:512px;height:512px}') % FONTS
    svgs = "".join('<svg id="L_%d" data-z="%s" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">%s</svg>' % (i, z, s) for i, (k, z, s) in enumerate(MARKS[mark](th)))
    return '<!doctype html><html><head><meta charset="utf-8"><style>%s</style></head><body>%s</body></html>' % (css, svgs)

if __name__ == "__main__":
    out = os.path.join(HERE, "pages2"); os.makedirs(out, exist_ok=True)
    for m in MARKS:
        for th in ("day", "night"):
            open(os.path.join(out, "%s-%s.html" % (m, th)), "w", encoding="utf-8").write(page(m, th))
    print("pages2 written")
