# Builds two sheets as HTML: the four candidate symbols in Emporium's disc, and the door card under three names.
import json, sys, os
M = json.load(open(sys.argv[1]))
ORDER = sys.argv[3].split(",")
PAIRS = [tuple(x.split(":")) for x in sys.argv[4].split(",")]
OUT = sys.argv[2]
n = [0]
def disc(mark, size, night=False):
    n[0] += 1; q = "m%d_" % n[0]
    if night:
        r0, r1, r2, f0, f1, w0c, w1c, gl, fd, m0, m1, br = "#ddd6fb", "#8f7ee0", "#2f2370", "#352d4f", "#1a1626", "#000000", "#c9bdf6", "#b3a6f0", "#b3a6f0", "#b6a8f2", "#6f5ad0", "#d8b46a"
        cast, hi, lo = ("#000000", .55), ("#ffffff", .5), ("#120826", .35)
    else:
        r0, r1, r2, f0, f1, w0c, w1c, gl, fd, m0, m1, br = "#aea2ec", "#5a40b6", "#3a2a7e", "#ffffff", "#eeebf8", "#2c2066", "#ffffff", "#b8aef0", "#5a40b6", "#8574de", "#4b33a0", "#c09a52"
        cast, hi, lo = ("#241a50", .30), ("#ffffff", .42), ("#1e1450", .30)
    m = M[mark]
    sym = ""
    if "ring" in m: sym += '<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-opacity=".75" stroke-width=".9"/>' % (m["ring"][0], m["ring"][1], m["ring"][2], br)
    if "fill" in m: sym += '<path d="%s" fill="url(#%smono)"%s/>' % (m["fill"], q, (' stroke="%s" stroke-width="1.1" stroke-linejoin="round"' % f0) if m.get("sep") else "")
    if "throat" in m: sym += '<circle cx="%s" cy="%s" r="%s" fill="%s" fill-opacity=".85"/>' % (m["throat"][0], m["throat"][1], m["throat"][2], r2)
    if "fillL" in m: sym += '<path d="%s" fill="url(#%smonoL)"/>' % (m["fillL"], q)
    if "stroke" in m: sym += '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (m["stroke"], (br if m.get("sep") else "url(#%smono)" % q), m.get("sw", 2.7))
    for dx in m.get("dots", []): sym += '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (dx[0], dx[1], dx[2], br)
    if "bow" in m: sym += '<path d="%s" fill="none" stroke="url(#%smono)" stroke-width="2.7" stroke-linejoin="round"/>' % (m["bow"], q)
    if "star" in m: sym += '<path d="%s" fill="url(#%smono)"/>' % (m["star"], q)
    if "dot" in m and m["dot"][2] > 0: sym += '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (m["dot"][0], m["dot"][1], m["dot"][2], br)
    return ('<svg viewBox="0 0 120 120" width="%d" height="%d" style="display:block;overflow:visible"><defs>'
      '<linearGradient id="{q}rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset=".5" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
      '<linearGradient id="{q}spec" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></linearGradient>'
      '<linearGradient id="{q}face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
      '<linearGradient id="{q}well" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s" stop-opacity=".16"/><stop offset=".38" stop-color="%s" stop-opacity="0"/><stop offset=".62" stop-color="%s" stop-opacity="0"/><stop offset="1" stop-color="%s" stop-opacity=".6"/></linearGradient>'
      '<radialGradient id="{q}glow" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="%s" stop-opacity=".22"/><stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient>'
      '<linearGradient id="{q}fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="%s" stop-opacity=".5"/><stop offset=".55" stop-color="%s" stop-opacity=".5"/><stop offset="1" stop-color="%s" stop-opacity=".06"/></linearGradient>'
      '<linearGradient id="{q}mono" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
      '<linearGradient id="{q}monoL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9d2fa"/><stop offset="1" stop-color="#9d8ce6"/></linearGradient>'
      '<filter id="{q}lift" x="-25%%" y="-25%%" width="150%%" height="150%%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="b"/><feOffset in="b" dx=".7" dy="1.6" result="o"/>'
      '<feFlood flood-color="%s" flood-opacity="%s"/><feComposite in2="o" operator="in" result="cast"/><feOffset in="SourceAlpha" dx=".6" dy=".7" result="a1"/>'
      '<feComposite in="SourceAlpha" in2="a1" operator="out" result="e1"/><feGaussianBlur in="e1" stdDeviation=".25" result="e1b"/><feComposite in="e1b" in2="SourceAlpha" operator="in" result="e1c"/>'
      '<feFlood flood-color="%s" flood-opacity="%s"/><feComposite in2="e1c" operator="in" result="hi"/><feOffset in="SourceAlpha" dx="-.6" dy="-.7" result="a2"/>'
      '<feComposite in="SourceAlpha" in2="a2" operator="out" result="e2"/><feGaussianBlur in="e2" stdDeviation=".25" result="e2b"/><feComposite in="e2b" in2="SourceAlpha" operator="in" result="e2c"/>'
      '<feFlood flood-color="%s" flood-opacity="%s"/><feComposite in2="e2c" operator="in" result="lo"/>'
      '<feMerge><feMergeNode in="cast"/><feMergeNode in="SourceGraphic"/><feMergeNode in="hi"/><feMergeNode in="lo"/></feMerge></filter></defs>'
      '<circle cx="60" cy="60" r="56.2" fill="url(#{q}face)"/><circle cx="60" cy="60" r="53" fill="url(#{q}glow)"/>'
      '<circle cx="60" cy="60" r="54.5" fill="none" stroke="url(#{q}well)" stroke-width="1.4"/><circle cx="60" cy="60" r="56" fill="none" stroke="url(#{q}rim)" stroke-width="1.4"/>'
      '<circle cx="60" cy="60" r="56.5" fill="none" stroke="url(#{q}spec)" stroke-width=".7"/>'
      '<circle cx="60" cy="60" r="50" fill="none" stroke="url(#{q}fade)" stroke-width="1"/><circle cx="60" cy="60" r="47.6" fill="none" stroke="%s" stroke-opacity=".55" stroke-width=".45"/>'
      '<g filter="url(#{q}lift)">%s</g></svg>' % (size, size, r0, r1, r2, f0, f1, w0c, w0c, w1c, w1c, gl, gl, fd, fd, fd, m0, m1,
        cast[0], cast[1], hi[0], hi[1], lo[0], lo[1], br, sym)).replace("{q}", q)

