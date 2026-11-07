# Second round of symbols for Emporium's disc: crisper geometry, two-tone facets, sized to sit well inside the rim.
import math, json, sys
C = 60.0
def pol(r, deg, cx=C, cy=C):
    a = math.radians(deg); return (cx + r * math.cos(a), cy + r * math.sin(a))
def f(p): return "%.2f %.2f" % p
M = {}

# A. Soleil: a sun rising over the sea, its rays set like an Art Deco fan (warm welcome, a new day at the counter)
hor = 68.0
rays_d, rays_l = "", ""
for i, deg in enumerate([-157.5, -135, -112.5, -90, -67.5, -45, -22.5]):
    long_ = i % 2 == 1 or deg == -90
    r_in, r_out = 15.2, (28.5 if long_ else 23.5)
    hw = 1.9 if long_ else 1.6
    a = math.radians(deg); px, py = -math.sin(a), math.cos(a)
    b1 = (C + r_in * math.cos(a) + px * hw, hor + r_in * math.sin(a) + py * hw)
    b2 = (C + r_in * math.cos(a) - px * hw, hor + r_in * math.sin(a) - py * hw)
    tip = (C + r_out * math.cos(a), hor + r_out * math.sin(a))
    rays_d += "M%sL%sL%sZ" % (f(b1), f(tip), f(b2))
sun = "M%.2f %.2fA11.6 11.6 0 0 1 %.2f %.2fZ" % (C - 11.6, hor, C + 11.6, hor)
M["soleil"] = {"fill": sun + rays_d, "stroke": "M35 %.1fH85M43 %.1fH77M51.5 %.1fH68.5" % (hor + 0.2, hor + 6.4, hor + 12.4), "sw": 2.4}

# B. Rose des vents: an eight-point compass rose, each point in two facets (travel, and trade between the islands)
dark, light = "", ""
for k in range(8):
    deg = -90 + k * 45
    card = k % 2 == 0
    R, w = (29.0, 4.6) if card else (17.5, 3.4)
    tip = pol(R, deg); l = pol(w, deg - 90); r = pol(w, deg + 90)
    light += "M%sL%sL%sZ" % (f((C, C)), f(l), f(tip))
    dark += "M%sL%sL%sZ" % (f((C, C)), f(tip), f(r))
M["rose"] = {"fill": dark, "fillL": light, "ring": (C, C, 20.5), "dot": (C, C, 2.4)}

# C. Hibiscus: five petals in a gentle pinwheel and the flower's long stamen (the islands' flower)
pet = ""
base = [(0, -3.0), ((5.5, -4.5), (13.5, -9.5), (13.0, -17.5)), ((12.5, -25.0), (5.0, -28.5), (-0.5, -27.0)), ((-7.5, -25.5), (-10.5, -18.0), (-8.0, -11.5)), ((-6.0, -6.5), (-3.0, -3.5), (0, -3.0))]
def rot(p, deg):
    a = math.radians(deg); return (C + p[0] * math.cos(a) - p[1] * math.sin(a), C + p[0] * math.sin(a) + p[1] * math.cos(a))
for k in range(5):
    d = k * 72 + 8
    s = "M" + f(rot(base[0], d))
    for c1, c2, e in base[1:]: s += "C%s %s %s" % (f(rot(c1, d)), f(rot(c2, d)), f(rot(e, d)))
    pet += s + "Z"
stam = "M60 60C63.5 54 67.5 48.5 72.5 43.5"
M["hibiscus"] = {"fill": pet, "sep": True, "stroke": stam, "sw": 1.5, "dots": [(73.6, 42.0, 1.5), (76.0, 43.6, 1.2), (71.2, 40.2, 1.2), (75.6, 40.0, 1.0)], "dot": (C, C, 2.6)}

# D. Lambi: the conch's spiral, drawn as one fine line that widens as it turns (the sea, and a gathering)
def spiral(r0=1.2, r1=24.5, turns=2.75, w0=.7, w1=4.4, rot_=-1.9, n=260):
    T = turns * 2 * math.pi; k = math.log(r1 / r0) / T; pts = []
    for i in range(n + 1):
        t = T * i / n; r = r0 * math.exp(k * t); a = t + rot_
        pts.append((t, C + r * math.cos(a), C + r * math.sin(a)))
    L, R = [], []
    for i, (t, x, y) in enumerate(pts):
        if i < n: dx, dy = pts[i + 1][1] - x, pts[i + 1][2] - y
        else: dx, dy = x - pts[i - 1][1], y - pts[i - 1][2]
        ln = math.hypot(dx, dy) or 1; ux, uy = -dy / ln, dx / ln
        w = w0 + (w1 - w0) * (t / T) ** 1.6
        L.append((x + ux * w / 2, y + uy * w / 2)); R.append((x - ux * w / 2, y - uy * w / 2))
    d = "M%.1f %.1f" % L[0] + "".join("L%.1f %.1f" % p for p in L[1:])
    d += "A%.2f %.2f 0 0 1 %.1f %.1f" % (w1 / 2, w1 / 2, R[-1][0], R[-1][1]) + "".join("L%.1f %.1f" % p for p in reversed(R[:-1])) + "Z"
    return d
M["lambi"] = {"fill": spiral(), "dot": (C, C, 0)}
json.dump(M, open(sys.argv[1], "w"), indent=1)
print({k: len(json.dumps(v)) for k, v in M.items()})
