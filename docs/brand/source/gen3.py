"""Round 3: subtler, jewel-cut marks. Lakay: Hibiscus brooch, Spiral shell. Le Comptoir: Rose des vents.
Four depth layers each, day and night."""
import math, os
from gen2 import lerp, mix, poly, lg, rg, goldg, GOLD, SHADOW, SHADOW_S, FONTS
HERE = os.path.dirname(os.path.abspath(__file__))
LIGHT = (-.55, -.83)
C = (200, 200)

def facet_point(tip, left, right, base, lo, hi, gid, k=0.0):
    """a point (kite): split along tip-base into two halves, each shaded by how it faces the light"""
    out = []
    for i, (a, b) in enumerate(((left, base), (base, right))):
        tri = [tip, a, b] if i == 0 else [tip, a, b]
        # normal of the half: perpendicular to the axis, on the side of the outer vertex
        outer = left if i == 0 else right
        ax, ay = tip[0] - base[0], tip[1] - base[1]; L = math.hypot(ax, ay) or 1
        nx, ny = -ay / L, ax / L
        if (outer[0] - base[0]) * nx + (outer[1] - base[1]) * ny < 0: nx, ny = -nx, -ny
        lit = nx * LIGHT[0] + ny * LIGHT[1]
        t = .52 + .42 * lit + k
        g = "%s_%d" % (gid, i)
        out.append(lg(g, [(0, mix(lo, hi, t + .14), None), (1, mix(lo, hi, t - .12), None)], x1=.5, y1=0, x2=.5, y2=1))
        out.append('<path d="%s" fill="url(#%s)"/>' % (poly([tip, outer, base]), g))
    out.append('<path d="M%.2f %.2fL%.2f %.2f" stroke="#ffffff" stroke-opacity=".5" stroke-width=".8"/>' % (tip[0], tip[1], base[0], base[1]))
    return "".join(out)

def plate(th, face0, face1, ticks=True, letters=None, engr="#ffffff"):
    night = th == "night"
    d = ("<defs>" + goldg("gd", th) + goldg("gdh", th, False) + SHADOW + SHADOW_S +
         rg("pf", [(0, face0, None), (1, face1, None)], cx=.4, cy=.35, r=.75) +
         lg("spec", [(0, "#ffffff", ".85" if not night else ".25"), (.45, "#ffffff", "0")], x1=0, y1=0, x2=1, y2=1) + "</defs>")
    s = [d, '<g filter="url(#sh)"><circle cx="200" cy="200" r="186" fill="url(#gd)"/></g>',
         '<circle cx="200" cy="200" r="186" fill="none" stroke="%s" stroke-opacity=".6" stroke-width="1"/>' % GOLD[th][3],
         '<circle cx="200" cy="200" r="171" fill="url(#pf)"/>',
         '<circle cx="200" cy="200" r="171" fill="none" stroke="%s" stroke-opacity=".7" stroke-width="1.6"/>' % GOLD[th][3]]
    # knurled bezel
    s.append('<path d="%s" stroke="%s" stroke-opacity=".45" stroke-width="1.1"/>' % ("".join(
        "M%.1f %.1fL%.1f %.1f" % (200 + 174 * math.cos(a), 200 + 174 * math.sin(a), 200 + 184 * math.cos(a), 200 + 184 * math.sin(a))
        for a in [i * math.pi / 60 for i in range(120)]), GOLD[th][3]))
    # engraved guilloche: fine concentric waves
    for r in (150, 156, 162):
        pts = []
        for i in range(181):
            a = i * 2 * math.pi / 180
            rr = r + 1.6 * math.sin(a * 24)
            pts.append((200 + rr * math.cos(a), 200 + rr * math.sin(a)))
        s.append('<path d="%s" fill="none" stroke="%s" stroke-opacity="%s" stroke-width=".7"/>' % (poly(pts), engr, ".35" if not night else ".14"))
    if ticks:
        s.append('<path d="%s" stroke="%s" stroke-opacity=".8" stroke-width="1"/>' % ("".join(
            "M%.1f %.1fL%.1f %.1f" % (200 + 140 * math.cos(a), 200 + 140 * math.sin(a), 200 + (147 if i % 3 else 152) * math.cos(a), 200 + (147 if i % 3 else 152) * math.sin(a))
            for i, a in enumerate([i * math.pi / 36 for i in range(72)])), GOLD[th][2]))
    if letters:
        for ch, ang in letters:
            a = math.radians(ang)
            s.append('<text x="%.1f" y="%.1f" font-family="Cinzel" font-weight="700" font-size="17" text-anchor="middle" dominant-baseline="central" fill="url(#gd)">%s</text>' % (
                200 + 128 * math.cos(a), 200 + 128 * math.sin(a), ch))
    s.append('<circle cx="200" cy="200" r="171" fill="url(#spec)" opacity=".6"/>')
    return "".join(s)

