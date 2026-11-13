/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Schedae: Carpe Diem's sticky notes, behind the 🗒️ key on the rail. Each person keeps their own
   notes, sealed in the books with everything else (B.notes and B.saveNotes in 04-books.js), and carried in backups.
   A note floats over every page until it is unpinned. It takes bold, italic, underline, strikethrough, a bulleted list
   and pictures; it moves by its top, grows from any edge or its corner, folds to its top, and changes its paper: Lakay's
   own six (Build 9), each with its own night paper. The notes list finds, pins, unpins, copies and deletes them.
   Carpe Diem's "Send to Tabula" becomes "Copy the note", since Lakay has no Tabula.
   The words and marks of a note are kept as a small model of allowed marks, never as markup, so a note can never carry
   a script, a link or a picture from outside the page. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui;
  var S = E.schedae = {};
  /* Lakay's own six papers (Build 9), named in Kreyòl: Mango, Lanmè (the sea), Flanbwayan (the flame tree's flower),
     Zaboka (avocado), Douvanjou (dawn: Lakay's own periwinkle) and Kokoye (coconut). A note made in Build 8 kept one of
     Carpe Diem's papers; it takes the Lakay paper nearest to it. */
  var COLORS = [
    { id: "mango", name: "Mango" }, { id: "lanme", name: "Lanmè" }, { id: "flanbwayan", name: "Flanbwayan" },
    { id: "zaboka", name: "Zaboka" }, { id: "douvanjou", name: "Douvanjou" }, { id: "kokoye", name: "Kokoye" }];
  var BEFORE = { gold: "mango", sky: "lanme", rose: "flanbwayan", sage: "zaboka", violet: "douvanjou", ivory: "kokoye" };
  function col(id) { id = BEFORE[id] || id; for (var i = 0; i < COLORS.length; i++) if (COLORS[i].id === id) return COLORS[i]; return COLORS[0]; }
  function still() { return document.documentElement.getAttribute("data-calm") === "1" || !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function snd(n) { if (E.sound) E.sound.play(n); }
  function notes() { return B.isOpen ? B.notes() : []; }
  function save(now) { return B.isOpen ? B.saveNotes(now) : Promise.resolve(false); }
  function byId(id) { var l = notes(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function uid() { return "sn-" + Date.now() + "-" + Math.floor(Math.random() * 1e6); }
  try { document.execCommand("styleWithCSS", false, false); } catch (e) { }

  /* ---------- the words of a note: a small model of allowed marks ----------
     A string is text; ["br"] a line break; ["img", "data:image/..."] a picture kept in the note itself; [mark, [...]]
     a mark around its contents, where the mark is one of b, i, u, s, ul, ol, li, div. Anything else that arrives in a
     note (a paste from elsewhere, say) keeps its words and loses its markup. */
  var KEEP = { B: "b", STRONG: "b", I: "i", EM: "i", U: "u", INS: "u", S: "s", STRIKE: "s", DEL: "s", UL: "ul", OL: "ol", LI: "li",
    DIV: "div", P: "div", H1: "div", H2: "div", H3: "div", H4: "div", H5: "div", H6: "div", BLOCKQUOTE: "div", PRE: "div", SECTION: "div", ARTICLE: "div" };
  var SKIP = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1, SVG: 1, MATH: 1, LINK: 1, META: 1, HEAD: 1, TITLE: 1,
    INPUT: 1, BUTTON: 1, SELECT: 1, TEXTAREA: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1, PICTURE: 1, SOURCE: 1 };
  var MAKE = { b: 1, i: 1, u: 1, s: 1, ul: 1, ol: 1, li: 1, div: 1 };
  var PIC = /^data:image\/(png|jpeg|gif|webp|bmp|avif);base64,[A-Za-z0-9+\/=]+$/;
  function put(out, x) { if (typeof x === "string") { if (!x) return; if (typeof out[out.length - 1] === "string") out[out.length - 1] += x; else out.push(x); } else out.push(x); }
  function toModel(node, depth) {
    var out = [];
    if (depth > 24) { put(out, node.textContent || ""); return out; }
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { put(out, c.nodeValue || ""); continue; }
      if (c.nodeType !== 1) continue;
      var tag = String(c.tagName).toUpperCase();
      if (SKIP[tag]) continue;
      if (tag === "BR") { out.push(["br"]); continue; }
      if (tag === "IMG") { var src = c.getAttribute("src") || ""; if (PIC.test(src)) out.push(["img", src]); continue; }
      var kids = toModel(c, depth + 1), k = KEEP[tag];
      if (k) { out.push([k, kids]); continue; }
      /* a span or a font: its look, carried in the marks we keep */
      var st = c.style || {}, fw = String(st.fontWeight || ""), deco = String(st.textDecorationLine || st.textDecoration || ""), wrap = kids;
      if (deco.indexOf("line-through") >= 0) wrap = [["s", wrap]];
      if (deco.indexOf("underline") >= 0) wrap = [["u", wrap]];
      if (st.fontStyle === "italic") wrap = [["i", wrap]];
      if (fw === "bold" || fw === "bolder" || parseInt(fw, 10) >= 600) wrap = [["b", wrap]];
      wrap.forEach(function (x) { put(out, x); });
    }
    return out;
  }
  function fromModel(model, into, depth) {
    if (!Array.isArray(model) || depth > 24) return into;
    model.forEach(function (x) {
      if (typeof x === "string") into.appendChild(document.createTextNode(x));
      else if (Array.isArray(x)) {
        if (x[0] === "br") into.appendChild(document.createElement("br"));
        else if (x[0] === "img") { if (typeof x[1] === "string" && PIC.test(x[1])) { var im = document.createElement("img"); im.alt = ""; im.src = x[1]; into.appendChild(im); } }
        else if (MAKE[x[0]]) into.appendChild(fromModel(x[1], document.createElement(x[0]), depth + 1));
      }
    });
    return into;
  }
  /* the plain words of a note, line by line */
  function plain(model) {
    var s = "";
    (function walk(m, depth) {
      if (!Array.isArray(m) || depth > 24) return;
      m.forEach(function (x) {
        if (typeof x === "string") s += x;
        else if (Array.isArray(x)) {
          if (x[0] === "br") s += "\n";
          else if (x[0] !== "img") {
            var block = x[0] === "div" || x[0] === "li";
            if (block && s && s.slice(-1) !== "\n") s += "\n";
            if (x[0] === "li") s += "• ";
            walk(x[1], depth + 1);
          }
        }
      });
    })(model, 0);
    return s.replace(/\n{3,}/g, "\n\n").trim();
  }
  S.plain = plain;
  function preview(n) { var p = plain(n && n.doc).replace(/\s+/g, " ").trim(); return p ? p.slice(0, 64) : t("sn.emptyOne"); }

  /* ---------- the notes ---------- */
  var Z = 9250;
  S.create = function () {
    if (!B.isOpen) return null;
    var list = notes(), e = list.length % 5;
    var n = { id: uid(), doc: [], ts: Date.now(), pinned: true, color: COLORS[0].id, x: 90 + e * 20, y: 100 + e * 20 };
    list.unshift(n); save(); render(); snd("page");
    var el = cardOf(n.id), body = el && el.querySelector(".sn-body");
    if (body) setTimeout(function () { try { body.focus({ preventScroll: true }); } catch (x) { } }, 40);
    return n;
  };
  function remove(id) {
    var list = notes();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { list.splice(i, 1); break; }
    save(); render(); if (panelOpen()) openPanel();
  }
  S.remove = function (id) {
    var el = cardOf(id);
    if (el && !still()) { el.classList.add("cd-ripping"); snd("soft"); setTimeout(function () { remove(id); }, 430); }
    else remove(id);
  };
  S.togglePin = function (id) {
    var n = byId(id); if (!n) return;
    n.pinned = !n.pinned; save(); render(); if (panelOpen()) openPanel();
  };
  S.copy = function (id) {
    var n = byId(id); if (!n) return Promise.resolve(false);
    return E.clip.write(plain(n.doc)).then(function () { ui.toast(t("sn.copied"), "good"); return true; }, function () { ui.toast(t("sn.copyFailed"), "bad"); return false; });
  };
  function cardOf(id) {
    if (!pins) return null;
    for (var c = pins.firstChild; c; c = c.nextSibling) if (c.getAttribute && c.getAttribute("data-sn-id") === id) return c;
    return null;
  }

  /* a picture, made small enough to keep in a note (as Carpe Diem does: at most 600 points a side, as a JPEG) */
  function picture(file, done) {
    if (!file || !/^image\//.test(file.type || "")) return;
    var rd = new FileReader();
    rd.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 600, w = img.width, hh = img.height;
        if (w > max || hh > max) { var k = Math.min(max / w, max / hh); w = Math.round(w * k); hh = Math.round(hh * k); }
        var cv = document.createElement("canvas"); cv.width = w; cv.height = hh;
        var src;
        try { cv.getContext("2d").drawImage(img, 0, 0, w, hh); src = cv.toDataURL("image/jpeg", 0.82); } catch (e) { src = rd.result; }
        if (PIC.test(src)) done(src);
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  /* one note on the page */
  function card(n) {
    if (n.color !== col(n.color).id) n.color = col(n.color).id;
    var el = h("div.sticky-note", { "data-sn-id": n.id, "data-sn-col": n.color });
    if (n.min) el.setAttribute("data-sn-min", "1");
    var body = h("div.sn-body", { contenteditable: "true", role: "textbox", "aria-multiline": "true", "aria-label": t("sn.note"), "data-ph": t("sn.phWrite"), spellcheck: "true" });
    fromModel(n.doc, body, 0);
    function keep() { n.doc = toModel(body, 0); save(); }
    body.addEventListener("input", keep);
    /* what arrives from elsewhere comes in as words (or as a picture), never as foreign markup */
    body.addEventListener("paste", function (e) {
      var cd = e.clipboardData; if (!cd) return;
      e.preventDefault();
      var file = null; try { for (var i = 0; i < cd.items.length; i++) if (cd.items[i].kind === "file" && /^image\//.test(cd.items[i].type)) { file = cd.items[i].getAsFile(); break; } } catch (x) { }
      if (file) { picture(file, function (src) { body.focus(); try { document.execCommand("insertImage", false, src); } catch (x) { } keep(); }); return; }
      var text = cd.getData("text/plain"); if (!text) return;
      try { document.execCommand("insertText", false, text); } catch (x) { }
      keep();
    });
    body.addEventListener("drop", function (e) {
      var dt = e.dataTransfer; if (!dt) return;
      e.preventDefault();
      var file = dt.files && dt.files[0];
      if (file) { picture(file, function (src) { body.focus(); try { document.execCommand("insertImage", false, src); } catch (x) { } keep(); }); return; }
      var text = dt.getData("text/plain"); if (!text) return;
      body.focus(); try { document.execCommand("insertText", false, text); } catch (x) { } keep();
    });
    function iconKey(sym, title, fn) {
      var b = h("button.sn-iconbtn", { type: "button", title: title, "aria-label": title }, sym);
      b.addEventListener("click", function (e) { e.stopPropagation(); fn(b); });
      return b;
    }
    var grip = h("div.sn-grip", { title: t("sn.drag") });
    var head = h("div.sn-head", null, [
      iconKey("+", t("sn.new"), function () { S.create(); }),
      grip,
      iconKey("↶", t("sn.undo"), function () { try { body.focus(); document.execCommand("undo"); } catch (x) { } }),
      iconKey("↷", t("sn.redo"), function () { try { body.focus(); document.execCommand("redo"); } catch (x) { } }),
      iconKey("⋯", t("sn.menu"), function (b) { openMenu(n, b); }),
      iconKey("✕", t("sn.close"), function () { S.togglePin(n.id); })]);
    el.appendChild(head); el.appendChild(body);

    /* the tools: bold, italic, underline, strikethrough, a list, a picture, and Save (which Carpe Diem puts first) */
    var tools = h("div.sn-tools");
    function tool(label, cmd, title, cls) {
      var b = h("button.sn-tool" + (cls ? "." + cls : ""), { type: "button", title: title, "aria-label": title }, label);
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function (e) { e.preventDefault(); body.focus(); try { document.execCommand(cmd, false, null); } catch (x) { } keep(); });
      return b;
    }
    tools.appendChild(tool("B", "bold", t("sn.bold"), "snb"));
    tools.appendChild(tool("I", "italic", t("sn.italic"), "sni"));
    tools.appendChild(tool("U", "underline", t("sn.underline"), "snu"));
    tools.appendChild(tool("ab", "strikeThrough", t("sn.strike"), "sns"));
    tools.appendChild(tool("•", "insertUnorderedList", t("sn.list")));
    var file = h("input.sn-file", { type: "file", accept: "image/*", hidden: true, tabindex: "-1", "aria-hidden": "true" });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0]; file.value = "";
      picture(f, function (src) { body.focus(); try { document.execCommand("insertImage", false, src); } catch (x) { } keep(); });
    });
    var pic = h("button.sn-tool.sn-pic", { type: "button", title: t("sn.image"), "aria-label": t("sn.image") }, U.icon("image", "sn-ico"));
    pic.addEventListener("mousedown", function (e) { e.preventDefault(); });
    pic.addEventListener("click", function (e) { e.preventDefault(); file.click(); });
    tools.appendChild(pic);
    var saveKey = h("button.sn-tool.sn-save", { type: "button", title: t("sn.saveTip"), "aria-label": t("sn.saveTip") }, t("sn.save"));
    saveKey.addEventListener("mousedown", function (e) { e.preventDefault(); });
    saveKey.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      n.doc = toModel(body, 0); save(true);
      saveKey.textContent = t("sn.saved"); setTimeout(function () { saveKey.textContent = t("sn.save"); }, 1200);
    });
    tools.appendChild(saveKey);
    el.appendChild(tools); el.appendChild(file);

    if (n.w) el.style.width = n.w + "px";
    if (n.h) el.style.height = n.h + "px";

    /* the corner: grows the note */
    var corner = h("div.sn-resize", { title: t("sn.resize") }), rz = null;
    corner.addEventListener("pointerdown", function (e) {
      e.preventDefault(); rz = { sx: e.clientX, sy: e.clientY, ow: el.offsetWidth, oh: el.offsetHeight };
      try { corner.setPointerCapture(e.pointerId); } catch (x) { }
    });
    corner.addEventListener("pointermove", function (e) {
      if (!rz) return;
      n.w = Math.max(150, rz.ow + (e.clientX - rz.sx)); n.h = Math.max(120, rz.oh + (e.clientY - rz.sy));
      el.style.width = n.w + "px"; el.style.height = n.h + "px";
    });
    corner.addEventListener("pointerup", function () { if (rz) { rz = null; save(); } });
    corner.addEventListener("pointercancel", function () { rz = null; });
    el.appendChild(corner);

    /* every edge grows it too (Carpe Diem's edges: four sides and three corners) */
    [["n", "ns-resize"], ["s", "ns-resize"], ["e", "ew-resize"], ["w", "ew-resize"], ["ne", "nesw-resize"], ["sw", "nesw-resize"], ["nw", "nwse-resize"]].forEach(function (g) {
      var k = g[0], edge = h("div.cd-sn-edge.cd-sn-edge-" + k, { "aria-hidden": "true" }), on = null;
      edge.style.cursor = g[1];
      edge.addEventListener("pointerdown", function (e) {
        e.preventDefault(); e.stopPropagation();
        var r = el.getBoundingClientRect();
        on = { sx: e.clientX, sy: e.clientY, x: n.x, y: n.y, w: r.width, h: r.height };
        try { edge.setPointerCapture(e.pointerId); } catch (x) { }
      });
      edge.addEventListener("pointermove", function (e) {
        if (!on) return;
        var dx = e.clientX - on.sx, dy = e.clientY - on.sy, x = on.x, y = on.y, w = on.w, hh = on.h;
        if (k.indexOf("e") >= 0) w = on.w + dx;
        if (k.indexOf("w") >= 0) { w = on.w - dx; x = on.x + dx; }
        if (k.indexOf("s") >= 0) hh = on.h + dy;
        if (k.indexOf("n") >= 0) { hh = on.h - dy; y = on.y + dy; }
        if (w < 150) { if (k.indexOf("w") >= 0) x -= 150 - w; w = 150; }
        if (hh < 120) { if (k.indexOf("n") >= 0) y -= 120 - hh; hh = 120; }
        n.w = Math.round(w); n.h = Math.round(hh); n.x = Math.max(0, Math.round(x)); n.y = Math.max(0, Math.round(y));
        el.style.width = n.w + "px"; el.style.height = n.h + "px"; el.style.left = n.x + "px"; el.style.top = n.y + "px";
      });
      function up() { if (on) { on = null; save(); } }
      edge.addEventListener("pointerup", up); edge.addEventListener("pointercancel", up);
      el.appendChild(edge);
    });

    /* the top: carries the note anywhere on the page */
    var drag = null, frame = 0;
    grip.addEventListener("pointerdown", function (e) {
      drag = { sx: e.clientX, sy: e.clientY, ox: n.x || 90, oy: n.y || 100 };
      try { grip.setPointerCapture(e.pointerId); } catch (x) { }
      grip.style.cursor = "grabbing";
    });
    grip.addEventListener("pointermove", function (e) {
      if (!drag) return;
      if (!(e.buttons & 1) && e.pointerType === "mouse") { drag = null; grip.style.cursor = ""; return; }
      n.x = Math.max(0, Math.min(drag.ox + (e.clientX - drag.sx), innerWidth - 214));
      n.y = Math.max(0, Math.min(drag.oy + (e.clientY - drag.sy), innerHeight - 164));
      if (frame) return;
      frame = requestAnimationFrame(function () { frame = 0; el.style.left = n.x + "px"; el.style.top = n.y + "px"; });
    });
    grip.addEventListener("pointerup", function () { if (drag) { drag = null; grip.style.cursor = ""; save(); } });
    grip.addEventListener("pointercancel", function () { drag = null; grip.style.cursor = ""; });

    /* where it stands: on the page, never off it */
    var x = Math.max(0, Math.min(n.x || 90, innerWidth - 214)), y = Math.max(0, Math.min(n.y || 100, innerHeight - 164));
    if ((n.x || 0) > innerWidth - 60 || (n.y || 0) > innerHeight - 60) { var i = notes().indexOf(n); if (i < 0) i = 0; x = 90 + (i % 5) * 20; y = 100 + (i % 5) * 20; }
    n.x = x; n.y = y;
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.zIndex = String(++Z);
    el.addEventListener("pointerdown", function () { el.style.zIndex = String(++Z); }, true);
    if (!still()) el.classList.add("sn-pop");
    setTimeout(function () { el.classList.remove("sn-pop"); }, 320);
    return el;
  }

  /* ---------- the notes on the page ---------- */
  var pins = null;
  function render() {
    closeMenu();
    if (!B.isOpen) { if (pins) { pins.remove(); pins = null; } return; }
    if (!pins || !pins.isConnected) { pins = h("div#sticky-pins", { role: "region", "aria-label": t("sn.title") }); document.body.appendChild(pins); }
    U.clear(pins);
    notes().filter(function (n) { return n.pinned; }).forEach(function (n) { pins.appendChild(card(n)); });
  }
  S.render = render;
  var resizeWait = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeWait);
    resizeWait = setTimeout(function () {
      if (!B.isOpen || !pins) return;
      var moved = false;
      notes().forEach(function (n) {
        var x = Math.max(0, Math.min(n.x || 90, innerWidth - 214)), y = Math.max(0, Math.min(n.y || 100, innerHeight - 164));
        if (x !== n.x || y !== n.y) { n.x = x; n.y = y; moved = true; var el = cardOf(n.id); if (el) { el.style.left = x + "px"; el.style.top = y + "px"; } }
      });
      if (moved) save();
    }, 180);
  });

  /* ---------- a note's ⋯ menu: its paper, fold, unpin, the list, copy, delete ---------- */
  function closeMenu() { var m = document.querySelector(".sticky-card-menu-back"); if (m) m.remove(); }
  function openMenu(n, btn) {
    closeMenu();
    var back = h("div.sticky-card-menu-back");
    back.addEventListener("click", function (e) { if (e.target === back) back.remove(); });
    var r = btn.getBoundingClientRect(), left = Math.min(Math.round(r.left), (innerWidth || 360) - 200);
    var box = h("div.sn-menu", { role: "menu", "aria-label": t("sn.menu") });
    box.style.left = Math.max(8, left) + "px"; box.style.top = Math.round(r.bottom + 4) + "px";
    var dots = h("div.sn-dots", { role: "group", "aria-label": t("sn.paper") });
    COLORS.forEach(function (c) {
      var d = h("button.sn-dot", { type: "button", "data-sn-col": c.id, title: t("sn.col." + c.id), "aria-label": t("sn.col." + c.id), "aria-pressed": String(col(n.color).id === c.id) });
      d.addEventListener("click", function () {
        n.color = c.id; save(); render(); document.body.appendChild(back);
        Array.prototype.forEach.call(dots.children, function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-sn-col") === c.id)); });
      });
      dots.appendChild(d);
    });
    box.appendChild(dots);
    function item(label, fn) { var b = h("button.sn-mbtn", { type: "button", role: "menuitem" }, label); b.addEventListener("click", fn); box.appendChild(b); return b; }
    item(n.min ? t("sn.unfold") : t("sn.minimise"), function () { n.min = !n.min; save(); render(); });
    item(t("sn.unpin"), function () { back.remove(); S.togglePin(n.id); });
    item(t("sn.notesList"), function () { back.remove(); openPanel(); });
    item(t("sn.copyNote"), function () { back.remove(); S.copy(n.id); });
    item(t("sn.delNote"), function () { back.remove(); S.remove(n.id); });
    back.appendChild(box); document.body.appendChild(back);
    var first = box.querySelector(".sn-mbtn"); if (first) try { first.focus({ preventScroll: true }); } catch (x) { }
  }

  /* ---------- the notes list (the 🗒️ key) ---------- */
  function panelOpen() { return !!document.querySelector(".sticky-panel-back"); }
  function closePanel() { var p = document.querySelector(".sticky-panel-back"); if (p) p.remove(); }
  function openPanel() {
    closePanel(); closeMenu();
    if (!B.isOpen) return;
    var back = h("div.sticky-panel-back");
    back.addEventListener("click", function (e) { if (e.target === back) back.remove(); });
    var box = h("div.sn-panel", { role: "dialog", "aria-label": t("sn.title") });
    var newKey = h("button.sn-b.sn-b-primary#snNew", { type: "button" }, t("sn.new"));
    /* the list steps aside so the new note can be written in at once (Carpe Diem keeps its list open here) */
    newKey.addEventListener("click", function () { closePanel(); S.create(); });
    box.appendChild(h("div.sn-panel-head", null, [h("h3.sn-panel-title", null, t("sn.title")), newKey]));
    var list = notes(), rows = h("div.sn-rows"), q = null;
    if (list.length) {
      q = h("input.sn-search#snSearch", { type: "search", placeholder: t("sn.search"), "aria-label": t("sn.search"), autocomplete: "off", spellcheck: "false" });
      q.addEventListener("input", function () {
        var v = q.value.toLowerCase();
        Array.prototype.forEach.call(rows.children, function (r) { r.hidden = (r.__pv || "").indexOf(v) < 0; });
      });
      box.appendChild(q);
    } else box.appendChild(h("p.sn-empty", null, t("sn.empty")));
    list.forEach(function (n) {
      var row = h("div.sn-row", { "data-sn-row": n.id });
      row.__pv = plain(n.doc).toLowerCase();
      row.appendChild(h("div.sn-row-top", null, [h("span.sn-rowdot", { "data-sn-col": col(n.color).id, title: t("sn.col." + col(n.color).id) }), h("span.sn-rowtext", null, preview(n))]));
      var pin = h("button.sn-b.sn-b-soft", { type: "button" }, n.pinned ? t("sn.unpinShort") : t("sn.pin"));
      pin.addEventListener("click", function () { S.togglePin(n.id); });
      var copy = h("button.sn-b.sn-b-soft", { type: "button" }, t("sn.copy"));
      copy.addEventListener("click", function () { S.copy(n.id).then(function (ok) { if (!ok) return; copy.textContent = t("sn.copiedShort"); setTimeout(function () { copy.textContent = t("sn.copy"); }, 1200); }); });
      var del = h("button.sn-b.sn-b-ghost.sn-del", { type: "button" }, t("delete"));
      del.addEventListener("click", function () { S.remove(n.id); });
      row.appendChild(h("div.sn-row-keys", null, [pin, copy, del]));
      rows.appendChild(row);
    });
    box.appendChild(rows);
    back.appendChild(box); document.body.appendChild(back);
    setTimeout(function () { try { (q || newKey).focus({ preventScroll: true }); } catch (x) { } }, 30);
  }
  S.panel = openPanel;
  S.toggle = function () { if (panelOpen()) closePanel(); else { openPanel(); snd("page"); } };

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.querySelector(".sticky-card-menu-back")) { e.preventDefault(); closeMenu(); return; }
    if (panelOpen() && !document.getElementById("cd-em-menu")) { e.preventDefault(); closePanel(); }
  }, true);

  /* the notes follow the person: shown when the books open, put away when they lock */
  B.on("open", function () { setTimeout(render, 0); });
  B.on("user", function () { closePanel(); setTimeout(render, 0); });
  B.on("lock", function () { closePanel(); closeMenu(); if (pins) { pins.remove(); pins = null; } });
})();
