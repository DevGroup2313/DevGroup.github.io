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
4. Lakay's own builds were the last check. Build 12 was the first to run with them (14 November 2026): all five apps
   were built and published, `git push` from the workflows still worked, and the Fire tablet's build log shows no
   Node.js 20 warning.

## Updating an action later

Repeat the three checks for the new release, then replace the commit and the version beside it, here and in the
workflows (`.github/workflows/` in this repository, and `release/workflows/` for Lakay-Mac and Lakay-Apps, which
`release/device_repos.py` copies). Never go back to a bare label such as `@v7`.

## The owner's other apps (14 November 2026)

At the owner's request ("my apps", with Inkwell included that once), the same change was made on the branch each app
builds from, in one commit marked `[skip ci]` so that no build or release started:

- Carpe Diem: `Offline-ios`, `Offline-pro` (main) and `Carpe-Diem-Gift` (its own default branch).
- The Forge: `FFF`, `Forge-Fire`, `Forge-Mac`, `Forge-windows`, `The-forge-IOS` (main).
- Ingenium: `Ingenium-Mac-Mini`, `Ingenium-Mac-Intel`, `Ingenium-Android-fire`, `Ingenium-HPWindows` (main).
- Inkwell: `Inkwell-Android-fire`, `Inkwell-Mac-Mini`, `Inwell-Mac-Intel` (main).

Node.js 20 actions moved to the newest Node.js 24 release; actions already on a Node.js 24 major were pinned within it,
so their behaviour did not change:

| Action | Pinned release | Commit |
| --- | --- | --- |
| `actions/checkout` (from v4) | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/upload-artifact` (from v4) | v7.0.2 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| `actions/setup-python` (from v5) | v7.1.0 | `6d4fd22b20465ccc0f7354476588e8df7c9ca0e0` |
| `actions/setup-java` (from v4) | v6.3.0 | `d1374f8ac74474200d16ef8ecee22c7ae7a51880` |
| `gradle/actions/setup-gradle` (from v4) | v6.4.1, with `cache-provider: basic` | `8da46b539cd8fe6ab27ca75128919a18d757604c` |
| `actions/checkout` (v5) | v5.1.0 | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` |
| `actions/cache` (v5) | v5.1.0 | `caa296126883cff596d87d8935842f9db880ef25` |
| `actions/download-artifact` (v7) | v7.0.0 | `37930b1c2abaa49bbe596cd826c3c89aef350131` |
| `actions/setup-python` (v6) | v6.3.0 | `ece7cb06caefa5fff74198d8649806c4678c61a1` |
| `actions/upload-artifact` (v6) | v6.0.0 | `b7c566a772e6b6bfb58ed0dc250532a479d7789f` |
| `actions/setup-java` (v5) | v5.7.0 | `b6effb05e454b25005698d916606bdc6ffcbf961` |
| `gradle/actions/setup-gradle` (v5) | v5.0.2 | `0723195856401067f7a2779048b490ace7a47d7c` |
| `reactivecircus/android-emulator-runner` (v2) | v2.38.0 | `a421e43855164a8197daf9d8d40fe71c6996bb0d` |
| `anthropics/claude-code-action` (v1) | v1.0.276 (a composite action; its own step runs on Node.js 24) | `f3b070c88125d33dbae5653df5f143101d4ea9dc` |

Gradle's setup-gradle 6 uses a proprietary cache by default, offered to private repositories only as a free preview
(its own README). Inkwell's Fire build was told to use Gradle's open-source cache instead (`cache-provider: basic`).

Not changed: `DevGroup2313/Inkwell-Windows`, which this session could not reach; the work branches other chats keep
(they carry their own copies of the workflows until they are merged); and `Ingenium-Android-fire`'s
`.github/workflows/claude.yml`, which holds one line of text, not a workflow.