def pearl(cx, cy, r, th, col0="#ffffff", col1="#d9d3f2", gid="pe"):
    return (rg(gid, [(0, col0, None), (.7, col1, None), (1, mix(col1, "#6a63a8", .5), None)], cx=.35, cy=.3, r=.8) +
            '<g filter="url(#shs)"><circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#gd)"/><circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#%s)"/></g>' % (cx, cy, r + 3.2, cx, cy, r, gid) +
            '<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#ffffff" opacity=".85"/>' % (cx - r * .35, cy - r * .4, r * .28, r * .18))

# ---------------- Le Comptoir: Rose des vents ----------------
def rose(th):
    night = th == "night"
    face0, face1 = ("#3b3f99", "#1f2266") if not night else ("#262a72", "#0f1035")
    base = plate(th, face0, face1, ticks=True, engr="#b8bdff")
    # layer 1: a gold ring with sixteen short points
    d = "<defs>" + goldg("gd", th) + SHADOW_S + "</defs>"
    pts = []
    for i in range(16):
        a = math.radians(i * 22.5 + 11.25)
        tip = (200 + 112 * math.cos(a), 200 + 112 * math.sin(a))
        l = (200 + 64 * math.cos(a - .12), 200 + 64 * math.sin(a - .12)); r = (200 + 64 * math.cos(a + .12), 200 + 64 * math.sin(a + .12))
        pts.append(facet_point(tip, l, r, (200 + 60 * math.cos(a), 200 + 60 * math.sin(a)), "#8a7ad0" if not night else "#6c62b8", "#e9e6ff", "s%d" % i))
    ring = d + '<g filter="url(#shs)">' + "".join(pts) + '<circle cx="200" cy="200" r="66" fill="none" stroke="url(#gd)" stroke-width="3"/></g>'
    # layer 2: the eight great points: four long in gold, four in lavender silver
    out = ["<defs>" + goldg("gd", th) + SHADOW + "</defs>", '<g filter="url(#sh)">']
    for i in range(8):
        a = math.radians(i * 45 - 90)
        long_ = i % 2 == 0
        R, w = (150, 20) if long_ else (104, 17)
        tip = (200 + R * math.cos(a), 200 + R * math.sin(a))
        l = (200 + w * math.cos(a - math.pi / 2) + 6 * math.cos(a), 200 + w * math.sin(a - math.pi / 2) + 6 * math.sin(a))
        r = (200 + w * math.cos(a + math.pi / 2) + 6 * math.cos(a), 200 + w * math.sin(a + math.pi / 2) + 6 * math.sin(a))
        lo, hi = ((GOLD[th][3], GOLD[th][0]) if long_ else (("#6e66b6", "#f1efff") if not night else ("#5d56a6", "#e6e3ff")))
        out.append(facet_point(tip, l, r, C, lo, hi, "p%d" % i))
    out.append('</g>')
    points = "".join(out)
    # layer 3: the jewel at the heart, and a fleur at north
    d3 = "<defs>" + goldg("gd", th) + SHADOW_S + "</defs>"
    fleur = '<path d="M200 34C204 42 212 44 212 52C212 58 206 60 202 56L200 62L198 56C194 60 188 58 188 52C188 44 196 42 200 34Z" fill="url(#gd)"/>'
    heart = d3 + pearl(200, 200, 15, th, "#ffffff", "#ffd9c4" if not night else "#f4c7b8") + '<g filter="url(#shs)">%s</g>' % fleur
    return [("plate", 0, base), ("ring", .06, ring), ("points", .14, points), ("heart", .24, heart)]

