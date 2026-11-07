/* LAKAY | Build 3 test: the whole app, end to end, in Chromium.
   Run: node tests/t_build3.js [url]   (default: the built page, app/Lakay.html, opened from disk)
   Checks the door and the living mark, the practice store and every room, the top bar (one language key), the right
   press panel, hidden scrollbars, the footer, the build number in About and the Guidebook, the report periods with no
   stamp line, night dress, and the real store: set-up with the Master Key, lock, sign-in, a wrong password refused. */
"use strict";
const { chromium } = require("playwright");
const path = require("path");
const BUILD = require(path.join(__dirname, "..", "build.json")).build;
const URL = process.argv[2] || "file://" + path.resolve(__dirname, "..", "app", "Lakay.html");
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

  console.log("The door");
  await page.goto(URL);
  await page.waitForSelector("#introDoor .intro-card", { timeout: 20000 });
  ok(await page.locator("#introSeal .lk-crest img.lk-l").count() === 16, "the door's mark stands in its sixteen planes");
  ok(/^data:image\/png;base64,/.test(await page.getAttribute('link[rel="icon"]', "href")), "the page's icon is the mark");
  ok((await page.title()) === "Lakay", "the window is called Lakay");

  console.log("The practice store");
  await page.click("#introEnter");
  await page.waitForSelector(".shell", { timeout: 30000 });
  ok(await page.locator("#brandSeal .lk-crest").count() === 1, "the side menu carries the living mark");
  ok(await page.locator("#heroCrest .lk-crest img.lk-l").count() === 16, "home carries the living mark in its sixteen planes");
  const status = await page.textContent("#statusPill");
  ok(/practice/i.test(status), "the status key says practice store (" + status.trim() + ")");
  ok(await page.locator(".cl-cluster button.cl-key.lang").count() === 1, "one language key, not three");
  ok(await page.locator("#langBtn .flag svg").count() === 1, "the language key carries one small flag");
  const sw = await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth);
  ok(sw === "none", "scrollbars are hidden (scrollbar-width: " + sw + ")");
  const foot = await page.textContent("footer.app-foot");
  ok(/Yannie D\. Forest/.test(foot) && /©/.test(foot) && /Lakay/.test(foot), "the footer: the mark, the name, the maker and the copyright");
  ok(await page.locator("footer.app-foot .crest-key .lk-crest").count() === 1, "the footer's mark is a key");

  console.log("Every room");
  for (const room of ["register", "inventory", "reports", "guide", "settings", "studio", "home"]) {
    await page.click('.nav-btn[data-room="' + room + '"]');
    await page.waitForTimeout(350);
    ok(await page.locator("main#room h1, main#room .hx").count() > 0, "the room opens: " + room);
    const body = await page.textContent("main#room");
    ok(!/ledger line \d+|fingerprint [0-9a-f]{12}/i.test(body), "no stamp line in " + room);
  }

  console.log("Reports");
  await page.click('.nav-btn[data-room="reports"]'); await page.waitForTimeout(300);
  const periods = await page.locator("main#room .period-rows button, main#room .period-rows [role=radio]").count();
  ok(periods >= 12, "the report periods are all there (" + periods + ")");

  console.log("The build number in About and the Guidebook");
  await page.click('.cl-key:has-text("About")'); await page.waitForTimeout(400);
  ok(new RegExp("Build " + BUILD).test(await page.textContent(".about-foot")), "About's foot names Build " + BUILD);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await page.click('.nav-btn[data-room="guide"]'); await page.waitForTimeout(300);
  ok(new RegExp("Build " + BUILD).test(await page.textContent(".guide-foot")), "the Guidebook's foot names Build " + BUILD);

  console.log("Languages");
  const navHome = () => page.textContent('.nav-btn[data-room="home"] .long');
  const en = await navHome();
  await page.click("#langBtn"); await page.waitForTimeout(300); const fr = await navHome();
  await page.click("#langBtn"); await page.waitForTimeout(300); const ht = await navHome();
  await page.click("#langBtn"); await page.waitForTimeout(300); const back = await navHome();
  ok(en !== fr && fr !== ht && back === en, "one key goes English, French, Kreyòl and back (" + [en, fr, ht].join(" / ") + ")");

  console.log("The right press panel");
  await page.click('.nav-btn[data-room="inventory"]'); await page.waitForTimeout(300);
  const field = page.locator("main#room input[type=text], main#room input[type=search], main#room input:not([type])").first();
  if (await field.count()) {
    await field.click(); await field.fill("Kremas");
    await field.click({ button: "right" }); await page.waitForTimeout(200);
    ok(await page.locator("#cd-em-menu[role=menu]").count() === 1, "a right press on a field opens the family's edit menu");
    await page.screenshot({ path: path.join(__dirname, "edit-menu.png") });
    const items = await page.locator("#cd-em-menu .cd-em-row").allTextContents();
    ok(items.some(x => /Copy/.test(x)) && items.some(x => /Paste/.test(x)) && items.some(x => /Undo/.test(x)), "the panel has Undo, Copy and Paste");
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    ok(await page.locator("#cd-em-menu").count() === 0, "Escape closes the menu");
    await page.evaluate(() => { try { window.getSelection().removeAllRanges(); } catch (e) { } });
    await page.mouse.click(700, 120, { button: "right" }); await page.waitForTimeout(200);
    ok(await page.locator("#cd-em-menu").count() === 0, "a right press where there is nothing to edit opens nothing");
  } else ok(false, "a text field to right press in Inventory");

  console.log("The mark answers a press, and dresses for the night");
  await page.click('.nav-btn[data-room="home"]'); await page.waitForTimeout(300);
  await page.click("#heroCrest"); await page.waitForTimeout(300); await page.click("#heroCrest"); await page.waitForTimeout(300);
  const daySrc = await page.getAttribute("#heroCrest img.lk-plate", "src");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "night")); await page.waitForTimeout(200);
  const nightSrc = await page.getAttribute("#heroCrest img.lk-plate", "src");
  ok(daySrc !== nightSrc, "the mark changes to its night dress");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "day"));

  console.log("The real store: set-up, Master Key, lock, sign-in");
  const p2 = await ctx.newPage();
  p2.on("pageerror", e => errors.push(e.message));
  await p2.goto(URL); await p2.waitForSelector("#introProtect", { timeout: 20000 });
  await p2.click("#introProtect");
  await p2.fill("#ldStore", "Mizik Depot Test"); await p2.fill("#ldUser", "Yannie");
  ok(await p2.locator("#ldP1 + .pw-peek").count() === 1 && await p2.locator("#ldP2 + .pw-peek").count() === 1, "both new-password fields have the key");
  await p2.fill("#ldP1", "kreyol and coffee 2026"); await p2.fill("#ldP2", "kreyol and coffee 2026");
  await p2.click("#ldNext");
  await p2.waitForSelector(".ild-words li", { timeout: 60000 });
  const groups = await p2.$$eval(".ild-words li", lis => lis.map(li => li.textContent.slice(li.querySelector("b").textContent.length).trim()));
  ok(groups.length === 13, "the Master Key is shown in 13 groups");
  await p2.click("#ldWrote");
  await p2.waitForSelector("#ldG1");
  const labels = await p2.locator("form#ldCf label").allTextContents();
  const nums = labels.map(s => parseInt((s.match(/\d+/) || ["0"])[0], 10));
  await p2.fill("#ldG1", groups[nums[0] - 1]); await p2.fill("#ldG2", groups[nums[1] - 1]);
  await p2.click("#ldSeal");
  await p2.waitForSelector(".shell", { timeout: 60000 });
  ok(/Mizik Depot Test/.test(await p2.textContent(".brand .storename")), "the real store opens with its name");
  await p2.evaluate(() => E.books.lock("test"));
  await p2.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  ok(!(await p2.isVisible("#ldPw")), "the door opens on the introduction, not on the sign-in");
  ok(await p2.locator("#doorBar #doorDisplay").count() === 1 && await p2.locator("#doorBar #doorAbout").count() === 1 && await p2.locator("#doorBar #doorLang").count() === 1,
    "the door carries the top bar: Display, About and one language key");
  ok(await p2.locator(".intro-corner-l .intro-lockpill #introLock svg").count() === 1, "the little lock sits in the card's top-left corner, as in Ingenium");
  await p2.click("#introLock");
  await p2.waitForSelector("#lockDoor.ild-indoor #ldPw", { state: "visible", timeout: 5000 });
  ok(true, "the lock opens the sign-in in the card's place");
  await p2.screenshot({ path: path.join(__dirname, "door-unfolded.png") });
  ok(await p2.locator(".pw-wrap #ldPw + .pw-peek").count() === 1, "the sign-in's password field has its show-password key");
  await p2.fill("#ldPw", "not the password at all");
  await p2.click(".pw-wrap #ldPw + .pw-peek");
  ok(await p2.getAttribute("#ldPw", "type") === "text", "the key shows the password as it is typed");
  await p2.screenshot({ path: path.join(__dirname, "signin-peek.png") });
  await p2.click(".pw-wrap #ldPw + .pw-peek");
  ok(await p2.getAttribute("#ldPw", "type") === "password", "and hides it again");
  await p2.click("#ldGo");
  await p2.waitForTimeout(2500);
  ok(await p2.locator(".shell").count() === 0, "a wrong password is refused");
  ok(/match|wrong|not/i.test(await p2.textContent("#lockDoor .ild-err")), "and the door says so");
  await p2.fill("#ldPw", "kreyol and coffee 2026"); await p2.click("#ldGo");
  await p2.waitForSelector(".shell", { timeout: 60000 });
  ok(true, "the right password opens the store again");

  console.log("Errors");
  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""));
  await browser.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
