/* LAKAY | Build 8 test: Schedae, Carpe Diem's sticky notes, and the refined Dawn dress. A note is made from the 🗒️ key,
   written in, made bold, given another paper (checked by day and by night against Lakay's own papers, Build 9),
   folded, carried, unpinned and pinned, found, copied as words, and deleted. Notes are sealed in the books, each
   person's own, kept through a lock, carried in backups, and never hold foreign markup. The right press opens the
   edit menu inside a note. The Reset's erase choice is a quiet card, and the night is Lakay's calm periwinkle ink.
   Run: node tests/t_build8.js [url]   (default: the built page, app/Lakay.html, opened from disk) */
"use strict";
const { chromium } = require("playwright");
const path = require("path");
const URL = process.argv[2] || "file://" + path.resolve(__dirname, "..", "app", "Lakay.html");
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }
const OWNER_PW = "kreyol and coffee 2026";
const wait = (p, ms) => p.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));

  console.log("A store is set up");
  await p.goto(URL); await p.waitForSelector("#introDoor .intro-card", { timeout: 20000 });
  await p.click("#introProtect");
  await p.fill("#ldStore", "Boutik Test"); await p.fill("#ldUser", "Yannie");
  await p.fill("#ldP1", OWNER_PW); await p.fill("#ldP2", OWNER_PW);
  await p.click("#ldNext"); await p.waitForSelector(".ild-words li", { timeout: 60000 });
  const groups = await p.$$eval(".ild-words li", lis => lis.map(li => li.textContent.slice(li.querySelector("b").textContent.length).trim()));
  await p.click("#ldWrote"); await p.waitForSelector("#ldG1");
  const nums = (await p.locator("form#ldCf label").allTextContents()).map(s => parseInt((s.match(/\d+/) || ["0"])[0], 10));
  await p.fill("#ldG1", groups[nums[0] - 1]); await p.fill("#ldG2", groups[nums[1] - 1]);
  await p.click("#ldSeal"); await p.waitForSelector(".shell", { timeout: 60000 });
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); });

  console.log("The 🗒️ key and the notes list");
  ok(await p.locator("#rail-notes").count() === 1, "the rail carries the Schedae key");
  await p.click("#rail-notes"); await p.waitForSelector(".sn-panel");
  ok(await p.locator(".sn-panel .sn-empty").count() === 1, "with no notes, the list says how notes work");
  await p.click("#snNew"); await p.waitForSelector(".sticky-note");
  ok(await p.locator(".sticky-note").count() === 1, "New note puts a note on the page");
  await wait(p, 120);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains("sn-body")) && await p.locator(".sn-panel").count() === 0, "the list steps aside and the new note is ready to write in");

  console.log("Writing, sealed");
  await p.click(".sticky-note .sn-body"); await p.keyboard.type("Order Florida water");
  await wait(p, 900);
  const sealed = await p.evaluate(() => E.db.get("rec", "notes:owner").then(r => ({ has: !!r, iv: !!(r && r.iv), ct: !!(r && r.ct), plain: !!(r && (r.notes || r.doc)) })));
  ok(sealed.has && sealed.iv && sealed.ct && !sealed.plain, "the note is written a moment after typing stops, sealed like the books (no plain words stored)");
  await p.keyboard.press("Control+A"); await p.click(".sticky-note .sn-tool.snb");
  ok(await p.locator(".sticky-note .sn-body b").count() >= 1, "B makes the words bold");
  ok(await p.evaluate(() => JSON.stringify(E.books.notes()[0].doc).indexOf('["b",') >= 0), "the bold is kept as a mark in the note's model, not as markup");

  console.log("Lakay's own papers by day and by night (Build 9)");
  const bg = () => p.evaluate(() => { const n = document.querySelector(".sticky-note"); const s = getComputedStyle(n); return { bg: s.backgroundColor, sh: s.boxShadow }; });
  let look = await bg();
  ok(look.bg === "rgb(253, 244, 217)" && look.sh.indexOf("rgb(167, 161, 143)") >= 0, "a new note is Mango, a light pastel, with its edge at two thirds of its light (" + look.bg + ")");
  await p.click('.sticky-note .sn-iconbtn[aria-label="Menu"]'); await p.waitForSelector(".sn-menu");
  ok(await p.locator(".sn-menu .sn-dot").count() === 6, "the ⋯ menu offers Lakay's six papers");
  await p.click('.sn-menu .sn-dot[data-sn-col="lanme"]'); await wait(p, 250);
  look = await bg();
  ok(look.bg === "rgb(226, 244, 241)" && look.sh.indexOf("rgb(149, 161, 159)") >= 0, "Lanmè by day: the pastel sea glass #e2f4f1 with its edge (" + look.bg + ")");
  await p.keyboard.press("Escape");
  await p.evaluate(() => { E.util.prefSet("theme", "night"); E.ui.applyLook(); }); await wait(p, 250);
  look = await bg();
  ok(look.bg === "rgb(21, 51, 47)" && look.sh.indexOf("rgb(11, 30, 28)") >= 0, "Lanmè by night: its own night paper #15332f, edge #0b1e1c (" + look.bg + ")");
  const ink = await p.evaluate(() => getComputedStyle(document.querySelector(".sticky-note .sn-body")).color);
  ok(ink === "rgb(236, 229, 211)", "the night ink is Lakay's warm ivory #ece5d3 (" + ink + ")");
  ok(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()) === "#12121c", "the night is Lakay's calm periwinkle ink, not the old saturated indigo");
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); }); await wait(p, 200);

  console.log("Fold, carry, unpin, pin");
  await p.click('.sticky-note .sn-iconbtn[aria-label="Menu"]'); await p.waitForSelector(".sn-menu");
  await p.click(".sn-menu .sn-mbtn >> nth=0"); await wait(p, 250);
  ok(await p.locator('.sticky-note[data-sn-min="1"]').count() === 1 && !(await p.locator(".sticky-note .sn-body").isVisible()), "Minimise folds the note to its top");
  await p.click('.sticky-note .sn-iconbtn[aria-label="Menu"]'); await p.waitForSelector(".sn-menu");
  await p.click(".sn-menu .sn-mbtn >> nth=0"); await wait(p, 250);
  ok(await p.locator(".sticky-note .sn-body").isVisible(), "Unfold brings the words back");
  const g = await p.locator(".sticky-note .sn-grip").boundingBox();
  const before = await p.evaluate(() => ({ x: E.books.notes()[0].x, y: E.books.notes()[0].y }));
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(g.x + g.width / 2 + i * 20, g.y + g.height / 2 + i * 10);
  await p.mouse.up(); await wait(p, 700);
  const after = await p.evaluate(() => ({ x: E.books.notes()[0].x, y: E.books.notes()[0].y }));
  ok(after.x - before.x >= 100 && after.y - before.y >= 50, "the note is carried by its top (" + JSON.stringify(before) + " to " + JSON.stringify(after) + ")");
  await p.click('.sticky-note .sn-iconbtn[aria-label^="Close"]'); await wait(p, 250);
  ok(await p.locator(".sticky-note").count() === 0 && await p.evaluate(() => E.books.notes().length) === 1, "✕ unpins the note: it leaves the page and stays in the list");
  await p.click("#rail-notes"); await p.waitForSelector(".sn-panel");
  await p.click(".sn-row .sn-b-soft >> nth=0"); await wait(p, 250);
  ok(await p.locator(".sticky-note").count() === 1, "Pin in the list brings it back to the page");
  await p.keyboard.press("Escape"); await wait(p, 150);

  console.log("The right press, pastes and pictures");
  await p.click(".sticky-note .sn-body", { button: "right" });
  ok(await p.locator("#cd-em-menu").count() === 1, "a right press inside a note opens the edit menu");
  await p.keyboard.press("Escape"); await wait(p, 150);
  await p.evaluate(() => {
    const body = document.querySelector(".sticky-note .sn-body"); body.focus();
    const r = document.createRange(); r.selectNodeContents(body); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const dt = new DataTransfer();
    dt.setData("text/html", '<img src="https://example.com/x.png"><script>window.__pwned = 1</script><b onclick="window.__pwned = 2">bold</b>');
    dt.setData("text/plain", " pasted words");
    body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await wait(p, 200);
  const pasted = await p.evaluate(() => ({ text: document.querySelector(".sticky-note .sn-body").textContent, imgs: document.querySelectorAll(".sticky-note .sn-body img").length, model: JSON.stringify(E.books.notes()[0].doc), pwned: window.__pwned || 0 }));
  ok(/pasted words/.test(pasted.text) && pasted.imgs === 0 && !/script|https|onclick/.test(pasted.model) && !pasted.pwned, "a paste comes in as words only: no foreign picture, script or handler");
  const kept = await p.evaluate(() => {
    const body = document.querySelector(".sticky-note .sn-body");
    body.appendChild(document.createElement("iframe"));
    const far = document.createElement("img"); far.setAttribute("src", "blob:nothing"); body.appendChild(far);
    const near = document.createElement("img"); near.src = "data:image/png;base64,iVBORw0KGgo="; body.appendChild(near);
    const sp = document.createElement("span"); sp.style.fontWeight = "700"; sp.textContent = " heavy"; body.appendChild(sp);
    body.dispatchEvent(new Event("input", { bubbles: true }));
    return JSON.stringify(E.books.notes()[0].doc);
  });
  ok(/data:image\/png;base64/.test(kept) && !/iframe|blob:/.test(kept) && /\["b",\[" heavy"\]\]/.test(kept), "the model keeps a picture held in the note and a bold span's weight, and drops a frame and an outside picture");

  console.log("Kept through a lock, each person's own, carried in backups");
  await wait(p, 700);
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  ok(await p.locator("#sticky-pins").count() === 0, "when the books lock, the notes are put away");
  await p.click("#introLock"); await p.waitForSelector("#lockDoor #ldName", { state: "visible" });
  await p.fill("#ldPw", OWNER_PW); await p.click("#ldGo"); await p.waitForSelector(".shell", { timeout: 60000 });
  await p.waitForSelector(".sticky-note", { timeout: 5000 });
  const back = await p.evaluate(() => { const n = document.querySelector(".sticky-note"); return { col: n.getAttribute("data-sn-col"), text: n.querySelector(".sn-body").textContent, bold: n.querySelectorAll(".sn-body b").length, left: parseInt(n.style.left, 10) }; });
  ok(back.col === "lanme" && /Order Florida water/.test(back.text) && back.bold >= 1 && back.left === after.x, "after the lock the note is back as it was: its paper, its words, its bold, its place");
  const bk = await p.evaluate(() => E.books.makeBackup().then(t => { const b = JSON.parse(t); return { keys: b.rec.map(r => r[0]), plain: /Florida/.test(t) }; }));
  ok(bk.keys.indexOf("notes:owner") >= 0 && !bk.plain, "a backup carries the notes, sealed");
  await p.click("#rail-notes"); await p.waitForSelector(".sn-panel");
  await p.click("#snNew"); await wait(p, 200); await p.keyboard.type("Second note about cassava"); await wait(p, 100);
  await p.click("#rail-notes"); await p.waitForSelector(".sn-panel");
  await p.fill("#snSearch", "cassava"); await wait(p, 100);
  const shown = await p.$$eval(".sn-row", rows => rows.filter(r => !r.hidden).length);
  ok(shown === 1, "the list's search finds a note by its words");
  await p.fill("#snSearch", "");
  const copyKey = p.locator(".sn-row >> nth=0").locator(".sn-b-soft >> nth=1");
  await copyKey.click(); await wait(p, 300);
  ok(await p.evaluate(() => E.schedae.plain(E.books.notes()[0].doc)) === "Second note about cassava", "Copy takes the note's words as plain text");
  await p.click(".sn-row >> nth=0 >> .sn-del"); await wait(p, 700);
  ok(await p.evaluate(() => E.books.notes().length) === 1 && !(await p.evaluate(() => JSON.stringify(E.books.notes()).indexOf("cassava") >= 0)), "Delete takes the note away");
  await p.keyboard.press("Escape");

  console.log("A sign-in opens only that person's own notes");
  await p.evaluate((pw) => E.books.addPerson({ name: "Rose Delva", password: "rose password 2026", preset: "cashier", access: E.books.PRESETS.cashier }, pw), OWNER_PW);
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  await p.evaluate(() => E.books.signIn("Rose Delva", "rose password 2026")); await wait(p, 300);
  const rose = await p.evaluate(() => ({ who: E.books.user.name, keys: Object.keys(E.books.state().notes), mine: E.books.notes().length, pins: document.querySelectorAll(".sticky-note").length }));
  ok(rose.who === "Rose Delva" && rose.keys.indexOf("owner") < 0 && rose.mine === 0 && rose.pins === 0, "Rose signs in: the owner's notes are neither shown nor even opened in her session");
  await p.evaluate(() => { const n = E.schedae.create(); n.doc = ["Rose's own note"]; return E.books.saveNotes(true); });
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  await p.evaluate((pw) => E.books.signIn("", pw), OWNER_PW); await wait(p, 300);
  const own = await p.evaluate(() => ({ keys: Object.keys(E.books.state().notes), n: E.books.notes().length, text: E.schedae.plain(E.books.notes()[0].doc) }));
  ok(own.keys.join() === "owner" && own.n === 1 && /Florida/.test(own.text), "the owner signs in again: only the owner's own note is opened, and Rose's stays sealed");

  console.log("In the practice store, each person keeps their own notes");
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  await p.click("#introPractice"); await p.waitForSelector(".shell", { timeout: 60000 });
  await p.evaluate(() => { const n = E.schedae.create(); n.doc = ["the owner's practice note"]; return E.books.saveNotes(true); });
  await p.evaluate(() => E.books.practiceAs("u_practice_marie")); await wait(p, 300);
  ok(await p.locator(".sticky-note").count() === 0, "Marie does not see the owner's notes");
  await p.evaluate(() => { const n = E.schedae.create(); n.doc = ["Marie's note"]; return E.books.saveNotes(true); }); await wait(p, 200);
  ok(await p.evaluate(() => E.db.get("rec", "notes:u_practice_marie").then(r => !!r)), "Marie's notes are sealed under her own name");
  await p.evaluate(() => E.books.practiceAs("owner")); await wait(p, 300);
  const ownerSees = await p.$$eval(".sticky-note .sn-body", b => b.map(x => x.textContent));
  ok(ownerSees.length === 1 && /owner's practice note/.test(ownerSees[0]), "back as the owner, only the owner's note is there");

  console.log("Calm, and the Reset's quiet erase card");
  await p.evaluate(() => { E.util.prefSet("calm", "1"); E.ui.applyLook(); E.schedae.render(); }); await wait(p, 100);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector(".sticky-note")).animationName) === "none", "in Calm a note arrives without moving");
  await p.evaluate(() => { E.util.prefSet("calm", "0"); E.ui.applyLook(); });
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  await p.click("#doorReset"); await p.waitForSelector("#rsErase");
  const card = await p.evaluate(() => ({ erase: getComputedStyle(document.querySelector("#rsErase b")).color, clear: getComputedStyle(document.querySelector("#rsClear b")).color, dlg: getComputedStyle(document.querySelector(".dialog")).boxShadow }));
  ok(card.erase === card.clear, "the erase choice is written in the same ink as the others, marked by its badge, not painted red");
  ok(!/\) -2px 0px 0px 0px inset/.test(card.dlg), "the dialog is a flat slab with a hairline rim, without the old pillowed walls");
  await p.keyboard.press("Escape");

  console.log("Errors");
  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" / ") : ""));
  await browser.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