# ---------------- Lakay: Hibiscus brooch ----------------
def hibiscus(th):
    night = th == "night"
    face0, face1 = ("#ffe7d6", "#d9dbf8") if not night else ("#2c2e62", "#151634")
    base = plate(th, face0, face1, ticks=False, engr="#ffffff" if not night else "#b8bdff")
    # layer 1: five gold leaves between the petals
    d = "<defs>" + goldg("gd", th) + SHADOW_S + "</defs>"
    leaves = []
    for i in range(5):
        a = math.radians(i * 72 - 90 + 36)
        tip = (200 + 140 * math.cos(a), 200 + 140 * math.sin(a))
        l = (200 + 70 * math.cos(a - .26), 200 + 70 * math.sin(a - .26)); r = (200 + 70 * math.cos(a + .26), 200 + 70 * math.sin(a + .26))
        leaves.append(facet_point(tip, l, r, (200 + 40 * math.cos(a), 200 + 40 * math.sin(a)), GOLD[th][3], GOLD[th][0], "lf%d" % i))
    leaf_l = d + '<g filter="url(#shs)">' + "".join(leaves) + "</g>"
    # layer 2: five petals, each a fan cut into five facets, periwinkle with a dawn blush at the throat
    lo, hi = ("#4e55b8", "#eef0ff") if not night else ("#3d44a6", "#e8eaff")
    blush = "#f2a58a" if not night else "#e3907a"
    out = ["<defs>" + SHADOW + "</defs>", '<g filter="url(#sh)">']
    for i in range(5):
        a0 = math.radians(i * 72 - 90)
        ctr = (200 + 10 * math.cos(a0), 200 + 10 * math.sin(a0))
        # the petal's outer edge: a soft scalloped arc
        edge = []
        for k in range(11):
            t = k / 10.0
            aa = a0 + (t - .5) * math.radians(66)
            rr = 92 + 44 * math.sin(math.pi * t) ** .65 + 3.2 * math.sin(math.pi * t * 5)
            edge.append((200 + rr * math.cos(aa), 200 + rr * math.sin(aa)))
        for k in range(5):
            seg = edge[k * 2:k * 2 + 3]
            mid = seg[1]
            # facet: from the throat to two points on the edge, shaded by its own direction
            ax, ay = mid[0] - 200, mid[1] - 200; L = math.hypot(ax, ay)
            nx, ny = ax / L, ay / L
            lit = nx * LIGHT[0] + ny * LIGHT[1] + (.22 if k in (1, 2) else -.16 if k == 4 else 0)
            t = .5 + .46 * lit
            g = "pt%d_%d" % (i, k)
            out.append(lg(g, [(0, blush, None), (.28, mix(lo, hi, t + .1), None), (1, mix(lo, hi, t - .14), None)],
                          x1=.5 - nx / 2, y1=.5 - ny / 2, x2=.5 + nx / 2, y2=.5 + ny / 2))
            out.append('<path d="%s" fill="url(#%s)"/>' % (poly([ctr] + seg), g))
            out.append('<path d="M%.1f %.1fL%.1f %.1f" stroke="#ffffff" stroke-opacity=".35" stroke-width=".8"/>' % (ctr[0], ctr[1], seg[0][0], seg[0][1]))
        out.append('<path d="%s" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.1" stroke-linejoin="round"/>' % (
            "M%.1f %.1fL" % ctr + "L".join("%.1f %.1f" % p for p in edge) + "Z"))
    out.append('</g>')
    petals = "".join(out)
    # layer 3: the stamen, a gold column ending in five small pearls, and a pearl at the throat
    d3 = "<defs>" + goldg("gd", th) + SHADOW_S + "</defs>"
    col = '<path d="M196 200C198 170 212 146 238 126L243 131C220 150 207 172 204 200Z" fill="url(#gd)"/>'
    beads = "".join('<circle cx="%.1f" cy="%.1f" r="4.6" fill="url(#gd)"/><circle cx="%.1f" cy="%.1f" r="1.5" fill="#ffffff" opacity=".85"/>' % (x, y, x - 1.4, y - 1.4)
                    for x, y in ((246, 116), (254, 126), (236, 110), (250, 106), (258, 116)))
    stamen = d3 + '<g filter="url(#shs)">%s%s</g>' % (col, beads) + pearl(200, 202, 11, th, "#ffffff", "#ffd2bd" if not night else "#f3c3b0")
    return [("plate", 0, base), ("leaves", .06, leaf_l), ("petals", .14, petals), ("stamen", .24, stamen)]

