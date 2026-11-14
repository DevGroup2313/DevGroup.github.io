/* LAKAY | Build 14 test: the owner's corrections to the Home, the thinned side rail, and Lakay on the web.
   The logo stands alone with its living 3D mark and no ring; the gold band at the foot of the Home is gone; the side
   rail carries three keys (notes, a new sale, price check) and the rest live in the top bar: the calculator has its own
   key, and what runs low and the reminders share one Alerts panel, where each low item has its Receive key. Then the
   web app is served from builds/Lakay-Web.zip as the owner uploads it to the store's website (Build 15: the lakay folder
   at /lakay/): its manifest names the
   logo for home screens and docks, every icon it names is there, Chromium finds nothing that stops it being installed,
   the service worker keeps the page, and Lakay opens again with the server gone. Nothing is refused by the page's policy.
   Run: node tests/t_build14.js [url]   (default: the built page, app/Lakay.html, opened from disk) */
"use strict";
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), http = require("http"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, ".."), APP = path.join(ROOT, "app"), WEB = path.join(ROOT, "web");
const PAGE = process.argv[2] || "file://" + path.join(APP, "Lakay.html");
const BUILD = JSON.parse(fs.readFileSync(path.join(ROOT, "build.json"), "utf8")).build;
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }
const wait = (p, ms) => p.waitForTimeout(ms);
function png(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: buf[25], png: buf.slice(1, 4).toString() === "PNG" }; }
function localInput(d) { const z = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "T" + z(d.getHours()) + ":" + z(d.getMinutes()); }

/* a small server that answers as GitHub Pages does: the site's front page at /, the web app at /lakay/ */
const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript", ".png": "image/png", ".ico": "image/x-icon", ".sha256": "text/plain" };
/* what the owner uploads: the lakay folder from builds/Lakay-Web.zip, unpacked here as a host's file manager would */
const SITE = fs.mkdtempSync(path.join(require("os").tmpdir(), "lakay-site-"));
require("child_process").execFileSync("python3", ["-I", "-m", "zipfile", "-e", path.join(ROOT, "builds", "Lakay-Web.zip"), SITE]);
const UPLOADED = path.join(SITE, "lakay");
function serve() {
  const asked = [];
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]); asked.push(u);
    if (u === "/") { res.writeHead(200, { "Content-Type": TYPES[".html"] }); return res.end("<!doctype html><title>The store's own site</title><p>Our store</p>"); }
    if (u === "/lakay") { res.writeHead(301, { Location: "/lakay/" }); return res.end(); }
    if (u.indexOf("/lakay/") !== 0) { res.writeHead(404); return res.end("not here"); }
    let rel = u.slice("/lakay/".length) || "index.html";
    if (rel.indexOf("..") >= 0 || rel.indexOf("/") >= 0) { res.writeHead(404); return res.end(); }
    const file = path.join(UPLOADED, rel);
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end("not here"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "max-age=600" });
    res.end(fs.readFileSync(file));
  });
  const sockets = new Set();
  server.on("connection", s => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
  return new Promise(done => server.listen(0, "127.0.0.1", () => done({ port: server.address().port, asked,
    stop: () => new Promise(r => { server.close(() => r()); sockets.forEach(s => s.destroy()); }) })));
}

