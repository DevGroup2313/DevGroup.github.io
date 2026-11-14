#!/usr/bin/env python3
# LAKAY  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
# NO LICENCE IS GRANTED. See LICENCE.txt.
"""Makes each device's repository from this one (Lakay-Windows, the source), the way the owner's other apps are
kept: the ready-made app in builds/, a READ ME FIRST for the device, a short README, and that device's build kit only.

    python3 release/device_repos.py windows                  this repository's own README and READ ME FIRST
    python3 release/device_repos.py mac  <clone of Lakay-Mac>
    python3 release/device_repos.py apps <clone of Lakay-Apps>

The web app needs no repository: build.py makes builds/Lakay-Web.zip, for the owner to upload to the store's own website.

A device repository is emptied first, except .git and builds/ (its ready-made apps, which GitHub replaces after each
build). Nothing is committed here: look, then commit and push. Only files git tracks here are copied.
"""
import datetime
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
README = os.path.join(ROOT, "release", "readme")
COMMON = ["LICENCE.txt", "build.json", "app/Lakay.html", "app/Lakay.html.sha256", "release/publish.py", ".gitignore"]
KITS = {
    "mac": {
        "paths": ["desktop/emporium_app.py", "desktop/mac"],
        "workflows": ["mac.yml"],
        "guides": ["READ ME FIRST (Mac).txt"],
    },
    "apps": {
        "paths": ["packages/ios", "packages/fire"],
        "workflows": ["ios.yml", "fire.yml"],
        "guides": ["READ ME FIRST - IPHONE AND IPAD.txt", "READ ME FIRST - FIRE TABLET.txt"],
    },
}
ATTRIBUTES = """app/Lakay.html -text
app/Lakay.html.sha256 -text
builds/** binary
*.exe binary
*.zip binary
*.apk binary
*.ipa binary
*.ico binary
*.icns binary
*.png binary
*.jpg binary
"""


def tracked(paths):
    out = subprocess.run(["git", "ls-files", "-z", "--", *paths], cwd=ROOT, capture_output=True, text=True, check=True)
    return [p for p in out.stdout.split("\0") if p]


def words():
    with open(os.path.join(ROOT, "build.json"), encoding="utf-8") as fh:
        info = json.load(fh)
    d = datetime.date.fromisoformat(info["date"])
    return {"@@BUILD@@": str(int(info["build"])), "@@DATE@@": "%d %s %d" % (d.day, d.strftime("%B"), d.year)}


def fill(src, dst):
    with open(src, encoding="utf-8") as fh:
        text = fh.read()
    for k, v in words().items():
        text = text.replace(k, v)
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    with open(dst, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def empty(target):
    for name in os.listdir(target):
        if name in (".git", "builds"):
            continue
        p = os.path.join(target, name)
        if os.path.isdir(p) and not os.path.islink(p):
            shutil.rmtree(p)
        else:
            os.remove(p)


def make(kind, target):
    kit = KITS[kind]
    target = os.path.abspath(target)
    if not os.path.isdir(os.path.join(target, ".git")):
        sys.exit("%s is not a clone of the device's repository." % target)
    if os.path.samefile(target, ROOT):
        sys.exit("The device repository must be a separate clone, not this one.")
    empty(target)
    for rel in tracked(COMMON + kit["paths"]):
        dst = os.path.join(target, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel), dst)
    for wf in kit["workflows"]:
        dst = os.path.join(target, ".github", "workflows", wf)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, "release", "workflows", wf), dst)
    for guide in kit["guides"]:
        fill(os.path.join(README, guide), os.path.join(target, guide))
    fill(os.path.join(README, "README-%s.md" % kind), os.path.join(target, "README.md"))
    with open(os.path.join(target, ".gitattributes"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(ATTRIBUTES)
    os.makedirs(os.path.join(target, "builds"), exist_ok=True)
    print("Made the %s repository in %s." % (kind, target))


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("windows", "mac", "apps"):
        sys.exit(__doc__)
    if sys.argv[1] == "windows":
        fill(os.path.join(README, "README-windows.md"), os.path.join(ROOT, "README.md"))
        fill(os.path.join(README, "READ ME FIRST (Windows).txt"), os.path.join(ROOT, "READ ME FIRST (Windows).txt"))
        with open(os.path.join(ROOT, ".gitattributes"), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(ATTRIBUTES)
        w = words()
        with open(os.path.join(ROOT, "build.json"), encoding="utf-8") as fh:
            stage = json.load(fh).get("stage", "")
        with open(os.path.join(ROOT, "BUILD_INFO.txt"), "w", encoding="utf-8", newline="\n") as fh:
            fh.write("Lakay\nBuild: %s\nDate: %s\nStage: %s\nCopyright (c) 2026 Yannie D. Forest. All rights reserved.\n"
                     "NO LICENCE IS GRANTED.\n" % (w["@@BUILD@@"], w["@@DATE@@"], stage))
        print("Wrote this repository's README.md, READ ME FIRST (Windows).txt and BUILD_INFO.txt.")
        return
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    make(sys.argv[1], sys.argv[2])


if __name__ == "__main__":
    main()
