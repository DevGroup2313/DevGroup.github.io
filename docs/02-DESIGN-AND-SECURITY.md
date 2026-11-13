# Emporium: design and security

How Emporium keeps the store's books, who can open them, and what protects them. The first part is in plain words for
the owner. The appendix gives the exact methods and numbers, for an auditor.

Written 7 November 2026 for Build 1. Parts marked with a stage are planned, not yet built.

## 1. Principles

1. **Offline first.** Every device keeps its own complete, sealed copy of the books and works with no connection.
   The internet is used only to keep devices in step (Stage 5), never to run the store.
2. **One source of truth: the ledger.** Every event is written as one line: a sale, a delivery, a stock correction, a
   clock-in, a price change. Stock levels and reports are worked out from those lines.
3. **Nothing is deleted.** A mistake is corrected by a new line that names the line it corrects and gives a reason.
   The original stays visible.
4. **Every line has an author.** Who did it, when, and on which device.
5. **Money is counted in whole cents.** No figure is ever stored as a fraction of a cent, so totals add up exactly.
6. **Plain words.** Every screen, message and report says what it means in short sentences, in English, French or
   Kreyòl.

## 2. Where the data lives

On each device, inside the app's own private storage (the browser's database, IndexedDB, which the Windows, Mac,
iPhone, iPad and Fire tablet programs keep in the user's own profile). There is no Emporium server holding your data.

### What is sealed and what is not

- **Sealed** (encrypted): every item, price, cost, stock figure, sale, receipt, report figure, setting, note, name of an
  employee and line of the ledger.
- **Not sealed:** the store's name shown at the door (so the right store is opened), the number of the build, and the
  technical facts needed to open the seal (which method, the random "salt"). The number of records of each kind can be
  counted by someone holding the device, but not read.

## 3. Who can open the books

| Who | How they sign in | What it opens | Stage |
|---|---|---|---|
| The owner | Password (at least 10 characters) | Everything | Build 1 |
| The owner, recovering | The **Master Key** (a 52 character code on a printed card) | Everything, and sets a new password | Build 1 |
| Each person on the staff (cashier, stock keeper, manager) | Their name or user ID, and their own password (at least 10 characters) | What the owner allows | Build 6 |

### The Store Key and how it is protected

The books are sealed with one random **Store Key** (256 bits). The Store Key itself is never written down in the clear.
It is kept in two sealed envelopes (more at Stage 2):

1. one sealed with a key made from the **owner's password**;
2. one sealed with a key made from the **Master Key**.

Opening either envelope gives the Store Key, which stays in the computer's memory only while the store is open. When the
app locks (by hand, after the idle time you choose, or when it closes), the Store Key is forgotten.

### The Master Key

- It is created at setup from the device's secure random generator, shown once, and confirmed by typing two of its
  groups.
- It can be printed as a card. Keep it in a safe place away from the store's computers (a safe, a deposit box).
- It never leaves the device inside the app and is never stored by Emporium.
- With it you can always open the books and choose a new password. Without the password and without the Master Key,
  nobody can open the books, including the person who wrote Emporium. This is what end to end encryption means, and it
  is why the card matters.

### The people's own keys (Build 6)

The owner asked that signing out be clocking out, and that the next person sign in on their own. So when a person signs
out, the books lock, and the next person must open them. A short PIN cannot do that safely: a stolen copy of the books
could be tried against every PIN in minutes. So each person has a password of their own, held to the same rule as the
owner's (at least 10 characters), and their own envelope of the Store Key:

- The owner adds a person in the Team room. The owner's password opens the Store Key in a form that can be sealed again,
  and a new envelope is sealed with a key made from the person's first password (PBKDF2, the same settings as the
  owner's). The envelope's additional data names the store and the person, so it cannot be moved.
- At their first sign-in the person chooses their own password, and their envelope is sealed again under it.
- Each person has a user ID (the owner is 1001; the people are 1002, 1003 and on). It is kept on every ledger line, sale,
  stock move and shift they make. Their names and IDs are kept plain at the door, as the owner's name is, so the sign-in
  can find the right envelope; a wrong name takes as long to refuse as a wrong password.
