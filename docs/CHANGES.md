# Lakay: what changed in each build

Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.

The newest build is first. The build number also shows in Lakay's About.

## Build 9 (13 November 2026): the edit menu everywhere, and Schedae's own papers

- **The right press's edit menu, inside the sticky notes and every field.** Three faults were found and fixed:
  - A right press on bold or listed words inside a note took only those words as the field, so Select all, Copy the whole field and Clear the field acted on part of the note. The menu now always takes the whole note (the whole editable area).
  - On the Fire tablet, Paste put the tablet program's whole answer into the field, braces and all, instead of the words. The page now takes the words from it.
  - In a browser and the standalone page, Copy borrowed the focus for a moment, so Cut inside a note copied the words but did not remove them. The focus and the selection now go straight back, and Cut removes what it copied.
- **Checked on every road the words travel:** the browser's own clipboard, the Fire tablet's program, the iPhone and iPad program, and the Mac and Windows program, in a sticky note, a search field, a text area in a dialog, and words chosen on the page.
- **Schedae's own papers.** The notes no longer use Carpe Diem's colours. Lakay has six papers of its own, light pastels by day, each with its own night paper, named in Kreyòl: Mango, Lanmè, Flanbwayan, Zaboka, Douvanjou and Kokoye. The inks are Lakay's too. A note made in Build 8 takes the Lakay paper nearest to its old one.
- tests/t_build9.js: 21 checks, served from this computer so the test reaches a real clipboard. All the earlier suites pass.

## Build 8 (13 November 2026): Schedae, and the Dawn dress refined

- **Schedae, Carpe Diem's sticky notes, in parity,** behind the 🗒️ key at the foot of the side keys. The list makes a new note, finds notes by their words, pins and unpins them, copies their words, and deletes them. A note floats over every room until its ✕ unpins it. It moves by its top and grows from any edge or its corner. Its ⋯ menu changes its paper (Carpe Diem's six: Foolscap, Primrose, Inkwell, Claret, Laurel, Vespers), folds it, opens the list, copies it, or deletes it. Its keys make words bold, italic, underlined or struck through, start a list, add a picture, and save. Undo and redo are on its top. The paper, edges, night papers, ink, head, tools and corner carry the values measured from Carpe Diem by day and by night.
- **Two departures from Carpe Diem, on purpose.** "Send to Tabula" is "Copy the note", since Lakay has no Tabula. New note in the list puts the list away and leaves the caret in the new note, so it can be written in at once.
- **Each person's own, and sealed.** Notes are sealed in the books with the Store Key, one record per person, and a backup carries them. A sign-in opens only that person's notes; the practice store opens all of its sample people's. A note saves itself half a second after typing stops, and again when the books lock. Notes are not ledger lines: they are a person's own scribbles, not the store's accounts.
- **No foreign markup.** A note keeps its words and marks as a small model (bold, italic, underline, strikethrough, lists, line breaks, and pictures held inside the note), never as markup. A paste arrives as plain words, or as a picture. Nothing from outside the page can enter a note.
- **The right press** inside a note opens the Offline Project's edit menu, as in every field.
- **The Dawn dress, refined, by the owner's request.** Lakay keeps its design and its periwinkle; the surfaces are a step more refined. By day: white and ivory faces with crisp hairline rims and a firm stepped edge, a deeper and matte periwinkle on the main keys and the room jewels, and a quieter sunrise behind the page. By night: Lakay's periwinkle ink, calmer and deeper, in place of the saturated indigo. Dialogs, the edit menu, the side keys' panels and the calculator are flat slabs with a hairline rim, without the purple glow and the pillowed walls. The other colour sets follow.
- **The Reset's erase choice** is a quiet card in the same ink as the others, marked by a small brick-red badge and dot, not painted red.
- A new Guidebook chapter: Sticky notes (Schedae).
- tests/t_build8.js: 36 checks, all passing, with the 48 of t_build3.js, the 42 of t_build6.js and the 24 of t_build7.js.

## Build 7 (12 November 2026): never locked out

