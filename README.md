# Lakay for Windows

**Build 5, 7 November 2026.** Lakay is the store's own app: inventory, the register and reports. It works with no connection, and it keeps the store's books sealed on each device. This repository also holds Lakay's source.

## Download

| The ready-made app | For | |
| --- | --- | --- |
| [**Lakay-Windows-Setup.exe**](builds/Lakay-Windows-Setup.exe) | Windows 10 and 11: the installer. The PC needs nothing else. | [Download now](https://github.com/DevGroup2313/Lakay-Windows/releases/latest/download/Lakay-Windows-Setup.exe) |

Double-click it, and follow [READ ME FIRST (Windows).txt](READ%20ME%20FIRST%20%28Windows%29.txt) if Edge or Windows warns about it. The same file is on the Releases page, "Lakay for Windows (latest build)".

The other devices have their own repositories, set up the same way:

- **Mac** (the Mac mini and Intel Macs): [Lakay-Mac](https://github.com/DevGroup2313/Lakay-Mac)
- **iPhone, iPad and the Fire tablet:** [Lakay-Apps](https://github.com/DevGroup2313/Lakay-Apps)

## What is here

- `builds/`: the ready-made Windows installer. Each new build replaces it.
- `READ ME FIRST (Windows).txt`: installing, updating, and where the books are kept.
- Lakay's source, for every device:
  - `src/`: the app (`src/js`, `src/css`, the mark's pictures in `src/brand`). `build.py` makes `app/Lakay.html` from it.
  - `tests/t_build3.js`: the whole app driven in Chromium.
  - `desktop/`: the window program for Windows and the Mac, with their recipes. `packages/`: the iPhone and iPad shell and the Fire tablet's.
  - `.github/workflows/windows.yml`: builds the Windows program, opens it once, installs and uninstalls it, scans it with Microsoft Defender, and puts it here and on the Releases page.
  - `release/`: `publish.py` (the Releases page and `builds/`), `device_repos.py` (makes Lakay-Mac and Lakay-Apps from this source), the other devices' workflows, and the READ ME FIRST files.
  - `docs/`: [HANDOFF.md](docs/HANDOFF.md) (where Lakay stands and what comes next), [CHANGES.md](docs/CHANGES.md) (each build), the design and security notes, and the mark's drawings in `docs/brand`.
- `LICENCE.txt`: all rights reserved; no licence is granted.

## Building and testing

    python3 build.py              # writes app/Lakay.html from src/
    node tests/t_build3.js        # drives the whole app in Chromium (Playwright)

The build stops if the code uses `eval`, `innerHTML`, `document.write` or an address outside the page. The page's Content Security Policy allows only its own script, named by its SHA-256.

## Releasing a build

1. Raise the build number and date in `build.json`, build, and run the tests.
2. `python3 release/device_repos.py windows` refreshes this README and the READ ME FIRST with the new build number.
3. Commit and push here. GitHub builds the Windows installer and puts it in `builds/` and on the Releases page.
4. `python3 release/device_repos.py mac <clone of Lakay-Mac>` and `python3 release/device_repos.py apps <clone of Lakay-Apps>` make those repositories from this source; commit and push each. GitHub builds their apps and puts them in their `builds/` and on their Releases pages.

Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