INFO = {
  "soleil": ("Soleil", "A sun rising over the sea, its rays set like an Art Deco fan. A nod to the islands' warmth, and to a new day at the counter."),
  "rose": ("Rose des vents", "An eight-point compass rose in two-tone facets. A nod to travel, and to the trade and the families between the islands and here."),
  "lambi": ("Lambi", "The conch's spiral, as one fine line that widens as it turns. A nod to the sea, and to the conch that calls people together."),
  "door": ("The door", "An arched shop door with a small star for its keystone. A nod to the store, and to coming home."),
  "key": ("The key", "A slender key whose bow is an open four-petal flower. A nod to keeping the store, its books and its Master Key."),
  "hibiscus": ("Hibiscus", "Five petals in a gentle pinwheel, and the flower's long brass stamen. A nod to the flowers of the islands."),
}
CSS = """*{box-sizing:border-box}body{margin:0;background:#efedf4;font:14px/1.5 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1f1a30}
.serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif}
.page{width:1600px;padding:40px 48px 48px}.top{display:flex;align-items:baseline;gap:18px;margin-bottom:26px}
.top h1{font:600 30px/1.1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.02em;margin:0}.top p{margin:0;color:#69647a;font-size:15px}
.row{display:grid;grid-template-columns:230px 230px 1fr 360px;gap:18px;align-items:stretch;margin-bottom:18px}
.tile{border-radius:22px;display:flex;align-items:center;justify-content:center;padding:22px;border:1px solid rgba(31,26,48,.08);box-shadow:0 1px 0 rgba(40,22,68,.06),0 12px 30px rgba(40,22,68,.08)}
.day{background:linear-gradient(180deg,#fff,#faf9fd)}.night{background:linear-gradient(180deg,#221d32,#1a1727);border-color:rgba(196,186,244,.12)}
.smalls{display:flex;flex-direction:column;gap:12px;justify-content:center}
.bar{display:flex;align-items:center;gap:12px;padding:8px 14px;border-radius:14px}.bar.day{background:#fff}.bar.night{background:#28233a}
.wm{font:600 14px/1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.18em;text-transform:uppercase}.night .wm{color:#f2effc}
.cap{background:#fff;border-radius:22px;padding:22px 24px;border:1px solid rgba(31,26,48,.08);display:flex;flex-direction:column;justify-content:center}
.cap .k{font:700 11px/1 -apple-system,"Segoe UI",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#b0873e}.cap h2{font:600 24px/1.2 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;margin:8px 0 6px}
.cap p{margin:0;color:#48435a;font-size:15px;line-height:1.55}.fav{display:flex;gap:10px;align-items:center;color:#69647a;font-size:12px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.card{position:relative;border-radius:26px;text-align:center;padding:34px 26px 26px;box-shadow:0 1px 0 rgba(40,22,68,.08),0 4px 7px rgba(40,22,68,.08),0 20px 36px rgba(40,22,68,.12)}
.card.day{background:#fff;border:1px solid rgba(40,22,68,.10)}.card.night{background:#1f1b2e;border:1px solid rgba(196,186,244,.14);color:#f2effc}
.word{font:600 36px/1.1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.015em;margin-top:16px}
.sub{display:flex;align-items:center;justify-content:center;gap:11px;margin-top:9px;font:600 10.5px/1 -apple-system,"Segoe UI",sans-serif;letter-spacing:.26em;text-transform:uppercase;color:#69647a}
.night .sub{color:#a79fc4}.sub:before,.sub:after{content:"";width:30px;height:1.2px;background:linear-gradient(90deg,rgba(90,64,182,0),rgba(90,64,182,.6))}.sub:after{background:linear-gradient(90deg,rgba(90,64,182,.6),rgba(90,64,182,0))}
.lede{margin:16px auto 18px;max-width:34ch;font-size:13.5px;line-height:1.6;color:#48435a}.night .lede{color:#d2cbe6}
.enter{display:inline-block;font:600 14px/1.2 -apple-system,"Segoe UI",sans-serif;letter-spacing:.04em;padding:12px 40px;border-radius:999px;color:#fff;border:1px solid #3c2a86;background:linear-gradient(180deg,#6a52c6,#4b33a0);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 2px 0 #2c1e6a,0 4px 6px rgba(40,22,68,.24),0 9px 16px rgba(40,22,68,.16)}
.tb{display:flex;align-items:center;gap:10px;margin:18px auto 0;justify-content:center}
.note{margin-top:8px;color:#69647a;font-size:12.5px}
"""
def marks_sheet():
    rows = ""
    for k in ORDER:
        nm, d = INFO[k]
        rows += ('<div class="row"><div class="tile day">%s</div><div class="tile night">%s</div>'
                 '<div class="smalls"><div class="bar day">%s<span class="wm">Emporium</span><span style="flex:1"></span>%s%s</div>'
                 '<div class="bar night">%s<span class="wm">Emporium</span><span style="flex:1"></span>%s%s</div></div>'
                 '<div class="cap"><span class="k">%s</span><h2>%s</h2><p>%s</p></div></div>') % (
            disc(k, 168), disc(k, 168, True), disc(k, 34), disc(k, 24), disc(k, 16), disc(k, 34, True), disc(k, 24, True), disc(k, 16, True),
            "Mark " + "ABCD"[ORDER.index(k)], nm, d)
    return '<div class="page"><div class="top"><h1>A new mark for the disc</h1><p>Four symbols in place of the letter. By day, by night, and at the sizes of the top bar and the browser tab.</p></div>%s</div>' % rows

