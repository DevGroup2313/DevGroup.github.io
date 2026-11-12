/* LAKAY | Build 7 test: never locked out. The owner opens the books with the password whatever name is typed (or
   none); the practice store is always on the door; Refresh and Reset keys on the door and in Display; the Reset
   clears the wait after wrong tries, starts the practice store again, and takes the store off this device after a
   sealed backup. End to end, in Chromium.
   Run: node tests/t_build7.js [url]   (default: the built page, app/Lakay.html, opened from disk) */
"use strict";
const { chromium } = require("playwright");
const path = require("path");
const URL = process.argv[2] || "file://" + path.resolve(__dirname, "..", "app", "Lakay.html");
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }
const OWNER_PW = "kreyol and coffee 2026";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
  const errors = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));

  console.log("The door of a new device: Refresh and Reset are there");
  await p.goto(URL); await p.waitForSelector("#introDoor .intro-card", { timeout: 20000 });
  ok(await p.locator("#doorBar #doorRefresh").count() === 1 && await p.locator("#doorBar #doorReset").count() === 1, "the door's bar carries Refresh and Reset");
  await p.click("#doorReset"); await p.waitForSelector("#rsClear");
  ok(await p.locator("#rsPractice").count() === 1 && await p.locator("#rsErase").count() === 0, "with no store, Reset offers the waits and the practice store, not an erase");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);

  console.log("A store is set up");
  await p.click("#introProtect");
  await p.fill("#ldStore", "Boutik Test"); await p.fill("#ldUser", "Yannie");
  await p.fill("#ldP1", OWNER_PW); await p.fill("#ldP2", OWNER_PW);
  await p.click("#ldNext"); await p.waitForSelector(".ild-words li", { timeout: 60000 });
  const groups = await p.$$eval(".ild-words li", lis => lis.map(li => li.textContent.slice(li.querySelector("b").textContent.length).trim()));
  await p.click("#ldWrote"); await p.waitForSelector("#ldG1");
  const nums = (await p.locator("form#ldCf label").allTextContents()).map(s => parseInt((s.match(/\d+/) || ["0"])[0], 10));
  await p.fill("#ldG1", groups[nums[0] - 1]); await p.fill("#ldG2", groups[nums[1] - 1]);
  await p.click("#ldSeal"); await p.waitForSelector(".shell", { timeout: 60000 });
  await p.evaluate(() => E.books.addItem({ name: "Malta, 12 oz", cat: "drinks", price: 199, cost: 85, openingStock: 12 }));
  /* the owner's remembered name differs from the record's, as it can on a device set up in an older build */
  await p.evaluate(() => E.db.get("meta", "door").then(d => { d.user = "yannie f"; d.last = "Yannie D. Forest"; return E.db.write([{ store: "meta", key: "door", value: d }]); }));
  await p.evaluate(() => E.books.lock("test"));
  await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });

  console.log("The practice store is always on the door");
  ok(await p.locator("#introPractice").count() === 1, "the door with a store carries the practice store's own key beside Enter");
  await p.click("#introPractice"); await p.waitForSelector(".shell", { timeout: 60000 });
  ok(/practice/i.test(await p.textContent("#statusPill")), "it opens the practice store");
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });

  console.log("Display carries Refresh and Reset too");
  await p.click("#doorDisplay"); await p.waitForSelector("#dispRefresh");
  ok(await p.locator("#dispReset").count() === 1, "Display has Refresh and Reset");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);

  console.log("The owner's password opens the books whatever the name");
  await p.click("#introLock"); await p.waitForSelector("#lockDoor #ldName", { state: "visible" });
  ok((await p.inputValue("#ldName")) === "Yannie D. Forest", "the name field is prefilled with the name remembered last (which differs from the first one)");
  await p.fill("#ldPw", OWNER_PW); await p.click("#ldGo");
  await p.waitForSelector(".shell", { timeout: 60000 });
  ok(/Yannie/.test(await p.textContent("#statusPill")), "a differently remembered name no longer shuts the owner out");
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  await p.click("#introLock"); await p.waitForSelector("#lockDoor #ldName", { state: "visible" });
  await p.fill("#ldName", "anybody at all"); await p.fill("#ldPw", OWNER_PW); await p.click("#ldGo");
  await p.waitForSelector(".shell", { timeout: 60000 });
  ok(true, "any name with the owner's password opens the books");
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  await p.click("#introLock"); await p.waitForSelector("#lockDoor #ldName", { state: "visible" });
  await p.fill("#ldName", ""); await p.fill("#ldPw", OWNER_PW); await p.click("#ldGo");
  await p.waitForSelector(".shell", { timeout: 60000 });
  ok(true, "no name at all with the owner's password opens the books");
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });

  console.log("Wrong tries: a short wait, and the Reset ends it");
  await p.click("#introLock"); await p.waitForSelector("#lockDoor #ldName", { state: "visible" });
  for (let i = 0; i < 5; i++) { await p.fill("#ldPw", "wrong one " + i); await p.click("#ldGo"); await p.waitForTimeout(2200); }
  const msg = await p.textContent("#lockDoor .ild-err");
  ok(/wait/i.test(msg) && /reset/i.test(msg), "after five wrong tries the door asks for a short wait and names the Reset key (" + msg.trim().slice(0, 80) + ")");
  const until = await p.evaluate(() => +localStorage.getItem("emporium.waitUntil") || 0);
  ok(until > Date.now() && until - Date.now() <= 61000, "the wait is at most a minute");
  await p.fill("#ldPw", OWNER_PW); await p.click("#ldGo"); await p.waitForTimeout(800);
  ok(await p.locator(".shell").count() === 0, "during the wait the right password is not tried yet");
  await p.click("#doorReset"); await p.waitForSelector("#rsClear"); await p.click("#rsClear");
  await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  ok(await p.evaluate(() => +localStorage.getItem("emporium.waitUntil") === 0), "Reset clears the wait");
  await p.click("#introLock"); await p.waitForSelector("#lockDoor #ldName", { state: "visible" });
  ok((await p.inputValue("#ldName")) === "yannie f", "and forgets the last name typed (back to the owner's)");
  await p.fill("#ldPw", OWNER_PW); await p.click("#ldGo"); await p.waitForSelector(".shell", { timeout: 60000 });
  ok(true, "the owner is in again at once");
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });

  console.log("Reset: the store leaves this device after a sealed backup");
  await p.click("#doorReset"); await p.waitForSelector("#rsErase"); await p.click("#rsErase");
  await p.waitForSelector("#rsBackup");
  const dl = p.waitForEvent("download", { timeout: 20000 });
  await p.click("#rsBackup");
  const file = await dl;
  ok(/Lakay backup .*\.json$/.test(file.suggestedFilename()), "a sealed backup is saved first (" + file.suggestedFilename() + ")");
  const text = require("fs").readFileSync(await file.path(), "utf8");
  ok(/"format":"emporium-backup"/.test(text) && /"journal"/.test(text) && !/Malta/.test(text), "the backup is the sealed books: the item's name is not readable in it");
  await p.fill("#rsName", "Wrong Name"); await p.click("#rsGo"); await p.waitForTimeout(300);
  ok(await p.locator("#rsName[aria-invalid=true]").count() === 1, "the store's name must be typed to erase");
  await p.fill("#rsName", "Boutik Test"); await p.click("#rsGo");
  await p.waitForSelector("#introProtect", { timeout: 20000 });
  ok(true, "the store is off this device: the door is a new device's again");
  const restoreKey = await p.locator("#introRestore").count();
  ok(restoreKey === 1, "and the door offers to bring a store back from a backup");

  console.log("The backup brings the store back");
  await p.click("#introRestore"); await p.waitForSelector("#restoreFile", { state: "attached", timeout: 10000 });
  ok(true, "the restore asks for the backup file");
  await p.setInputFiles("#restoreFile", { name: "Lakay backup.json", mimeType: "application/json", buffer: Buffer.from(text) });
  await p.waitForSelector("#restoreSecret", { timeout: 20000 });
  await p.fill("#restoreSecret", OWNER_PW); await p.click("#restoreGo");
  await p.waitForSelector(".shell", { timeout: 60000 });
  const back = await p.evaluate(() => Object.keys(E.books.state().items).length);
  ok(back === 1 && /Boutik Test/.test(await p.textContent(".brand .storename")), "the books are back with their item");

  console.log("Can't sign in? offers Reset as a third way");
  await p.evaluate(() => E.books.lock("test")); await p.waitForSelector("#introDoor #introLock", { timeout: 20000 });
  await p.click("#introLock"); await p.waitForSelector("#ldForgot", { state: "visible" }); await p.click("#ldForgot");
  await p.waitForSelector("#ldWayReset"); await p.click("#ldWayReset"); await p.waitForSelector("#rsClear");
  ok(true, "the third way opens the Reset");
  await p.keyboard.press("Escape");

  console.log("Errors");
  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" / ") : ""));
  await browser.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
