/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The side rail, as Ingenium and Carpe Diem have it: bare emoji keys down the right edge, and a small key above them
   that lays them down. Since Build 14 it carries only the three keys the counter reaches for all day: Schedae (each
   person's sticky notes, 22-schedae.js), a new sale, and Price check (any item by name, code or barcode: its price and
   its stock, and a sale or a delivery from there). The rest moved to the top bar at the owner's request, so that the
   rail stays uncrowded: the reminders (orders, deliveries, bills; they ring when due; each person's own, sealed in the
   books) and what runs low now share the Alerts panel; the calculator, which floats and can be carried anywhere, has
   its own small key there; day or night is in Display. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui;
  var R = E.rail = {};
  function snd(n) { if (E.sound) E.sound.play(n); }
  function pad() { return B.isOpen ? B.pad() : { thoughts: [], reminders: [] }; }
  function save(p, what) { return B.isOpen ? B.savePad(p, what).then(function () { R.refresh(); }) : Promise.resolve(); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function when(iso) { try { var d = new Date(iso); return d.toLocaleString(E.lang === "ht" ? "fr" : E.lang, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); } catch (e) { return iso; } }

  /* ---------- the rail ---------- */
  var KEYS = [["notes", "🗒️", "rail.notes"], ["sale", "🛒", "rail.sale"], ["find", "🔎", "rail.find"]];
  R.build = function () {
    var down = U.prefGet("railDown", "0") === "1";
    var box = h("div#rail.rail" + (down ? ".down" : ""), { role: "toolbar", "aria-label": t("rail.label") });
    /* the new-sale key only for those who sell */
    var keys = KEYS.filter(function (k) { return k[0] !== "sale" || !B.isOpen || B.can("sell"); });
    keys.forEach(function (k, i) {
      var b = h("button.rail-btn#rail-" + k[0], { type: "button", title: t(k[2]), "aria-label": t(k[2]), onclick: function () { R.press(k[0], b); } },
        h("span", { "aria-hidden": "true" }, k[1]));
      b.style.bottom = "calc(" + (52 + i * 56) + "px + env(safe-area-inset-bottom, 0px))";
      box.appendChild(b);
    });
    var chev = h("button#railChevron", { type: "button", title: t(down ? "rail.up" : "rail.down"), "aria-label": t(down ? "rail.up" : "rail.down"), "aria-expanded": String(!down), onclick: function () {
      U.prefSet("railDown", U.prefGet("railDown", "0") === "1" ? "0" : "1"); closePop(); R.refresh();
    } }, down ? "‹" : "›");
    chev.style.bottom = "calc(" + (52 + keys.length * 56) + "px + env(safe-area-inset-bottom, 0px))";
    box.appendChild(chev);
    setTimeout(R.badges, 0);
    return box;
  };
  R.refresh = function () { var old = document.getElementById("rail"); if (old) old.replaceWith(R.build()); };
  /* the reminders due by tonight; and the Alerts key's dot, which shows when anything waits and rings when a reminder is due */
  R.dueCount = function () {
    var p = pad(), end = new Date(); end.setHours(23, 59, 59, 999);
    return p.reminders.filter(function (r) { return !r.done && new Date(r.at).getTime() <= end.getTime(); }).length;
  };
  R.badges = function () {
    var a = document.getElementById("alertsBtn"); if (!a || !B.isOpen) return;
    var n = R.dueCount() + (ui.alerts ? ui.alerts().length : 0), dot = a.querySelector(".cnt"), now = Date.now();
    if (n && !dot) a.appendChild(h("span.cnt", { "aria-hidden": "true" })); else if (!n && dot) dot.remove();
    a.setAttribute("aria-label", t("top.alerts") + (n ? " (" + n + ")" : ""));
    a.classList.toggle("ringing", pad().reminders.some(function (r) { return !r.done && new Date(r.at).getTime() <= now; }));
  };
  R.press = function (k, b) {
    if (k === "calc") { closePop(); return calc.toggle(); }
    if (k === "sale") { closePop(); return toSale(); }
    if (k === "notes") { closePop(); return E.schedae && E.schedae.toggle(); }
    if (pop && pop.__k === k) { closePop(); return; }
    openPop(k, b);
  };

  /* ---------- the panels that open beside a key ---------- */
  var pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; document.removeEventListener("pointerdown", outside, true); } }
  function outside(e) { if (pop && !pop.contains(e.target) && !(e.target.closest && e.target.closest(".rail-btn"))) closePop(); }
  function openPop(k, b) {
    closePop();
    pop = h("div.rail-pop", { role: "dialog", "aria-label": t("rail." + k) }); pop.__k = k;
    ({ find: findPanel })[k](pop);
    document.body.appendChild(pop);
    var r = b.getBoundingClientRect();
    pop.style.bottom = Math.max(12, window.innerHeight - r.bottom) + "px";
    setTimeout(function () { document.addEventListener("pointerdown", outside, true); }, 0);
    var f = pop.querySelector("input, textarea"); if (f) try { f.focus({ preventScroll: true }); } catch (e) { }
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pop) { closePop(); } }, true);
  function head(icon, key) { return h("div.rp-head", null, [h("span.rp-emo", { "aria-hidden": "true" }, icon), h("h3", null, t(key))]); }

  /* 🔔 reminders: drawn in the Alerts panel (10-ui.js); again() draws them afresh after a change */
  function bellPanel(box, again) {
    again = again || function () { var b = document.getElementById("alertsBtn"); if (b) ui.alertsPanel(); };
    var p = pad();
    var text = h("input#remText", { type: "text", maxlength: "160", placeholder: t("rem.what"), autocomplete: "off" });
    var d = new Date(Date.now() + 3600000); d.setMinutes(0, 0, 0);
    var at = h("input#remWhen", { type: "datetime-local", value: d.getFullYear() + "-" + U.pad2(d.getMonth() + 1) + "-" + U.pad2(d.getDate()) + "T" + U.pad2(d.getHours()) + ":00" });
    var list = h("ul.rp-list");
    p.reminders.slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).forEach(function (r) {
      var late = !r.done && new Date(r.at).getTime() <= Date.now();
      list.appendChild(h("li" + (r.done ? ".done" : "") + (late ? ".late" : ""), null, [
        h("button.rp-check", { type: "button", "aria-pressed": String(!!r.done), title: t("rem.done"), "aria-label": t("rem.done"), onclick: function () {
          var q = pad(); q.reminders.forEach(function (x) { if (x.id === r.id) x.done = !x.done; }); save(q, "reminder.done").then(again);
        } }, r.done ? "✓" : ""),
        h("div.rp-text", null, [h("span", null, r.text), h("small", null, when(r.at))]),
        h("button.rp-del", { type: "button", title: t("delete"), "aria-label": t("delete"), onclick: function () {
          var q = pad(); q.reminders = q.reminders.filter(function (x) { return x.id !== r.id; }); save(q, "reminder.deleted").then(again);
        } }, "×")]));
    });
    if (!p.reminders.length) list.appendChild(h("li.rp-none", null, t("rem.none")));
    var form = h("form.rp-form", { onsubmit: function (e) {
      e.preventDefault(); var v = text.value.trim(); if (!v || !at.value) return;
      var q = pad(); q.reminders.push({ id: uid(), text: v, at: new Date(at.value).toISOString(), done: false, rung: false });
      save(q, "reminder.added").then(function () { snd("sale"); again(); });
    } }, [text, h("div.rp-row", null, [at, h("button.key.primary.sm", { type: "submit" }, t("rem.add"))])]);
    box.appendChild(head("🔔", "rail.bell")); box.appendChild(list); box.appendChild(form);
  }
  R.reminders = bellPanel;
  /* reminders ring when they come due */
  setInterval(function () {
    if (!B.isOpen) return;
    var p = pad(), now = Date.now(), rang = false;
    p.reminders.forEach(function (r) { if (!r.done && !r.rung && new Date(r.at).getTime() <= now) { r.rung = true; rang = true; ui.toast("🔔 " + r.text, "good"); } });
    if (rang) { snd("welcome"); save(p, "reminder.rang"); } else R.badges();
  }, 20000);

  /* 🛒 a new sale: straight to the register, ready to scan */
  function toSale(id) {
    if (!B.isOpen) return;
    if (ui.current !== "register") ui.go("register");
    if (id && E.register && E.register.add) E.register.add(id);
    setTimeout(function () { var f = document.getElementById("regSearch"); if (f) try { f.focus(); } catch (e) { } }, 80);
    snd("page");
  }
  R.toSale = toSale;
  function itemsOf() { var st = B.state(); return st ? Object.keys(st.items).map(function (k) { return st.items[k]; }).filter(function (it) { return !it.archived; }) : []; }
  function stockWord(it) {
    if (it.stock <= 0) return h("span.rp-stock.out", null, t("find.out"));
    if (it.reorderAt !== null && it.reorderAt !== undefined && it.stock <= it.reorderAt) return h("span.rp-stock.low", null, t("find.low", { n: it.stock }));
    return h("span.rp-stock", null, t("find.in", { n: it.stock }));
  }
  function itemRow(it, keys) {
    return h("li.rp-item", null, [h("span.rp-emo", { "aria-hidden": "true" }, ui.catEmo(it.cat)),
      h("div.rp-text", null, [h("span", null, it.name), h("small", null, [h("b.rp-price", null, U.money(it.price)), " · ", stockWord(it)])]),
      h("div.rp-acts", null, keys)]);
  }
  /* 🔎 price check: any item by name, code or barcode */
  function findPanel(box) {
    var q = h("input#findQ", { type: "search", placeholder: t("find.what"), autocomplete: "off", spellcheck: "false", enterkeyhint: "search" });
    var list = h("ul.rp-list#findList");
    function draw() {
      var v = U.norm(q.value), all = itemsOf(); U.clear(list);
      var hits = !v ? [] : all.filter(function (it) {
        return U.norm(it.name).indexOf(v) >= 0 || (it.barcode && U.norm(it.barcode) === v) || (it.sku && U.norm(it.sku).indexOf(v) >= 0);
      }).sort(function (a, b) { var ea = a.barcode && U.norm(a.barcode) === v ? 0 : 1, eb = b.barcode && U.norm(b.barcode) === v ? 0 : 1; return ea - eb || a.name.localeCompare(b.name); }).slice(0, 8);
      if (!v) { list.appendChild(h("li.rp-none", null, t("find.hint", { n: all.length }))); return; }
      if (!hits.length) { list.appendChild(h("li.rp-none", null, t("find.none"))); return; }
      hits.forEach(function (it) {
        list.appendChild(itemRow(it, [
          B.can("sell") ? h("button.key.sm.primary", { type: "button", title: t("find.sellTip"), onclick: function () { closePop(); toSale(it.id); } }, ["🛒 ", t("find.sell")]) : null,
          h("button.key.sm", { type: "button", title: t("find.openTip"), onclick: function () { closePop(); ui.go("inventory"); setTimeout(function () { if (E.inventory && E.inventory.open) E.inventory.open(it.id); }, 60); } }, t("find.open"))]));
      });
    }
    q.addEventListener("input", draw);
    q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); var first = list.querySelector(".rp-item .key.primary"); if (first) first.click(); } });
    box.appendChild(head("🔎", "rail.find")); box.appendChild(h("div.rp-form", null, [q])); box.appendChild(list);
    draw();
  }
  /* the badges follow the books: a sale or a delivery changes the stock */
  B.on("change", function () { setTimeout(R.badges, 0); });

  /* 🧮 the calculator: it floats above the page and can be carried anywhere by its top */
  var calc = (function () {
    var win = null, cur = "0", toks = [], fresh = false, tape = [];
    function fmt(n) { if (!isFinite(n)) return t("calc.err"); var r = Math.round(n * 1e10) / 1e10; return String(r); }
    function evalToks(list) {
      var a = list.slice(), i;
      for (i = 1; i < a.length; i += 2) { if (a[i] === "×" || a[i] === "÷") { var v = a[i] === "×" ? a[i - 1] * a[i + 1] : a[i - 1] / a[i + 1]; a.splice(i - 1, 3, v); i -= 2; } }
      var out = a[0]; for (i = 1; i < a.length; i += 2) out = a[i] === "+" ? out + a[i + 1] : out - a[i + 1];
      return out;
    }
    function paint() {
      if (!win) return;
      win.querySelector(".calc-expr").textContent = toks.map(function (x) { return typeof x === "number" ? fmt(x) : " " + x + " "; }).join("");
      win.querySelector(".calc-val").textContent = cur;
      var tp = win.querySelector(".calc-tape"); U.clear(tp);
      tape.slice(-4).forEach(function (line) { tp.appendChild(h("button.calc-line", { type: "button", title: t("calc.reuse"), onclick: function () { cur = line.val; fresh = true; paint(); } }, line.text)); });
    }
    function press(k) {
      if (/^[0-9]$/.test(k)) { cur = (fresh || cur === "0") ? k : (cur.length < 16 ? cur + k : cur); fresh = false; }
      else if (k === ".") { if (fresh) { cur = "0."; fresh = false; } else if (cur.indexOf(".") < 0) cur += "."; }
      else if (k === "C") { cur = "0"; toks = []; fresh = false; }
      else if (k === "⌫") { cur = fresh ? "0" : (cur.length > 1 ? cur.slice(0, -1) : "0"); if (cur === "-") cur = "0"; }
      else if (k === "±") { cur = cur.charAt(0) === "-" ? cur.slice(1) : (cur === "0" ? "0" : "-" + cur); }
      else if (k === "%") { cur = fmt(parseFloat(cur) / 100); }
      else if ("+−×÷".indexOf(k) >= 0) {
        if (fresh && toks.length && typeof toks[toks.length - 1] !== "number") toks[toks.length - 1] = k === "−" ? "-" : k;
        else { toks.push(parseFloat(cur)); toks.push(k === "−" ? "-" : k); }
        fresh = true;
      } else if (k === "=") {
        if (!toks.length) return;
        toks.push(parseFloat(cur));
        var r = evalToks(toks), text = toks.map(function (x) { return typeof x === "number" ? fmt(x) : (x === "-" ? "−" : x); }).join(" ") + " = " + fmt(r);
        tape.push({ text: text, val: fmt(r) }); cur = fmt(r); toks = []; fresh = true; snd("soft");
      }
      paint();
    }
    var LAYOUT = [["C", "±", "%", "÷"], ["7", "8", "9", "×"], ["4", "5", "6", "−"], ["1", "2", "3", "+"], ["⌫", "0", ".", "="]];
    function build() {
      var grip = h("div.calc-grip", { title: t("calc.move") }, [h("span", null, "🧮 " + t("rail.calc")), h("button.calc-x", { type: "button", "aria-label": t("close"), title: t("close"), onclick: close }, "×")]);
      var keys = h("div.calc-keys");
      LAYOUT.forEach(function (row) { row.forEach(function (k) {
        var cls = "button.calc-k" + ("+−×÷".indexOf(k) >= 0 ? ".op" : k === "=" ? ".eq" : k === "C" ? ".clr" : /[0-9.]/.test(k) ? "" : ".fn");
        keys.appendChild(h(cls, { type: "button", "aria-label": k, onclick: function () { press(k); } }, k));
      }); });
      var copy = h("button.key.sm.calc-copy", { type: "button", onclick: function () { E.clip.write(cur).then(function () { ui.toast(t("calc.copied"), "good"); }); } }, ["📋 ", t("calc.copy")]);
      win = h("div#calcWin.calc", { role: "dialog", "aria-label": t("rail.calc") }, [grip, h("div.calc-screen", null, [h("div.calc-expr"), h("div.calc-val", { "aria-live": "polite" }, "0")]), keys, h("div.calc-foot", null, [h("div.calc-tape"), copy])]);
      document.body.appendChild(win);
      var pos = null; try { pos = JSON.parse(U.prefGet("calcPos", "null")); } catch (e) { }
      var x = pos ? pos.x : window.innerWidth - 380, y = pos ? pos.y : Math.max(60, window.innerHeight - 560);
      move(x, y);
      drag(grip);
      paint();
    }
    function move(x, y) {
      var w = win.offsetWidth || 290, hh = win.offsetHeight || 460;
      x = Math.max(6, Math.min(x, window.innerWidth - w - 6)); y = Math.max(6, Math.min(y, window.innerHeight - hh - 6));
      win.style.left = x + "px"; win.style.top = y + "px"; return { x: x, y: y };
    }
    function drag(grip) {
      grip.addEventListener("pointerdown", function (e) {
        if (e.target.closest(".calc-x")) return;
        var r = win.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top, last = null;
        win.classList.add("lifted"); try { grip.setPointerCapture(e.pointerId); } catch (x) { }
        function mv(ev) { last = move(ev.clientX - dx, ev.clientY - dy); }
        function up() { win.classList.remove("lifted"); grip.removeEventListener("pointermove", mv); grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up); if (last) U.prefSet("calcPos", JSON.stringify(last)); }
        grip.addEventListener("pointermove", mv); grip.addEventListener("pointerup", up); grip.addEventListener("pointercancel", up);
      });
    }
    function close() { if (win) { win.remove(); win = null; } }
    document.addEventListener("keydown", function (e) {
      if (!win) return;
      var tg = e.target, typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.isContentEditable);
      if (typing && !win.contains(tg)) return;
      var map = { "*": "×", "x": "×", "/": "÷", "-": "−", "+": "+", "Enter": "=", "=": "=", "Backspace": "⌫", "Escape": "C", ",": ".", ".": ".", "%": "%" };
      var k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
      if (k) { e.preventDefault(); press(k); var b = win.querySelector('.calc-k[aria-label="' + k + '"]'); if (b) { b.classList.add("hit"); setTimeout(function () { b.classList.remove("hit"); }, 120); } }
    }, true);
    return { toggle: function () { if (win) close(); else { build(); snd("page"); } }, close: close, press: press, value: function () { return cur; } };
  })();
  R.calc = calc;

  /* the rail takes the place of the old round keys */
  ui.fabs = R.build;
  B.on("lock", function () { closePop(); calc.close(); });
})();
