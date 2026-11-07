/* LAKAY | Build 6 test: the owner as administrator, the staff with user IDs and access levels, signing in and out
   with the time clock, and reports by person. End to end, in Chromium.
   Run: node tests/t_build6.js [url]   (default: the built page, app/Lakay.html, opened from disk) */
"use strict";
const { chromium } = require("playwright");
const path = require("path");
const URL = process.argv[2] || "file://" + path.resolve(__dirname, "..", "app", "Lakay.html");
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }
const OWNER_PW = "kreyol and coffee 2026", FIRST_PW = "first one for rose", ROSE_PW = "rose sells kompa cds";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const errors = [];

  console.log("The practice store: sample people, seeing the store as each of them");
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForSelector("#introDoor .intro-card", { timeout: 20000 });
  await page.click("#introEnter");
  await page.waitForSelector(".shell", { timeout: 60000 });
  ok(await page.locator('.nav-btn[data-room="team"]').count() === 1, "the side menu has the Team room");
  await page.click('.nav-btn[data-room="team"]');
  await page.waitForSelector("#peopleList");
  const names = await page.$$eval("#peopleList tbody tr", rows => rows.map(r => r.textContent));
  ok(names.length === 3 && /Marie/.test(names[1]) && /1002/.test(names[1]) && /Jean/.test(names[2]) && /1003/.test(names[2]), "the owner (1001), Marie (1002) and Jean (1003) are listed with their IDs");
  ok(await page.locator("#teamHours tbody tr").count() >= 3, "everyone's hours are shown");
  await page.click('.team-tools [role="radio"][data-v="-1"]');
  const lastWeek = await page.$$eval('#teamHours tbody tr[data-person="u_practice_marie"] td', tds => tds.map(td => td.textContent));
  ok(lastWeek.length === 5 && +lastWeek[2] >= 5 && /h/.test(lastWeek[3]), "Marie worked her sample shifts last week (" + lastWeek.join(" | ") + ")");

  /* as Marie, a cashier */
  await page.click("#statusPill");
  await page.click('.as-keys [data-person="u_practice_marie"]');
  await page.waitForTimeout(600);
  ok(/Marie/.test(await page.textContent("#statusPill")), "the status key names Marie");
  ok(await page.locator("#statusPill.onclock").count() === 1, "Marie is clocked in as she arrives");
  ok(await page.locator('.nav-btn[data-room="reports"]').count() === 0 && await page.locator('.nav-btn[data-room="settings"]').count() === 0 && await page.locator('.nav-btn[data-room="studio"]').count() === 0,
    "a cashier sees no Reports, Settings or Author Studio");
  ok(await page.locator('.nav-btn[data-room="register"]').count() === 1, "a cashier sells at the Register");
  await page.click('.nav-btn[data-room="inventory"]'); await page.waitForSelector("#invRows tr");
  const heads = await page.$$eval(".grid thead th", ths => ths.map(th => th.textContent));
  ok(!heads.some(x => /cost|value/i.test(x)), "the inventory shows no cost and no value to a cashier (" + heads.join(", ") + ")");
  ok(await page.locator("#addItem").count() === 0, "a cashier cannot add items");
  const denied = await page.evaluate(() => E.books.addItem({ name: "x", cat: "other", price: 100 }).then(() => "added", e => e.code));
  ok(denied === "denied", "the books themselves refuse an item from a cashier");
  await page.evaluate(() => { location.hash = "settings"; });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => E.ui.current) === "home", "a cashier sent to Settings lands on Home instead");
  ok(await page.locator("#hxProfit").count() === 0, "Home shows no profit to a cashier");

  /* as Jean, a manager */
  await page.click("#statusPill");
  await page.click('.as-keys [data-person="u_practice_jean"]');
  await page.waitForTimeout(600);
  ok(await page.locator('.nav-btn[data-room="reports"]').count() === 1 && await page.locator('.nav-btn[data-room="settings"]').count() === 0, "a manager sees Reports but not Settings");
  await page.click('.nav-btn[data-room="reports"]'); await page.waitForSelector("#repOut");
  await page.click('.chip[data-p="m2"]'); await page.waitForTimeout(300);
  ok(await page.locator("#repPeople tbody tr").count() >= 2, "the report lists the sales by person");
  ok(await page.locator("#rProfit").count() === 1, "a manager sees the profit");
  await page.click("#statusPill");
  ok(await page.locator("#onClockList li").count() >= 2, "a manager sees who is on the clock (Marie and Jean)");
  await page.click('.as-keys [data-person="owner"]');
  await page.waitForTimeout(500);
  ok(await page.locator('.nav-btn[data-room="settings"]').count() === 1, "back as the owner, every room is open");

  console.log("The real store: the owner adds a person with an ID and a first password");
  const p2 = await ctx.newPage();
  p2.on("pageerror", e => errors.push(e.message));
  await p2.goto(URL); await p2.waitForSelector("#introProtect", { timeout: 20000 });
  await p2.click("#introProtect");
  await p2.fill("#ldStore", "Mizik Depot Test"); await p2.fill("#ldUser", "Yannie");
  await p2.fill("#ldP1", OWNER_PW); await p2.fill("#ldP2", OWNER_PW);
  await p2.click("#ldNext");
  await p2.waitForSelector(".ild-words li", { timeout: 60000 });
  const groups = await p2.$$eval(".ild-words li", lis => lis.map(li => li.textContent.slice(li.querySelector("b").textContent.length).trim()));
  await p2.click("#ldWrote"); await p2.waitForSelector("#ldG1");
  const nums = (await p2.locator("form#ldCf label").allTextContents()).map(s => parseInt((s.match(/\d+/) || ["0"])[0], 10));
  await p2.fill("#ldG1", groups[nums[0] - 1]); await p2.fill("#ldG2", groups[nums[1] - 1]);
  await p2.click("#ldSeal");
  await p2.waitForSelector(".shell", { timeout: 60000 });
  await p2.evaluate(() => E.books.addItem({ name: "Kompa classics (CD)", cat: "music", price: 1299, cost: 650, openingStock: 10 }));
  await p2.click('.nav-btn[data-room="team"]'); await p2.waitForSelector("#addPerson");
  await p2.click("#addPerson");
  await p2.fill("#pName", "Rose");
  ok(await p2.$eval('#pLevel [data-v="cashier"]', b => b.getAttribute("aria-checked")) === "true", "a new person starts as a cashier");
  await p2.fill("#pPw", FIRST_PW); await p2.fill("#pPw2", FIRST_PW); await p2.fill("#pOwnerPw", "not my password");
  await p2.click("#pSave");
  await p2.waitForSelector("#pOwnerPw[aria-invalid=true]", { timeout: 30000 });
  ok(true, "a wrong owner password gives no key");
  await p2.fill("#pOwnerPw", OWNER_PW); await p2.click("#pSave");
  await p2.waitForSelector("#newPersonId", { timeout: 30000 });
  ok(/1002/.test(await p2.textContent("#newPersonId")), "Rose gets the user ID 1002");
  await p2.click("text=Got it");
  const vaultPeople = await p2.evaluate(() => E.db.get("meta", "vault").then(v => Object.keys(v.people || {}).length));
  ok(vaultPeople === 1, "Rose has her own sealed key in the vault");

  console.log("Signing out, and Rose's first sign-in");
  await p2.click("#statusPill"); await p2.click("#signOutKey");
  await p2.waitForSelector("#lockDoor #ldName", { state: "visible", timeout: 20000 });
  ok(true, "signing out brings the sign-in straight to the door");
  await p2.fill("#ldName", "Rose"); await p2.fill("#ldPw", FIRST_PW); await p2.click("#ldGo");
  await p2.waitForSelector("#ldOwn1", { timeout: 30000 });
  ok(true, "on her first sign-in, Rose is asked to choose her own password");
  await p2.fill("#ldOwn1", FIRST_PW); await p2.fill("#ldOwn2", FIRST_PW); await p2.click("#ldOwnGo");
  await p2.waitForTimeout(300);
  ok(await p2.locator(".shell").count() === 0, "she cannot keep the password she was given");
  await p2.fill("#ldOwn1", ROSE_PW); await p2.fill("#ldOwn2", ROSE_PW); await p2.click("#ldOwnGo");
  await p2.waitForSelector(".shell", { timeout: 60000 });
  ok(/Rose/.test(await p2.textContent("#statusPill")) && await p2.locator("#statusPill.onclock").count() === 1, "Rose is in, and on the clock");
  ok(await p2.locator('.nav-btn[data-room="settings"]').count() === 0 && await p2.locator('.nav-btn[data-room="reports"]').count() === 0, "Rose sees no Settings and no Reports");

  console.log("Rose sells, takes a break, clocks out");
  await p2.click('.nav-btn[data-room="register"]'); await p2.waitForSelector("#regResults .product");
  await p2.click("#regResults .product"); await p2.click("#takeCash");
  await p2.waitForSelector("#cashIn"); await p2.fill("#cashIn", "20"); await p2.click("#cashDone");
  await p2.waitForSelector(".receipt .r-by", { timeout: 20000 });
  ok(/Rose · ID 1002/.test(await p2.textContent(".receipt .r-by")), "the receipt says Rose (ID 1002) served");
  await p2.click("#receiptDone");
  const saleBy = await p2.evaluate(() => { const s = E.books.state().sales.slice(-1)[0]; return s.by === E.books.user.id && s.byNo === 1002; });
  ok(saleBy, "the sale carries Rose's user ID");
  const lineBy = await p2.evaluate(() => E.books.lines().then(ls => ls[0].by === E.books.user.id));
  ok(lineBy, "the ledger line carries Rose's user ID");
  await p2.click("#statusPill"); await p2.click("#breakKey"); await p2.waitForTimeout(400);
  ok(await p2.locator("#statusPill.onbreak").count() === 1, "on a break, the status key turns amber");
  await p2.click("#statusPill"); await p2.click("#breakKey"); await p2.waitForTimeout(400);
  ok(await p2.locator("#statusPill.onclock").count() === 1, "back from the break");
  await p2.click("#statusPill"); await p2.click("#signOutKey");
  await p2.waitForSelector("#lockDoor #ldName", { state: "visible", timeout: 20000 });
  ok(/Rose clocked out/.test(await p2.textContent("#lockDoor")), "the door says Rose clocked out and signed out");

  console.log("The owner signs in by ID, and sees it all");
  await p2.fill("#ldName", "1001"); await p2.fill("#ldPw", OWNER_PW); await p2.click("#ldGo");
  await p2.waitForSelector(".shell", { timeout: 60000 });
  ok(/Yannie/.test(await p2.textContent("#statusPill")), "the owner signs in with the ID 1001");
  await p2.click('.nav-btn[data-room="team"]'); await p2.waitForSelector("#teamHours");
  const rose = await p2.$$eval('#teamHours tbody tr td', tds => tds.map(td => td.textContent).join(" | "));
  ok(/Rose \| 1002 \| 1 \|/.test(rose), "Rose's shift is on the time card (" + rose + ")");
  const shift = await p2.evaluate(() => { const s = E.books.shifts()[0]; return !!(s && s.out && s.breaks.length === 1 && s.breaks[0].to); });
  ok(shift, "the shift has its clock-in, its break and its clock-out");
  await p2.click('.nav-btn[data-room="reports"]'); await p2.waitForSelector("#repPeople");
  ok(/Rose · ID 1002/.test(await p2.textContent("#repPeople")), "today's report shows Rose's sale under her name and ID");
  await p2.click('#repPeople button.row-key'); await p2.waitForTimeout(300);
  ok(/Rose/.test(await p2.textContent("#repRange")), "pressing her name shows Rose's report alone");

  console.log("Taking a key back");
  await p2.click('.nav-btn[data-room="team"]'); await p2.waitForSelector("#peopleList");
  await p2.click('#peopleList tr[data-person] button.row-key'); await p2.waitForSelector("#pRetire");
  await p2.click("#pRetire"); await p2.click(".layer .key.danger");
  await p2.waitForTimeout(800);
  ok(/Key taken back/.test(await p2.textContent("#peopleList")), "Rose's key is taken back");
  await p2.evaluate(() => E.books.lock("signout"));
  await p2.waitForSelector("#lockDoor #ldName", { state: "visible", timeout: 20000 });
  await p2.fill("#ldName", "Rose"); await p2.fill("#ldPw", ROSE_PW); await p2.click("#ldGo");
  await p2.waitForTimeout(3000);
  ok(await p2.locator(".shell").count() === 0, "Rose can no longer sign in");

  console.log("Errors");
  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" / ") : ""));
  await browser.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
