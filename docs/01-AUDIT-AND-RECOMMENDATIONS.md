# Emporium: what your four apps can give it

An audit of Carpe Diem, The Forge, Ingenium and Inkwell, read for one purpose: to find what Emporium, the store's app,
should inherit from them, and what it needs that none of them has.

Written 7 November 2026 for Build 1. Yannie D. Forest decides what is kept; nothing here is final until approved.

## 1. What was examined

| App | Build read | How |
|---|---|---|
| Carpe Diem | 1080, the Public sample | The built page: its 41 Guidebook articles, its rooms, its tools, its settings. |
| The Forge | 656 (9s88) | The built page, and its blocks in DevGroup2313/Ingenium-Mac-Mini (accessibility, Quiet Screen, permissions, security audit of pass 647). |
| Ingenium | 6.9.3, the demo edition | The built page, and its sources (commit ee11182): the sign-in seal, the shared modules, the device kits, the tests. |
| Inkwell | 7.52 | The built page: its rooms and settings, read only for features. |
| Shared parts | as carried by Ingenium 6.9.3 | Tabula, Abacus, Imago (slides), Scriba, Fontes, the Thought Cloud, the Quiet Screen, SupportCore, PermitCore, Fabrica. |
| Build recipes | current | The iPhone and iPad recipe (offline-pro), the Mac recipe (Ingenium-Mac-Mini), the Windows kit (FFF, The Forge 648). |

Each recommendation below says what the feature is, where it comes from, what it would do for the store, and the stage
in which it would arrive (the stages are in `03-STAGES.md`). A star (★) marks those I consider most valuable.

## 2. Opening the app and signing in

1. ★ **The morning door** (Carpe Diem). Each day begins with a small card that greets the user, names the day and asks
   for its shape. *For the store:* the opening routine. Who is opening, the cash counted into the drawer, the owner's
   notes for the day, deliveries expected and shifts on duty. Accountability starts at the first minute. *Stage 2.*
2. ★ **Sign-in protection with a recovery phrase** (Ingenium). A password at the door seals everything the app keeps,
   and a recovery phrase is shown once and confirmed by typing two of its words. *For the store:* the owner's password
   and the **Master Key**, a code printed on a card and kept in a safe, which can always open the books and reset any
   password. *Build 1.*
3. ★ **Locking when idle** (Ingenium locks itself after a quiet spell). *For the store:* the register locks after a
   chosen number of minutes, so an unattended computer is never left open. *Build 1 for the owner; Stage 2 for staff.*
4. **"Forgot your password?"** (Ingenium). *For the store:* the owner recovers with the Master Key; a manager resets a
   cashier's PIN; nobody is ever locked out of the business. *Build 1 (owner), Stage 2 (staff).*
5. **Earlier desks on this computer** (Ingenium). *For the store:* if a computer ever held two stores (a practice store
   and the real one), the door shows which is which. *Stage 2, with practice mode.*

## 3. Learning the app

