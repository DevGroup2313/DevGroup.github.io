EMPORIUM  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
NO LICENCE IS GRANTED. See LICENCE.txt. Every distributed copy carries a build marker.

# Emporium

The store's own app: inventory, the register, reports, and (in the stages to come) staff, time cards, schedules, money
transfer logs, travel bookings and every device in step. It works with no connection, and the store's books are sealed
on each device with the owner's password and the Master Key. It belongs to the family of Carpe Diem, The Forge, Inkwell
and Ingenium.

## Build 2 (7 November 2026): the foundation, redesigned, with the Author Studio

- One family of colours: lavender mist, white and indigo by day; a midnight library (ink, parchment, brass) by night.
  Compact raised keys at the Forge's scale, figures set like a ledger, the ticket as a slip of receipt paper, and the
  side menu after the Forge's own.
- The store's name at the top of every page, so the screen always says whose system it is.
- The Author Studio (after Carpe Diem's): rename the app and the store, rewrite any phrase in English, French or Kreyòl,
  choose a matched set of colours, word the receipt, and export, import or reset those choices. Every change is written
  in the ledger, and the software's own name and build stay on receipts and reports for audits.
- 65 checks in Chromium, served and opened from a file.

## Build 1 (7 November 2026): the foundation

- The door: setting up the store in five steps, the owner's password, the Master Key (shown once, confirmed, printable),
  recovery with the Master Key, restoring a backup.
- The books sealed on the device (AES-GCM, with the Store Key in two envelopes), a ledger whose lines are chained by
  SHA-256 fingerprints, locking by hand and when idle, and "Verify the books".
- Inventory: items, categories, prices, costs, barcodes, reorder levels; receiving stock at an average cost; correcting
  stock with a reason; archiving; each item's history.
- The register: search or scan, the ticket, sales tax, cash with the change to give, the receipt.
- Reports for any period: sales, tax, cost of goods, gross profit, best sellers, items not selling, sales by hour and by
  category, losses, stock value; CSV files for the accountant.
- Sealed backups and restore; English, French and Kreyòl; Day, Night and Auto; larger text; Calm mode; tips beside the
  controls; the Guidebook.

**To install it:** the repository's Releases page holds each build's packages, made by GitHub from this repository:
the Windows installer (`Emporium-Build-2-Windows-Setup.exe`) and the standalone page
(`Emporium-Build-2-Standalone-Page.zip`). The Mac, iPhone and iPad, and Fire tablet packages follow.

**To try it without installing:** open `app/Emporium.html` in Microsoft Edge, Chrome or Safari. Nothing leaves the
device.

`app/Emporium.html.sha256` holds the fingerprint of the page, to check a download.

## The documents

- `docs/01-AUDIT-AND-RECOMMENDATIONS.md`: what Carpe Diem, The Forge, Inkwell and Ingenium can give Emporium.
- `docs/02-DESIGN-AND-SECURITY.md`: how the books are kept and protected, in plain words, with the methods for an auditor.
- `docs/03-STAGES.md`: the stages, and what to check at each.
- `docs/04-QUESTIONS.md`: the questions still open.

## The packages

- `desktop/emporium_app.py`: the window around the page for Windows (and later Mac), after the Forge's Windows program.
- `desktop/windows/`: the PyInstaller recipe and the Inno Setup installer script.
- `.github/workflows/windows.yml`: builds the program, opens it once, installs and uninstalls it, scans it with Microsoft
  Defender, and puts the installer on the build's release page. `.github/workflows/page.yml` does the same for the
  standalone page. `release/publish.py` names each release after the build number in `build.json`.

## Building and testing

    python3 build.py                                   # writes app/Emporium.html from src/
    node tests/t_build1.js <address of Emporium.html> <folder for pictures>   # 65 checks in Chromium (Playwright)

The build stops if the code uses `eval`, `innerHTML`, `document.write` or an address outside the page. The page's
Content Security Policy allows only its own script, named by its SHA-256.