The owner reported being shut out of Lakay: refused at the door, asked again and again for a key, and unable to reach the practice store. Build 6 had prefilled the sign-in's name with the owner's record name while the door still compared the typed name with the name given at the first sign-in; when the two differed, every try was refused even with the right password, and five refusals started a wait that grew to fifteen minutes. This build removes every such lock.

- **The password is the key, never the name.** The owner's envelope is tried with the owner's password whatever name is typed, or none. A staff name still finds that person's own envelope first.
- **The practice store is always on the door.** Its own key sits beside Enter when a store exists. If its sample books will not open, the door offers to start the practice store again.
- **Refresh and Reset,** on the door's bar and in Display. Refresh starts the app again, as a browser's refresh does. Reset needs no password and offers three things: clear the wait and the remembered name; start the practice store again; or take the store off this device after a sealed backup (the store's name must be typed; a backup can be saved first and restored later with the password or the Master Key). "Can't sign in?" offers Reset as a third way.
- **The wait after wrong tries** is now at most a minute, and the Reset ends it.
- Dialogs and messages now sit above the sign-in card, so nothing on the door is ever out of reach.
- tests/t_build7.js: 24 checks, all passing, with the 48 of t_build3.js and the 42 of t_build6.js.

## Build 6 (7 November 2026): the owner as administrator, the staff, and the time clock

- **The owner is the administrator,** with every room and key, and the user ID 1001. Settings, backups, the Author Studio and the people with their keys are the owner's alone.
- **The Team room.** The owner adds each person with a name, a user ID (1002, 1003 and on) and a level of access: Cashier, Stock keeper, Manager, or chosen one by one (sell; items and prices; deliveries; stock corrections; costs and profit; reports; the team's hours). The owner gives a first password; the person chooses their own at their first sign-in. A key can be given again, or taken back; what the person did stays in the books.
- **Who did what.** Every ledger line, sale, receipt, stock move and shift carries the person's user ID. The receipt says who served; the history of an item says who did each thing; the reports have a Person chooser and a table of each person's sales, with the time they worked and their sales per hour.
- **Signing in and out is the time clock.** A person signs in with their name or ID and their own password, and is clocked in as they arrive. The status key at the top shows who is in, green on the clock and amber on a break; it starts and ends breaks, clocks out, and signs out. "Clock out and sign out" brings the door back for the next person. My hours shows each week's shifts; the owner and managers see everyone's hours and who is on the clock now, and can clock out a person who forgot.
- **What each person sees.** A person without costs and profit sees no cost, profit or value of the stock anywhere: not in Inventory, the item cards, Home, the reports or the CSV files. The rooms, keys and side-rail keys follow each person's access, and the books themselves refuse a change a person may not make.
- **The practice store** has two sample people, Marie (a cashier) and Jean (a manager), with two weeks of shifts and sales. The status key there shows the store as each of them sees it.
- Two new Guidebook chapters: Your team, and Signing in, the clock and breaks.
- tests/t_build6.js: 42 checks, all passing, with the 48 of tests/t_build3.js.

## Build 5 (7 November 2026): the mark in true depth, and the downloads set up as the other apps'

- **The mark in true depth.** The Spiral now stands in sixteen planes at real depth, with its drawing unchanged: the coin's gold edge (four planes behind the face, so its thickness shows as it turns), the shadows the halo and the shell cast on the plate, the shell's own sides under its faceted top, then the lattice, the pearl and the sparkles. It sways further, leans toward the pointer, and its rings, shell and pearl breathe in and out of depth out of step. A press still winds it up like a flywheel. Calm keeps it still.
- **Downloads, as the other apps have them.** Each repository is set up for its device, as Inkwell's and Ingenium's are: the ready-made app in `builds/` on the front page, a READ ME FIRST for the device, and a short README. Each Releases page is "Lakay for <device> (latest build)" and lists only that device's files. Lakay-Mac holds both Mac apps; Lakay-Apps holds the iPhone and iPad app and the Fire tablet's; Lakay-Windows holds the Windows installer and Lakay's source.
- The standalone page is no longer offered as a download: every device has a ready-made app. The iPhone and iPad file is now `Lakay-iPhone-iPad.ipa`.

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
