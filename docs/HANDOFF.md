# Lakay · handoff

Read this first in a new session. It says where Lakay stands and what comes next.

## Where things are

- **Repositories** (all work on branch `claude/magical-darwin-ppq4pn`). Each is set up for its device, the way the owner's other apps are (Inkwell, Ingenium, The Forge): the ready-made app in `builds/` on the front page, a READ ME FIRST for the device, a short README, and one release, "Lakay for <device> (latest build)", that lists only that device's files.
  - `DevGroup2313/Lakay-Windows`: the source of truth (everything below), the Windows installer in `builds/`, and `READ ME FIRST (Windows).txt`. (The old address `DevGroup2313/emporium` redirects here.)
  - `DevGroup2313/Lakay-Mac`: both Mac apps (Apple silicon for the Mac mini, Intel for the 2019 MacBook Pro) and the Mac build kit only.
  - `DevGroup2313/Lakay-Apps`: the iPhone and iPad app and the Fire tablet's, and their build kits only.
- **Making a release:** see "Releasing a build" in `README.md`. In short: raise `build.json`, build, test, run `python3 release/device_repos.py windows`, commit and push Lakay-Windows; then `python3 release/device_repos.py mac <clone of Lakay-Mac>` and `... apps <clone of Lakay-Apps>`, commit and push each. Put `[skip ci]` in a commit message to save work without building.
- **GitHub commits the apps into `builds/`** after each build (`release/publish.py`, as github-actions, with `[skip ci]`). So pull before pushing: `git pull --rebase origin claude/magical-darwin-ppq4pn`.
- **Released:** Build 5 (7 November 2026): the mark in true depth and the downloads set up as the other apps'. Build 4's files were confirmed on all three repositories before it.
- **Tests:** `node tests/t_build3.js` drives the whole app in Chromium (48 checks). Build with `python3 build.py`.

## How the app is made

- One HTML page built by `build.py` from `src/js/*.js` and `src/css/*.css`, in name order (`z-door.css` last).
- A strict Content Security Policy is used: no eval, no innerHTML. `E.util.h()` builds every element.
- The store's books are sealed with AES-GCM in IndexedDB, with a hash-chained ledger. Every change is one ledger line stamped with `by` (the user id) and the device.
- The old names stay where data lives, so nothing is lost: IndexedDB `emporium`, localStorage `emporium.`, the Fire and iPhone bridge `EmporiumHost`, and the data folders named Emporium.
- **Modules:**
  - `09-crest.js` + `crest.css`: the living mark, sixteen planes at real depth (the pictures are in `src/brand/lakay-mark`, eleven roles by day and by night).
  - `11-door.js`: Ingenium's introduction door with its lock pill, the sign-in in the card's place, the set-up with the Master Key.
  - `17-panel.js`: the Offline Project's edit menu (`#cd-em-menu`) and the device clipboard bridges.
  - `18-peek.js`: the show-password key on every password field.
  - `19-sound.js`: live sounds.
  - `20-rail.js` + `rail.css`: the side rail (Reminders, Price check, Low stock, Calculator, Day or night, New sale).
- **The mark is the Spiral.** It was chosen and approved. Its drawing sources are in `docs/brand/source` (`gen3.py`, `spiral9` draws the planes). Le Comptoir's compass rose and the other marks are kept in `docs/brand/backup`.

## What the owner asked for that is still to come

1. **Build 6: administrator and staff.**
   - The owner is the administrator, with full control.
   - Every person has a user id, stamped on every ledger line, sale and stock move.
   - Roles and levels of access are given by the owner. Staff never see costs, profits, budgets, the business's reports, Settings, the Studio or backups.
   - Sign out is clock out. The next person signs in and clocks in; breaks are recorded too.
   - The status key shows who is on the clock. Reports can be filtered by person.
2. **Schedae from Carpe Diem, in exact parity.** The sticky notes, their right-press menu, their side menu and their night dress, as 🗒️ on the rail.
3. **Inventory.** Departments, tabs and pages by kind of merchandise; a massive expansion for large inventories.
4. **Payments.** Card, Apple Pay and Google Pay through any processor (not only Square), and split payments.
5. **Learning.** Trainings for staff and new hires; a guided interactive tour with live demonstrations; tips throughout.
6. **The Author Studio** is to be redesigned; the owner calls it pitiful.
7. **Other business.** Travel bookings for clients, earnings, transfer and top-up logs, schedules and shift swaps.

## Rules the owner has set

- **Delivery:** the ready-made apps download from GitHub the way the other apps' do. No browser page in place of an app; no other way around.
- **Look:** Always hide scrollbars. Keep parity with Carpe Diem and Ingenium where the owner asks for it. Show designs before committing to them.
- **Writing:** No dashes in prose; short sentences; truth first; mark uncertainty.
- **Security:** Never read Android signing keys. The Fire key must be a GitHub secret (`EMPORIUM_ANDROID_KEY`, `EMPORIUM_ANDROID_KEY_PASSWORD`). Lakay-Apps does not yet hold it.
- **Process:** No pull requests unless asked. Give the owner a summary, download links and a handoff prompt with every release.
