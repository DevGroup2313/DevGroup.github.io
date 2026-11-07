#!/usr/bin/env python3
# EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
# NO LICENCE IS GRANTED. See LICENCE.txt.
"""Puts one package on its build's release page and adds its fingerprint.

    python release/publish.py <file> <label> [note]

The release is named after the build number in build.json ("build-2",
"Lakay build 2"); the first package to finish makes it, with the notes in
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
    # One release, "latest", updated in place with fixed file names, as the
    # owner's other apps publish theirs (Ingenium-Mac-Mini, Ingenium-Android-fire).
    tag, title = "latest", "Lakay (latest build)"
    commit = (os.environ.get("GITHUB_SHA") or "")[:7]
    name = os.path.basename(path)
    with open(path, "rb") as fh:
        digest = hashlib.sha256(fh.read()).hexdigest()
    tmp = tempfile.mkdtemp()

    if gh("release", "view", tag, capture=True).returncode != 0:
        with open(os.path.join(ROOT, "release", "NOTES.md"), encoding="utf-8") as fh:
            notes = fh.read().replace("@@BUILD@@", str(build)).replace("@@DATE@@", str(info.get("date", ""))).replace("@@COMMIT@@", commit)
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

    # The notes are written afresh from release/NOTES.md each time, so a later
    # change to the instructions reaches the page; the fingerprint lines already
    # there (one per package, under the last heading) are kept, this package's
    # replaced.
    with open(os.path.join(ROOT, "release", "NOTES.md"), encoding="utf-8") as fh:
        template = fh.read().replace("@@BUILD@@", str(build)).replace("@@DATE@@", str(info.get("date", ""))).replace("@@COMMIT@@", commit).rstrip("\n")
    line = "- %s: `%s`" % (name, digest)
    for _ in range(4):
        r = gh("release", "view", tag, "--json", "body", "-q", ".body", capture=True)
        if r.returncode == 0:
            old = r.stdout.rstrip("\n").splitlines()
            mark = max((i for i, x in enumerate(old) if x.startswith("**Fingerprints**")), default=-1)
            kept = [x for x in old[mark + 1:] if x.startswith("- ") and not x.startswith("- %s: " % name)] if mark >= 0 else []
            body = template.splitlines() + kept
            body.append(line)
            bf = os.path.join(tmp, "body.md")
            with open(bf, "w", encoding="utf-8") as fh:
                fh.write("\n".join(body) + "\n")
            if gh("release", "edit", tag, "--notes-file", bf).returncode == 0:
                break
        time.sleep(5)
    r = gh("release", "list", "--limit", "50", "--json", "tagName", "-q", ".[].tagName", capture=True)
    for old_tag in (r.stdout.split() if r.returncode == 0 else []):
        if old_tag.startswith("build-"):
            gh("release", "delete", old_tag, "--cleanup-tag", "-y")
            print("Removed the older page %s: everything is on %s now." % (old_tag, tag))
    if note:
        print(note)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write("### Published %s on %s\n\nSHA-256 %s\n\nhttps://github.com/%s/releases/tag/%s\n"
                     % (name, title, digest, os.environ.get("GITHUB_REPOSITORY", ""), tag))
    print("Published %s on %s (SHA-256 %s)" % (name, tag, digest))


if __name__ == "__main__":
    main()