# ---------------- Lakay: Spiral shell ----------------
def spiral(th):
    night = th == "night"
    face0, face1 = ("#e9e6fb", "#b9bff2") if not night else ("#262860", "#111230")
    base = plate(th, face0, face1, ticks=False, engr="#ffffff" if not night else "#b8bdff")
    # a golden spiral: r = a * e^(b * theta), chambers between turns cut by septa, each chamber two facets
    b = math.log(1.618) / (math.pi / 2)
    t_end = 4 * math.pi + 1.2
    a = 162.0 / math.exp(b * t_end)
    cx, cy = 246, 160
    def pt(th_, rr=None):
        r_ = a * math.exp(b * th_) if rr is None else rr
        return (cx + r_ * math.cos(th_ + 2.2), cy + r_ * math.sin(th_ + 2.2))
    lo, hi = ("#4a50b4", "#f0f1ff") if not night else ("#3a40a2", "#e9ebff")
    gl, gh = GOLD[th][3], GOLD[th][0]
    out1 = ["<defs>" + goldg("gd", th) + SHADOW + "</defs>", '<g filter="url(#sh)">']
    out2 = ["<defs>" + goldg("gd", th) + SHADOW_S + "</defs>", '<g filter="url(#shs)">']
    steps = 26
    t0 = t_end - 2 * math.pi
    for k in range(steps):
        ta = t0 + 2 * math.pi * k / steps
        tb = t0 + 2 * math.pi * (k + 1) / steps
        o1, o2 = pt(ta), pt(tb)
        i1, i2 = pt(ta - 2 * math.pi), pt(tb - 2 * math.pi)
        m1 = ((o1[0] + i1[0]) / 2, (o1[1] + i1[1]) / 2); m2 = ((o2[0] + i2[0]) / 2, (o2[1] + i2[1]) / 2)
        ax, ay = (o1[0] + o2[0]) / 2 - cx, (o1[1] + o2[1]) / 2 - cy; L = math.hypot(ax, ay) or 1
        nx, ny = ax / L, ay / L
        lit = nx * LIGHT[0] + ny * LIGHT[1]
        tt = .5 + .4 * lit
        for j, quad in enumerate(([o1, o2, m2, m1], [m1, m2, i2, i1])):
            g = "c%d_%d" % (k, j)
            t2 = tt + (.12 if j == 0 else -.1)
            out1.append(lg(g, [(0, mix(lo, hi, t2 + .08), None), (1, mix(lo, hi, t2 - .1), None)], x1=.5 + nx / 2, y1=.5 + ny / 2, x2=.5 - nx / 2, y2=.5 - ny / 2))
            out1.append('<path d="%s" fill="url(#%s)"/>' % (poly(quad), g))
        out2.append('<path d="M%.1f %.1fL%.1f %.1f" stroke="url(#gd)" stroke-width="%.1f" stroke-linecap="round"/>' % (o1[0], o1[1], i1[0], i1[1], 1.2 + 2.2 * k / steps))
    # the inner turns, small and bright
    for k in range(40):
        ta = t0 - 2 * math.pi + 2 * math.pi * k / 40
        tb = t0 - 2 * math.pi + 2 * math.pi * (k + 1) / 40
        o1, o2 = pt(ta), pt(tb)
        i1, i2 = pt(ta - 2 * math.pi), pt(tb - 2 * math.pi)
        t2 = .55 + .3 * math.cos(ta + 2.2 + 2.2)
        out1.append('<path d="%s" fill="%s"/>' % (poly([o1, o2, i2, i1]), mix(lo, hi, t2)))
    spine = [pt(t0 - 4 * math.pi + i * (6 * math.pi) / 200) for i in range(201)]
    out2.append('<path d="M%s" fill="none" stroke="url(#gd)" stroke-width="3" stroke-linecap="round"/>' % "L".join("%.1f %.1f" % p for p in spine))
    out1.append('</g>'); out2.append('</g>')
    shell = "".join(out1)
    gold_l = "".join(out2) + pearl(cx + 2, cy - 1, 7.5, th, "#ffffff", "#ffd2bd" if not night else "#f3c3b0")
    # layer 1: a faint gold halo behind the shell
    halo = "<defs>" + goldg("gd", th) + "</defs>" + '<circle cx="200" cy="200" r="132" fill="none" stroke="url(#gd)" stroke-width="2.4"/><circle cx="200" cy="200" r="126" fill="none" stroke="url(#gd)" stroke-opacity=".5" stroke-width="1"/>'
    return [("plate", 0, base), ("halo", .05, halo), ("shell", .14, shell), ("gold", .22, gold_l)]

MARKS = {"hibiscus": hibiscus, "spiral": spiral, "rose": rose}

def page(mark, th):
    css = ('@font-face{font-family:Cinzel;font-weight:700;src:url("file://%s/cinzel/files/cinzel-latin-700-normal.woff2")}'
           'html,body{margin:0;background:transparent}svg{position:absolute;left:0;top:0;width:512px;height:512px}') % FONTS
    svgs = "".join('<svg id="L_%d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">%s</svg>' % (i, s) for i, (k, z, s) in enumerate(MARKS[mark](th)))
    return '<!doctype html><html><head><meta charset="utf-8"><style>%s</style></head><body>%s</body></html>' % (css, svgs)

if __name__ == "__main__":
    import shutil
    out = os.path.join(HERE, "pages2")
    for f in os.listdir(out): os.remove(os.path.join(out, f))
    for m in MARKS:
        for th in ("day", "night"):
            open(os.path.join(out, "%s-%s.html" % (m, th)), "w", encoding="utf-8").write(page(m, th))
    print("pages written")

# ---------------- Lakay: the Spiral in seven layers (chosen 7 November 2026) ----------------
def _defs(th):
    return "<defs>" + goldg("gd", th) + goldg("gdh", th, False) + SHADOW + SHADOW_S + "</defs>"

