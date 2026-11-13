/* LAKAY | Build 9 test: the right press's edit menu works in every field, inside the sticky notes too, and carries words
   to and from the device's own clipboard; and Lakay's own pastel papers for the notes.
   The page is served from this computer (http://127.0.0.1) so the browser lets the test reach its clipboard, as the
   owner's devices do. The clipboards of the Fire tablet, the iPhone and iPad, and the Mac and Windows programs are
   stood in for by small fakes that answer as those programs answer, so each road the words travel is driven.
   Run: node tests/t_build9.js */
"use strict";
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), http = require("http");
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }
const wait = (p, ms) => p.waitForTimeout(ms);
const PAGE = fs.readFileSync(path.resolve(__dirname, "..", "app", "Lakay.html"));

(async () => {
  const server = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(PAGE); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const ORIGIN = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: ORIGIN });
  const errors = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));
  const clip = () => p.evaluate(() => navigator.clipboard.readText());
  const setClip = (t) => p.evaluate((t) => navigator.clipboard.writeText(t), t);
  async function menuOn(locator, pos) {
    await locator.click({ button: "right", position: pos });
    await p.waitForSelector("#cd-em-menu", { timeout: 3000 });
  }
  async function pick(label) {
    await p.locator("#cd-em-menu .cd-em-row").filter({ has: p.locator("span", { hasText: new RegExp("^" + label + "$") }) }).first().click();
    await wait(p, 350);
  }
  const noteText = () => p.evaluate(() => document.querySelector(".sticky-note .sn-body").textContent);
  const noteWords = () => p.evaluate(() => E.schedae.plain(E.books.notes()[0].doc));
  async function caretAtEnd() {
    await p.evaluate(() => { const b = document.querySelector(".sticky-note .sn-body"); b.focus(); const r = document.createRange(); r.selectNodeContents(b); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  }

  console.log("The practice store, with a note in rich text");
  await p.goto(ORIGIN + "/"); await p.waitForSelector("#introEnter", { timeout: 20000 });
  await p.evaluate(() => E.books.openPractice().then(() => E.app.opened(true)));
  await p.waitForSelector(".shell", { timeout: 60000 });
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); const n = E.schedae.create(); n.doc = ["Order ", ["b", ["Florida water"]], " today"]; E.books.saveNotes(true); E.schedae.render(); });
  await p.waitForSelector(".sticky-note .sn-body b");
  ok(await p.getAttribute(".sticky-note", "data-sn-col") === "citrine", "a new note takes Lakay's first paper, Citrine");
  const paper = await p.evaluate(() => getComputedStyle(document.querySelector(".sticky-note")).backgroundColor);
  ok(paper === "rgb(253, 244, 217)", "Citrine by day is a light pastel, #fdf4d9 (" + paper + ")");

  console.log("The right press inside a sticky note");
  await menuOn(p.locator(".sticky-note .sn-body b"));
  ok(await p.locator("#cd-em-menu .cd-em-row").count() >= 9, "a right press on bold words in a note opens the whole edit menu");
  await pick("Select all");
  ok(await p.evaluate(() => String(getSelection())) === "Order Florida water today", "Select all takes the whole note, not only the bold words");
  await menuOn(p.locator(".sticky-note .sn-body b"));
  await pick("Copy the whole field");
  ok(await clip() === "Order Florida water today", "Copy the whole field puts the whole note on the device's clipboard");
  await setClip(" and kremas");
  await caretAtEnd();
  const box = await p.locator(".sticky-note .sn-body").boundingBox();
  await p.mouse.click(box.x + box.width - 12, box.y + box.height - 8, { button: "right" }); await p.waitForSelector("#cd-em-menu");
  await pick("Paste");
  await wait(p, 700);
  ok(/today and kremas$/.test(await noteText()), "Paste brings words from outside the app into the note (" + (await noteText()) + ")");
  ok(/kremas/.test(await noteWords()), "and the note keeps them");
  await p.evaluate(() => { const b = document.querySelector(".sticky-note .sn-body"); const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n; while ((n = walker.nextNode())) { const i = n.nodeValue.indexOf("today"); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 5); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; } } });
  const word = await p.evaluate(() => { const r = getSelection().getRangeAt(0).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(word.x, word.y, { button: "right" }); await p.waitForSelector("#cd-em-menu");
  await pick("Cut"); await wait(p, 700);
  ok(await clip() === "today" && !/today/.test(await noteText()) && !/today/.test(await noteWords()), "Cut takes the chosen word to the clipboard and out of the note");
  await menuOn(p.locator(".sticky-note .sn-body b"));
  await pick("Clear the field"); await wait(p, 700);
  ok(await noteText() === "" && (await noteWords()) === "", "Clear the field empties the whole note, and the note keeps it so");

  console.log("Every other kind of field");
  /* the note floats over the page by design: it is carried to the lower right first, out of the fields' way */
  await p.evaluate(() => { const n = E.books.notes()[0]; n.x = 900; n.y = 600; E.books.saveNotes(true); E.schedae.render(); });
  await p.evaluate(() => E.ui.go("inventory")); await p.waitForSelector("#invSearch");
  await setClip("Malta");
  await menuOn(p.locator("#invSearch"));
  await pick("Paste"); await wait(p, 300);
  ok(await p.inputValue("#invSearch") === "Malta", "Paste works in a search field");
  await menuOn(p.locator("#invSearch"));
  await p.click('#cd-em-menu .cd-em-row >> nth=0'); await wait(p, 100);
  await p.evaluate(() => { const f = document.getElementById("invSearch"); f.focus(); f.setSelectionRange(0, 3); });
  await menuOn(p.locator("#invSearch"), { x: 8, y: 10 });
  await pick("Copy");
  ok(await clip() === "Mal", "Copy takes the chosen part of a field");
  await p.evaluate(() => E.inventory.add()); await p.waitForSelector("#itNotes");
  await setClip("Keep cold. Sold by the case.");
  await menuOn(p.locator("#itNotes"));
  await pick("Paste"); await wait(p, 300);
  ok(await p.inputValue("#itNotes") === "Keep cold. Sold by the case.", "Paste works in a text area inside a dialog");
  await p.keyboard.press("Escape"); await wait(p, 300);
  await p.evaluate(() => { const h = document.querySelector("h1.page-title"); const r = document.createRange(); r.selectNodeContents(h); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await menuOn(p.locator("h1.page-title"));
  const rows = await p.$$eval("#cd-em-menu .cd-em-row span:first-child", s => s.map(x => x.textContent));
  ok(rows.indexOf("Copy") >= 0 && rows.indexOf("Paste") < 0, "chosen words anywhere on the page offer Copy (and no Paste, since nothing can be written there)");
  await pick("Copy");
  ok(await clip() === "Inventory", "and Copy takes them");
  await p.evaluate(() => E.ui.go("home")); await wait(p, 300);

  console.log("The roads to each device's own clipboard");
  async function throughNote(setup, from, check, label) {
    await p.evaluate(setup);
    await caretAtEnd();
    const b = await p.locator(".sticky-note .sn-body").boundingBox();
    /* the note starts empty for each device ("Clear the field" is rightly off on an empty note) */
    await p.evaluate(() => { const body = document.querySelector(".sticky-note .sn-body"); body.textContent = ""; body.dispatchEvent(new Event("input", { bubbles: true })); });
    await caretAtEnd();
    await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: "right" }); await p.waitForSelector("#cd-em-menu");
    await pick("Paste"); await wait(p, 700);
    const got = await noteText();
    ok(got === from, label + ": Paste brings the device clipboard's words, and only the words (" + got + ")");
    await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: "right" }); await p.waitForSelector("#cd-em-menu");
    await pick("Copy the whole field"); await wait(p, 400);
    ok(await p.evaluate(check) === from, label + ": Copy hands the note's words to the device's clipboard");
  }
  await throughNote(() => { window.EmporiumHost = { readClipboard: () => JSON.stringify({ text: "from the Fire tablet", html: "" }), writeClipboard: (t) => { window.__fire = t; return true; } }; },
    "from the Fire tablet", () => window.__fire, "Fire tablet");
  await p.evaluate(() => { delete window.EmporiumHost; });
  await throughNote(() => { window.webkit = { messageHandlers: { shellClipboard: { postMessage: (m) => Promise.resolve(m.op === "read" ? { text: "from the iPad", html: "" } : (window.__ios = m.text, true)) } } }; },
    "from the iPad", () => window.__ios, "iPhone and iPad");
  await p.evaluate(() => { delete window.webkit; });
  await throughNote(() => {
    window.__lakayDesk = 1;
    window.__deskShell = setInterval(() => { (window.__lakayClip.take() || []).forEach((n) => { if (n.op === "read") window.__lakayClip.answer(n.id, true, "from the Mac mini"); else { window.__desk = n.text; window.__lakayClip.answer(n.id, true, ""); } }); }, 40);
  }, "from the Mac mini", () => window.__desk, "Mac and Windows programs");
  await p.evaluate(() => { clearInterval(window.__deskShell); delete window.__lakayDesk; });

  console.log("Errors");
  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" / ") : ""));
  await browser.close(); server.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
