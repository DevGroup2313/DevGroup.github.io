#!/usr/bin/env python3
# EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
# NO LICENCE IS GRANTED. See LICENCE.txt.
"""Puts one package on its build's release page and adds its fingerprint.

    python release/publish.py <file> <label> [note]

The release is named after the build number in build.json ("build-2",
"Emporium build 2"); the first package to finish makes it, with the notes in
release/NOTES.md. Each package then adds one line to the notes: its label, its
file name and its SHA-256. Run by the GitHub workflows; uses the gh command
with the workflow's own token.
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def gh(*args, capture=False):
    return subprocess.run(["gh", *args], capture_output=capture, text=True)


def main():
    path, label = sys.argv[1], sys.argv[2]
    note = sys.argv[3] if len(sys.argv) > 3 else ""
    with open(os.path.join(ROOT, "build.json"), encoding="utf-8") as fh:
        info = json.load(fh)
    build = int(info["build"])
    tag, title = "build-%d" % build, "Emporium build %d" % build
    name = os.path.basename(path)
    with open(path, "rb") as fh:
        digest = hashlib.sha256(fh.read()).hexdigest()
    tmp = tempfile.mkdtemp()

    if gh("release", "view", tag, capture=True).returncode != 0:
        with open(os.path.join(ROOT, "release", "NOTES.md"), encoding="utf-8") as fh:
            notes = fh.read().replace("@@BUILD@@", str(build)).replace("@@DATE@@", str(info.get("date", "")))
        nf = os.path.join(tmp, "notes.md")
        with open(nf, "w", encoding="utf-8") as fh:
            fh.write(notes)
        # Another package may make the release at the same moment; then this
        # one simply finds it there.
        gh("release", "create", tag, "--target", os.environ.get("GITHUB_SHA", "HEAD"),
           "--title", title, "--notes-file", nf)

    for wait in (0, 15, 30, 60):
        time.sleep(wait)
        if gh("release", "upload", tag, path, "--clobber").returncode == 0:
            break
        print("GitHub did not accept the file; trying again.")
    else:
        sys.exit("GitHub did not accept %s after four tries. If an error above says 403, the cure is "
                 "Settings, Actions, General, Workflow permissions: Read and write." % name)

    line = "- %s: `%s`, SHA-256 `%s`%s" % (label, name, digest, (". " + note) if note else "")
    for _ in range(4):
        r = gh("release", "view", tag, "--json", "body", "-q", ".body", capture=True)
        if r.returncode == 0:
            body = [x for x in r.stdout.rstrip("\n").splitlines() if not x.startswith("- %s: " % label)]
            body.append(line)
            bf = os.path.join(tmp, "body.md")
            with open(bf, "w", encoding="utf-8") as fh:
                fh.write("\n".join(body) + "\n")
            if gh("release", "edit", tag, "--notes-file", bf).returncode == 0:
                break
        time.sleep(5)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write("### Published %s on %s\n\nSHA-256 %s\n\nhttps://github.com/%s/releases/tag/%s\n"
                     % (name, title, digest, os.environ.get("GITHUB_REPOSITORY", ""), tag))
    print("Published %s on %s (SHA-256 %s)" % (name, tag, digest))


if __name__ == "__main__":
    main()
