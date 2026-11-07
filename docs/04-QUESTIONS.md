# Emporium: open questions

Answers already given (7 November 2026): the app is called **Emporium**; its repository is **public** under
DevGroup2313; the counter runs on a **Windows computer**; payments are **cash only for now**; the store is in
**Florida** (question 2); what employees may do is **not decided yet** (question 6: Stage 2 will propose defaults that
you can change); the licence sentence will be read (question 19).

**New:** which **county** is the store in? As far as I know, Florida's state sales tax is 6%, and most counties add a
discretionary surtax (Miami-Dade, for example, 1%), so the total depends on the county. Groceries for home use are
generally exempt, while prepared food (hot patties) and soft drinks are generally taxed. Please confirm the rates and
which goods are taxed with your accountant or the Florida Department of Revenue before relying on them.

The questions below can be answered at your own pace. Each says which stage needs the answer. Until then, Emporium uses
the default given in brackets, which you can change later in Settings.

## The store

1. **The store's name and address** as they should appear on receipts. *(Build 1 asks for the name at setup.)*
2. **The state (or country) where the store is,** and the **sales tax rates** that apply. Many states tax groceries,
   prepared food, drinks and other goods differently. Your accountant can give the exact rates. *(No tax until you set
   one; Build 1 lets you set several rates and choose one per item.)*
3. **The currency.** *(US dollars.)*
4. **Opening hours** and the days the store is open. *Stage 3.*

## Staff

5. **How many employees**, and who is the store manager. *Stage 2.*
6. **What employees may do** without asking: discounts (up to what amount?), refunds, voids, seeing cost prices and
   profit, seeing reports, receiving deliveries, correcting stock. *Stage 2. (Default: sales and the time clock only.)*
7. **Pay periods and overtime** (weekly, every two weeks; your state's overtime rules). *Stage 3.*

## Products

8. **How many different products** you carry today, and whether a list exists (a spreadsheet, a notebook). *Stage 2
   (import).*
9. **Barcodes and hardware:** do most products have barcodes? Is there a USB barcode scanner, a receipt printer or a
   cash drawer at the Windows counter? Which models? *Stage 7. (A USB scanner already works in Build 1: it types the
   code and presses Enter.)*
10. **Patties:** made in the store or bought in? Sold by the piece? Is waste counted today? *Stage 4.*

## Services

11. **Money transfers and Boss Revolution:** what should be recorded for each one? I recommend: the provider, the amount,
    the fee, the commission, the provider's reference number, and cash in or out. I recommend **not** storing customer
    identity documents in Emporium: the providers' own systems keep those, under their rules. *Stage 4.*

## Tools and design

12. **"Clepsydra's sticky notes":** I understood the floating sticky notes of Carpe Diem, kept beside the Clepsydra timer
    (with Ingenium's Inbox). Is that right? *Stage 6.*
13. **Kreyòl:** I can write the Kreyòl text, but I am not a native speaker and may make mistakes. Is there someone who
    could read it and correct it? *(Build 1 carries my Kreyòl, marked for review.)*
14. **Which language** should the counter open in? *(English, with French and Kreyòl one press away.)*

## Internet, devices and payments

15. **Keeping devices in step (Stage 5):** the relay needs an account with an internet service. Options include
    Cloudflare, Supabase or Firebase, each with a free start and paid levels (please verify their current prices). I will
    compare them for you at Stage 5. You may also prefer to wait.
16. **iPhone and iPad:** with a free Apple ID, Sideloadly's signature lasts about 7 days, after which the app must be
    installed again (as far as I know; please verify). Apple's Developer Program (about 99 US dollars a year) removes that
    limit and makes the app "official" on Apple devices. Windows and Mac show warnings for unsigned programs, which code
    signing removes. Do you want this at Stage 9?
17. **Card payments later:** when you are ready, which card system? Square is a common choice for stores of this size.
    *Stage 7.*

## Travel bookings

18. **What you book** (flights, hotels, packages), **with which systems**, and **what you track** (deposits, balances,
    documents, commissions, travel dates). *Stage 8.*

## Authorship

19. **The licence.** Emporium carries the same licence as your other apps, with one added sentence so that your staff may
    use it on the store's devices as you direct. Please read `LICENCE.txt` and confirm.
20. **The Master Key card:** who else, if anyone, should know where it is kept (for example, in case of an emergency)?
