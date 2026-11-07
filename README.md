LAKAY  |  Copyright (c) 2026 Yannie D. Forest. All rights reserved.
NO LICENCE IS GRANTED. See LICENCE.txt. Every distributed copy carries a build marker.

# Lakay

Lakay (formerly Emporium) is the store's own app: inventory, the register, reports, and (in the stages to come) staff, time cards, schedules, money
transfer logs, travel bookings and every device in step. It works with no connection, and the store's books are sealed
on each device with the owner's password and the Master Key. It belongs to the family of Carpe Diem, The Forge, Inkwell
and Ingenium.

## Build 4 (7 November 2026): the door, the side rail, the sounds

- **The door.** Ingenium's introduction door, always first: the mark, the name, Enter. The little lock in the card's top-left corner (as in Ingenium) opens the sign-in in the card's place; on a new device it sets up the real store. Carpe Diem's top bar on the door: Display, About and one language key.
- **The side rail, for the store.** 🔔 Reminders (orders, deliveries, bills; they ring when due, sealed in the books), 🔎 Price check (any item by name, code or barcode, with its price and stock; sell it or open it from there), 📦 Low stock (what runs low or out; receive a delivery in one press), 🧮 the calculator (it floats and can be carried anywhere; keyboard, a tape of results, copy), 🌙 day or night, 🛒 a new sale. The › key lays them down.
- **The sounds.** Made live, as Ingenium's are: the door's welcome, felt key taps, a page set down, the mark's flywheel, a book shut, the lamp, a sale sealed. Never in Calm; on or off and three volumes in Display.
- **The edit menu.** The Offline Project's own right-press menu, only where there is something to edit or copy.
- **The mark** in Lakay's own deep periwinkle enamel, with a pearl-light shell and champagne gold; every icon redrawn.
- **Show the password** on every password field.

## Build 3 (7 November 2026): Lakay

- **The name and the mark.** Emporium is now Lakay. Its mark is the Spiral: a nautilus cut in facets like a jewel, on an enamel plate with a fine champagne rim, a pearl at its heart. It lives in seven layers, as Ingenium's seal does: it sways, leans toward the pointer, breathes in depth, turns in counter motion, and winds up like a flywheel when pressed. Every device icon is drawn from it. Le Comptoir and its compass rose are kept in `docs/brand/backup/`.
- **Colours.** Dawn: a warm periwinkle between Carpe Diem's blue and Ingenium's purple, with a sunrise glow and champagne gold.
- **The top bar.** Carpe Diem's capsule: the fold key, the status key, Alerts, Display, Guide, About, and one language key with a small flag.
- **Everywhere.** Hidden scrollbars; the right press panel (Undo, Redo, Cut, Copy, Paste, Paste as plain text, Select all) that works with the device's own clipboard; a show-password key on every password field; Ingenium's footer, with the build number in About and the Guidebook.
- **The door.** Ingenium's door: Enter opens the practice store at once; the real store is set up with a sign-in and the Master Key.
- **Reports.** This hour, the morning, the afternoon, the evening, a day, another day, the week, the month, 2, 3, 6 and 12 months, the year, or between two dates, with every sale listed.
- **Downloads by device.** Lakay-Windows (Windows and the standalone page), Lakay-Mac (both Macs) and Lakay-Apps (iPhone, iPad and Fire). The data folders keep the name Emporium, so nothing is lost.

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

**To install it:** open the latest release (Releases, "Emporium (latest build)") and download the file for the
device: `Emporium-Windows-Setup.exe`, `Emporium-Mac-Apple-Silicon.zip`, `Emporium-Mac-Intel.zip`,
`Emporium-Android-Fire.apk`, `Emporium-iPhone-iPad-unsigned.ipa`, or `Emporium-Standalone-Page.zip`. The release
page says how to install each. GitHub builds them all from this repository and replaces them with each new build.

**To try it without installing:** open `app/Lakay.html` in Microsoft Edge, Chrome or Safari. Nothing leaves the
device.

`app/Lakay.html.sha256` holds the fingerprint of the page, to check a download.

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

    python3 build.py                                   # writes app/Lakay.html from src/
    node tests/t_build1.js <address of Lakay.html> <folder for pictures>   # 65 checks in Chromium (Playwright)

The build stops if the code uses `eval`, `innerHTML`, `document.write` or an address outside the page. The page's
Content Security Policy allows only its own script, named by its SHA-256.
