/* LAKAY | Build 12 test: the Home in the shell's own colours, and Lakay's logo in the tab and on the home screen.
   The Home's colours come from the mark (its periwinkle enamel, pearl and champagne), worn as Ingenium and Carpe Diem wear
   theirs since Build 13 (white slabs, enamel cards and keys inside them), and nothing on it is green;
   the day's figures stand on their drums exactly as the books have them, by day, by night and in Calm; the shell's spiral
   is engraved across the hero and holds still in Calm and with "reduce motion"; the counter's keys travel down when
   pressed; no word is cut short on an iPad or a phone; the rest of the house keeps Lakay's Dawn. The page names the logo
   alone for the tab (the round coin, on nothing) and a tile for home screens (filled edge to edge with the coin's
   enamel, never white), and the website's icon files beside the page are the right sizes, the iPhone's with no
   transparency for the system to fill in black. The page's security policy blocks nothing it needs.
   Run: node tests/t_build12.js [url]   (default: the built page, app/Lakay.html, opened from disk) */
"use strict";
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const APP = path.resolve(__dirname, "..", "app");
const URL = process.argv[2] || "file://" + path.join(APP, "Lakay.html");
let failed = 0, passed = 0;
function ok(cond, what) { if (cond) { passed++; console.log("  ok   " + what); } else { failed++; console.log("  FAIL " + what); } }
const wait = (p, ms) => p.waitForTimeout(ms);
/* a PNG's size and kind, from its header: colour type 2 is RGB with no transparency, 6 is RGB with transparency */
function png(file) { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), type: b[25], png: b.slice(1, 4).toString() === "PNG" }; }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const errors = [], csp = [];
  const p = await ctx.newPage();
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
  const home = async () => { await p.evaluate(() => E.ui.go("home")); await p.waitForSelector(".ct-hero"); await wait(p, 1700); };

  console.log("Lakay's logo, in the tab and on the home screen");
  await p.goto(URL); await p.waitForSelector("#introEnter", { timeout: 20000 });
  const links = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'), l => ({ rel: l.rel, sizes: l.getAttribute("sizes"), href: l.getAttribute("href") })));
  const tab = links.filter(l => l.rel === "icon"), last = tab[tab.length - 1];
  ok(tab.length === 2 && last.sizes === "96x96" && /^data:image\/png;base64,/.test(last.href), "the tab's icon is named last, a 96-point picture inside the page");
  const look = await p.evaluate(async (srcs) => {
    async function px(src) {
      const im = new Image(); im.src = src; await im.decode();
      const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext("2d"); g.drawImage(im, 0, 0);
      const at = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data);
      return { w: im.naturalWidth, corner: at(1, 1), centre: at(c.width >> 1, c.height >> 1) };
    }
    return { coin: await px(srcs[0]), tile: await px(srcs[1]) };
  }, [last.href, tab[0].href]);
  ok(look.coin.corner[3] === 0 && look.coin.centre[3] === 255, "the tab shows the logo alone: the round coin, with nothing around it (corner alpha " + look.coin.corner[3] + ")");
  const tc = look.tile.corner;
  ok(look.tile.w === 192 && tc[3] === 255 && tc[2] > tc[1] + 40 && tc[0] < 200, "the home-screen shortcut's tile is filled to its corners with the coin's periwinkle, not white (rgb " + tc.slice(0, 3).join(", ") + ")");
  const touch = links.find(l => l.rel === "apple-touch-icon");
  const tt = touch && await p.evaluate(async (src) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext("2d"); g.drawImage(im, 0, 0); return { w: im.naturalWidth, corner: Array.from(g.getImageData(1, 1, 1, 1).data) }; }, touch.href);
  ok(touch && touch.sizes === "180x180" && /^data:image\/png;base64,/.test(touch.href) && tt.w === 180 && tt.corner[3] === 255 && tt.corner[2] > tt.corner[1] + 40,
    "the iPhone and iPad home screen icon is inside the page too: 180 points, filled to its corners with the coin's periwinkle");
  ok(await p.getAttribute('meta[name="apple-mobile-web-app-title"]', "content") === "Lakay", "and the home screen names it Lakay");
  const ati = png(path.join(APP, "apple-touch-icon.png")), pre = png(path.join(APP, "apple-touch-icon-precomposed.png"));
  ok(ati.png && ati.w === 180 && ati.h === 180 && ati.type === 2 && pre.w === 180 && pre.type === 2, "apple-touch-icon.png is 180 points with no transparency, so the iPhone has no corner to fill in black");
  const i192 = png(path.join(APP, "icon-192.png")), i512 = png(path.join(APP, "icon-512.png"));
  ok(i192.w === 192 && i512.w === 512 && i192.type === 2 && i512.type === 2, "icon-192.png and icon-512.png are beside the page for a website");
  const ico = fs.readFileSync(path.join(APP, "favicon.ico"));
  ok(ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) === 3, "favicon.ico holds the coin at three sizes");
  const ios = ["AppIcon60x60@2x.png", "AppIcon60x60@3x.png", "AppIcon76x76@2x~ipad.png", "AppIcon83.5x83.5@2x~ipad.png"].map(n => png(path.join(__dirname, "..", "packages", "ios", "Shell", "Icons", n)));
  ok(ios.every(x => x.type === 2) && ios.map(x => x.w).join() === "120,180,152,167", "the iPhone and iPad app's icons: the coin's own tile, every size, no transparency");
  const fire = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"].map(d => png(path.join(__dirname, "..", "packages", "fire", "res", "mipmap-" + d, "ic_launcher.png")));
  ok(fire.every(x => x.type === 6) && fire.map(x => x.w).join() === "48,72,96,144,192", "the Fire tablet app's icon: the coin alone, on nothing, every size");

  console.log("The Home in the shell's colours");
  await p.evaluate(() => E.books.openPractice().then(() => E.app.opened(true)));
  await p.waitForSelector(".shell", { timeout: 60000 });
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); });
  await home();
  const hero = await p.evaluate(() => getComputedStyle(document.querySelector(".ct-hero")).backgroundImage);
  const win = await p.evaluate(() => getComputedStyle(document.querySelector(".ct-window")).backgroundImage);
  ok(/rgb\(255, 255, 255\)/.test(hero) && !/rgb\(89, 96, 190\)/.test(hero), "the welcome is a white slab, as Ingenium and Carpe Diem set theirs (Build 13)");
  ok(/rgb\(108, 113, 208\)/.test(win) && /rgb\(89, 96, 190\)/.test(win), "and the figures sit in a card of the mark's periwinkle enamel inside it");
  const keyLook = await p.evaluate(() => ({ sale: getComputedStyle(document.querySelector("#homeSale .ct-key-face")).backgroundImage, recv: getComputedStyle(document.querySelector("#homeReceive .ct-key-face")).backgroundImage,
    find: getComputedStyle(document.querySelector("#homeFind .ct-key-face")).backgroundImage }));
  ok(/rgb\(107, 115, 214\)/.test(keyLook.sale) && /rgb\(248, 248, 255\)/.test(keyLook.recv) && /rgb\(248, 248, 255\)/.test(keyLook.find), "New sale is the enamel key; Receive and Price check are the gentle lavender beside it");
  const rooms = await p.evaluate(() => ({ slab: getComputedStyle(document.querySelector(".hm-rooms")).backgroundImage, drawer: getComputedStyle(document.querySelector(".ct-drawer")).backgroundImage,
    jewel: getComputedStyle(document.querySelector(".ct-plate-ico")).backgroundImage }));
  ok(/rgb\(255, 255, 255\)/.test(rooms.slab) && /rgb\(255, 255, 255\)/.test(rooms.drawer) && /rgb\(141, 147, 226\)/.test(rooms.jewel), "the rooms are white drawers on a white slab, each with an enamel jewel");
  const greens = await p.evaluate(() => {
    const found = [];
    function check(c, where) { const m = (c || "").match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/g) || []; m.forEach(s => { const v = s.match(/[\d.]+/g).map(Number); if ((v[3] === undefined || v[3] > .2) && v[1] > v[0] + 24 && v[1] > v[2] + 24) found.push(where + " " + s); }); }
    document.querySelectorAll(".hm, .hm *").forEach(el => {
      if (el.closest(".emo, .ct-key-emo, .hm-need-emo, .hm-strip-emo, .hm-calm-emo, .lk-crest")) return;
      const cs = getComputedStyle(el); check(cs.backgroundColor, el.className); check(cs.backgroundImage, el.className); check(cs.color, el.className); check(cs.borderTopColor, el.className);
    });
    return found;
  });
  ok(greens.length === 0, "nothing on the Home is green" + (greens.length ? ": " + greens.slice(0, 4).join(" / ") : ""));
  const engr = await p.evaluate(() => { const s = document.querySelector(".ct-hero svg.ct-engr"); return s && { paths: s.querySelectorAll("path").length, rings: s.querySelectorAll("circle").length, hidden: s.getAttribute("aria-hidden"), anim: getComputedStyle(s).animationName }; });
  ok(engr && engr.paths === 36 && engr.rings === 3 && engr.hidden === "true" && engr.anim === "ctTurn", "the shell's spiral is engraved across the hero, eighteen turns each way and three rings, turning slowly, hidden from screen readers");

  async function drumsRight(label) {
    const r = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll(".ct-read"), (rd) => {
      const spoken = rd.querySelector(".g-value .sr-only").textContent.replace(/[^0-9]/g, "");
      const shown = Array.prototype.map.call(rd.querySelectorAll(".ct-cell"), (cell) => {
        const strip = cell.querySelector(".ct-strip"), one = strip.getBoundingClientRect().height / 10;
        return String(Math.round((cell.getBoundingClientRect().top - strip.getBoundingClientRect().top) / one));
      }).join("");
      return { id: rd.id, spoken, shown, digits: Array.prototype.map.call(rd.querySelectorAll(".ct-strip"), s => s.getAttribute("data-d")).join("") };
    }));
    ok(r.length >= 4 && r.every(x => x.shown === x.spoken && x.digits === x.spoken), label + ": every drum shows its digit, and the figures agree with what a screen reader hears (" + r.map(x => x.id + " " + x.shown).join(", ") + ")");
  }
  await drumsRight("By day");
  const taken = await p.evaluate(() => { const k = E.util.dayKey(); return E.util.money(E.books.report(k, k).gross); });
  ok((await p.textContent("#hxTaken .sr-only")) === taken, "the takings on the drums are the books' own (" + taken + ")");

  console.log("The keys, by hand");
  const face = p.locator("#homeSale .ct-key-face");
  const box = await face.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await wait(p, 200);
  const down = await p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("#homeSale .ct-key-face")).transform).m42);
  await p.mouse.move(5, 5); await p.mouse.up(); await wait(p, 300);
  const up = await p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("#homeSale .ct-key-face")).transform).m42);
  ok(down >= 6 && up <= 0.5, "New sale travels down as it is pressed (" + down + " points) and comes back up (" + up + ")");
  ok(await p.evaluate(() => E.ui.current) === "home", "and a press that slides off the key does nothing");

  console.log("Night, Calm, and \"reduce motion\"");
  await p.evaluate(() => { E.util.prefSet("theme", "night"); E.ui.applyLook(); }); await home();
  const nightHero = await p.evaluate(() => getComputedStyle(document.querySelector(".ct-hero")).backgroundImage);
  const nightWin = await p.evaluate(() => getComputedStyle(document.querySelector(".ct-window")).backgroundImage);
  ok(/rgb\(31, 31, 45\)/.test(nightHero) && /rgb\(70, 75, 166\)/.test(nightWin) && /rgb\(43, 47, 120\)/.test(nightWin), "by night the slab is Lakay's night slab and the enamel deepens to the shell's indigo");
  await drumsRight("By night");
  await p.evaluate(() => { document.documentElement.setAttribute("data-calm", "1"); E.ui.go("home"); });
  await p.waitForSelector(".ct-hero"); await wait(p, 120);
  const calm = await p.evaluate(() => ({ t: getComputedStyle(document.querySelector(".ct-strip")).transitionDuration, a: getComputedStyle(document.querySelector(".ct-engr")).animationName }));
  ok(calm.t === "0s" && calm.a === "none", "in Calm the drums do not roll and the engraving holds still (" + calm.t + ", " + calm.a + ")");
  await drumsRight("In Calm, at once");
  await p.evaluate(() => document.documentElement.removeAttribute("data-calm"));
  await p.emulateMedia({ reducedMotion: "reduce" }); await home();
  ok(await p.evaluate(() => getComputedStyle(document.querySelector(".ct-engr")).animationName) === "none", "with the system's \"reduce motion\" the engraving holds still too");
  await p.emulateMedia({ reducedMotion: "no-preference" });
  await p.evaluate(() => { E.util.prefSet("theme", "day"); E.ui.applyLook(); });

  console.log("An iPad and a phone");
  await p.setViewportSize({ width: 820, height: 1000 }); await home();
  const keys = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll(".ct-key-t b, .ct-key-t small"), (n) => n.scrollWidth <= n.clientWidth + 1 && n.getBoundingClientRect().width > 40));
  ok(keys.length >= 6 && keys.every(Boolean), "on an iPad every key keeps its words whole");
  await p.setViewportSize({ width: 390, height: 900 }); await home();
  const names = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll(".hm-tile-t b"), (n) => n.scrollWidth <= n.clientWidth + 1));
  ok(names.length === 7 && names.every(Boolean), "on a phone every room's name is whole on its drawer");
  ok(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, "and nothing scrolls sideways");
  await p.setViewportSize({ width: 1280, height: 860 });

  console.log("The rest of the house");
  await p.evaluate(() => E.ui.go("inventory")); await wait(p, 300);
  const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(bg === "rgb(245, 244, 248)" && await p.locator(".ct-hero").count() === 0, "the other rooms keep Lakay's Dawn, from the same mark (" + bg + ")");

  console.log("Errors");
  ok(csp.length === 0, "the page's security policy refused nothing" + (csp.length ? ": " + csp.slice(0, 2).join(" / ") : ""));
  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" / ") : ""));
  await browser.close();
  console.log("\n" + passed + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