(async () => {
  /* lakay.test stands for a website reached by plain http, which is not a secure address */
  const browser = await chromium.launch({ args: ["--host-resolver-rules=MAP lakay.test 127.0.0.1"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const errors = [], csp = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
  const home = async () => { await p.evaluate(() => E.ui.go("home")); await p.waitForSelector(".ct-hero"); await wait(p, 1500); };

  await p.goto(PAGE); await p.waitForSelector("#introEnter", { timeout: 20000 });
  ok(await p.locator('meta[name="lakay-web"]').count() === 0 && await p.locator('link[rel="manifest"]').count() === 0, "the apps' own page is not the web app: no manifest and no service worker there");
  await p.evaluate(() => E.books.openPractice().then(() => E.app.opened(true)));
  await p.waitForSelector(".shell", { timeout: 60000 });
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); });
  await home();

  console.log("The logo, left alone");
  const mark = await p.evaluate(() => {
    const m = document.querySelector(".ct-mark"), cs = getComputedStyle(m), b = getComputedStyle(m, "::before"), a = getComputedStyle(m, "::after");
    const crest = m.querySelector("#heroCrest"), moving = crest ? Array.prototype.filter.call(crest.querySelectorAll("*"), el => getComputedStyle(el).animationName !== "none").length : 0;
    return { border: cs.borderTopWidth, shadow: cs.boxShadow, bg: cs.backgroundImage + " " + cs.backgroundColor, before: b.content, after: a.content, crest: !!crest, moving,
      key: crest ? crest.classList.contains("hx-seal-key") && crest.classList.contains("crest-key") : false };
  });
  ok(mark.crest && mark.key, "the welcome holds Lakay's own living mark, the same key it had before the redesign");
  ok(mark.border === "0px" && mark.shadow === "none" && /none/.test(mark.bg) && /rgba\(0, 0, 0, 0\)/.test(mark.bg) && mark.before === "none" && mark.after === "none",
    "no ring, rim, disc or shadow is drawn around it (border " + mark.border + ", shadow " + mark.shadow + ", before " + mark.before + ", after " + mark.after + ")");
  ok(mark.moving >= 3, "and it keeps its popped-out 3D movement: " + mark.moving + " of its layers are moving");

  console.log("The figures and New sale, with the colour woven in");
  const look = await p.evaluate(() => {
    const w = getComputedStyle(document.querySelector(".ct-window")), k = getComputedStyle(document.querySelector("#homeSale .ct-key-face"));
    return { wBg: w.backgroundImage, wBorder: w.borderTopColor, kBg: k.backgroundImage, kShadow: k.boxShadow, value: getComputedStyle(document.querySelector(".ct-window .g-value")).color };
  });
  ok(/linear-gradient\(90deg/.test(look.wBg) && /rgb\(255, 255, 255\)/.test(look.wBg) && !/rgb\(89, 96, 190\) 100%/.test(look.wBg), "the figures' card is pearl, with a slim periwinkle band along its top instead of a solid purple face");
  ok(/rgb\(255, 255, 255\)/.test(look.kBg) && /4px 0px 0px 0px inset/.test(look.kShadow), "New sale is a pearl key marked by a periwinkle edge and its periwinkle jewel");
  ok(await p.locator(".hm-proverb, .ct-plaque, .hm-pv-ht").count() === 0, "the gold band at the foot of the Home is gone");

  console.log("The side rail: three keys");
  const rail = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll("#rail .rail-btn"), b => b.id));
  ok(rail.join() === "rail-notes,rail-sale,rail-find", "the rail carries notes, a new sale and price check, and nothing else (" + rail.join(", ") + ")");
  ok(await p.locator("#rail-bell, #rail-low, #rail-calc, #rail-theme, #fabTheme").count() === 0, "the reminders, low stock, calculator and day or night keys left the rail");
  const gaps = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll("#rail .rail-btn, #railChevron"), b => parseFloat(getComputedStyle(b).bottom)));
  ok(gaps.length === 4 && gaps[1] - gaps[0] === 56 && gaps[2] - gaps[1] === 56 && gaps[3] - gaps[2] === 56, "evenly spaced, with the key that lays them down above them (" + gaps.join(", ") + ")");
  await p.click("#rail-sale"); await wait(p, 300);
  ok(await p.evaluate(() => E.ui.current) === "register", "the sale key opens the register, ready to scan");
  await home();
  await p.click("#railChevron"); await wait(p, 400);
  ok(await p.evaluate(() => document.getElementById("rail").classList.contains("down")), "the rail still lays down at a touch");
  await p.click("#railChevron"); await wait(p, 300);

  console.log("The calculator, in the top bar");
  ok(await p.locator("#topCluster #calcBtn").count() === 1, "the calculator has its own key in the top bar");
  await p.click("#calcBtn"); await wait(p, 300);
  ok(await p.locator("#calcWin").isVisible(), "it opens the floating calculator");
  for (const k of ["7", "×", "6", "="]) await p.click('#calcWin .calc-k[aria-label="' + k + '"]');
  ok(await p.textContent("#calcWin .calc-val") === "42", "and it works as before: 7 × 6 = " + await p.textContent("#calcWin .calc-val"));
  await p.click("#calcBtn"); await wait(p, 300);
  ok(await p.locator("#calcWin").count() === 0, "and the same key puts it away");

  console.log("Alerts: what needs seeing to, and the reminders");
  const lowN = await p.evaluate(() => E.ui.alerts().filter(a => a.item).length);
  ok(lowN >= 1 && await p.locator("#alertsBtn .cnt").count() === 1, "the Alerts key shows its dot while something waits (" + lowN + " items low in the practice store)");
  await p.click("#alertsBtn"); await p.waitForSelector("#alertsNeeds");
  const needs = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll("#alertsNeeds .alert-list li"), li => ({ text: li.textContent, keys: li.querySelectorAll("button").length })));
  ok(needs.length === lowN && needs.every(n => n.keys === 2), "each low item is listed with its Receive key and its Open key");
  ok(await p.locator("#alertsReminders #remText").count() === 1 && await p.locator("#alertsReminders #remWhen").count() === 1, "the reminders are in the same panel, with their list and the form to add one");
  await p.fill("#remText", "Call the drinks supplier");
  await p.fill("#remWhen", localInput(new Date(Date.now() - 3600000)));
  await p.click('#alertsReminders button[type="submit"]'); await wait(p, 700);
  const rem = await p.evaluate(() => { const li = Array.prototype.find.call(document.querySelectorAll("#alertsReminders .rp-list li"), x => /drinks supplier/.test(x.textContent));
    return { there: !!li, late: li ? li.classList.contains("late") : false, ring: document.getElementById("alertsBtn").classList.contains("ringing"), label: document.getElementById("alertsBtn").getAttribute("aria-label") }; });
  ok(rem.there && rem.late, "a reminder is added there, and one already due is marked late");
  ok(rem.ring && /\(\d+\)/.test(rem.label), "the Alerts key rings while a reminder is due, and says how many things wait (" + rem.label + ")");
  await p.click('#alertsReminders li.late .rp-check'); await wait(p, 700);
  ok(await p.evaluate(() => !document.getElementById("alertsBtn").classList.contains("ringing")), "ticked off, it stops ringing");
  ok(await p.locator("#alertsNeeds").count() === 1 && await p.locator(".dialog #alertsReminders").count() === 1, "and the panel stays open, drawn afresh");
  await p.click("#alertsNeeds .alert-list li button.primary"); await wait(p, 500);
  ok(await p.locator("#rcQty").count() === 1 && await p.locator("#alertsNeeds").count() === 0, "Receive goes straight to the delivery of that item");
  await p.keyboard.press("Escape"); await wait(p, 400);
  await p.click("#alertsBtn"); await p.waitForSelector("#alertsNeeds");
  await p.click('#alertsNeeds .alert-list li button:not(.primary)'); await wait(p, 600);
  ok(await p.evaluate(() => E.ui.current) === "inventory", "Open goes to the item's room");
  await p.evaluate(() => { E.util.prefSet("theme", "night"); E.ui.applyLook(); E.ui.refreshTop(); }); await home();
  ok(await p.locator("#rail .rail-btn").count() === 3, "by night the rail is the same three keys");
  await p.setViewportSize({ width: 390, height: 844 }); await home();
  const phone = await p.evaluate(() => ({ keys: Array.prototype.every.call(document.querySelectorAll("#rail .rail-btn"), b => { const r = b.getBoundingClientRect(); return r.right <= innerWidth && r.top >= 0; }),
    wide: document.documentElement.scrollWidth <= innerWidth }));
  ok(phone.keys && phone.wide, "on a phone the three keys sit inside the screen, and nothing is wider than it");
  ok(errors.length === 0, "no errors in the page" + (errors.length ? ": " + errors.join(" | ") : ""));
  await ctx.close();

  console.log("Lakay on the web, uploaded from builds/Lakay-Web.zip to a website");
  const inZip = fs.readdirSync(UPLOADED).sort().join();
  ok(inZip === "apple-touch-icon.png,favicon.ico,icon-192.png,icon-512.png,icon-maskable-192.png,icon-maskable-512.png,index.html,manifest.json,sw.js" && fs.existsSync(path.join(SITE, "READ ME FIRST (web).txt")),
    "the zip holds the lakay folder (the page, its manifest, its worker and its icons) and the note on putting it online");
  ok(fs.readFileSync(path.join(UPLOADED, "index.html")).equals(fs.readFileSync(path.join(WEB, "index.html"))), "the page in the zip is web/index.html, byte for byte");
  const html = fs.readFileSync(path.join(WEB, "index.html"));
  ok(fs.readFileSync(path.join(WEB, "index.html.sha256"), "utf8").indexOf(crypto.createHash("sha256").update(html).digest("hex")) === 0, "web/index.html.sha256 matches the page");
  const scriptOf = s => { const m = s.match(/<script>([\s\S]*)<\/script>/); return m ? m[1] : ""; };
  ok(scriptOf(html.toString()) === scriptOf(fs.readFileSync(path.join(APP, "Lakay.html"), "utf8")) && scriptOf(html.toString()).length > 100000, "the web app runs the very same Lakay as the apps, line for line");
  const site = await serve(), base = "http://127.0.0.1:" + site.port;
  const wctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const w = await wctx.newPage(), werr = [], wcsp = [];
  w.on("pageerror", e => werr.push(e.message));
  w.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) wcsp.push(m.text()); });
  await w.goto(base + "/lakay"); await w.waitForURL(base + "/lakay/", { timeout: 10000 }); await w.waitForSelector("#introEnter", { timeout: 20000 });
  ok(true, "the uploaded folder opens at /lakay/ beside the store's own pages");
  const get = async (u) => { const r = await wctx.request.get(u); return { status: r.status(), type: r.headers()["content-type"], body: await r.body() }; };
  const manHref = await w.evaluate(() => document.querySelector('link[rel="manifest"]').href);
  const manRes = await get(manHref), man = { type: manRes.type, json: JSON.parse(manRes.body.toString("utf8")), href: manHref };
  ok(manRes.status === 200 && /json/.test(man.type) && /manifest\.json$/.test(manHref), "the manifest is manifest.json, which any host serves as JSON");
  ok(man.json.name === "Lakay" && man.json.short_name === "Lakay" && man.json.display === "standalone" && man.json.start_url === "./" && man.json.scope === "./", "the manifest names Lakay, opens in its own window, and keeps to /lakay/");
  const icons = await Promise.all(man.json.icons.map(async (i) => { const r = await get(new URL(i.src, manHref).href), g = png(r.body);
    return { src: i.src, sizes: i.sizes, purpose: i.purpose, status: r.status, ctype: r.type, w: g.w, h: g.h, type: g.type }; }));
  ok(icons.length === 4 && icons.every(i => i.status === 200 && i.ctype === "image/png" && i.sizes === i.w + "x" + i.h), "every icon the manifest names is there, at the size it says (" + icons.map(i => i.src + " " + i.w).join(", ") + ")");
  ok(icons.filter(i => i.purpose === "any").every(i => i.type === 6) && icons.filter(i => i.purpose === "maskable").every(i => i.type === 2),
    "browsers and docks get the coin alone, on nothing; Android gets the square it cuts its own shape from");
  const tl = await w.evaluate(() => { const l = document.querySelector('link[rel="apple-touch-icon"]'); return { href: l.getAttribute("href"), abs: l.href }; });
  const tr = await get(tl.abs), tg = png(tr.body), touch = { href: tl.href, status: tr.status, w: tg.w, type: tg.type };
  ok(touch.href === "apple-touch-icon.png" && touch.status === 200 && touch.w === 180 && touch.type === 2, "the iPhone, iPad and Mac Safari find the logo's tile beside the page, 180 points, with no white and no transparency");
  const tab = await w.evaluate(() => Array.prototype.map.call(document.querySelectorAll('link[rel="icon"]'), l => l.getAttribute("sizes") + " " + l.href.slice(0, 22)));
  ok(tab.length === 2 && /^96x96 data:image\/png/.test(tab[1]), "the tab shows the coin alone, carried inside the page, so every browser has it at once");
  const cdp = await wctx.newCDPSession(w);
  const am = await cdp.send("Page.getAppManifest").catch(e => ({ fail: e.message }));
  ok(am && !am.fail && am.errors && am.errors.length === 0 && /manifest\.json$/.test(am.url), "Chromium reads the manifest with no errors" + (am && am.errors && am.errors.length ? ": " + JSON.stringify(am.errors) : am && am.fail ? ": " + am.fail : ""));
  const sw = await w.evaluate(() => navigator.serviceWorker.ready.then(r => ({ scope: r.scope, script: r.active && r.active.scriptURL })));
  ok(sw.scope === base + "/lakay/" && sw.script === base + "/lakay/sw.js", "the service worker is at work for /lakay/ and nothing beyond it");
  await w.reload(); await w.waitForSelector("#introEnter", { timeout: 20000 });
  ok(await w.evaluate(() => !!navigator.serviceWorker.controller), "after a reload the page is in its care");
  const kept = await w.evaluate(async (b) => { const ks = await caches.keys(); const c = await caches.open("lakay-web-" + b); const reqs = await c.keys(); return { ks, n: reqs.map(r => new URL(r.url).pathname) }; }, BUILD);
  ok(kept.ks.indexOf("lakay-web-" + BUILD) >= 0 && ["/lakay/", "/lakay/index.html", "/lakay/manifest.json", "/lakay/apple-touch-icon.png", "/lakay/icon-512.png"].every(f => kept.n.indexOf(f) >= 0),
    "it keeps the page, the manifest and the icons (" + kept.n.length + " files), and nothing of the store's");
  const inst = await cdp.send("Page.getInstallabilityErrors").catch(e => ({ fail: e.message }));
  ok(inst && !inst.fail && Array.isArray(inst.installabilityErrors) && inst.installabilityErrors.length === 0,
    "Chromium finds nothing that stops Lakay being installed or added to a home screen or dock" + (inst && inst.installabilityErrors && inst.installabilityErrors.length ? ": " + JSON.stringify(inst.installabilityErrors) : inst && inst.fail ? ": " + inst.fail : ""));
  /* a plain http address on another host is not secure: Lakay says what to do instead of failing */
  const insecure = await browser.newContext(); const ip = await insecure.newPage();
  await ip.goto("http://lakay.test:" + site.port + "/lakay/"); await ip.waitForSelector("#fatalWhy", { timeout: 20000 });
  const why = await ip.textContent("#fatalWhy");
  ok(/https/.test(why) && !(await ip.evaluate(() => window.isSecureContext)), "on a plain http address Lakay asks for https, since browsers seal only on secure addresses");
  await insecure.close();
  await site.stop();
  await w.reload(); await w.waitForSelector("#introEnter", { timeout: 20000 });
  ok(true, "with the server gone, Lakay opens again from what the worker kept");
  await w.evaluate(() => E.books.openPractice().then(() => E.app.opened(true)));
  await w.waitForSelector(".shell", { timeout: 60000 }); await w.evaluate(() => E.ui.go("home")); await w.waitForSelector(".ct-hero");
  ok(await w.locator("#rail .rail-btn").count() === 3, "and the practice store opens in it, with no connection at all");
  ok(werr.length === 0, "no errors in the web app" + (werr.length ? ": " + werr.join(" | ") : ""));
  ok(wcsp.length === 0 && csp.length === 0, "the page's security policy refused nothing, on disk or on the web" + (wcsp.length + csp.length ? ": " + wcsp.concat(csp).slice(0, 3).join(" | ") : ""));
  await browser.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
