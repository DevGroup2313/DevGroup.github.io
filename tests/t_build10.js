/* LAKAY | Build 10 test: the Home page, redesigned (its look made new again in Build 12, in the shell's colours). The counter's three keys lead where they say; the day's figures and
   the takings of each hour agree with the books, answer the pointer and the keyboard, and are in a table for screen
   readers; Needs you offers the right key for each thing; the latest sales open their receipts; the room tiles open
   their rooms; the proverb is in Kreyòl. A cashier sees her shift and no profit; the owner of a new store sees the
   first steps and the backup to make. The page fits a phone and an iPad without sideways scrolling, by day and by night.
   Run: node tests/t_build10.js [url]   (default: the built page, app/Lakay.html, opened from disk) */
"use strict";
const { chromium } = require("playwright");
const path = require("path");
const URL = process.argv[2] || "file://" + path.resolve(__dirname, "..", "app", "Lakay.html");
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }
const wait = (p, ms) => p.waitForTimeout(ms);
const OWNER_PW = "kreyol and coffee 2026";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));
  const home = async () => { await p.evaluate(() => E.ui.go("home")); await p.waitForSelector(".hm-hero"); await wait(p, 600); };

  console.log("The practice store's Home");
  await p.goto(URL); await p.waitForSelector("#introEnter", { timeout: 20000 });
  await p.evaluate(() => E.books.openPractice().then(() => E.app.opened(true)));
  await p.waitForSelector(".shell", { timeout: 60000 });
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); });
  await home();
  ok(await p.locator(".hm-hero #heroCrest").count() === 1, "the living mark leads the Home");
  ok(await p.locator("#homeSale").count() === 1 && await p.locator("#homeReceive").count() === 1 && await p.locator("#homeFind").count() === 1, "the counter's three keys: New sale, Receive a delivery, Price check");
  await p.click("#homeSale"); await wait(p, 400);
  ok(await p.evaluate(() => E.ui.current) === "register", "New sale opens the register");
  await home(); await p.click("#homeReceive"); await wait(p, 400);
  ok(await p.evaluate(() => E.ui.current) === "inventory" && /deliver|livraison|choose|item/i.test(await p.textContent(".banner")), "Receive a delivery opens the inventory, ready to choose what arrived");
  await home(); await p.click("#homeFind"); await p.waitForSelector(".rail-pop #findQ", { timeout: 3000 });
  ok(true, "Price check opens the price check, ready to type");
  await p.keyboard.press("Escape"); await wait(p, 200);

  console.log("The day's figures and the takings of each hour");
  const r = await p.evaluate(() => { const k = E.util.dayKey(); const rep = E.books.report(k, k); return { count: rep.count, gross: rep.gross, byHour: rep.byHour.map(x => x.gross) }; });
  const cols = await p.$$eval(".hm-col", cs => cs.length);
  const now = new Date().getHours();
  let first = 24, last = -1; r.byHour.forEach((g, i) => { if (g) { if (i < first) first = i; last = i; } });
  const from = Math.min(8, first), to = Math.min(23, Math.max(19, last, now));
  ok(cols === to - from + 1, "one column for each hour of the store's day (" + cols + ")");
  const pcts = await p.$$eval(".hm-bar", bs => bs.map(b => +b.getAttribute("data-pct")));
  const max = Math.max.apply(null, r.byHour.slice(from, to + 1));
  ok(pcts.some(x => x === 100) && pcts.every((x, i) => (r.byHour[from + i] ? x > 0 : x === 0)), "each column stands in proportion to its hour's takings");
  const peakIdx = r.byHour.indexOf(max);
  await p.locator(".hm-col").nth(peakIdx - from).focus(); await wait(p, 150);
  const tip = await p.evaluate(() => { const t = document.querySelector(".hm-tip"); return { shown: !t.hidden, text: t.textContent }; });
  ok(tip.shown && tip.text.indexOf(E_money(max)) >= 0, "the busiest hour answers the keyboard with its takings (" + tip.text + ")");
  function E_money(c) { return "$" + (c / 100).toFixed(2); }
  const label = await p.getAttribute(".hm-col >> nth=" + (peakIdx - from), "aria-label");
  ok(label && label.indexOf(E_money(max)) >= 0, "each column says its hour, takings and sales to a screen reader");
  const rows = await p.$$eval("table.sr-only tbody tr", t => t.length);
  ok(rows === r.byHour.slice(from, to + 1).filter(Boolean).length, "a table carries the same figures for screen readers");
  ok(/Busiest/.test(await p.textContent(".hm-peak")), "the busiest hour is named above the columns");
  const dayBar = await p.evaluate(() => getComputedStyle(document.querySelector(".hm-bar")).backgroundColor);
  ok(dayBar === "rgb(95, 103, 204)", "by day the columns wear the checked periwinkle #5f67cc (" + dayBar + ")");
  ok(+(await p.textContent("#hxSales .g-value .sr-only")).replace(/[^0-9]/g, "") === r.count, "the sales gauge agrees with the books");

  console.log("Needs you, the latest sales, the rooms and the proverb");
  const needRows = await p.$$eval(".hm-needs .hm-need", n => n.length);
  ok(needRows >= 1 && await p.locator(".hm-needs .hm-need-k").first().textContent() === "Receive", "Needs you lists what runs low, each with its Receive key");
  await p.locator(".hm-needs .hm-need-k").first().click(); await p.waitForSelector("#rcQty", { timeout: 3000 });
  ok(true, "Receive opens the delivery for that item");
  await p.keyboard.press("Escape"); await wait(p, 300);
  const sales = await p.$$eval(".hm-sale", s => s.length);
  ok(sales >= 1 && sales <= 5, "the latest sales, five at most (" + sales + ")");
  ok(await p.locator(".hm-sale small").count() >= 1, "each sale says who served it");
  await p.locator(".hm-sale").first().click(); await p.waitForSelector(".layer .dialog", { timeout: 3000 });
  ok(true, "a sale opens its receipt");
  await p.keyboard.press("Escape"); await wait(p, 300);
  const tiles = await p.$$eval(".hm-tile", t => t.map(x => x.getAttribute("data-room")));
  ok(tiles.length === 7 && tiles.indexOf("studio") >= 0, "the owner sees every room as a tile (" + tiles.join(", ") + ")");
  await p.click('.hm-tile[data-room="reports"]'); await wait(p, 400);
  ok(await p.evaluate(() => E.ui.current) === "reports", "a tile opens its room");
  await home();
  ok(await p.locator(".hm-proverb, .ct-plaque").count() === 0 && await p.evaluate(() => document.querySelector(".hm").lastElementChild.classList.contains("hm-rooms")), "the Home ends with the rooms: the gold band is gone (Build 14, at the owner's request)");

  console.log("Night, an iPad and a phone");
  await p.evaluate(() => { E.util.prefSet("theme", "night"); E.ui.applyLook(); }); await wait(p, 300);
  const nightBar = await p.evaluate(() => getComputedStyle(document.querySelector(".hm-bar")).backgroundColor);
  ok(nightBar === "rgb(117, 125, 222)", "by night the columns wear the checked #757dde (" + nightBar + ")");
  for (const w of [820, 390]) {
    await p.setViewportSize({ width: w, height: 900 }); await home();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 0, "at " + w + " points wide, nothing scrolls sideways (" + over + ")");
  }
  await p.setViewportSize({ width: 1280, height: 860 });
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); });

  console.log("A cashier's Home");
  await p.evaluate(() => E.books.practiceAs("u_practice_marie")); await home();
  ok(await p.locator("#hxProfit").count() === 0 && await p.locator("#hxOnClock").count() === 1, "a cashier sees no profit; the people on the clock instead");
  ok(await p.locator("#homeReceive").count() === 0 && await p.locator("#homeSale").count() === 1, "a cashier's keys: a sale and a price check, no delivery");
  ok(/shift|service|sèvis/i.test(await p.textContent(".hm-strip")), "the strip shows her shift");
  ok(await p.locator('.hm-tile[data-room="settings"]').count() === 0, "and no tile for a room she may not open");
  await p.evaluate(() => E.books.practiceAs("owner"));

  console.log("The owner of a new store");
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor", { timeout: 20000 });
  await p.evaluate(() => E.books.useBooks(false));
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
  await home();
  ok(await p.locator(".hm-steps li").count() === 5 && await p.locator(".hm-steps li.now").count() === 1, "the first steps, five of them, the next one marked");
  ok(await p.locator(".hm-strip #heroNext").count() === 1, "with a key for the next step");
  const backup = await p.locator(".hm-needs .hm-need", { hasText: "backup" }).count();
  ok(backup === 1, "Needs you asks for the first backup of the books");
  ok(await p.locator(".hm-sales .hm-calm").count() === 1, "with no sale yet, Latest sales says so calmly, with a key to make one");

  console.log("Errors");
  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" / ") : ""));
  await browser.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
