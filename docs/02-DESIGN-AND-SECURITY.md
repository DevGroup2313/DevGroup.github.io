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
| The store manager | Own password | What the owner allows | Stage 2 |
| Employees | Own PIN, on a store device that is already opened | Only what the owner allows (for example, sales and the time clock) | Stage 2 |

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

### Employee PINs (Stage 2)

A short PIN cannot protect data on its own, because a stolen copy could be tried against every PIN. So PINs are used only
to say **who** is at the register on a store device that the owner or manager has already opened. The data stays sealed
by the Store Key. Repeated wrong PINs lock that employee out until a manager unlocks them.

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
- **No program is proof against every attack.** Before Emporium is relied upon under audit, I recommend an independent
  security review by a professional, and that your accountant review the reports' arithmetic and tax rules.
- Emporium does not file taxes, move money or replace the provider systems of RIA, CAM, Unitransfer or Boss Revolution.

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
