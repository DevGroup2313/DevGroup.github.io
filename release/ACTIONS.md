# The GitHub actions Lakay's builds use

Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.

GitHub stopped supporting actions that run on Node.js 20 and runs them on Node.js 24 with a warning instead
([GitHub's notice, 19 September 2025](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)).
On 14 November 2026, at the owner's request, every action in Lakay's workflows was moved to a release that is written
for Node.js 24.

Each action is named by the **full commit** of its release, not by a version label such as `@v4`. A label can be moved
to other code; a commit cannot. So a changed, mistaken or hijacked release of an action can never reach Lakay's builds
without a change to this repository. The version is written beside each commit.

| Action | Release | Commit | Runtime | Used in |
| --- | --- | --- | --- | --- |
| `actions/checkout` | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` | node24 | every workflow |
| `actions/setup-python` | v7.1.0 | `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0` | node24 | Windows and Mac |

## How each was checked

1. The release's tag was read from the action's own repository on GitHub (`git ls-remote --tags`), and the commit it
   names was taken from there.
2. The action's own `action.yml` was read **at that commit**. Each says `runs: using: node24`.
3. The release notes were read for anything that would change Lakay's builds:
   - checkout 7: refuses, by default, to check out a fork's pull request under `pull_request_target` or
     `workflow_run` (Lakay uses neither); security fixes in its dependencies. Checkout 6 had moved the stored
     credentials out of `.git/config`; `git push` still works, which Lakay's workflows need to put the apps in `builds/`.
   - setup-python 7: its internals moved to ES modules; its inputs, outputs and behaviour are unchanged.
4. Lakay's own builds are the last check: see docs/CHANGES.md for the build that first ran with them, and its result.

## Updating an action later

Repeat the three checks for the new release, then replace the commit and the version beside it, here and in the
workflows (`.github/workflows/` in this repository, and `release/workflows/` for Lakay-Mac and Lakay-Apps, which
`release/device_repos.py` copies). Never go back to a bare label such as `@v7`.
