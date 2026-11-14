/* LAKAY | Build 15 test: Inventory's departments, scanning everywhere, large inventories, and the money transfers and
   top-ups. Each department has its own tab and page with its own figures, search and filters; the signs are line
   drawings (no coconut or dumpling) and nothing is green. A scanner that types is heard in every room: the Register
   adds the item (whether the code comes as EAN-13 or UPC-A), Inventory opens it or receives it, Home shows it in Price
   check, a window's barcode field takes it, and a code no item has offers to add one, which then goes onto the ticket;
   ordinary typing is never mistaken for a scan. The camera (Chromium's fake camera, showing a printed barcode) reads a
   code with Lakay's own reader and puts the item on the ticket. Twenty thousand items stay quick: a page of fifty at a
   time, and searches and scans in milliseconds. A transfer or top-up is recorded with its provider and reference,
   kept out of the sales, shown apart in the Reports, voided with a reason by someone who sees the reports and never by
   a cashier, and the books still verify. Every word is in French and Kreyòl too. Nothing is refused by the page's policy.
   Run: node tests/t_build15.js [url]   (default: the built page, app/Lakay.html, opened from disk) */
"use strict";
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), os = require("os");
const ROOT = path.resolve(__dirname, ".."), PAGE = process.argv[2] || "file://" + path.join(ROOT, "app", "Lakay.html");
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }
const wait = (p, ms) => p.waitForTimeout(ms);

/* a printed EAN-13 barcode, as a camera would see it, written as a short Y4M film for Chromium's fake camera */
function barcodeFilm(code12) {
  const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const R = L.map(x => x.split("").map(c => c === "0" ? "1" : "0").join("")), G = R.map(x => x.split("").reverse().join(""));
  const FIRST = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
  const ds = code12.split("").map(Number); let s = 0; for (let i = 0; i < 12; i++) s += ds[11 - i] * (i % 2 ? 1 : 3); ds.push((10 - s % 10) % 10);
  let bits = "101"; for (let i = 1; i <= 6; i++) bits += FIRST[ds[0]][i - 1] === "L" ? L[ds[i]] : G[ds[i]]; bits += "01010"; for (let i = 7; i <= 12; i++) bits += R[ds[i]]; bits += "101";
  const W = 480, H = 360, mod = 3, x0 = Math.round((W - bits.length * mod) / 2), y0 = 110, y1 = 250;
  const frame = Buffer.alloc(W * H * 3 / 2, 128), Y = Buffer.alloc(W * H, 214);
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) { const i = Math.floor((x - x0) / mod); if (i >= 0 && i < bits.length && bits[i] === "1") Y[y * W + x] = 36; }
  for (let y = y0; y < y1; y++) for (let x = 1; x < W - 1; x++) Y[y * W + x] = Math.round((Y[y * W + x - 1] + 2 * Y[y * W + x] + Y[y * W + x + 1]) / 4);
  Y.copy(frame, 0);
  const head = Buffer.from("YUV4MPEG2 W" + W + " H" + H + " F10:1 Ip A1:1 C420jpeg\n"), out = [head];
  for (let f = 0; f < 6; f++) out.push(Buffer.from("FRAME\n"), frame);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lakay-cam-")), "barcode.y4m");
  fs.writeFileSync(file, Buffer.concat(out));
  return { file, code: ds.join("") };
}

