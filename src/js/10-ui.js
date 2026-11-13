/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The shell: the menu, the rooms, dialogs, tips, messages, the look (Day, Night, Auto, text size, Calm), the idle lock,
   saving files and printing. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books;
  var ui = E.ui = {};

  /* ---------- the crest (09-crest.js): a still drawing for print and small places, a live one everywhere else ---------- */
  ui.seal = function (size, label) { return E.crest.flat(size, label); };
  ui.sealWrap = function (size, label) { return h("span.seal-wrap", null, ui.seal(size, label)); };
  ui.crest = function (size, o) { return E.crest.make(size, o); };
  /* a crest that is a key: it plays a flourish when pressed, then does its own job (if any) */
  ui.crestKey = function (size, o) {
    o = o || {};
    var c = ui.crest(size, { rise: o.rise });
    var b = h("button.crest-key" + (o.cls ? "." + o.cls : ""), { type: "button", title: o.title || E.appName(), "aria-label": o.label || o.title || E.appName(), onclick: function (e) {
      E.crest.play(c, o.flourish); if (o.onPress) o.onPress(e);
    } }, c);
    if (o.id) b.id = o.id;
    return b;
  };

  /* ---------- the look ---------- */
  ui.applyLook = function () {
    var root = document.documentElement, theme = U.prefGet("theme", "auto");
    var dark = theme === "night" || (theme === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "night" : "day");
    root.setAttribute("data-size", U.prefGet("size", "m"));
    root.setAttribute("data-calm", U.prefGet("calm", "0"));
    root.setAttribute("data-fold", U.prefGet("fold", "0"));
    var look = E.custom && E.custom.look;
    root.setAttribute("data-palette", look && look.palette ? look.palette : "dawn");
    root.setAttribute("data-density", look && look.density === "comfortable" ? "comfortable" : "compact");
    try { document.title = E.appName ? E.appName() : "Lakay"; } catch (e) { }
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", dark ? "#12121c" : "#f5f4f8");
  };
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ui.applyLook); } catch (e) { }

  /* ---------- emojis (drawn by the device's own emoji font; hidden from screen readers, the words carry the meaning) ---------- */
  ui.emo = function (ch, cls) { return h("span.emo" + (cls ? "." + cls : ""), { "aria-hidden": "true" }, ch); };
  ui.ROOM_EMO = { home: "🏠", register: "🛒", inventory: "📦", reports: "📊", team: "👥", guide: "📖", settings: "⚙️", studio: "⚒️" };
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
  /* A chooser drawn by the app itself: a key that shows the choice, and a list that opens under it. It behaves like a
     select for the code that reads it (.value, and a "change" event), and is worked by keyboard as a list box. */
  ui.select = function (options, value, attrs) {
    attrs = attrs || {};
    var cur = String(value === undefined || value === null ? (options[0] ? options[0][0] : "") : value);
    if (!options.some(function (o) { return String(o[0]) === cur; }) && options[0]) cur = String(options[0][0]);
    var text = h("span.sel-text");
    var btn = h("button.sel", Object.assign({ type: "button", "aria-haspopup": "listbox", "aria-expanded": "false" }, attrs), [text, h("span.sel-chev", { "aria-hidden": "true" }, U.icon("chevron"))]);
    function label() { var o = options.filter(function (x) { return String(x[0]) === cur; })[0]; text.textContent = o ? o[1] : ""; }
    Object.defineProperty(btn, "value", { get: function () { return cur; }, set: function (v) { cur = String(v); label(); } });
    btn.options = options;
    var pop = null, active = -1;
    function close(focus) { if (!pop) return; pop.remove(); pop = null; btn.setAttribute("aria-expanded", "false"); document.removeEventListener("pointerdown", outside, true); window.removeEventListener("resize", place); if (focus) btn.focus(); }
    function outside(e) { if (pop && !pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(false); }
    function place() { if (!pop) return; var r = btn.getBoundingClientRect(), H = pop.offsetHeight, below = window.innerHeight - r.bottom;
      pop.style.minWidth = r.width + "px"; pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)) + "px";
      pop.style.top = (below < H + 12 && r.top > below ? Math.max(8, r.top - H - 6) : r.bottom + 6) + "px"; }
    function choose(i) { var o = options[i]; if (!o) return; var changed = String(o[0]) !== cur; cur = String(o[0]); label(); close(true);
      if (changed) { btn.dispatchEvent(new Event("input", { bubbles: true })); btn.dispatchEvent(new Event("change", { bubbles: true })); } }
    function mark(i) { active = Math.max(0, Math.min(options.length - 1, i)); Array.prototype.forEach.call(pop.children, function (n, k) { n.classList.toggle("active", k === active); });
      var n = pop.children[active]; if (n) { btn.setAttribute("aria-activedescendant", n.id); n.scrollIntoView({ block: "nearest" }); } }
    function open() {
      if (pop) return close(true);
      var id = btn.id || (btn.id = U.uid("sel"));
      pop = h("div.sel-pop", { role: "listbox", id: id + "-list", "aria-labelledby": id });
      options.forEach(function (o, i) {
        pop.appendChild(h("div.sel-opt", { role: "option", id: id + "-o" + i, "aria-selected": String(String(o[0]) === cur), onclick: function () { choose(i); },
          onpointermove: function () { if (active !== i) mark(i); } }, [h("span.sel-tick", { "aria-hidden": "true" }, "✓"), h("span", null, o[1])]));
      });
      document.body.appendChild(pop); btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-controls", pop.id);
      place(); mark(Math.max(0, options.findIndex(function (o) { return String(o[0]) === cur; })));
      setTimeout(function () { document.addEventListener("pointerdown", outside, true); }, 0); window.addEventListener("resize", place);
    }
    btn.addEventListener("click", open);
    btn.addEventListener("keydown", function (e) {
      var k = e.key;
      if (!pop && (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ")) { e.preventDefault(); open(); return; }
      if (!pop) return;
      if (k === "ArrowDown") { e.preventDefault(); mark(active + 1); } else if (k === "ArrowUp") { e.preventDefault(); mark(active - 1); }
      else if (k === "Home") { e.preventDefault(); mark(0); } else if (k === "End") { e.preventDefault(); mark(options.length - 1); }
      else if (k === "Enter" || k === " ") { e.preventDefault(); choose(active); } else if (k === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (k === "Tab") close(false);
      else if (k.length === 1) { var q = U.norm(k), j = options.findIndex(function (o, i) { return i > active && U.norm(o[1]).indexOf(q) === 0; });
        if (j < 0) j = options.findIndex(function (o) { return U.norm(o[1]).indexOf(q) === 0; }); if (j >= 0) mark(j); }
    });
    label();
    return btn;
  };
  /* A file is chosen with one of the app's own keys; the browser's grey box stays hidden. */
  ui.filePick = function (o) {
    var input = h("input", { type: "file", id: o.id, accept: o.accept || "", tabindex: "-1", "aria-hidden": "true" });
    var name = h("span.file-name", null, o.none);
    var key = h("button.key", { type: "button", id: o.keyId || null, onclick: function () { input.click(); } }, [ui.emo(o.emoji || "📂"), o.label]);
    input.addEventListener("change", function () { var f = input.files && input.files[0]; if (!f) return; name.textContent = f.name; name.classList.add("chosen"); if (o.onFile) o.onFile(f, input); });
    return h("div.filepick", null, [input, key, name]);
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

  /* ---------- the shell, after Ingenium's (the side menu of plain words) with Carpe Diem's capsule of top keys ---------- */
  var GROUPS = [["nav.g.store", [["home", "home"], ["register", "register"], ["inventory", "box"], ["reports", "chart"], ["team", "people"]]],
                ["nav.g.learn", [["guide", "book"], ["settings", "gear"]]],
                ["nav.g.owner", [["studio", "edit"]]]];
  ui.rooms = {};
  ui.current = null;
  ui.shell = function () {
    var app = document.getElementById("app"); U.clear(app);
    var st = B.state();
    var folded = U.prefGet("fold", "0") === "1";
    var fold = h("button.cl-chev#navFold", { type: "button", "aria-label": t("menu.fold"), title: t("menu.fold"), "aria-expanded": String(!folded), onclick: function () {
      var f = U.prefGet("fold", "0") === "1" ? "0" : "1"; U.prefSet("fold", f); ui.applyLook(); fold.textContent = f === "1" ? "›" : "‹"; fold.setAttribute("aria-expanded", String(f !== "1"));
    } }, folded ? "›" : "‹");
    var sealNode = ui.crest(36);
    var brand = h("button.brand#brandSeal", { type: "button", title: E.appName() + " · " + t("room.home"), "aria-label": t("room.home"), onclick: function () {
      E.crest.play(sealNode, "burst"); ui.go("home");
    } }, [sealNode, h("span.bname", null, [h("span.wordmark", null, E.appName()), h("span.storename", null, st.settings.storeName)])]);
    var dock = h("nav.dock", { "aria-label": t("menu") }, [h("div.dock-brand", null, [brand, fold])]);
    GROUPS.forEach(function (g) {
      var mine = g[1].filter(function (r) { return ui.allowed(r[0]); });
      if (!mine.length) return;
      dock.appendChild(h("div.grp-label", null, t(g[0])));
      mine.forEach(function (r) {
        dock.appendChild(h("button.nav-btn", { type: "button", "data-room": r[0], title: t("room." + r[0]), onclick: function () { ui.go(r[0]); } },
          [U.icon(r[1]), h("span.long", null, t("room." + r[0]))]));
      });
    });
    var main = h("main#room.main", { tabindex: "-1" });
    app.appendChild(h("div.shell", null, [dock, main]));
    app.appendChild(ui.cluster());
    app.appendChild(ui.fabs());
    ui.go(location.hash.replace("#", "") || "home", true);
  };
  /* the rooms each person may open: the owner, every one; the people, those their access opens */
  ui.allowed = function (room) {
    if (room === "register") return B.can("sell");
    if (room === "reports") return B.can("reports");
    if (room === "settings" || room === "studio") return B.can("owner");
    return true;
  };
  ui.go = function (room, quiet) {
    if (!ui.rooms[room] || !ui.allowed(room)) room = "home";
    ui.current = room;
    if (location.hash !== "#" + room) history.replaceState(null, "", "#" + room);
    Array.prototype.forEach.call(document.querySelectorAll(".nav-btn[data-room]"), function (b) {
      if (b.getAttribute("data-room") === room) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    var main = document.getElementById("room"); if (!main) return;
    U.clear(main);
    ui.rooms[room](main);
    main.appendChild(ui.footer());
    if (!quiet && E.sound) E.sound.play("page");
    if (!quiet) { try { main.focus({ preventScroll: true }); } catch (e) { } window.scrollTo(0, 0); }
  };
  ui.refresh = function () { if (ui.current && document.getElementById("room")) { var y = window.scrollY; ui.go(ui.current, true); window.scrollTo(0, y); } };
  /* A room's head: Ingenium's page title, its tip, the room's own keys on the right, and a plain lede below. */
  ui.roomHead = function (titleKey, tipKey, right) {
    var room = titleKey.replace("room.", "");
    return h("div.room-intro", null, [
      h("div.room-head", null, [h("div.room-title", null, [h("h1.page-title", null, t(titleKey)), tipKey ? ui.tip(tipKey) : null]), right ? h("div.room-tools", null, right) : null]),
      E.has("lede." + room) ? h("p.lede", null, t("lede." + room)) : null]);
  };
  /* The foot of every page, as in Ingenium and the rest of the Offline Project: the emblem, the name, the maker. */
  ui.footer = function () {
    return h("footer.app-foot", null, [ui.crestKey(18, { cls: "foot-crest", title: t("top.about"), flourish: "turn", onPress: function () { setTimeout(ui.about, 380); } }), h("span", null, E.appName()), h("span.sep", { "aria-hidden": "true" }, "·"), h("span", null, E.tagline()),
      h("span.sep", { "aria-hidden": "true" }, "·"), h("span", null, t("foot.made")), h("span.sep", { "aria-hidden": "true" }, "·"), h("span", null, "© 2026 Yannie D. Forest. " + t("foot.rights"))]);
  };

  /* ---------- the flags of the three languages, drawn so that they look the same on every device ---------- */
  var FLAGS = {
    en: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#b22234"/><path d="M0 2.31h30M0 5.38h30M0 8.46h30M0 11.54h30M0 14.62h30M0 17.69h30" stroke="#fff" stroke-width="1.54"/><rect width="13" height="10.77" fill="#3c3b6e"/><g fill="#fff"><circle cx="2.2" cy="1.8" r=".55"/><circle cx="4.9" cy="1.8" r=".55"/><circle cx="7.6" cy="1.8" r=".55"/><circle cx="10.3" cy="1.8" r=".55"/><circle cx="3.5" cy="3.9" r=".55"/><circle cx="6.2" cy="3.9" r=".55"/><circle cx="8.9" cy="3.9" r=".55"/><circle cx="2.2" cy="6" r=".55"/><circle cx="4.9" cy="6" r=".55"/><circle cx="7.6" cy="6" r=".55"/><circle cx="10.3" cy="6" r=".55"/><circle cx="3.5" cy="8.1" r=".55"/><circle cx="6.2" cy="8.1" r=".55"/><circle cx="8.9" cy="8.1" r=".55"/></g></svg>',
    fr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#ffffff"/><rect x="20" width="10" height="20" fill="#ef4135"/></svg>',
    ht: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="10" fill="#00209f"/><rect y="10" width="30" height="10" fill="#d21034"/><rect x="10.5" y="6.2" width="9" height="7.6" rx=".8" fill="#ffffff"/><path d="M15 12.6V8.9M13.4 9.7l1.6-1.1 1.6 1.1M12.4 12.8h5.2" fill="none" stroke="#1d7a3c" stroke-width=".8" stroke-linecap="round"/></svg>' };
  ui.flag = function (code) {
    var doc = new DOMParser().parseFromString(FLAGS[code] || FLAGS.en, "image/svg+xml"), svg = document.importNode(doc.documentElement, true);
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    return h("span.flag", null, svg);
  };

  /* ---------- the top keys: Carpe Diem's floating capsule ---------- */
  ui.doorBar = function (onLang) {
    var NEXT = { en: "fr", fr: "ht", ht: "en" }, next = NEXT[E.lang] || "fr";
    return h("div#doorBar.cl-cluster.door-bar", { role: "toolbar", "aria-label": t("top.tools") }, [
      h("button.cl-key#doorDisplay", { type: "button", title: t("top.display"), onclick: ui.displayPanel }, t("top.display")),
      h("button.cl-key#doorAbout", { type: "button", title: t("top.about"), onclick: ui.about }, t("top.about")),
      h("button.cl-key#doorRefresh", { type: "button", title: t("top.refreshTip"), onclick: ui.refreshApp }, t("top.refresh")),
      h("button.cl-key#doorReset", { type: "button", title: t("reset.tip"), onclick: function () { E.door.reset(); } }, t("reset.h")),
      h("button.cl-key.lang#doorLang", { type: "button", title: "Langue · Language · Lang: " + t("lang." + next), "aria-label": t("lang." + next), onclick: function () { E.setLang(next); if (onLang) onLang(); } }, ui.flag(next))]);
  };
  ui.cluster = function () {
    var practice = B.mode === "practice", folded = U.prefGet("barFold", "0") === "1";
    var c = h("div#topCluster.cl-cluster" + (folded ? ".folded" : ""), { role: "toolbar", "aria-label": t("top.tools") });
    var fold = h("button.cl-fold#barFold", { type: "button", "aria-label": t("top.fold"), title: t("top.fold"), "aria-expanded": String(!folded), onclick: function () {
      var f = !c.classList.contains("folded"); c.classList.toggle("folded", f); U.prefSet("barFold", f ? "1" : "0"); fold.textContent = f ? "‹" : "›"; fold.setAttribute("aria-expanded", String(!f));
    } }, folded ? "‹" : "›");
    var alertsN = ui.alerts().length;
    var NEXT = { en: "fr", fr: "ht", ht: "en" }, next = NEXT[E.lang] || "fr";
    c.appendChild(fold);
    var me = B.user, sh = me ? B.openShift(me.id) : null, clockCls = sh ? (B.onBreak(sh) ? ".onbreak" : ".onclock") : "";
    var who = me ? me.name.split(" ")[0] : "";
    c.appendChild(h("button.cl-key#statusPill" + (practice ? ".practice" : "") + clockCls, { type: "button", title: (practice ? t("practice.pillTip") + " · " : "") + t("status.tip"), onclick: ui.statusPanel },
      [h("span.pdot", { "aria-hidden": "true" }), h("span.nm", null, practice ? (B.isOwner() ? t("practice.pill") : t("practice.pill") + " · " + who) : who || t("status.h"))]));
    c.appendChild(h("button.cl-key#alertsBtn", { type: "button", title: t("top.alerts"), onclick: ui.alertsPanel }, [t("top.alerts"), alertsN ? h("span.cnt", { "aria-label": String(alertsN) }) : null]));
    c.appendChild(h("button.cl-key#displayBtn", { type: "button", title: t("top.display"), onclick: ui.displayPanel }, t("top.display")));
    c.appendChild(h("button.cl-key#guideBtn", { type: "button", title: t("room.guide"), onclick: function () { ui.go("guide"); } }, t("top.guide")));
    c.appendChild(h("button.cl-key#aboutBtn", { type: "button", title: t("top.about") + " " + E.appName(), onclick: ui.about }, t("top.about")));
    /* one key for the language, as Carpe Diem's: it shows the flag of the language it switches to */
    c.appendChild(h("button.cl-key.lang#langBtn", { type: "button", title: "Langue · Language · Lang: " + t("lang." + next), "aria-label": t("lang." + next), onclick: function () { E.setLang(next); ui.shell(); } }, ui.flag(next)));
    return c;
  };
  ui.refreshTop = function () { var old = document.getElementById("topCluster"); if (old) old.replaceWith(ui.cluster()); var f = document.getElementById("rail"); if (f) f.replaceWith(ui.fabs()); };
  /* the round keys on the right, as in Ingenium and Carpe Diem: day or night, and the lock */
  ui.fabs = function () {
    var night = document.documentElement.getAttribute("data-theme") === "night";
    return h("div#fabs.fabs", null, [
      h("button.fab#fabTheme", { type: "button", "data-tip": t("top.dayNight"), "aria-label": t("top.dayNight"), onclick: function () {
        U.prefSet("theme", night ? "day" : "night"); ui.applyLook(); ui.refreshTop(); if (E.sound) E.sound.play("lamp");
      } }, ui.emo(night ? "☀️" : "🌙")),
      h("button.fab#fabLock", { type: "button", "data-tip": t("top.lock"), "aria-label": t("top.lock"), onclick: function () { B.lock("hand"); } }, ui.emo("🔒"))]);
  };
  /* what needs the owner: items low on stock, a backup not saved for a week */
  ui.alerts = function () {
    var out = [], stock = B.stockSummary(), last = U.prefGet("lastBackup", "");
    stock.low.slice(0, 12).forEach(function (it) { out.push({ emo: ui.catEmo(it.cat), text: it.name + " · " + t("inv.inStock", { n: it.stock }), go: "inventory", tone: it.stock <= 0 ? "bad" : "warn" }); });
    if (B.mode !== "practice" && B.can("owner") && (!last || Date.now() - Date.parse(last) > 7 * 86400000)) out.push({ emo: "💾", text: t(last ? "alerts.backup" : "alerts.backupNever"), go: "settings", tone: "warn" });
    if (B.mode !== "practice" && B.user && B.user.role !== "owner" && !B.openShift(B.user.id)) out.unshift({ emo: "🕘", text: t("clock.notIn"), go: "team", tone: "warn" });
    return out;
  };
  ui.alertsPanel = function () {
    var list = ui.alerts();
    var d = ui.dialog({ title: t("top.alerts"), emoji: "🔔", body: list.length ? h("ul.alert-list", null, list.map(function (a) {
      return h("li", null, [ui.emo(a.emo), h("span", null, a.text), h("button.key.sm", { type: "button", onclick: function () { d.close(); ui.go(a.go); } }, t("alerts.open"))]);
    })) : h("p", null, t("alerts.none")), actions: [{ label: t("close") }] });
  };
  /* ---------- the status key: who is at the counter, on the clock or on a break, and signing out ---------- */
  ui.dur = function (ms) {
    var m = Math.max(0, Math.round(ms / 60000)), hh = Math.floor(m / 60), mm = m % 60;
    return hh ? t("dur.hm", { h: hh, m: mm }) : t("dur.m", { m: mm });
  };
  ui.personTag = function (u) { return u ? u.name + " · " + t("people.id", { n: B.numberOf(u) }) : ""; };
  ui.levelName = function (u) { return !u ? "" : u.role === "owner" ? t("level.owner") : t("level." + (B.PRESETS[u.preset] ? u.preset : "custom")); };
  ui.failed = function (e) {
    console.error(e);
    ui.toast(e && e.code === "denied" ? t("people.denied") : e && e.code === "wrong" ? t("ld.wrongPw") : e && e.code === "password" ? t(e.extra) : t("door.problem"), "bad");
  };
  function clockAct(fn, done) {
    return function (close) {
      close();
      fn().then(function (sh) { ui.refreshTop(); ui.refresh(); if (done && sh) ui.toast(done(sh), "good"); if (E.sound) E.sound.play("soft"); }, ui.failed);
    };
  }
  ui.signOut = function (andClock) {
    var me = B.user, p = andClock ? B.clockOut() : Promise.resolve(null);
    return p.then(function (sh) {
      E.door.outNote = sh ? t("signout.clocked", { name: me.name, t: E.fmtTime(new Date(sh.out)), h: ui.dur(B.shiftMs(sh)) })
        : B.openShift(me.id) ? t("signout.only", { name: me.name }) : t("signout.plain", { name: me.name });
      B.lock("signout");
    }, ui.failed);
  };
  ui.statusPanel = function () {
    var st = B.state(), practice = B.mode === "practice", me = B.user, sh = B.openShift(me.id), brk = B.onBreak(sh), d;
    var rows = [h("div.who-card", null, [h("span.who-dot" + (sh ? (brk ? ".onbreak" : ".onclock") : ""), { "aria-hidden": "true" }),
        h("div", null, [h("b#whoName", null, me.name), h("span.who-meta", null, [t("people.id", { n: B.numberOf(me) }), " · ", ui.levelName(me)])])]),
      h("p#clockState", null, sh ? (brk ? t("clock.onBreak", { t: E.fmtTime(new Date(sh.breaks[sh.breaks.length - 1].from)) }) : t("clock.onSince", { t: E.fmtTime(new Date(sh.in)), d: ui.dur(B.shiftMs(sh)) })) : t("clock.off")),
      h("p.muted", null, st.settings.storeName + (ui.openedAt ? " · " + t("status.since", { t: E.fmtTime(ui.openedAt) }) : ""))];
    if (practice) rows.push(h("p.hint", null, t("practice.pillTip")));
    if (B.can("team")) {
      var on = B.onClock();
      rows.push(h("h3.status-h", null, t("clock.nowH")));
      rows.push(on.length ? h("ul.clock-list#onClockList", null, on.map(function (x) {
        var u = st.users[x.user];
        return h("li", null, [h("span.who-dot" + (B.onBreak(x) ? ".onbreak" : ".onclock"), { "aria-hidden": "true" }), h("span", null, u ? ui.personTag(u) : x.user),
          h("span.muted", null, B.onBreak(x) ? t("clock.break") : t("clock.since", { t: E.fmtTime(new Date(x.in)) }))]);
      })) : h("p.muted#onClockList", null, t("clock.nobody")));
    }
    if (practice) {
      var people = B.people();
      rows.push(h("h3.status-h", null, t("practice.asH")));
      rows.push(h("div.as-keys", null, people.map(function (u) {
        return h("button.key.sm" + (u.id === me.id ? ".primary" : ""), { type: "button", "data-person": u.id, onclick: function () {
          d.close(); B.practiceAs(u.id).then(function () {
            var p2 = (!B.isOwner() && !B.openShift(u.id)) ? B.clockIn() : Promise.resolve(null);
            return p2.then(function (x) { ui.shell(); ui.refreshTop(); ui.toast(t("practice.asNow", { name: u.name }) + (x ? " " + t("clock.inAt", { name: u.name, t: E.fmtTime(new Date(x.in)) }) : ""), "good"); });
          }, ui.failed);
        } }, [u.name, h("small", null, " " + ui.levelName(u))]);
      })));
    }
    var actions = [];
    if (!sh) actions.push({ label: t("clock.in"), emoji: "🕘", id: "clockInKey", onClick: clockAct(B.clockIn, function (x) { return t("clock.inAt", { name: me.name, t: E.fmtTime(new Date(x.in)) }); }) });
    else {
      actions.push(brk ? { label: t("clock.breakEnd"), emoji: "▶️", id: "breakKey", onClick: clockAct(B.breakEnd, function () { return t("clock.backAt", { t: E.fmtTime(new Date()) }); }) }
                       : { label: t("clock.breakStart"), emoji: "☕", id: "breakKey", onClick: clockAct(B.breakStart, function () { return t("clock.breakAt", { t: E.fmtTime(new Date()) }); }) });
      actions.push({ label: t("clock.out"), emoji: "🕔", id: "clockOutKey", onClick: clockAct(function () { return B.clockOut(); }, function (x) { return t("clock.outAt", { t: E.fmtTime(new Date(x.out)), h: ui.dur(B.shiftMs(x)) }); }) });
    }
    if (practice && B.isOwner()) {
      actions.push({ label: t("practice.reset"), onClick: function (close) { close(); ui.confirm(t("practice.resetQ"), t("practice.resetP"), t("practice.reset")).then(function (yes) {
        if (!yes) return; B.resetPractice().then(function () { return B.openPractice(); }).then(function () { E.app.opened(); ui.toast(t("practice.done"), "good"); });
      }); } });
      actions.push({ label: t("practice.real"), kind: "primary", onClick: function (close) { close(); E.door.startReal("app"); } });
    } else if (!practice) {
      if (!B.isOwner()) actions.push({ label: t("own.change"), emoji: "🔑", id: "myPwKey", onClick: function (close) { close(); ui.myPassword(); } });
      actions.push({ label: sh ? t("signout.andClock") : t("signout"), kind: "primary", emoji: "🚪", id: "signOutKey", onClick: function (close) { close(); ui.signOut(!!sh); } });
      if (sh) actions.push({ label: t("signout.stay"), id: "signOutStay", onClick: function (close) { close(); ui.signOut(false); } });
    }
    d = ui.dialog({ title: t("status.h"), emoji: practice ? "🧪" : sh ? (brk ? "☕" : "🟢") : "⚪", body: rows, actions: actions });
  };
  /* a person's own password: the old one, then the new one twice */
  ui.myPassword = function () {
    var a = ui.input({ type: "password", id: "myPwOld", autocomplete: "current-password" }), b = ui.input({ type: "password", id: "myPwNew", autocomplete: "new-password" }),
      c = ui.input({ type: "password", id: "myPwNew2", autocomplete: "new-password" }), meter = h("p.hint", { "aria-live": "polite" });
    b.addEventListener("input", function () { meter.textContent = b.value ? t(E.crypto.passwordAdvice(b.value).key) : ""; });
    ui.dialog({ title: t("own.change"), emoji: "🔑", body: [ui.field("own.current", a), ui.field("own.new", b), meter, ui.field("own.again", c)],
      actions: [{ label: t("cancel") }, { label: t("save"), kind: "primary", id: "myPwSave", onClick: function (close, btn) {
        var r = E.crypto.passwordAdvice(b.value);
        if (!r.ok) { ui.fieldError(b, t(r.key)); return false; }
        if (b.value !== c.value) { ui.fieldError(c, t("setup.noMatch")); return false; }
        btn.disabled = true;
        B.changeMyPassword(a.value, b.value).then(function () { close(); ui.toast(t("own.saved"), "good"); }, function (e) {
          btn.disabled = false; if (e && e.code === "wrong") ui.fieldError(a, t("ld.wrongPw")); else ui.failed(e);
        });
        return false;
      } }] });
  };
  /* Refresh: the page starts again from the beginning, as a browser's refresh does. Nothing in the books is touched. */
  ui.refreshApp = function () { try { location.reload(); } catch (e) { } };
  ui.displayPanel = function () {
    function row(label, seg) { return h("div.display-row", null, [h("span", null, label), seg]); }
    ui.dialog({ title: t("top.display"), emoji: "🎨", body: h("div.display-rows", null, [
      row(t("theme"), ui.seg([["day", t("theme.day"), "sun"], ["auto", t("theme.auto"), "auto"], ["night", t("theme.night"), "moon"]], U.prefGet("theme", "auto"), function (v) { U.prefSet("theme", v); ui.applyLook(); ui.refreshTop(); }, t("theme"))),
      row(t("set.size"), ui.seg([["m", t("set.sizeM")], ["l", t("set.sizeL")], ["xl", t("set.sizeXL")]], U.prefGet("size", "m"), function (v) { U.prefSet("size", v); ui.applyLook(); }, t("set.size"))),
      row(t("set.calm"), ui.seg([["0", t("off")], ["1", t("on")]], U.prefGet("calm", "0"), function (v) { U.prefSet("calm", v); ui.applyLook(); }, t("set.calm"))),
      row(t("disp.menu"), ui.seg([["0", t("disp.menu.full")], ["1", t("disp.menu.icons")]], U.prefGet("fold", "0"), function (v) { U.prefSet("fold", v); ui.applyLook(); }, t("disp.menu"))),
      row(t("disp.sound"), ui.seg([["1", t("on")], ["0", t("off")]], U.prefGet("sound", "1"), function (v) { U.prefSet("sound", v); if (v === "1" && E.sound) E.sound.play("welcome"); }, t("disp.sound"))),
      row(t("disp.vol"), ui.seg([["0.35", t("disp.vol.soft")], ["0.7", t("disp.vol.mid")], ["1", t("disp.vol.full")]], U.prefGet("soundVol", "0.7"), function (v) { U.prefSet("soundVol", v); if (E.sound) E.sound.play("sale"); }, t("disp.vol"))),
      h("p.hint", null, t("set.calmHint")),
      h("div.display-keys", null, [h("button.key#dispRefresh", { type: "button", onclick: ui.refreshApp }, [ui.emo("↻"), t("top.refresh")]),
        h("button.key#dispReset", { type: "button", onclick: function (e) { var l = e.currentTarget.closest(".layer"); if (l) l.remove(); ui.resetPanel(); } }, [ui.emo("⟲"), t("reset.h")])]),
      h("p.hint", null, t("top.refreshTip"))]), actions: [{ label: t("close"), kind: "primary" }] });
  };
  /* Reset, while the store is open: the sign-in's memory, the practice store, or (the owner) the store on this device. */
  ui.resetPanel = function () {
    if (!B.isOpen) return E.door.reset();
    var d, practice = B.mode === "practice";
    d = ui.dialog({ title: t("reset.h"), emoji: "⟲", body: h("div.reset-keys", null, [h("p", null, t("reset.p")),
      h("button.key#rsClear", { type: "button", onclick: function () { B.forgetSignIn().then(function () { d.close(); ui.toast(t("reset.cleared"), "good"); }); } },
        [ui.emo("🔓"), h("span", null, [h("b", null, t("reset.clear")), h("small", null, t("reset.clearP"))])]),
      h("button.key#rsPractice", { type: "button", onclick: function () {
        d.close();
        ui.confirm(t("practice.resetQ"), t("practice.resetP"), t("practice.reset")).then(function (yes) {
          if (!yes) return;
          if (practice) B.resetPractice().then(function () { return B.openPractice(); }).then(function () { E.app.opened(); ui.toast(t("practice.done"), "good"); }, ui.failed);
          else B.lock("hand");
        });
      } }, [ui.emo("🧪"), h("span", null, [h("b", null, t("practice.reset")), h("small", null, t("reset.practiceP"))])]),
      !practice && B.isOwner() ? h("button.key.danger#rsErase", { type: "button", onclick: function () { d.close(); ui.go("settings"); setTimeout(function () { var k = document.getElementById("eraseKey"); if (k) { k.scrollIntoView({ block: "center" }); k.focus(); } }, 80); } },
        [ui.emo("🧹"), h("span", null, [h("b", null, t("set.erase")), h("small", null, t("reset.eraseSettings"))])]) : null]),
      actions: [{ label: t("close"), kind: "primary" }] });
  };
  ui.about = function () {
    var st = B.state() || { settings: { storeName: (E.doorInfo && E.doorInfo.storeName) || "" }, head: null };
    ui.dialog({ title: t("top.about"), body: h("div.about-card", null, [ui.crestKey(84, { rise: true, title: t("crest.press") }), h("h3", null, E.appName()), h("span.eyebrow", null, E.tagline()),
      h("dl.about-facts", null, [h("dt", null, t("about.store")), h("dd", null, st.settings.storeName), h("dt", null, t("about.books")), h("dd", null, String(st.head ? st.head.seq : 0)),
        h("dt", null, t("about.lang")), h("dd", null, "English · Français · Kreyòl")]),
      h("p.hint", null, t("about.sealed")),
      h("p.about-foot", null, [E.appName() + " · " + t("build") + " " + E.BUILD.number + " · " + E.BUILD.date, h("br"), t("foot.made") + " · © 2026 Yannie D. Forest. " + t("foot.rights")])]),
      actions: [{ label: t("close"), kind: "primary" }] });
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
  ui.userTag = function (id) { var st = B.state(); var u = st && st.users[id]; return u ? ui.personTag(u) : id; };
  ui.dateLong = function (d) { return E.fmtDate(d, "long"); };
  ui.time = function (iso) { var d = new Date(iso); return U.dayKey(d) === U.dayKey() ? E.fmtTime(d) : E.fmtDate(d, "short") + " " + E.fmtTime(d); };
})();