- Taking a key back removes the person's envelope. Everything they did stays in the books, under their name and ID.
- What each person may do (sell, items and prices, deliveries, stock corrections, costs and profit, reports, the team's
  hours) is kept in their sealed record. Lakay keeps to it in two places: the screens (rooms, keys and figures are not
  shown) and the books (a change a person may not make is refused). Settings, backups, the Author Studio and the people
  are the owner's alone.

### Each person's notes (Build 8)

Schedae, the sticky notes, are each person's own. Each person's notes are one sealed record (`notes:<user id>`), sealed
with the Store Key like every other record, with additional data that names the store and the record, so it cannot be
moved. They are not ledger lines: a note changes with every keystroke, and it is a person's own scribble, not the
store's accounts.

- A note is written half a second after typing stops, and at once when the books lock, with the key that was in hand.
  The writes are made one at a time, in order, each into the books it was made in (the store's own or the practice
  store's), so an older copy never lands after a newer one. Erasing, resetting the practice store and restoring a backup
  wait for the last write, so no note sealed with an old key is left in new books.
- A sign-in opens only the signing-in person's notes. Other people's notes stay sealed and are not opened in that session.
  The practice store opens all of its sample people's notes, since it changes from one person to another.
- A note's words and marks are kept as a small model of allowed marks (bold, italic, underline, strikethrough, lists,
  line breaks, and pictures kept inside the note as data), never as markup. What is pasted or dropped arrives as plain
  words, or as a picture made small in the page. No address outside the page can enter a note.
- A backup carries the notes, sealed, as it carries every record.

## 3b. The Author Studio's choices

The owner can rename the app and the store, rewrite any phrase, choose the colours and word the receipt. These choices
are data, never code: the tested build stays exactly the same.

- They are kept beside the envelopes, not sealed, so that the door can wear them before the store is opened. They hold
  no figure of the business.
- Each change is also a ledger line ("The Author Studio was used", with the parts that changed), written in the same
  transaction, so the books show who changed what and when.
- A file brought in is checked field by field: only the fields the Studio knows, only text, within set lengths, and
  only phrases that exist. Everything is shown as text and never run.
- Whatever the app is called, receipts, reports and About keep the software's own name and build, which an auditor checks
  against the release.

## 4. The ledger and its seal

Each line of the ledger carries a fingerprint (SHA-256) of the line before it, so the lines form a chain. Changing,
removing or reordering any earlier line breaks the chain from that point on. "Verify the books" (Settings) checks the
whole chain and reports the first line that does not match.

At closing (Stage 2), the **day's seal** prints the fingerprint of the last line of the day on the closing report. A
paper copy of that fingerprint, kept outside the computer, proves later that the day's records were not rewritten.

## 5. Keeping devices in step (Stage 5)

Devices will exchange sealed ledger lines through a relay on the internet. The relay only ever stores sealed data and
cannot read it. A new device joins only when the owner approves it on a device that is already open (or with the Master
Key). Several services can serve as the relay; the choice and its cost are yours (question 10 in `04-QUESTIONS.md`).

## 6. Payments (Stage 7)

When cards are added, the card system (for example Square) handles the card. Emporium records only the amount, the
method and the card system's reference. Card numbers never enter Emporium. This keeps the card rules (PCI DSS) with the
card company, as far as possible.

## 7. Protection against attacks and malware

- **No code from outside.** The app's page carries all its own code. A Content Security Policy forbids scripts and
  connections from anywhere else.
- **Text is never code.** Everything typed or imported (item names, notes, backup files) is shown as plain text and
  never interpreted as markup or script. This follows the Forge's security audit of pass 647.
- **Nothing hidden runs.** No `eval`, no remote fonts, no analytics, no trackers, no advertising.
- **Sealed at rest, locked when idle.** See sections 2 and 3.
- **Least privilege** (Stage 2). Each person can do only what the owner allows, and sensitive actions (refunds, price
  changes, deleting a person, exports) ask for the right person again.
- **Known builds.** Each release lists the SHA-256 fingerprint of every file, so a download can be checked. From Stage 9,
  builds will also be signed with your own key (PermitCore).
