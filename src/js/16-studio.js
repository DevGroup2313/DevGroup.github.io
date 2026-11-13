/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The Author Studio, after Carpe Diem's and Ingenium's: the owner renames the app and the store, rewrites any phrase in
   any of the three languages, chooses the look, and words the receipt. Every choice is data (never code): it is checked
   field by field, kept beside the envelopes so the door can wear it, written in the ledger, and carried in backups. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui;
  var S = E.studio = { room: "start" };
  var LANGS = ["en", "fr", "ht"];
  var PALETTES = ["dawn", "amethyst", "indigo", "royal", "burgundy", "graphite"];
  var SWATCH = { dawn: ["#5f67cc", "#e7e6f5", "#c08b2f", "#12121c"], indigo: ["#3F4797", "#E6E3F5", "#A8864E", "#101119"], royal: ["#1B5E8C", "#DDE9F2", "#A8864E", "#0E1318"],
    amethyst: ["#5B3FA8", "#E8E0F6", "#A8864E", "#120F18"], burgundy: ["#7A2E3B", "#EEDFDD", "#A8864E", "#141011"], graphite: ["#3A4150", "#E3E4E8", "#A8864E", "#111214"] };
  var LIMIT = { app: 40, tagline: 70, word: 2000, lines: 300, thanks: 80 };

  function blank() { return { v: 2, names: { app: "", tagline: { en: "", fr: "", ht: "" } }, words: { en: {}, fr: {}, ht: {} }, look: { palette: "dawn", density: "compact" }, receipt: { lines: "", thanks: { en: "", fr: "", ht: "" } } }; }
  function clip(s, n) { return (typeof s === "string" ? s : "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, n); }
  /* Only what the Studio knows, only text, within limits: anything else in a file is left out. */
  E.cleanCustom = function (c) {
    var o = blank(); if (!c || typeof c !== "object") return o;
    if (c.names && typeof c.names === "object") {
      o.names.app = clip(c.names.app, LIMIT.app).trim();
      LANGS.forEach(function (l) { o.names.tagline[l] = clip(c.names.tagline && c.names.tagline[l], LIMIT.tagline).trim(); });
    }
    if (c.words && typeof c.words === "object") LANGS.forEach(function (l) {
      var w = c.words[l]; if (!w || typeof w !== "object") return;
      Object.keys(w).forEach(function (k) { if (E.has(k) && typeof w[k] === "string" && w[k].trim()) o.words[l][k] = clip(w[k], LIMIT.word); });
    });
    if (c.look && typeof c.look === "object") {
      if (PALETTES.indexOf(c.look.palette) >= 0) o.look.palette = c.look.palette;
      /* a set saved before Lakay (build 2 or earlier) was the old default, not a choice: Lakay's own Dawn takes its place */
      if (c.v !== 2 && (c.look.palette === "indigo" || c.look.palette === "amethyst")) o.look.palette = "dawn";
      if (c.look.density === "comfortable") o.look.density = "comfortable";
    }
    if (c.receipt && typeof c.receipt === "object") {
      o.receipt.lines = clip(c.receipt.lines, LIMIT.lines);
      LANGS.forEach(function (l) { o.receipt.thanks[l] = clip(c.receipt.thanks && c.receipt.thanks[l], LIMIT.thanks).trim(); });
    }
    return o;
  };
  function cur() { return JSON.parse(JSON.stringify(E.custom || blank())); }
  E.appName = function () { var n = E.custom && E.custom.names && E.custom.names.app; return n || "Lakay"; };
  E.tagline = function () { var c = E.custom && E.custom.names && E.custom.names.tagline; return (c && c[E.lang]) || t("door.tag"); };
  E.thanks = function () { var c = E.custom && E.custom.receipt && E.custom.receipt.thanks; return (c && c[E.lang]) || t("receipt.thanks"); };
  /* The software's own identity stays on receipts, reports and About, whatever the app is called: it is what an auditor
     checks against the release. */
  E.made = function () { var n = E.appName(); return (n === "Lakay" ? "Lakay " : n + " · Lakay ") + t("build") + " " + E.BUILD.number; };
  E.receiptLines = function () { return E.custom && E.custom.receipt && E.custom.receipt.lines ? E.custom.receipt.lines.split("\n").filter(function (x) { return x.trim(); }) : []; };

  /* Which parts changed, in plain paths, for the ledger line. */
  function diff(a, b, path, out) {
    out = out || [];
    if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
      Object.keys(Object.assign({}, a, b)).forEach(function (k) { diff(a[k], b[k], path ? path + "." + k : k, out); });
    } else if (JSON.stringify(a === undefined ? null : a) !== JSON.stringify(b === undefined ? null : b)) out.push(path);
    return out;
  }
  function save(next, quiet) {
    next = E.cleanCustom(next);
    var changed = diff(E.custom || blank(), next, "");
    if (!changed.length) { if (!quiet) ui.toast(t("studio.nothing")); return Promise.resolve(false); }
    return B.saveCustom(next, changed.slice(0, 50)).then(function () { ui.applyLook(); if (!quiet) ui.toast(t("studio.saved"), "good"); return true; },
      function (e) { ui.toast(t("door.problem"), "bad"); console.error(e); return false; });
  }
  S.save = save;

  var ROOMS = [["start", "🧰"], ["names", "🏷️"], ["words", "✍️"], ["look", "🎨"], ["receipt", "🧾"], ["safe", "🗄️"]];
  ui.rooms.studio = function (main) {
    var status = h("span.status-chip", null, [h("span.dot", { "aria-hidden": "true" }), t("studio.status")]);
    main.appendChild(ui.roomHead("room.studio", "tip.studio", [status,
      h("button.key.sm", { type: "button", id: "studioExport", onclick: exportAll }, [ui.emo("📤"), t("studio.export")]),
      h("button.key.sm", { type: "button", id: "studioImport", onclick: function () { S.room = "safe"; ui.refresh(); } }, [ui.emo("📥"), t("studio.import")]),
      h("button.key.sm.danger", { type: "button", id: "studioReset", onclick: resetAll }, [ui.emo("↩️"), t("studio.reset")])]));
    var index = h("ul.studio-index", { "aria-label": t("room.studio") });
    var pane = h("section.card.studio-pane", { id: "studioPane" });
    ROOMS.forEach(function (r) {
      index.appendChild(h("li", null, h("button.guide-key", { type: "button", "data-r": r[0], "aria-current": S.room === r[0] ? "true" : null, onclick: function () { S.room = r[0]; ui.refresh(); } }, [ui.emo(r[1]), t("studio.r." + r[0])])));
    });
    main.appendChild(h("div.studio", null, [index, pane]));
    ({ start: start, names: names, words: words, look: look, receipt: receipt, safe: safe })[S.room](pane);
  };
  function paneHead(pane, room) {
    var e = ROOMS.filter(function (r) { return r[0] === room; })[0][1];
    pane.appendChild(h("h2.studio-h", null, [ui.emo(e), t("studio.r." + room)]));
    pane.appendChild(h("p.studio-intro", null, t("studio." + room + ".intro")));
  }

  /* ---------- the Editor: where to begin ---------- */
  function start(pane) {
    paneHead(pane, "start");
    [["names", "🏷️"], ["words", "✍️"], ["look", "🎨"], ["receipt", "🧾"]].forEach(function (r) {
      pane.appendChild(h("div.studio-row", null, [h("span.emo", { "aria-hidden": "true" }, r[1]), h("div", null, [h("strong", null, t("studio.start." + r[0] + ".t")), h("p.hint", null, t("studio.start." + r[0] + ".b"))]),
        h("button.key.sm", { type: "button", "data-go": r[0], onclick: function () { S.room = r[0]; ui.refresh(); } }, t("studio.choose"))]));
    });
    pane.appendChild(h("p.studio-foot", null, t("studio.foot")));
  }

  /* ---------- names ---------- */
  function names(pane) {
    var st = B.state(), c = cur();
    paneHead(pane, "names");
    var app = ui.input({ id: "stApp", maxlength: String(LIMIT.app), value: c.names.app, placeholder: "Lakay" });
    var store = ui.input({ id: "stStore", maxlength: "80", value: st.settings.storeName });
    var owner = ui.input({ id: "stOwner", maxlength: "80", value: st.settings.ownerName });
    var tags = {};
    LANGS.forEach(function (l) { tags[l] = ui.input({ id: "stTag-" + l, maxlength: String(LIMIT.tagline), value: c.names.tagline[l], placeholder: E.original("door.tag", l) }); });
    var pvName = h("span.pv-name"), pvTag = h("em"), pvStore = h("span.pv-store");
    function paint() { pvName.textContent = app.value.trim() || "Lakay"; pvTag.textContent = tags[E.lang].value.trim() || E.original("door.tag", E.lang); pvStore.textContent = store.value.trim(); }
    [app, store, tags.en, tags.fr, tags.ht].forEach(function (x) { x.addEventListener("input", paint); });
    paint();
    pane.appendChild(h("div.studio-split", null, [
      h("form.studio-form", { onsubmit: function (e) { e.preventDefault(); } }, [
        ui.field("studio.appName", app, { hint: t("studio.appNameHint") }), ui.field("setup.storeName", store, { required: true }), ui.field("setup.ownerName", owner, { required: true }),
        h("p.label-caps", null, [ui.emo("✨"), t("studio.tagline")]),
        h("div.studio-langs", null, LANGS.map(function (l) { return ui.field(t("studio.lang." + l), tags[l]); })),
        h("div.row-keys", null, [
          h("button.key.primary", { type: "button", id: "stNamesSave", onclick: function () {
            if (!store.value.trim()) return ui.fieldError(store, t("setup.needStore"));
            if (!owner.value.trim()) return ui.fieldError(owner, t("setup.needOwner"));
            var next = cur(); next.names.app = app.value.trim(); LANGS.forEach(function (l) { next.names.tagline[l] = tags[l].value.trim(); });
            B.updateSettings({ storeName: store.value.trim(), ownerName: owner.value.trim() }).then(function () { return save(next, true); })
              .then(function () { ui.toast(t("studio.saved"), "good"); ui.shell(); });
          } }, [ui.emo("💾"), t("save")]),
          h("button.key", { type: "button", onclick: function () { app.value = ""; LANGS.forEach(function (l) { tags[l].value = ""; }); paint(); } }, [ui.emo("↩️"), t("studio.original")])])]),
      h("div.studio-preview", { "aria-label": t("studio.preview") }, [h("p.label-caps", null, [ui.emo("👀"), t("studio.preview")]),
        h("div.pv-door", null, [h("span.seal-ring", null, ui.crestKey(64, { title: t("crest.press") })), pvName, h("div.door-rule", null, [h("span"), pvTag, h("span")]), pvStore])])]));
  }

  /* ---------- words ---------- */
  var AREAS = [["all", null], ["door", ["door.", "setup.", "master.", "restore.", "pw."]], ["menu", ["room.", "short.", "menu", "lockNow", "build", "theme", "language"]],
    ["home", ["home.", "first.", "prov.", "app."]], ["register", ["reg.", "cash.", "receipt."]], ["inventory", ["inv.", "rc.", "ad.", "reason.", "cat.", "line.", "field."]],
    ["reports", ["rep."]], ["settings", ["set.", "about.", "problem.", "type."]], ["guide", ["guide."]], ["tips", ["tip."]], ["studio", ["studio."]]];
  var W = { lang: null, area: "all", q: "", pending: {} };
  function words(pane) {
    W.lang = W.lang || E.lang;
    paneHead(pane, "words");
    var c = cur(), over = c.words[W.lang];
    var list = h("div.word-list", { id: "wordList" }), more = h("p.hint"), count = h("span.badge", { id: "wordCount" }, t("studio.words.changed", { n: Object.keys(over).length }));
    var q = ui.input({ id: "wordSearch", type: "search", placeholder: t("studio.words.search"), "aria-label": t("studio.words.search"), value: W.q });
    var chips = h("div.chips");
    AREAS.forEach(function (a) {
      chips.appendChild(h("button.chip", { type: "button", "aria-pressed": String(W.area === a[0]), onclick: function (e) {
        W.area = a[0]; Array.prototype.forEach.call(chips.children, function (x) { x.setAttribute("aria-pressed", String(x === e.currentTarget)); }); draw();
      } }, t("studio.area." + a[0])));
    });
    function inArea(k) {
      if (W.area === "all") return true;
      var pre = AREAS.filter(function (a) { return a[0] === W.area; })[0][1];
      return pre.some(function (p) { return k === p || k.indexOf(p) === 0; });
    }
    function draw() {
      U.clear(list);
      var n = U.norm(W.q), keys = Object.keys(E.dict.en).filter(function (k) {
        if (!inArea(k)) return false;
        if (!n) return true;
        return U.norm(k + " " + E.original(k, W.lang) + " " + (over[k] || "")).indexOf(n) >= 0;
      });
      keys.slice(0, 60).forEach(function (k) {
        var orig = E.original(k, W.lang), long = orig.length > 90 || orig.indexOf("\n") >= 0;
        var val = W.pending[W.lang + "|" + k] !== undefined ? W.pending[W.lang + "|" + k] : (over[k] || "");
        var inp = long ? h("textarea", { rows: "3", maxlength: String(LIMIT.word), "data-k": k }) : ui.input({ maxlength: String(LIMIT.word), "data-k": k });
        inp.value = val; inp.placeholder = orig; inp.setAttribute("aria-label", t("studio.words.yours") + ": " + orig.slice(0, 60));
        inp.addEventListener("input", function () { W.pending[W.lang + "|" + k] = inp.value; row.classList.add("edited"); });
        var row = h("div.word-row" + (over[k] ? ".changed" : ""), { "data-k": k }, [
          h("div.word-orig", null, [h("span.word-key", null, k), h("span", null, orig)]), inp,
          h("button.icon-key", { type: "button", "aria-label": t("studio.words.reset"), title: t("studio.words.reset"), onclick: function () { inp.value = ""; W.pending[W.lang + "|" + k] = ""; row.classList.add("edited"); } }, "↺")]);
        list.appendChild(row);
      });
      more.textContent = keys.length > 60 ? t("studio.words.more", { n: keys.length - 60 }) : keys.length ? "" : t("studio.words.none");
    }
    q.addEventListener("input", U.debounce(function () { W.q = q.value; draw(); }, 120));
    var langSeg = ui.seg(LANGS.map(function (l) { return [l, t("studio.lang." + l)]; }), W.lang, function (l) { W.lang = l; ui.refresh(); }, t("studio.words.lang"));
    pane.appendChild(h("div.word-tools", null, [h("div.field", null, [h("p.label", null, t("studio.words.lang")), langSeg]), count]));
    pane.appendChild(h("div.search-row", null, [U.icon("search"), q]));
    pane.appendChild(chips);
    pane.appendChild(list); pane.appendChild(more);
    pane.appendChild(h("div.row-keys", null, [h("button.key.primary", { type: "button", id: "wordsSave", onclick: function () {
      var next = cur();
      Object.keys(W.pending).forEach(function (pk) {
        var i = pk.indexOf("|"), l = pk.slice(0, i), k = pk.slice(i + 1), v = W.pending[pk];
        if (v && v.trim() && v !== E.original(k, l)) next.words[l][k] = v; else delete next.words[l][k];
      });
      save(next).then(function () { W.pending = {}; ui.shell(); });
    } }, [ui.emo("💾"), t("studio.words.saveAll")])]));
    draw();
  }

  /* ---------- look ---------- */
  function look(pane) {
    var c = cur();
    paneHead(pane, "look");
    var grid = h("div.palette-grid", { role: "radiogroup", "aria-label": t("studio.r.look") });
    PALETTES.forEach(function (p) {
      var sw = h("span.swatches", { "aria-hidden": "true" });
      SWATCH[p].forEach(function (col) { var d = h("span.sw"); d.style.background = col; sw.appendChild(d); });
      grid.appendChild(h("button.palette-card", { type: "button", role: "radio", "aria-checked": String(c.look.palette === p), "data-p": p, onclick: function () {
        var next = cur(); next.look.palette = p; save(next).then(function () { ui.refresh(); });
      } }, [sw, h("strong", null, t("studio.pal." + p)), h("span.hint", null, t("studio.pal." + p + ".d"))]));
    });
    pane.appendChild(grid);
    pane.appendChild(h("div.field", null, [h("p.label", null, t("studio.density")), ui.seg([["compact", t("studio.density.compact")], ["comfortable", t("studio.density.comfortable")]], c.look.density, function (v) {
      var next = cur(); next.look.density = v; save(next);
    }, t("studio.density"))]));
    pane.appendChild(h("p.hint", null, t("studio.look.hint")));
  }

  /* ---------- receipt ---------- */
  function receipt(pane) {
    var st = B.state(), c = cur();
    paneHead(pane, "receipt");
    var lines = h("textarea", { id: "stLines", rows: "3", maxlength: String(LIMIT.lines) }); lines.value = c.receipt.lines;
    var note = ui.input({ id: "stNote", maxlength: "160", value: st.settings.receiptNote || "" });
    var thanks = {};
    LANGS.forEach(function (l) { thanks[l] = ui.input({ id: "stThanks-" + l, maxlength: String(LIMIT.thanks), value: c.receipt.thanks[l], placeholder: E.original("receipt.thanks", l) }); });
    var pv = h("div.studio-preview", { id: "receiptPreview" });
    function sample() {
      var last = st.sales[st.sales.length - 1];
      return last || { no: "A-000000", at: new Date().toISOString(), by: "owner", lines: [{ qty: 1, name: t("studio.sampleItem"), amount: 250 }], subtotal: 250, taxes: [], tax: 0, total: 250, pay: [{ tendered: 500, change: 250 }] };
    }
    function paint() {
      var keep = E.custom; E.custom = E.cleanCustom({ v: 1, names: cur().names, words: cur().words, look: cur().look, receipt: { lines: lines.value, thanks: { en: thanks.en.value, fr: thanks.fr.value, ht: thanks.ht.value } } });
      var keepNote = st.settings.receiptNote; st.settings.receiptNote = note.value.trim();
      U.clear(pv); pv.appendChild(h("p.label-caps", null, [ui.emo("👀"), t("studio.preview")])); pv.appendChild(E.register.receiptNode(sample()));
      E.custom = keep; st.settings.receiptNote = keepNote;
    }
    [lines, note, thanks.en, thanks.fr, thanks.ht].forEach(function (x) { x.addEventListener("input", paint); });
    pane.appendChild(h("div.studio-split", null, [h("form.studio-form", { onsubmit: function (e) { e.preventDefault(); } }, [
      ui.field("studio.receipt.lines", lines, { hint: t("studio.receipt.linesHint") }),
      h("p.label-caps", null, [ui.emo("💐"), t("studio.receipt.thanks")]),
      h("div.studio-langs", null, LANGS.map(function (l) { return ui.field(t("studio.lang." + l), thanks[l]); })),
      ui.field("set.receiptNote", note, { hint: t("set.receiptNoteHint") }),
      h("div.row-keys", null, [h("button.key.primary", { type: "button", id: "stReceiptSave", onclick: function () {
        var next = cur(); next.receipt.lines = lines.value; LANGS.forEach(function (l) { next.receipt.thanks[l] = thanks[l].value.trim(); });
        B.updateSettings({ receiptNote: note.value.trim() }).then(function () { return save(next, true); }).then(function () { ui.toast(t("studio.saved"), "good"); ui.refresh(); });
      } }, [ui.emo("💾"), t("save")])])]), pv]));
    paint();
  }

  /* ---------- safekeeping ---------- */
  function exportAll() {
    var body = { format: "emporium-author", v: 1, build: E.BUILD.number, at: new Date().toISOString(), custom: cur() };
    ui.saveFile("Lakay Author Studio " + U.dayKey() + ".json", "application/json", JSON.stringify(body, null, 1)).then(function () { ui.toast(t("studio.exported"), "good"); });
  }
  function resetAll() {
    ui.confirm(t("studio.resetT"), t("studio.resetP"), t("studio.resetYes"), "danger").then(function (ok) {
      if (ok) save(blank(), true).then(function (did) { ui.toast(t(did ? "studio.resetDone" : "studio.nothing"), did ? "good" : null); ui.shell(); });
    });
  }
  function safe(pane) {
    paneHead(pane, "safe");
    var msg = h("p.door-msg", { role: "status" });
    var file = ui.filePick({ id: "studioFile", keyId: "studioFileKey", accept: ".json,application/json", label: t("studio.import"), none: t("ld.rs.none"), emoji: "📥", onFile: function (f) {
      f.text().then(function (text) {
        var body; try { body = JSON.parse(text); } catch (e) { body = null; }
        if (!body || body.format !== "emporium-author" || body.v !== 1 || !body.custom) { msg.textContent = t("studio.importBad"); return; }
        var next = E.cleanCustom(body.custom);
        ui.confirm(t("studio.importConfirmT"), t("studio.importConfirmP"), t("studio.importYes")).then(function (ok) {
          if (ok) save(next, true).then(function () { ui.toast(t("studio.imported"), "good"); ui.shell(); });
        });
      });
    } });
    pane.appendChild(h("div.studio-row", null, [h("span.emo", { "aria-hidden": "true" }, "📤"), h("div", null, [h("strong", null, t("studio.export")), h("p.hint", null, t("studio.safe.export"))]),
      h("button.key.sm", { type: "button", onclick: exportAll }, t("studio.export"))]));
    pane.appendChild(h("div.studio-row", null, [h("span.emo", { "aria-hidden": "true" }, "📥"), h("div", null, [h("strong", null, t("studio.import")), h("p.hint", null, t("studio.safe.import")), file, msg])]));
    pane.appendChild(h("div.studio-row", null, [h("span.emo", { "aria-hidden": "true" }, "↩️"), h("div", null, [h("strong", null, t("studio.reset")), h("p.hint", null, t("studio.resetP"))]),
      h("button.key.sm.danger", { type: "button", onclick: resetAll }, t("studio.reset"))]));
  }
})();