6. ★ **The Guidebook** (all four apps; Carpe Diem's has 41 articles, each with a tip). *For the store:* one article for
   each room and each task, in English, French and Kreyòl, written in short sentences. *Build 1 starts it; it grows at
   every stage.*
7. ★ **The guided tour with live demonstrations** (Carpe Diem's tour shows a button, explains it, then presses it:
   "Next, we will press it."). *For the store:* the tour rings up a real-looking sale in a **practice store** (item 31),
   so a new employee watches each step happen and then repeats it without touching real money. *Stage 6.*
8. ★ **A tip on every card** (Carpe Diem's Guidebook and the Forge's Shortcuts library). *For the store:* small tip
   buttons beside each control that can be misunderstood: what it does, when to use it, what to do instead. *Build 1.*
9. **Read aloud** (Carpe Diem's narrated lectures). *For the store:* any Guidebook article or tip can be read aloud, for
   those who prefer listening. It uses the voices the device already has. *Stage 6.*
10. **Which build am I running** (Carpe Diem's About ends with the build). *For the store:* the build number is on the
    door, in About and at the foot of every report, so you always know which version you installed and which version
    produced a figure. *Build 1.*
11. **Honest limits** (Ingenium has a page that says what it cannot do). *For the store:* a page that says plainly what
    Emporium does not do (it does not file taxes; it does not move money; it does not replace your accountant). *Build 1,
    in the design notes; in the app at Stage 6.*

## 4. Accessibility, for AuDHD and for older users

12. ★ **One clear thing per screen.** All four apps avoid crowding, and the Offline Project's rooms keep one main action
    in view. *For the store:* the register shows the sale and one large button to take payment; setup asks one question
    per page; long forms are split into steps. *Build 1.*
13. ★ **Calm and Clear words** (Ingenium's Focus offers "Calm" and "Clear words"). *For the store:* a Calm mode (no
    motion, fewer colours, larger buttons) and plain labels everywhere. *Build 1 (text size, Calm mode).*
14. **Reduced motion respected** (every app follows the device's request for less motion). *Build 1.*
15. ★ **Accessibility audits on every room** (the Forge 644 tested each room with axe-core to WCAG 2.1 AA, by day and by
    night, and fixed contrast, keyboard and screen reader faults). *For the store:* the same tests at every build, so
    text stays readable and every key works from the keyboard. *Build 1 tests the contrast and the keyboard; the full
    axe-core run arrives at Stage 2.*
16. **One light for every room** (Carpe Diem: Day, Night and Auto, one switch for the whole house). *Build 1.*
17. **The Quiet Screen** (Ingenium, carried by the Forge): a still screen with a slow breathing circle and one way back.
    *For the store:* a calm minute for staff after a difficult customer, with the register locked behind it. *Stage 6.*
18. **"Where was I?"** (Inkwell). *For the store:* an interrupted sale or stock count is kept and offered back when the
    person returns. *Stage 2 (held sales).*
19. **Reminders in the app's own card** (the Forge 644 dressed every reminder in its own colours). *For the store:*
    reminders for reorders, provider settlement days and shift starts, in Emporium's own look. *Stage 4.*

## 5. Tools you asked for

20. ★ **Tabula** (the word processor, with Word and PDF export). *For the store:* letters, store policies, the staff
    handbook, supplier letters, price notices. *Stage 6.* Ingenium already carries Tabula as a separate page
    (`source/build/apps/tabula.html`), which makes the move simpler.
21. ★ **Abacus** (the spreadsheet, with CSV). *For the store:* price calculations, ad hoc counts, and the bridge for
    importing an existing inventory list. *Stage 6; CSV import of inventory arrives earlier, at Stage 2.*
22. ★ **Imago** (the slides). *For the store:* promotion slides for a screen facing customers, and training slides.
    *Stage 6.*
23. ★ **Sticky notes beside Clepsydra** (Carpe Diem's sticky notes float over any page and can be sent to Tabula; Clepsydra
    is the timer beside them; Ingenium's Thought Cloud adds an Inbox and numbering). *For the store:* the owner pins a
    note for the next shift ("Delivery from the perfume supplier at 2 pm"), and a shift leaves a handover note for the
    next. I have read "Clepsydra's sticky notes" this way; please confirm (question 12 in `04-QUESTIONS.md`). *Stage 6.*
24. **Clepsydra and Custodia** (the focus timer and the break guard). *For the store:* break timers that are tied to the
    time clock, so a 30 minute break is timed and recorded. *Stage 3.*
25. **Signatures** (Tabula, Abacus and Imago carry a signature panel). *For the store:* a signature on a time card
    approval, a cash count, a delivery receipt. Signatures belong to the store's sealed data and never to the app's
    code. *Stage 3.*
26. **Floating windows** (Carpe Diem). *For the store:* the calculator or the notes open over the register without
    leaving the sale. *Stage 6.*
27. **Scriba, dictation** (Carpe Diem). *For the store:* item names spoken instead of typed, for those who find typing
    slow. It depends on what each device offers without a connection. *Stage 6, if the devices allow it.*

## 6. Keeping the data safe

28. ★ **Backup and moving to another device** (Ingenium's "Backup and moving"; Inkwell's "Move your library to another
    device"). *For the store:* a sealed backup file that only your password or the Master Key can open, saved on demand
    and offered at closing. *Build 1.*
29. ★ **Recover an earlier moment** (Ingenium) and **Earlier copies of your library** (Inkwell). *For the store:*
    because Emporium never overwrites a record (every change is a new line in its ledger), any earlier day can be shown
    exactly as it stood. *Stage 2.*
30. **Export your data** (Ingenium). *For the store:* CSV files of sales, stock and hours for your accountant. *Build 1
    (sales and stock).*
31. **Storage, what takes the room, your limit** (Ingenium). *For the store:* a page that shows the size of the books
    and asks the device to keep them permanently. *Build 1 asks for permanent storage; the page arrives at Stage 2.*
32. **System check and Health** (Ingenium). *For the store:* a "Verify the books" key that checks every line of the
    ledger against its seal, and a health page (last backup, storage, build). *Build 1 (verify); Stage 2 (health).*
33. **Reloading without losing work** (Carpe Diem's reset and the Offline Project's refresh key). *Build 1.*

## 7. Security and authorship

34. ★ **The Forge's security audit (pass 647).** Text that comes from files, backups or labels is drawn as plain text and
    never as markup; pages from outside run apart with no access to what the app keeps; only the app's own rooms may save
    or print. *For the store:* the same rules from the first build: nothing typed or imported is ever run as code, and
    the page refuses scripts from anywhere but itself. *Build 1.*
35. ★ **PermitCore** (the Forge 644 and Ingenium): the licence, the owner's public keys, and permissions that the owner
    grants and can withdraw. *For the store:* your **authorship** of Emporium: builds and permissions signed by your key,
    shown in About, so a copy that was altered by someone else can be recognised. *Stage 9 (signing), with the licence
    in Build 1.*
36. **Build markers and fingerprints** (every app carries its pass number; the Offline Project's releases list each file's
    SHA-256). *For the store:* every Emporium file you download comes with its fingerprint in the release notes, so you
    can check that it is exactly what was built. *Build 1.*
37. **Sealed editions** (Carpe Diem's Committee demo opens only with an access code). *For the store:* a demonstration
    edition of Emporium, with invented data, to show others without showing your business. *Stage 9.*

## 8. Building and installing

38. ★ **The device recipes** (Fabrica's kits; the Mac recipe with PyInstaller and pywebview on Apple silicon and Intel; the
    Windows kit in FFF with its Inno Setup installer; the unsigned IPA recipe for Sideloadly; the Fire tablet APK recipe).
    *For the store:* the same recipes, built by GitHub for every device at each build. *Build 1 (standalone page and
    Windows), then all devices.*
39. ★ **Tests for every page** (Ingenium's `rig/t_*.js` drive each page in Chromium). *For the store:* each build is
    released only after its tests pass, and the test report travels with it. *Build 1.*
40. **A quick start** (the Forge 644 loads its heavy parts only when wanted). *For the store:* the register opens fast;
    Tabula, Abacus and Imago load only when opened. *Stage 6.*

## 9. What I recommend leaving out of the store's copy

41. **Editing the app from inside it** (Carpe Diem and the Forge). In a business that will be audited, the copy that
    runs the register should be exactly the build that was tested and released. Changes should go through the Forge and
    a new build. You keep full authorship; the store's copy simply cannot be changed by whoever sits at the counter.
42. **AI chat and cloud models** (Ingenium, Inkwell). They are not needed to run the store, and they would add a path by
    which business data could leave the device. If you later want help reading the reports, a local model can be
    considered then.
43. **Study and writing features** (Curriculum, Library, Socrat, citations). They belong to their own apps.

## 10. What the store needs that none of the apps has

These come from your description of the business. They are the heart of Emporium.

44. ★ **A ledger that never forgets.** Every sale, delivery, adjustment, void, refund, clock-in and price change is one
    line, with who, when and on which device. A correction is a new line that points to the old one. Nothing is deleted.
45. ★ **Cash drawer accountability.** Opening count, every cash movement, a closing count made without seeing the
    expected figure (a "blind count"), the difference recorded and signed off by a manager. *Stage 2.*
46. ★ **Voids, refunds and discounts by permission**, with a reason, and a manager's approval above a limit you set.
    *Stage 2.*
47. ★ **Staff profiles, PINs and permissions** that you grant and withdraw. *Stage 2.*
48. ★ **Time clock, time cards, schedules and shift swaps.** *Stage 3.*
49. ★ **Money transfers (RIA, CAM, Unitransfer) and Boss Revolution, logged correctly.** The money a customer sends is
    not the store's income: it is held for the provider and settled with them. Only the fee or commission is income.
    Emporium will keep these apart, so the daily profit is not inflated by money that belongs to someone else, and so the
    cash held for each provider can be reconciled with their statements. *Stage 4.*
50. ★ **Patties and fresh food:** what was made or bought today, what sold, what was thrown away. Waste becomes visible.
    *Stage 4.*
51. **Suppliers, purchase orders and deliveries checked against the order.** *Stage 4.*
52. **Stock counts and shrinkage** (what the books say against what is on the shelf, by item and by category). *Stage 4.*
53. **High-value items** (perfume): optional serial numbers and a count at every shift change. *Stage 4.*
54. **Reports** by day, week, month and any period: sales, profit, tax, best and slowest sellers, dead stock, sales by
    hour, labour cost against sales, cash differences by employee. *Build 1 starts them; they grow at each stage.*
55. **Card payments** when you are ready (Square or another), so the card amount is recorded by the card system and never
    typed by hand. Card numbers never enter Emporium. *Stage 7.*
56. **Travel bookings and reservations.** *Stage 8.*
57. **Access from anywhere, encrypted end to end** (an internet relay that only ever holds sealed data). *Stage 5.*

## 11. How to answer

Mark each item **yes**, **no** or **later**, or tell me in your own words. Items without an answer follow the plan in
`03-STAGES.md`.