- **Tested builds.** Each build runs its tests before release (section 9).

## 8. Honest limits

Encryption protects data at rest and in transit. It cannot protect against everything:

- While the store is **open** on a device, anyone at that device can see what the screen shows. Lock it when you step
  away, and let the idle lock work.
- **Malware on a computer** can watch the screen and the keyboard while the store is open. Keep Windows and macOS up to
  date, use their built in protection, and do not install unknown programs on the counter computer.
- A **weak password** can be guessed from a stolen copy. Choose a long password; Emporium refuses short ones.
- **People acting together** (two employees covering for each other) cannot be stopped by software, but the ledger makes
  their actions visible after the fact.
- **The Reset at the door needs no password** (Build 7). It can end the wait after wrong tries, start the practice store again, or take the store off this device after the store's name is typed. Nothing in the books can be read this way: they stay sealed, and a backup saved first opens only with the password or the Master Key. The risk is loss, not disclosure: anyone at an unattended counter could erase that device's books. Keep a sealed backup off the device, every day.
- **The wait after wrong tries is short** (at most a minute) and the Reset ends it, so the owner is never shut out. The real protection against guessing is the password's length and the slow key derivation (PBKDF2, 600,000 rounds), not the wait.
- **A person's key opens the same sealed books as the owner's.** The limits on what each person sees (costs, profit,
  reports) are kept by Lakay itself, not by a separate lock on that data. Someone who copied the books and also knew a
  staff password, and who wrote their own program, could read everything. Give keys only to people you trust with the
  store, and take a key back when someone leaves.
- **No program is proof against every attack.** Before Emporium is relied upon under audit, I recommend an independent
  security review by a professional, and that your accountant review the reports' arithmetic and tax rules.
- Emporium does not file taxes, move money or replace the provider systems of RIA, CAM, Unitransfer or Boss Revolution.
- **Notes are kept apart by Lakay, not by a key of each person's own.** Every person who can open the books holds the
  Store Key, so someone who signs in and uses a browser's developer tools could, with effort, read another person's
  sealed notes on that device. Lakay never opens or shows them, but the seal itself is shared by everyone with a key.


## 9. Verification

Every build is checked in Chromium (the engine behind Edge and the Windows program) by automated tests: setup, the door,
the Master Key, sealing (the stored data is checked for any readable item name), sales arithmetic, stock, reports,
backups and restore, the ledger's chain, the three languages, and the layout at common screen sizes. The results are
published with the build.

## Appendix: methods and parameters (Build 1)

| Purpose | Method | Parameters |
|---|---|---|
| Random values | `crypto.getRandomValues` (Web Crypto) | |
| Store Key | AES-GCM | 256-bit key, generated by `crypto.subtle.generateKey` |
| Sealing each record | AES-GCM | 96-bit random IV per write; 128-bit tag; additional authenticated data = store id, record kind and record id |
| Password key | PBKDF2-HMAC-SHA-256 | 600,000 iterations (the OWASP Password Storage Cheat Sheet's recommendation for PBKDF2-HMAC-SHA-256); 128-bit random salt; password normalised to Unicode NFC |
| Master Key | 240 random bits + 16-bit checksum, written in Crockford Base32 (52 characters, 13 groups) | |
| Master wrapping key | HKDF-SHA-256 | salt = store id; info = "emporium master wrap v1" |
| Wrapping the Store Key | AES-GCM (`wrapKey` "raw") | 96-bit random IV; additional data names the store and the envelope |
| Ledger chain | SHA-256 over the line's canonical JSON, which includes the previous line's fingerprint | |
| Key in memory | The Store Key is unwrapped as non-extractable for daily use; it is unwrapped as extractable only during setup and password changes | |
| Idle lock | 15 minutes by default (5 to 60) | |
| Wrong password | A growing wait after 5 failures (the real protection is the cost of PBKDF2) | |

With a random 96-bit IV, NIST SP 800-38D advises at most 2^32 encryptions under one key. A store writing 100,000 records
a day would reach that limit after more than 100 years. Key rotation is still planned (Stage 9).