def spiral7(th):
    night = th == "night"
    face0, face1 = ("#e9e6fb", "#b9bff2") if not night else ("#262860", "#111230")
    # 0. the plate: gold bezel and enamel face, lit from the upper left (still)
    d0 = ("<defs>" + goldg("gd", th) + SHADOW + rg("pf", [(0, face0, None), (1, face1, None)], cx=.4, cy=.35, r=.75) +
          lg("spec", [(0, "#ffffff", ".85" if not night else ".25"), (.45, "#ffffff", "0")], x1=0, y1=0, x2=1, y2=1) +
          rg("inner", [(0, "#000000", "0"), (.86, "#000000", "0"), (1, "#1a1640", ".22" if not night else ".45")], r=.5) + "</defs>")
    plate0 = (d0 + '<g filter="url(#sh)"><circle cx="200" cy="200" r="186" fill="url(#gd)"/></g>' +
              '<circle cx="200" cy="200" r="186" fill="none" stroke="%s" stroke-opacity=".6" stroke-width="1"/>' % GOLD[th][3] +
              '<circle cx="200" cy="200" r="171" fill="url(#pf)"/><circle cx="200" cy="200" r="171" fill="url(#inner)"/>' +
              '<circle cx="200" cy="200" r="171" fill="none" stroke="%s" stroke-opacity=".7" stroke-width="1.6"/>' % GOLD[th][3] +
              '<circle cx="200" cy="200" r="171" fill="url(#spec)" opacity=".6"/>')
    # 1. the engraving: the knurled edge of the bezel and the guilloche waves (turns anticlockwise)
    eng = ['<path d="%s" stroke="%s" stroke-opacity=".5" stroke-width="1.2"/>' % ("".join(
        "M%.1f %.1fL%.1f %.1f" % (200 + 174 * math.cos(a), 200 + 174 * math.sin(a), 200 + 184 * math.cos(a), 200 + 184 * math.sin(a))
        for a in [i * math.pi / 60 for i in range(120)]), GOLD[th][3])]
    col = "#ffffff" if not night else "#b8bdff"
    for r, lobes, amp, op in ((146, 18, 2.2, .55), (153, 24, 1.8, .5), (160, 30, 1.5, .45), (166, 36, 1.2, .4)):
        pts = [(200 + (r + amp * math.sin(i * 2 * math.pi / 360 * lobes)) * math.cos(i * 2 * math.pi / 360),
                200 + (r + amp * math.sin(i * 2 * math.pi / 360 * lobes)) * math.sin(i * 2 * math.pi / 360)) for i in range(361)]
        eng.append('<path d="%s" fill="none" stroke="%s" stroke-opacity="%.2f" stroke-width=".8"/>' % (poly(pts), col, op if not night else op * .4))
    eng.append('<path d="%s" stroke="%s" stroke-opacity="%s" stroke-width="1"/>' % ("".join(
        "M%.1f %.1fL%.1f %.1f" % (200 + 137 * math.cos(a), 200 + 137 * math.sin(a), 200 + (141 if i % 5 else 144) * math.cos(a), 200 + (141 if i % 5 else 144) * math.sin(a))
        for i, a in enumerate([i * math.pi / 30 for i in range(60)])), GOLD[th][2], ".7"))
    engraving = "".join(eng)
    # 2. the halo: a double gold ring with eight beads and four diamonds (turns clockwise)
    beads = "".join('<circle cx="%.1f" cy="%.1f" r="3.4" fill="url(#gd)"/><circle cx="%.1f" cy="%.1f" r="1.1" fill="#ffffff" opacity=".9"/>' % (
        200 + 129 * math.cos(a), 200 + 129 * math.sin(a), 200 + 129 * math.cos(a) - 1, 200 + 129 * math.sin(a) - 1)
        for a in [math.radians(22.5 + 45 * k) for k in range(8)])
    dia = "".join('<path d="M%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fZ" fill="url(#gd)"/>' % (
        200 + 120 * math.cos(a), 200 + 120 * math.sin(a), 200 + 129 * math.cos(a) + 4 * -math.sin(a), 200 + 129 * math.sin(a) + 4 * math.cos(a),
        200 + 138 * math.cos(a), 200 + 138 * math.sin(a), 200 + 129 * math.cos(a) - 4 * -math.sin(a), 200 + 129 * math.sin(a) - 4 * math.cos(a))
        for a in [math.radians(90 * k) for k in range(4)])
    halo = (_defs(th) + '<g filter="url(#shs)"><circle cx="200" cy="200" r="132" fill="none" stroke="url(#gd)" stroke-width="2.6"/>' +
            '<circle cx="200" cy="200" r="126" fill="none" stroke="url(#gd)" stroke-opacity=".55" stroke-width="1.1"/>' + beads + dia + "</g>")
    # 3 and 4: the shell and its gold lattice (from the Spiral drawing)
    sp = spiral(th)
    shell, gold_and_pearl = sp[2][2], sp[3][2]
    # split the pearl from the gold: the gold is everything before the pearl's gradient
    k = gold_and_pearl.index('<radialGradient id="pe"')
    gold = gold_and_pearl[:k]
    b = math.log(1.618) / (math.pi / 2)
    cx, cy = 246, 160
    pearl_l = _defs(th) + pearl(cx + 2, cy - 1, 7.5, th, "#ffffff", "#ffd2bd" if not night else "#f3c3b0")
    # 6. three small sparkles on the bezel's inner edge (orbit anticlockwise, twinkle)
    def spark(x, y, r):
        k_ = r * .2
        return '<path d="M%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fZ"/>' % (
            x, y - r, x + k_, y - k_, x + r, y, x + k_, y + k_, x, y + r, x - k_, y + k_, x - r, y, x - k_, y - k_)
    sparks = "".join(spark(200 + 152 * math.cos(math.radians(a)), 200 + 152 * math.sin(math.radians(a)), r) for a, r in ((-62, 14), (58, 10), (178, 12)))
    sparkles = ('<defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>' +
                '<g fill="%s" filter="url(#gl)" opacity=".8">%s</g><g fill="%s">%s</g>' % (GOLD[th][1], sparks, "#fffaf0", sparks))
    return [("plate", 0, plate0), ("engraving", .012, engraving), ("halo", .05, halo), ("shell", .14, shell),
            ("gold", .2, gold), ("pearl", .27, pearl_l), ("sparkles", .32, sparkles)]

