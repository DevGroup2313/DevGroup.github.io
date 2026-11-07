/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The shell: the menu, the rooms, dialogs, tips, messages, the look (Day, Night, Auto, text size, Calm), the idle lock,
   saving files and printing. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books;
  var ui = E.ui = {};

  /* ---------- the seal (a fixed drawing that lives in this page) ---------- */
  var SEAL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs>' +
    '<radialGradient id="emg1" cx="50%" cy="36%" r="72%"><stop offset="0" stop-color="#6F7CD0"/><stop offset="1" stop-color="#2C3474"/></radialGradient>' +
    '<linearGradient id="emg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4DC97"/><stop offset=".52" stop-color="#C99B3F"/><stop offset="1" stop-color="#8C6820"/></linearGradient>' +
    '<path id="emt" d="M 35 120 A 85 85 0 0 1 205 120"/><path id="emb" d="M 30 120 A 90 90 0 0 0 210 120"/></defs>' +
    '<circle cx="120" cy="120" r="117" fill="url(#emg2)"/><circle cx="120" cy="120" r="109" fill="url(#emg1)"/>' +
    '<circle cx="120" cy="120" r="104" fill="none" stroke="#E5C77F" stroke-width="1.3" stroke-dasharray="1.5 3.5"/>' +
    '<circle cx="120" cy="120" r="70" fill="#353F86" stroke="url(#emg2)" stroke-width="3.5"/>' +
    '<text font-family="Palatino Linotype,Palatino,Book Antiqua,Georgia,serif" font-size="21" font-weight="700" letter-spacing="7" fill="#F4DC97"><textPath href="#emt" startOffset="50%" text-anchor="middle">EMPORIUM</textPath></text>' +
    '<text font-family="Palatino Linotype,Palatino,Book Antiqua,Georgia,serif" font-size="13" font-weight="700" letter-spacing="5" fill="#E5C77F"><textPath href="#emb" startOffset="50%" text-anchor="middle">· MMXXVI ·</textPath></text>' +
    '<path d="M120 52.5l3.1 6.8 7.4.8-5.5 5 1.6 7.3-6.6-3.8-6.6 3.8 1.6-7.3-5.5-5 7.4-.8z" fill="#F6B8A8" stroke="#F4DC97" stroke-width="1.2"/>' +
    '<g fill="none" stroke="url(#emg2)" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M120 80V158M100 160h40M82 92h76M82 92l-12 30M82 92l12 30M158 92l-12 30M158 92l12 30"/></g>' +
    '<circle cx="120" cy="84" r="5.5" fill="#F4DC97"/>' +
    '<path d="M66 122q16 15 32 0z M142 122q16 15 32 0z" fill="#E9CB82" stroke="#C99B3F" stroke-width="1.5"/>' +
    '<path d="M106 166q14 6 28 0" fill="none" stroke="#C99B3F" stroke-width="2.4" stroke-linecap="round"/></svg>';
  ui.SEAL = SEAL;
  ui.sealWrap = function (size, label) { return h("span.seal-wrap", null, ui.seal(size, label)); };
  ui.seal = function (size, label) {
    var doc = new DOMParser().parseFromString(SEAL, "image/svg+xml"), svg = document.importNode(doc.documentElement, true);
    svg.setAttribute("width", size); svg.setAttribute("height", size); svg.setAttribute("class", "seal");
    if (label) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label); } else svg.setAttribute("aria-hidden", "true");
    return svg;
  };

  /* ---------- the look ---------- */
  ui.applyLook = function () {
    var root = document.documentElement, theme = U.prefGet("theme", "auto");
    var dark = theme === "night" || (theme === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "night" : "day");
    root.setAttribute("data-size", U.prefGet("size", "m"));
    root.setAttribute("data-calm", U.prefGet("calm", "0"));
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", dark ? "#0A1A20" : "#F6F1E7");
  };
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ui.applyLook); } catch (e) { }

  /* ---------- emojis (drawn by the device's own emoji font; hidden from screen readers, the words carry the meaning) ---------- */
  ui.emo = function (ch, cls) { return h("span.emo" + (cls ? "." + cls : ""), { "aria-hidden": "true" }, ch); };
  ui.ROOM_EMO = { home: "🏠", register: "🛒", inventory: "📦", reports: "📊", guide: "📖", settings: "⚙️" };
  ui.CAT_EMO = { music: "🎵", movies: "🎬", perfume: "🌸", grocery: "🥥", drinks: "🥤", food: "🥟", services: "💸", other: "🛍️" };
  ui.catEmo = function (c) { return ui.CAT_EMO[c] || "🏷️"; };

  /* ---------- messages ---------- */
  ui.toast = function (text, kind) {
    var box = document.getElementById("toasts");
    var n = h("div.toast" + (kind ? "." + kind : ""), { role: kind === "bad" ? "alert" : "status" }, [ui.emo({ bad: "⚠️", warn: "⚠️", good: "✅" }[kind] || "💬"), h("span", null, text)]);
    box.appendChild(n);
    setTimeout(function () { n.classList.add("going"); setTimeout(function () { n.remove(); }, 400); }, kind === "bad" ? 7000 : 4200);
  };

  /* ---------- dialogs: focus stays inside, Esc closes, focus returns where it was ---------- */
  ui.dialog = function (o) {
    var back = document.activeElement, layer = h("div.layer"), closed = false;
    var titleId = U.uid("dt");
    var box = h("div.dialog" + (o.wide ? ".wide" : ""), { role: o.alert ? "alertdialog" : "dialog", "aria-modal": "true", "aria-labelledby": titleId });
    var head = h("div.dialog-head", null, [h("h2", { id: titleId }, [o.emoji ? ui.emo(o.emoji) : null, o.title]), o.noClose ? null : h("button.icon-key", { type: "button", "aria-label": t("close"), onclick: function () { close(); } }, U.icon("x"))]);
    var body = h("div.dialog-body", null, o.body);
    var foot = h("div.dialog-foot");
    function close(v) { if (closed) return; closed = true; document.removeEventListener("keydown", onKey, true); layer.remove(); if (back && back.focus) try { back.focus(); } catch (e) { } if (o.onClose) o.onClose(v); }
    (o.actions || []).forEach(function (a) {
      var b = h("button.key" + (a.kind ? "." + a.kind.split(" ").join(".") : ""), { type: "button", onclick: function () { if (a.onClick) { var r = a.onClick(close, b); if (r === false) return; } else close(); } }, [a.emoji ? ui.emo(a.emoji) : a.icon ? U.icon(a.icon) : null, a.label]);
      if (a.id) b.id = a.id; if (a.disabled) b.disabled = true;
      foot.appendChild(b);
    });
    function onKey(e) {
      if (e.key === "Escape" && !o.noClose) { e.preventDefault(); close(); return; }
      if (e.key === "Tab") {
        var f = $allFocusable(box); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    box.appendChild(head); box.appendChild(body); if (o.actions && o.actions.length) box.appendChild(foot);
    layer.appendChild(box); document.body.appendChild(layer);
    setTimeout(function () { var f = o.focus ? box.querySelector(o.focus) : $allFocusable(body)[0] || $allFocusable(foot)[0]; if (f) f.focus(); }, 30);
    return { close: close, box: box, body: body, foot: foot };
  };
  function $allFocusable(root) {
    return Array.prototype.filter.call(root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'), function (n) { return !n.disabled && n.offsetParent !== null; });
  }
  /* A question with two answers, in plain words. Resolves true or false. */
  ui.confirm = function (title, text, yes, kind) {
    return new Promise(function (res) {
      var answered = false;
      ui.dialog({ title: title, alert: true, body: h("p", null, text),
        actions: [{ label: t("cancel"), onClick: function (c) { answered = true; c(); res(false); } },
                  { label: yes, kind: kind || "primary", onClick: function (c) { answered = true; c(); res(true); } }],
        onClose: function () { if (!answered) res(false); } });
    });
  };

  /* ---------- tips: a small key beside a control, which opens a short explanation ---------- */
  ui.tip = function (key) {
    var b = h("button.tip-key", { type: "button", "aria-label": t("tip") + ": " + t(key + ".t"), title: t("tip") }, ui.emo("💡"));
    b.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      ui.dialog({ title: t(key + ".t"), emoji: "💡", body: [h("p.tip-text", null, t(key + ".b")), ui.readAloud(t(key + ".t") + ". " + t(key + ".b"))],
        actions: [{ label: t("gotIt"), kind: "primary" }] });
    });
    return b;
  };
  ui.readAloud = function (text) {
    if (!("speechSynthesis" in window)) return null;
    return h("button.key.small", { type: "button", onclick: function () {
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.lang = { en: "en-US", fr: "fr-FR", ht: "fr-HT" }[E.lang] || "en-US"; speechSynthesis.speak(u); } catch (e) { }
    } }, [ui.emo("🔊"), t("readAloud")]);
  };

  /* ---------- form fields ---------- */
  ui.field = function (labelKey, input, opt) {
    opt = opt || {};
    var id = input.id || (input.id = U.uid("f"));
    var label = h("label", { for: id }, [E.has(labelKey) ? t(labelKey) : labelKey, opt.required ? h("span.req", { "aria-hidden": "true" }, " *") : null]);
    var hint = opt.hint ? h("p.hint", { id: id + "-h" }, opt.hint) : null;
    if (hint) input.setAttribute("aria-describedby", id + "-h");
    var errN = h("p.err", { id: id + "-e", role: "alert" });
    return h("div.field" + (opt.cls ? "." + opt.cls : ""), null, [h("div.label-row", null, [label, opt.tip ? ui.tip(opt.tip) : null]), input, hint, errN]);
  };
  ui.fieldError = function (input, text) {
    var e = document.getElementById(input.id + "-e"); if (!e) return;
    e.textContent = text || "";
    if (text) { input.setAttribute("aria-invalid", "true"); input.focus(); } else input.removeAttribute("aria-invalid");
  };
  ui.input = function (attrs) { return h("input", Object.assign({ type: "text", autocomplete: "off", spellcheck: "false" }, attrs || {})); };
  ui.select = function (options, value, attrs) {
    var s = h("select", attrs || {});
    options.forEach(function (o) { var op = h("option", { value: o[0] }, o[1]); if (String(o[0]) === String(value)) op.selected = true; s.appendChild(op); });
    return s;
  };
  ui.seg = function (options, value, onChange, label) {
    var g = h("div.seg", { role: "radiogroup", "aria-label": label || "" });
    options.forEach(function (o) {
      var b = h("button", { type: "button", role: "radio", "aria-checked": String(o[0] === value), "data-v": o[0] }, [o[2] ? U.icon(o[2]) : null, o[1]]);
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(g.children, function (x) { x.setAttribute("aria-checked", String(x === b)); });
        onChange(o[0]);
      });
      g.appendChild(b);
    });
    return g;
  };

  /* ---------- saving files and printing ---------- */
  ui.saveFile = function (name, mime, text) {
    var bytes = typeof text === "string" ? U.TE.encode(text) : text;
    try {
      if (window.pywebview && window.pywebview.api && window.pywebview.api.save_file) {
        return window.pywebview.api.save_file(name, mime, U.b64e(bytes)).then(function (r) { return r !== false; });
      }
      if (window.EmporiumHost && window.EmporiumHost.saveFile) { window.EmporiumHost.saveFile(name, mime, U.b64e(bytes)); return Promise.resolve(true); }
    } catch (e) { }
    var url = URL.createObjectURL(new Blob([bytes], { type: mime })), a = h("a", { href: url, download: name });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
    return Promise.resolve(true);
  };
  ui.print = function (node) {
    var p = document.getElementById("print"); U.clear(p); p.appendChild(node);
    document.documentElement.classList.add("printing");
    setTimeout(function () {
      try { window.print(); } catch (e) { }
      setTimeout(function () { document.documentElement.classList.remove("printing"); U.clear(p); }, 500);
    }, 60);
  };

  /* ---------- the shell and its rooms ---------- */
  var ROOMS = ["home", "register", "inventory", "reports", "guide", "settings"];
  ui.rooms = {};
  ui.current = null;
  ui.shell = function () {
    var app = document.getElementById("app"); U.clear(app);
    var st = B.state();
    var nav = h("nav.rail", { "aria-label": t("menu") }, [
      h("div.rail-brand", null, [ui.sealWrap(46), h("div", null, [h("div.brand-name", null, "Emporium"), h("div.brand-store", null, st.settings.storeName)])]),
      h("div.rail-keys", null, ROOMS.map(function (r) {
        return h("button.nav-key", { type: "button", "data-room": r, "aria-label": t("room." + r), onclick: function () { ui.go(r); } },
          [h("span.nav-tile", { "aria-hidden": "true" }, ui.emo(ui.ROOM_EMO[r])), h("span.long", null, t("room." + r)), h("span.short", { "aria-hidden": "true" }, t("short." + r))]);
      })),
      h("div.rail-foot", null, [
        h("button.nav-key.lock-key", { type: "button", "aria-label": t("lockNow"), onclick: function () { B.lock("hand"); } }, [h("span.nav-tile", { "aria-hidden": "true" }, ui.emo("🔒")), h("span.long", null, t("lockNow"))]),
        h("p.build-line", null, t("build") + " " + E.BUILD.number)])
    ]);
    var main = h("main#room", { tabindex: "-1" });
    app.appendChild(h("div.shell", null, [nav, main]));
    ui.go(location.hash.replace("#", "") || "home", true);
  };
  ui.go = function (room, quiet) {
    if (!ui.rooms[room]) room = "home";
    ui.current = room;
    if (location.hash !== "#" + room) history.replaceState(null, "", "#" + room);
    Array.prototype.forEach.call(document.querySelectorAll(".nav-key[data-room]"), function (b) {
      if (b.getAttribute("data-room") === room) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    var main = document.getElementById("room"); if (!main) return;
    U.clear(main);
    ui.rooms[room](main);
    if (!quiet) { try { main.focus({ preventScroll: true }); } catch (e) { } window.scrollTo(0, 0); }
  };
  ui.refresh = function () { if (ui.current && document.getElementById("room")) { var y = window.scrollY; ui.go(ui.current, true); window.scrollTo(0, y); } };
  ui.roomHead = function (titleKey, tipKey, right) {
    var emo = ui.ROOM_EMO[titleKey.replace("room.", "")];
    return h("div.room-head", null, [h("div.room-title", null, [emo ? ui.emo(emo) : null, h("h1", null, t(titleKey)), tipKey ? ui.tip(tipKey) : null]), right ? h("div.room-tools", null, right) : null]);
  };

  /* ---------- small joys: they never run in Calm mode or when the device asks for less motion ---------- */
  function still() { return document.documentElement.getAttribute("data-calm") === "1" || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  ui.still = still;
  ui.celebrate = function () {
    if (still()) return;
    var box = h("div.confetti", { "aria-hidden": "true" }), set = ["🎉", "✨", "💵", "🌸", "🥳", "⭐", "🎊"];
    for (var i = 0; i < 26; i++) {
      var sp = h("span", null, set[i % set.length]);
      sp.style.left = (Math.random() * 96) + "%";
      sp.style.setProperty("--d", (Math.random() * .35).toFixed(2) + "s"); sp.style.setProperty("--t", (1.4 + Math.random() * .9).toFixed(2) + "s");
      sp.style.setProperty("--dx", Math.round(Math.random() * 160 - 80) + "px"); sp.style.setProperty("--rot", Math.round(Math.random() * 540 - 270) + "deg");
      box.appendChild(sp);
    }
    document.body.appendChild(box); setTimeout(function () { box.remove(); }, 2600);
  };
  ui.plusOne = function (el, text) {
    if (still() || !el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect(), n = h("span.plus-one", { "aria-hidden": "true" }, text || "+1");
    n.style.left = (r.left + r.width / 2) + "px"; n.style.top = (r.top + 8) + "px";
    document.body.appendChild(n); setTimeout(function () { n.remove(); }, 800);
    el.classList.remove("popped"); void el.offsetWidth; el.classList.add("popped");
  };
  /* A number that counts up to its value; the final text is always exactly the value. */
  ui.countUp = function (el, value, fmt) {
    el.textContent = fmt(value);
    if (still() || !value) return;
    var t0 = performance.now(), dur = 700;
    function step(now) { var f = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - f, 3); el.textContent = fmt(f < 1 ? Math.round(value * e) : value); if (f < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  };

  /* ---------- the idle lock ---------- */
  var last = Date.now();
  ["pointerdown", "keydown", "touchstart", "wheel", "mousemove"].forEach(function (ev) { window.addEventListener(ev, function () { last = Date.now(); }, { passive: true, capture: true }); });
  setInterval(function () {
    if (!B.isOpen || !E.settings) return;
    var mins = E.settings.lockMinutes || 15;
    if (Date.now() - last > mins * 60000) B.lock("idle");
  }, 5000);
  ui.touch = function () { last = Date.now(); };

  /* ---------- names a person reads ---------- */
  ui.catName = function (c) { if (!c) return ""; return c.key ? t(c.key) : c.name; };
  ui.cats = function () { var st = B.state(); return Object.keys(st.cats).map(function (k) { return st.cats[k]; }).sort(function (a, b) { return a.order - b.order; }); };
  ui.userName = function (id) { var st = B.state(); var u = st && st.users[id]; return u ? u.name : id; };
  ui.dateLong = function (d) { return E.fmtDate(d, "long"); };
  ui.time = function (iso) { var d = new Date(iso); return U.dayKey(d) === U.dayKey() ? E.fmtTime(d) : E.fmtDate(d, "short") + " " + E.fmtTime(d); };
})();
