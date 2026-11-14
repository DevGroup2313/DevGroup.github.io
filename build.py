#!/usr/bin/env python3
# LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
"""Builds app/Lakay.html, the whole app in one file, from src/.

    python3 build.py            writes app/Lakay.html and app/Lakay.html.sha256

The page refuses every script but its own: its Content Security Policy names the SHA-256 of the one script it carries.
The build stops if the code reaches for anything that would weaken that (eval, new Function, innerHTML, document.write,
a script or a style from the network)."""
import base64, glob, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")


def main():
    info = json.load(open(os.path.join(HERE, "build.json"), encoding="utf-8"))
    build, date = str(info["build"]), info["date"]
    parts = sorted(glob.glob(os.path.join(SRC, "js", "*.js")))
    js = "\n".join(open(p, encoding="utf-8").read() for p in parts)
    css = "\n".join(open(p, encoding="utf-8").read() for p in sorted(glob.glob(os.path.join(SRC, "css", "*.css"))))
    page = open(os.path.join(SRC, "lakay.html"), encoding="utf-8").read()

    # what the code must never do
    banned = [(r"\beval\s*\(", "eval"), (r"new\s+Function\s*\(", "new Function"), (r"\.innerHTML\b", "innerHTML"),
              (r"\.outerHTML\s*=", "outerHTML"), (r"insertAdjacentHTML", "insertAdjacentHTML"), (r"document\.write", "document.write"),
              (r"setTimeout\s*\(\s*['\"]", "setTimeout with a string"), (r"setInterval\s*\(\s*['\"]", "setInterval with a string")]
    for rx, what in banned:
        m = re.search(rx, js)
        if m:
            sys.exit("build stopped: the code uses %s near %r" % (what, js[max(0, m.start() - 60):m.end() + 20]))
    for u in re.findall(r"https?://[^\s\"')]+", js + css):
        if not u.startswith("http://www.w3.org/2000/svg"):
            sys.exit("build stopped: an address from outside: %s" % u)
    if "claude.ai" in js or "claudeusercontent" in js:
        sys.exit("build stopped: a script that does not belong")

    js = js.replace('"/*@@BUILD@@*/"', json.dumps(build)).replace('"/*@@DATE@@*/"', json.dumps(date))
    # the mark: the Spiral, its layers at depth (a coin with an edge, shadows on the plate, a shell with sides), by day and by night (drawn once, kept in src/brand/lakay-mark)
    MARK = os.path.join(SRC, "brand", "lakay-mark")
    def b64png(name):
        with open(os.path.join(MARK, name), "rb") as f:
            return "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")
    ROLES = ["edge", "plate", "engr", "hshadow", "sshadow", "halo", "sside", "shell", "lattice", "pearl", "sparks"]
    mark = {th: {r: b64png("spiral-%s-%s.png" % (th, r)) for r in ROLES} for th in ("day", "night")}
    js = js.replace('"/*@@MARK@@*/"', json.dumps(mark))
    if "@@" in js:
        sys.exit("build stopped: a placeholder was left in the code")
    # the logo alone for the tab, and its square tile for home screen shortcuts (both made by release/icons.py)
    favicon = b64png("web-coin-96.png")
    tile = b64png("web-tile-192.png")
    touch = b64png("web-tile-180.png")
    if "</script" in js.lower():
        sys.exit("build stopped: the code contains a closing script tag")
    digest = base64.b64encode(hashlib.sha256(js.encode("utf-8")).digest()).decode("ascii")
    out = (page.replace("@@CSS@@", css).replace("@@FAVICON@@", favicon).replace("@@ICON_TILE@@", tile).replace("@@TOUCH_ICON@@", touch).replace("@@BUILD@@", build).replace("@@DATE@@", date)
           .replace("@@SCRIPT_HASH@@", "sha256-" + digest).replace("@@JS@@", js))
    os.makedirs(os.path.join(HERE, "app"), exist_ok=True)
    path = os.path.join(HERE, "app", "Lakay.html")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(out)
    sha = hashlib.sha256(out.encode("utf-8")).hexdigest()
    with open(path + ".sha256", "w", encoding="ascii", newline="\n") as f:
        f.write("%s  Lakay.html\n" % sha)
    print("Lakay build %s (%s): app/Lakay.html, %d bytes, SHA-256 %s" % (build, date, len(out.encode("utf-8")), sha))


if __name__ == "__main__":
    main()