MARKS["spiral"] = spiral7

# ---------------- the Spiral, refined: champagne gold, a fine rim, a centred nautilus (7 November 2026) ----------------
CHAMP = {"day": ("#fbf3dc", "#e9d3a0", "#c9a86c", "#a2834f"), "night": ("#fdf6e2", "#ecd8a8", "#cfb078", "#a78a58")}
def champ(id_, th, vertical=True):
    a, b, c, d = CHAMP[th]
    return lg(id_, [(0, a, None), (.35, b, None), (.7, c, None), (.88, b, None), (1, d, None)], x2=0 if vertical else 1, y2=1 if vertical else 0)
def cdefs(th):
    return "<defs>" + champ("gd", th) + SHADOW + SHADOW_S + "</defs>"

def spiral8(th):
    night = th == "night"
    face0, face1, face2 = ("#a3acf3", "#727bdc", "#4a51b6") if not night else ("#5a62c8", "#363b98", "#1f2266")
    c3 = CHAMP[th][3]
    # 0. the plate: a fine champagne rim and an enamel face, lit from the upper left
    d0 = ("<defs>" + champ("gd", th) + SHADOW +
          rg("pf", [(0, face0, None), (.6, face1, None), (1, face2, None)], cx=.38, cy=.32, r=.8) +
          lg("spec", [(0, "#ffffff", ".55" if not night else ".2"), (.42, "#ffffff", "0")], x1=0, y1=0, x2=1, y2=1) +
          rg("inner", [(0, "#000000", "0"), (.86, "#000000", "0"), (1, "#141238", ".28" if not night else ".45")], r=.5) + "</defs>")
    plate0 = (d0 + '<g filter="url(#sh)"><circle cx="200" cy="200" r="184" fill="url(#gd)"/></g>' +
              '<circle cx="200" cy="200" r="178.5" fill="url(#pf)"/><circle cx="200" cy="200" r="178.5" fill="url(#inner)"/>' +
              '<circle cx="200" cy="200" r="178.5" fill="none" stroke="%s" stroke-opacity=".55" stroke-width=".8"/>' % c3 +
              '<circle cx="200" cy="200" r="184" fill="none" stroke="#ffffff" stroke-opacity="%s" stroke-width=".7"/>' % (".7" if not night else ".25") +
              '<circle cx="200" cy="200" r="173.5" fill="none" stroke="url(#gd)" stroke-width=".9" stroke-opacity=".9"/>' +
              '<circle cx="200" cy="200" r="178.5" fill="url(#spec)" opacity=".55"/>')
    # 1. the engraving: fine guilloche waves and a ring of ticks (turns anticlockwise)
    col = "#ffffff" if not night else "#d6d9ff"
    eng = []
    for r, lobes, amp, op in ((150, 20, 1.8, .34), (156, 26, 1.5, .3), (162, 32, 1.3, .27), (168, 38, 1.1, .24)):
        pts = [(200 + (r + amp * math.sin(math.radians(i) * lobes)) * math.cos(math.radians(i)),
                200 + (r + amp * math.sin(math.radians(i) * lobes)) * math.sin(math.radians(i))) for i in range(361)]
        eng.append('<path d="%s" fill="none" stroke="%s" stroke-opacity="%.2f" stroke-width=".7"/>' % (poly(pts), col, op * .75 if not night else op * .5))
    eng.append('<path d="%s" stroke="%s" stroke-opacity=".75" stroke-width=".8" stroke-linecap="round"/>' % ("".join(
        "M%.1f %.1fL%.1f %.1f" % (200 + 140 * math.cos(a), 200 + 140 * math.sin(a), 200 + (143 if i % 5 else 146) * math.cos(a), 200 + (143 if i % 5 else 146) * math.sin(a))
        for i, a in enumerate([k * math.pi / 30 for k in range(60)])), CHAMP[th][2]))
    engraving = "".join(eng)
    # 2. the halo: a fine double ring, eight small beads, four small diamonds (turns clockwise)
    beads = "".join('<circle cx="%.1f" cy="%.1f" r="2.5" fill="url(#gd)"/><circle cx="%.1f" cy="%.1f" r=".8" fill="#ffffff" opacity=".9"/>' % (
        200 + 131 * math.cos(a), 200 + 131 * math.sin(a), 200 + 131 * math.cos(a) - .7, 200 + 131 * math.sin(a) - .7)
        for a in [math.radians(22.5 + 45 * k) for k in range(8)])
    dia = "".join('<path d="M%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fZ" fill="url(#gd)"/>' % (
        200 + 124 * math.cos(a), 200 + 124 * math.sin(a), 200 + 131 * math.cos(a) - 3 * math.sin(a), 200 + 131 * math.sin(a) + 3 * math.cos(a),
        200 + 138 * math.cos(a), 200 + 138 * math.sin(a), 200 + 131 * math.cos(a) + 3 * math.sin(a), 200 + 131 * math.sin(a) - 3 * math.cos(a))
        for a in [math.radians(90 * k) for k in range(4)])
    halo = (cdefs(th) + '<g filter="url(#shs)"><circle cx="200" cy="200" r="133" fill="none" stroke="url(#gd)" stroke-width="1.5"/>' +
            '<circle cx="200" cy="200" r="129" fill="none" stroke="url(#gd)" stroke-opacity=".6" stroke-width=".7"/>' + beads + dia + "</g>")
    # 3 and 4: a centred nautilus, about three turns of chambers, each chamber cut in two facets, and its fine gold lattice
    growth = 2.15
    b = math.log(growth) / (2 * math.pi)
    R_out, t_end = 118.0, 0.0
    def rr(t): return R_out * math.exp(b * (t - t_end))
    def P(t, r=None):
        r_ = rr(t) if r is None else r
        a_ = t + math.radians(-35)
        return (200 + r_ * math.cos(a_), 200 + r_ * math.sin(a_))
    lo, hi = ("#8790e6", "#ffffff") if not night else ("#7780dc", "#f2f3ff")
    per_turn = 24
    turns = 3.1
    n = int(per_turn * turns)
    shell = [cdefs(th), '<g filter="url(#sh)">']
    gold = [cdefs(th), '<g filter="url(#shs)">']
    for k in range(n):
        ta = t_end - 2 * math.pi * k / per_turn
        tb = t_end - 2 * math.pi * (k + 1) / per_turn
        o1, o2 = P(ta), P(tb)
        i1, i2 = P(ta - 2 * math.pi), P(tb - 2 * math.pi)
        m1 = ((o1[0] + i1[0]) / 2, (o1[1] + i1[1]) / 2); m2 = ((o2[0] + i2[0]) / 2, (o2[1] + i2[1]) / 2)
        ax, ay = (o1[0] + o2[0]) / 2 - 200, (o1[1] + o2[1]) / 2 - 200; L = math.hypot(ax, ay) or 1
        nx, ny = ax / L, ay / L
        lit = nx * LIGHT[0] + ny * LIGHT[1]
        depth = k / n                                     # the inner turns sit deeper and darker
        tt = .56 + .34 * lit - .12 * depth
        for j, quad in enumerate(([o1, o2, m2, m1], [m1, m2, i2, i1])):
            g = "c%d_%d" % (k, j); t2 = tt + (.1 if j == 0 else -.08)
            shell.append(lg(g, [(0, mix(lo, hi, t2 + .07), None), (1, mix(lo, hi, t2 - .09), None)], x1=.5 + nx / 2, y1=.5 + ny / 2, x2=.5 - nx / 2, y2=.5 - ny / 2))
            shell.append('<path d="%s" fill="url(#%s)"/>' % (poly(quad), g))
        w = .5 + 1.3 * (1 - depth)
        gold.append('<path d="M%.2f %.2fL%.2f %.2f" stroke="url(#gd)" stroke-width="%.2f" stroke-linecap="round"/>' % (o1[0], o1[1], i1[0], i1[1], w))
    spine = [P(t_end - i * (2 * math.pi * (turns + 1)) / 400) for i in range(401)]
    gold.append('<path d="M%s" fill="none" stroke="url(#gd)" stroke-width="1.6" stroke-linecap="round"/>' % "L".join("%.2f %.2f" % p for p in spine))
    shell.append('</g>'); gold.append('</g>')
    pearl_l = cdefs(th) + pearl(200, 200, 8.5, th, "#ffffff", "#ffd8c6" if not night else "#f3c9b8").replace('url(#gd)', 'url(#gd)')
    def spark(x, y, r):
        k_ = r * .2
        return '<path d="M%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fL%.1f %.1fZ"/>' % (
            x, y - r, x + k_, y - k_, x + r, y, x + k_, y + k_, x, y + r, x - k_, y + k_, x - r, y, x - k_, y - k_)
    sparks = "".join(spark(200 + 157 * math.cos(math.radians(a)), 200 + 157 * math.sin(math.radians(a)), r) for a, r in ((-58, 11), (62, 8), (182, 9.5)))
    sparkles = ('<defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter></defs>' +
                '<g fill="%s" filter="url(#gl)" opacity=".7">%s</g><g fill="#fffaf0">%s</g>' % (CHAMP[th][1], sparks, sparks))
    return [("plate", 0, plate0), ("engraving", .012, engraving), ("halo", .05, halo), ("shell", .14, "".join(shell)),
            ("gold", .2, "".join(gold)), ("pearl", .27, pearl_l), ("sparkles", .32, sparkles)]