(async () => {
  const film = barcodeFilm("085000400003");   /* Haitian coffee, 1 lb, in the practice store */
  const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--use-file-for-fake-video-capture=" + film.file] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const errors = [], csp = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
  const go = async (room) => { await p.evaluate(r => E.ui.go(r), room); await wait(p, 350); };
  const ticket = () => p.evaluate(() => E.register.ticket ? E.register.ticket.lines.map(l => ({ name: E.books.state().items[l.itemId].name, qty: l.qty })) : []);
  const blur = () => p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); document.body.focus(); });
  const scan = async (code, delay) => { await blur(); await p.keyboard.type(code, { delay: delay === undefined ? 4 : delay }); await p.keyboard.press("Enter"); await wait(p, 450); };

  await p.goto(PAGE); await p.waitForSelector("#introEnter", { timeout: 20000 });
  await p.evaluate(() => E.books.openPractice().then(() => E.app.opened(true)));
  await p.waitForSelector(".shell", { timeout: 90000 });
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); });

  console.log("The departments, each with its own tab and page");
  await go("inventory");
  const tabs = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll(".inv-tab"), b => ({ id: b.getAttribute("data-dept"), name: b.querySelector(".inv-tab-name").textContent, n: (b.querySelector(".inv-tab-n") || {}).textContent })));
  ok(tabs.map(x => x.id).join() === "all,music,movies,perfume,grocery,drinks,food,services,other", "a tab for every department, and one for all of them (" + tabs.length + ")");
  ok(tabs.slice(1).map(x => x.name).join("|") === "Music|Films|Perfume and beauty|Caribbean groceries|Drinks|Haitian patties and food|Money transfers and top-ups|Other goods", "named as the owner lists them");
  const counts = await p.evaluate(() => { const c = {}; Object.values(E.books.state().items).forEach(it => { if (!it.archived) c[it.cat] = (c[it.cat] || 0) + 1; }); return c; });
  ok(tabs.filter(x => x.id !== "all" && x.id !== "services").every(x => Number(x.n) === (counts[x.id] || 0)), "each tab counts its own items");
  ok(await p.locator("#invDepts .inv-dept").count() === 8, "All departments shows each one side by side, with its figures");
  ok(await p.evaluate(() => !document.body.textContent.match(/\u{1F965}|\u{1F95F}/u)), "no coconut and no dumpling: the departments' signs are line drawings");
  ok(await p.evaluate(() => getComputedStyle(document.querySelector("#invRows .badge.ok")).color) === "rgb(77, 84, 184)", "a well stocked item's badge is the logo's periwinkle, not green");
  ok(await p.evaluate(() => document.querySelector(".inv-tabs-wrap").classList.contains("more-r")), "the tabs fade at the edge where more of them wait");
  await p.click('#invDepts .inv-dept[data-dept="music"]'); await wait(p, 350);
  ok(await p.getAttribute("#invTab-music", "aria-selected") === "true" && await p.locator("#invRows tr").count() === 5, "a department's card opens its own page, with only its items");
  const head = await p.evaluate(() => ({ h: document.querySelector(".inv-dhead h2").textContent, stats: Array.prototype.map.call(document.querySelectorAll(".inv-stats dd"), d => d.textContent) }));
  ok(head.h === "Music" && head.stats[0] === "5", "its head: its sign, its name and its own figures (" + head.stats.join(", ") + ")");
  await p.fill("#invSearch", "konpa"); await wait(p, 250);
  ok(await p.locator("#invRows tr").count() === 1, "the search keeps to the department");
  await p.fill("#invSearch", ""); await p.click('.seg [data-v="low"]'); await wait(p, 250);
  ok((await p.textContent("#invRows")).includes("Zouk evenings") && await p.locator("#invRows tr").count() === 1, "and so do the filters: Music's low stock is Zouk evenings");
  await p.click('.seg [data-v="active"]'); await wait(p, 150);
  await p.focus("#invTab-music"); await p.keyboard.press("ArrowRight"); await wait(p, 350);
  ok(await p.getAttribute("#invTab-movies", "aria-selected") === "true" && await p.evaluate(() => document.activeElement.id) === "invTab-movies", "the arrow keys move from one tab to the next");
  await p.click("#addItem"); await wait(p, 350);
  ok(await p.evaluate(() => document.getElementById("itCat").value) === "movies" && await p.locator("#itBarcode[data-scan-field]").count() === 1, "an item added from Films starts in Films, with a barcode field a scan can fill");
  await p.keyboard.press("Escape"); await wait(p, 250);

  console.log("A scanner that types, in every room");
  await go("register");
  await scan("0850001000017");
  let tk = await ticket();
  ok(tk.length === 1 && tk[0].name === "Kompa classics, volume 1 (CD)", "at the Register a scan with no field in focus puts the item on the ticket");
  await scan("850001000017");
  tk = await ticket();
  ok(tk.length === 1 && tk[0].qty === 2, "the same product scanned as UPC-A (12 digits) is the same item");
  await scan("0850001000024", 140);
  tk = await ticket();
  ok(tk.length === 1, "slow typing on the keyboard is never taken for a scan");
  await p.click("#regSearch"); await p.keyboard.type("0850005000013", { delay: 4 }); await p.keyboard.press("Enter"); await wait(p, 400);
  tk = await ticket();
  ok(tk.some(x => x.name === "Cola champagne, 12 oz"), "a scan into the search field adds the item too");
  await scan("7701234567896");
  const offer = await p.locator(".toast .toast-act").count();
  ok(offer === 1 && (await p.textContent(".toast.has-act")).includes("7701234567896"), "a code no item has says so, and offers to add it");
  await p.click(".toast .toast-act"); await wait(p, 400);
  ok(await p.inputValue("#itBarcode") === "7701234567896", "Add it opens a new item with that barcode");
  await p.fill("#itName", "Kremas, 750 ml"); await p.fill("#itPrice", "18.99"); await p.click("#itSave"); await wait(p, 700);
  tk = await ticket();
  ok(tk.some(x => x.name === "Kremas, 750 ml"), "and once saved, the new item is on the ticket");
  await go("inventory");
  await p.click("#invTab-all"); await wait(p, 300);
  await scan("0850003000015");
  ok(await p.locator('.dialog h2:has-text("Florida water, 7.5 oz")').count() === 1, "in Inventory a scan opens the item's card");
  await p.keyboard.press("Escape"); await wait(p, 250);
  await p.click("#invReceive"); await wait(p, 300);
  ok(await p.locator("#invReceiving").count() === 1, "Receive a delivery: Inventory waits for the goods");
  await scan("0850004000014");
  ok(await p.locator("#rcQty").count() === 1 && await p.locator('.dialog h2:has-text("Djon djon")').count() === 1, "and a scan opens that item's delivery");
  await p.keyboard.press("Escape"); await wait(p, 250);
  await p.fill("#invSearch", "0850002000016"); await p.press("#invSearch", "Enter"); await wait(p, 400);
  ok(await p.locator("#rcQty").count() === 1, "a code typed into Inventory's search does the same");
  await p.keyboard.press("Escape"); await wait(p, 250);
  await go("home");
  await scan("0850005000020");
  ok(await p.locator(".rail-pop #findList").count() === 1 && (await p.textContent("#findList")).includes("Malta, 12 oz"), "anywhere else, Price check shows what was scanned");
  await p.keyboard.press("Escape"); await wait(p, 200);
  await go("inventory"); await p.click("#addItem"); await wait(p, 350);
  await p.click(".dialog-head h2"); await scan("0850009999991");
  ok(await p.inputValue("#itBarcode") === "0850009999991", "with a window open, a scan fills its barcode field and does nothing else");
  await p.keyboard.press("Escape"); await wait(p, 250);

  console.log("The camera, with Lakay's own reader");
  await go("register");
  await p.evaluate(() => { E.register.ticket.lines = []; });
  await go("register");
  await p.waitForSelector(".reg-pick .cam-key:not([hidden])", { timeout: 5000 }).catch(() => {});
  ok(await p.locator(".reg-pick .cam-key:not([hidden])").count() === 1, "the camera key shows itself, since this device has a camera");
  ok(await p.evaluate(() => !("BarcodeDetector" in window)), "this browser has no barcode reader of its own, so Lakay's own reader does the work");
  const t0 = Date.now();
  await p.click(".reg-pick .cam-key");
  await p.waitForSelector(".scan-view video", { timeout: 5000 });
  await p.waitForFunction(() => !document.querySelector(".scan-view"), null, { timeout: 15000 }).catch(() => {});
  tk = await ticket();
  ok(tk.length === 1 && tk[0].name === "Haitian coffee, 1 lb", "the camera reads the printed barcode and the item goes onto the ticket (" + (Date.now() - t0) + " ms)");
  ok(await p.evaluate(() => { const v = document.querySelector("video"); return !v || !v.srcObject; }), "and the camera is let go at once");

  console.log("Money transfers and top-ups: a service with its own log");
  const before = await p.evaluate(() => { const k = E.util.dayKey(), r = E.books.report(k, k); return { gross: r.gross, count: r.count, svc: r.services.count, com: r.services.commission }; });
  await go("inventory"); await p.click("#invTab-services"); await wait(p, 350);
  ok(await p.locator(".svc-head").count() === 1 && await p.locator("#svcRecord").count() === 1, "the department's page is the service: today's figures and the key to record one");
  await p.click('.seg [data-v="all"]'); await wait(p, 250);
  const seeded = await p.locator("#svcRows tr").count();
  ok(seeded >= 10, "the log lists every entry, newest first (" + seeded + " in the practice store's fortnight)");
  await p.click("#svcRecord"); await wait(p, 300);
  await p.click('#svcProviders [data-v="boss"]');
  ok(await p.getAttribute('#svcKinds [data-v="topup"]', "aria-checked") === "true", "Boss Revolution starts as a phone top-up");
  await p.click('#svcProviders [data-v="cam"]'); await p.click('#svcKinds [data-v="send"]');
  await p.click("#svcSave"); await wait(p, 250);
  ok((await p.textContent("#svcAmount-e")).length > 0, "an amount is needed");
  await p.fill("#svcAmount", "120.00"); await p.fill("#svcFee", "7.50"); await p.fill("#svcCom", "2.00"); await p.fill("#svcRef", "CA-551204");
  ok((await p.textContent("#svcPreview")).includes("$127.50"), "the form says what comes into the drawer: the amount and the fee");
  await p.click("#svcSave"); await wait(p, 700);
  const first = await p.evaluate(() => document.querySelector("#svcRows tr").textContent);
  ok(/CAM/.test(first) && /\$120\.00/.test(first) && /CA-551204/.test(first), "it is recorded, at the top of the log");
  const after = await p.evaluate(() => { const k = E.util.dayKey(), r = E.books.report(k, k); return { gross: r.gross, count: r.count, svc: r.services.count, com: r.services.commission }; });
  ok(after.gross === before.gross && after.count === before.count, "the store's sales are not touched: the money is the provider's");
  ok(after.svc === before.svc + 1 && after.com === before.com + 200, "it is counted with the services, with the store's commission");
  await p.click('#svcRows tr:first-child .svc-void-key'); await wait(p, 300);
  await p.click("#svcVoidSave"); await wait(p, 250);
  ok((await p.textContent("#svcVoidWhy-e")).length > 0, "voiding asks why");
  await p.fill("#svcVoidWhy", "Typed twice"); await p.click("#svcVoidSave"); await wait(p, 700);
  ok(await p.locator("#svcRows tr.void").count() >= 1 && (await p.textContent("#svcRows tr.void")).includes("Voided"), "a voided entry stays in the log, marked void");
  const voided = await p.evaluate(() => { const k = E.util.dayKey(), r = E.books.report(k, k); return { svc: r.services.count, voided: r.services.voided }; });
  ok(voided.svc === before.svc && voided.voided >= 1, "and is no longer counted");
  await p.evaluate(() => E.books.practiceAs("u_practice_marie")); await go("inventory"); await wait(p, 200);
  ok(await p.locator("#svcRecord").count() === 1 && await p.locator(".svc-void-key").count() === 0, "a cashier records transfers but sees no Void key");
  await p.click("#svcRecord"); await wait(p, 300);
  ok(await p.locator("#svcCom").count() === 0, "nor the commission");
  await p.keyboard.press("Escape"); await wait(p, 200);
  const denied = await p.evaluate(() => { const v = E.books.services()[0]; return E.books.voidService(v.id, "x").then(() => "voided", e => e.code); });
  ok(denied === "denied", "and the books refuse a cashier's void");
  await p.evaluate(() => E.books.practiceAs("owner"));
  await go("register"); await p.click('.chip[data-dept="services"]'); await wait(p, 250);
  await p.click("#regRecordSvc"); await wait(p, 300);
  ok(await p.locator("#svcAmount").count() === 1, "at the Register, the department records a transfer or top-up at the counter");
  await p.keyboard.press("Escape"); await wait(p, 200);
  await p.evaluate(() => { E.reports.period = "today"; }); await go("reports");
  ok(await p.locator("#repSvcCash").count() === 1 && (await p.textContent(".report")).includes("Money transfers and top-ups"), "the Reports show them in a section of their own, apart from the sales");
  const verify = await p.evaluate(() => E.books.verify().then(r => ({ ok: r.ok, problems: r.problems.slice(0, 3) })));
  ok(verify.ok, "the books verify, every service entry replayed from the ledger" + (verify.ok ? "" : ": " + JSON.stringify(verify.problems)));

  console.log("Twenty thousand items");
  const big = await p.evaluate(() => {
    const st = E.books.state(), cats = ["music", "movies", "perfume", "grocery", "drinks", "food", "other"], n0 = Object.keys(st.items).length;
    for (let i = 0; i < 20000; i++) {
      const id = "ibig" + i;
      st.items[id] = { id: id, name: "Shelf item " + String(i).padStart(5, "0") + (i % 7 === 0 ? " volume " + (i % 13) : ""), cat: cats[i % 7], price: 100 + i % 900, cost: 50 + i % 400,
        barcode: String(2000000000000 + i), sku: null, taxId: null, reorderAt: 5, notes: "", stock: (i * 7) % 60, archived: false, created: "", updated: "" };
    }
    let t = performance.now(); E.find.reset(); E.find.search({ q: "" }); const build = performance.now() - t;
    t = performance.now(); const hits = E.find.search({ q: "volume 7" }).length; const search = performance.now() - t;
    t = performance.now(); const one = E.find.byCode("2000000019999"); const code = performance.now() - t;
    return { n: n0 + 20000, build, search, hits, code, found: one.length === 1 && st.items[one[0]].name.indexOf("19999") > 0 };
  });
  ok(big.build < 2000, "the index of " + big.n + " items is made in " + Math.round(big.build) + " ms, once");
  ok(big.search < 60 && big.hits > 0, "a search through them all takes " + big.search.toFixed(1) + " ms (" + big.hits + " found)");
  ok(big.code < 5 && big.found, "a scanned code is found among them in " + big.code.toFixed(2) + " ms");
  const draw = await p.evaluate(() => { E.inventory.dept = "all"; const t = performance.now(); E.ui.go("inventory", true); return performance.now() - t; });
  ok(draw < 600, "Inventory draws in " + Math.round(draw) + " ms however large the list");
  ok(await p.locator("#invRows tr").count() === 50 && /^1 to 50 of 20,0\d\d$/.test(await p.textContent(".inv-page")), "a page of fifty at a time: " + await p.textContent(".inv-page"));
  await p.click("#invNext"); await wait(p, 200);
  ok(/^51 to 100 of/.test(await p.textContent(".inv-page")) && await p.locator("#invRows tr").count() === 50, "Next turns the page");
  await p.fill("#invSearch", "shelf item 19999"); await wait(p, 300);
  ok(await p.locator("#invRows tr").count() === 1, "and the search finds the one wanted at once");
  await go("register");
  const reg = await p.evaluate(() => { const s = document.getElementById("regSearch"); const t = performance.now(); s.value = "volume 3"; s.dispatchEvent(new Event("input")); return new Promise(r => setTimeout(() => r({ ms: performance.now() - t - 70, tiles: document.querySelectorAll("#regResults .product").length }), 120)); });
  ok(reg.tiles === 80 && reg.ms < 120, "the Register shows the first eighty matches in " + Math.round(Math.max(0, reg.ms)) + " ms after the pause for typing");
  /* the twenty thousand were never written: the books as they are on this device come back on opening */
  await p.evaluate(() => { E.books.lock("hand"); return E.books.openPractice().then(() => E.app.opened(true)); }); await p.waitForSelector(".shell", { timeout: 60000 });

  console.log("Every word in French and Kreyòl");
  const langs = await p.evaluate(() => { const d = E.dict, en = Object.keys(d.en); return { fr: en.filter(k => d.fr[k] === undefined), ht: en.filter(k => d.ht[k] === undefined) }; });
  ok(!langs.fr.length && !langs.ht.length, "every word has its French and its Kreyòl" + (langs.fr.length + langs.ht.length ? ": " + langs.fr.concat(langs.ht).slice(0, 6).join(", ") : ""));
  for (const l of ["fr", "ht"]) {
    await p.evaluate(x => { E.setLang(x); E.ui.shell(); }, l); await go("inventory"); await p.click("#invTab-services"); await wait(p, 300); await p.click("#svcRecord"); await wait(p, 250);
    await p.keyboard.press("Escape"); await go("register");
  }
  const missing = await p.evaluate(() => Object.keys(E.missing || {}));
  ok(missing.length === 0, "nothing shown in any language is missing a word" + (missing.length ? ": " + missing.join(", ") : ""));
  await p.evaluate(() => { E.setLang("en"); E.ui.shell(); });
  await go("guide");
  ok((await p.textContent("#room")).includes("Departments and scanning") && (await p.textContent("#room")).includes("Money transfers and top-ups"), "the Guidebook has a chapter on each");

  ok(errors.length === 0, "no errors in the page" + (errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""));
  ok(csp.length === 0, "the page's security policy refused nothing" + (csp.length ? ": " + csp.slice(0, 2).join(" | ") : ""));
  await browser.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