def names_sheet(pair):
    cards = ""
    for name, mark, night in pair:
        cls = "night" if night else "day"
        cards += ('<div class="card %s">%s<div class="word">%s</div><div class="sub">The store\'s own books</div>'
                  '<p class="lede">The store\'s own books, on this device: stock, sales, cash and reports, in English, French and Kreyòl.</p>'
                  '<span class="enter">Enter</span><div class="tb"><div class="bar %s" style="box-shadow:0 1px 0 rgba(40,22,68,.08),0 4px 10px rgba(40,22,68,.08)">%s<span class="wm">%s</span></div></div></div>') % (
            cls, '<div style="display:flex;justify-content:center">%s</div>' % disc(mark, 112, night), name, cls, disc(mark, 34, night), name)
    return '<div class="page"><div class="top"><h1>Three names, one house</h1><p>The door card and the top bar as each name would show them.</p></div><div class="cards">%s</div></div>' % cards

for fn, body in [("sheet_marks.html", marks_sheet()),
                 ("sheet_names_day.html", names_sheet([(a, b, False) for a, b in PAIRS])),
                 ("sheet_names_night.html", names_sheet([(a, b, True) for a, b in PAIRS]))]:
    open(os.path.join(OUT, fn), "w", encoding="utf-8").write('<!doctype html><meta charset="utf-8"><style>%s</style>%s' % (CSS, body))
print("ok")