MARKS["spiral"] = spiral8

# ---------------- the Spiral in true depth (8 November 2026): a coin with an edge, cast shadows, a shell with sides ----------------
import re as _re
def _strip(svg):
    return svg.replace(' filter="url(#sh)"', '').replace(' filter="url(#shs)"', '')
def _silhouette(svg, color):
    s = _re.sub(r'fill="url\(#[^)]*\)"', 'fill="%s"' % color, svg)
    s = _re.sub(r'(<(?:path|circle|rect|ellipse)[^>]*?)fill="#[0-9a-fA-F]{3,6}"', r'\1fill="%s"' % color, s)
    s = _re.sub(r'stroke="url\(#[^)]*\)"', 'stroke="%s"' % color, s)
    s = _re.sub(r'(<(?:path|circle|rect|ellipse)[^>]*?)stroke="#[0-9a-fA-F]{3,6}"', r'\1stroke="%s"' % color, s)
    s = _re.sub(r'(stroke|fill)-opacity="[0-9.]+"', '', s)
    s = s.replace(' opacity=".9"', '').replace(' opacity=".85"', '')
    return s

def spiral9(th):
    night = th == "night"
    L = dict((k, s) for k, z, s in spiral8(th))
    shell, lattice, halo = _strip(L["shell"]), _strip(L["gold"]), _strip(L["halo"])
    dark = "#120c38" if not night else "#000000"
    def shadow(svg, dx, dy, blur, op, fid):
        return ('<defs><filter id="%s" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="%s"/></filter></defs>' % (fid, blur) +
                '<g filter="url(#%s)" opacity="%s" transform="translate(%s %s)">%s</g>' % (fid, op, dx, dy, _silhouette(svg, dark)))
    a, b, c, d = CHAMP[th]
    edge = ('<defs>' + lg("eg", [(0, "#c9a86c", None), (.5, "#9a7a44", None), (1, "#6a4f24", None)], x1=0, y1=0, x2=1, y2=1) + '</defs>'
            '<circle cx="200" cy="200" r="184" fill="url(#eg)"/><circle cx="200" cy="200" r="183.4" fill="none" stroke="#5a4320" stroke-opacity=".6" stroke-width="1.2"/>')
    side = _silhouette(shell, "#3a409a" if not night else "#1d2166")
    return [("edge", -0.07, edge), ("plate", 0, L["plate"]), ("engr", .012, L["engraving"]),
            ("hshadow", .018, shadow(halo, 3, 6, 2.6, ".34" if not night else ".5", "bh")),
            ("sshadow", .022, shadow(shell, 7, 12, 7, ".42" if not night else ".6", "bs")),
            ("halo", .10, halo), ("sside", .17, side), ("shell", .215, shell), ("lattice", .245, lattice),
            ("pearl", .33, L["pearl"]), ("sparks", .42, L["sparkles"])]

MARKS["spiral"] = spiral9
