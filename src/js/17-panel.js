/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The edit menu of the right press, as Carpe Diem, Ingenium and the rest of the Offline Project have it: Undo, Redo, Cut,
   Copy, Paste, Paste as plain text, Select all, Copy the whole field and Clear the field, on any field, and Copy and
   Select all on chosen text, everywhere in the app (a long press on a tablet or a phone). Nowhere else.
   Copy and Paste reach the device's own clipboard through the app's shell (Windows, Mac, Fire, iPhone and iPad), so text
   moves freely between Lakay and every other program; in a browser, the browser's own clipboard is used. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t;
  var CB = E.clip = {};
  function desk() { return window.pywebview && window.pywebview.api; }
  /* The Windows and Mac shell hands over the clipboard through a mailbox: the page leaves a note, the shell (which may
     speak to the page at any time) reads the notes a few times a second, does what they ask, and answers. Nothing in the
     page's own protections is loosened for it. */
  var box = { n: 0, q: [], wait: {} };
  window.__lakayClip = {
    take: function () { var q = box.q; box.q = []; return q; },
    answer: function (id, ok, text) { var w = box.wait[id]; if (!w) return; delete box.wait[id]; clearTimeout(w.timer); if (ok) w.res(text); else w.rej(new Error(text || "no clipboard")); }
  };
  function viaShell(op, text) {
    return new Promise(function (res, rej) {
      var id = ++box.n; box.q.push({ id: id, op: op, text: text || "" });
      box.wait[id] = { res: res, rej: rej, timer: setTimeout(function () { delete box.wait[id]; rej(new Error("no answer")); }, 3000) };
    });
  }
  function hands() { var hs = window.webkit && window.webkit.messageHandlers; return hs && hs.shellClipboard; }
  /* the text on the device's clipboard */
  CB.read = function () {
    if (window.__lakayDesk) return viaShell("read").catch(function () { return navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : Promise.reject(new Error("no clipboard")); });
    var api = desk();
    if (api && typeof api.read_clipboard === "function") return api.read_clipboard().then(function (r) { if (r && r.ok) return r.text || ""; throw new Error((r && r.error) || "no clipboard"); });
    if (window.EmporiumHost && typeof window.EmporiumHost.readClipboard === "function") {
      /* the Fire tablet's shell answers with {"text": ..., "html": ...}; an older shell answered with the words alone */
      try {
        var s = window.EmporiumHost.readClipboard();
        if (s !== null && s !== undefined) {
          s = String(s);
          try { var j = JSON.parse(s); if (j && typeof j === "object" && typeof j.text === "string") s = j.text; } catch (x) { }
          return Promise.resolve(s);
        }
      } catch (e) { }
    }
    var ios = hands();
    if (ios) return ios.postMessage({ op: "read" }).then(function (r) { return typeof r === "string" ? r : (r && r.text) || ""; });
    if (navigator.clipboard && navigator.clipboard.readText) return navigator.clipboard.readText();
    return Promise.reject(new Error("no clipboard"));
  };
  /* puts text on the device's clipboard */
  CB.write = function (text) {
    text = text === null || text === undefined ? "" : String(text);
    if (window.__lakayDesk) return viaShell("write", text).then(function () { return true; }, function () { return legacy(text); });
    var api = desk();
    if (api && typeof api.write_clipboard === "function") return api.write_clipboard(text).then(function (r) { if (!r || !r.ok) return legacy(text); return true; }, function () { return legacy(text); });
    if (window.EmporiumHost && typeof window.EmporiumHost.writeClipboard === "function") { try { if (window.EmporiumHost.writeClipboard(text)) return Promise.resolve(true); } catch (e) { } }
    var ios = hands();
    if (ios) return ios.postMessage({ op: "write", text: text, html: "" }).then(function () { return true; }, function () { return legacy(text); });
    if (legacy(text)) return Promise.resolve(true);
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; });
    return Promise.resolve(false);
  };
  function legacy(text) {
    /* the browser's own copy needs a field of its own for a moment; the focus and the selection go straight back */
    var act = document.activeElement, sel = window.getSelection(), ranges = [], span = null, ok = false;
    try { for (var i = 0; i < sel.rangeCount; i++) ranges.push(sel.getRangeAt(i).cloneRange()); } catch (e) { }
    try { if (act && (act.tagName === "INPUT" || act.tagName === "TEXTAREA")) span = [act.selectionStart, act.selectionEnd]; } catch (e) { }
    try {
      var ta = h("textarea", { readonly: "" }); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove();
    } catch (e) { ok = false; }
    try {
      if (act && act !== document.body && act.focus) act.focus({ preventScroll: true });
      if (span && typeof span[0] === "number") act.setSelectionRange(span[0], span[1]);
      else if (ranges.length) { sel.removeAllRanges(); ranges.forEach(function (r) { sel.addRange(r); }); }
    } catch (e) { }
    return ok;
  }

  /* ---------- the edit menu of the Offline Project (Carpe Diem's, as Ingenium carries it), built into Lakay ----------
     It opens only where there is something to edit or copy: in a field, or on chosen text. A right press anywhere else
     opens nothing, so nothing covers the page for no reason. */
  function isField(n) { return n && n.nodeType === 1 && (n.tagName === "TEXTAREA" || (n.tagName === "INPUT" && !/^(checkbox|radio|button|submit|reset|file|range|color|hidden|image)$/i.test(n.type || "text")) || n.isContentEditable === true); }
  function fieldOf(n) {
    while (n && n !== document.body && n !== document.documentElement) {
      if (isField(n)) {
        /* inside rich text (a sticky note's bold words, its list) the field is the whole editable area, not one mark of it */
        if (n.isContentEditable === true) while (n.parentNode && n.parentNode.nodeType === 1 && n.parentNode.isContentEditable === true) n = n.parentNode;
        return n;
      }
      n = n.parentNode;
    }
    return null;
  }
  function hasSel() { try { var s = window.getSelection(); return !!(s && !s.isCollapsed && String(s).length); } catch (e) { return false; } }
  function selectionIn(t) {
    if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") { try { var a = t.selectionStart, b = t.selectionEnd; return (typeof a === "number" && b > a) ? t.value.substring(a, b) : ""; } catch (e) { return ""; } }
    try { var sl = window.getSelection(); if (sl && sl.rangeCount && t.contains(sl.anchorNode)) return String(sl); } catch (e) { }
    return "";
  }
  function fieldText(t) { return (t.tagName === "TEXTAREA" || t.tagName === "INPUT") ? (t.value || "") : (t.innerText || ""); }
  function tell(t) { try { t.dispatchEvent(new Event("input", { bubbles: true })); t.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) { } }
  function insertText(t, txt) {
    if (!t || txt === null || txt === undefined) return;
    txt = String(txt);
    if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") {
      t.focus();
      var a = typeof t.selectionStart === "number" ? t.selectionStart : t.value.length, b = typeof t.selectionEnd === "number" ? t.selectionEnd : a;
      if (t.maxLength > 0) txt = txt.slice(0, Math.max(0, t.maxLength - (t.value.length - (b - a))));
      try { t.setRangeText(txt, a, b, "end"); } catch (e) { t.value = t.value.slice(0, a) + txt + t.value.slice(b); }
      tell(t); return;
    }
    t.focus(); var ok = false;
    try { ok = document.execCommand("insertText", false, txt); } catch (e) { }
    if (ok) tell(t);
  }
  var APPLE = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "") || /Mac OS X|iPhone|iPad/.test(navigator.userAgent || "");
  function key(k, shift) { return APPLE ? (shift ? "⇧" : "") + "⌘" + k : "Ctrl+" + (shift ? "Shift+" : "") + k; }

  var menu = null, target = null, saved = null, swallow = 0;
  function close() { if (menu && menu.parentNode) menu.parentNode.removeChild(menu); menu = null; }
  function note(text) { var n = menu && menu.querySelector(".cd-em-note"); if (n) { n.textContent = text; setTimeout(function () { if (n.textContent === text) n.textContent = ""; }, 3200); } }
  function place(x, y) {
    var w = menu.offsetWidth, hh = menu.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    menu.style.left = Math.max(6, Math.min(x, vw - w - 10)) + "px";
    menu.style.top = Math.max(6, Math.min(y, vh - hh - 10)) + "px";
    menu.style.transformOrigin = (x > vw - w - 10 ? "right" : "left") + " " + (y > vh - hh - 10 ? "bottom" : "top");
  }
  function build(rows) {
    close();
    menu = h("div#cd-em-menu", { role: "menu", "aria-label": t("ctx.label") });
    rows.forEach(function (it) {
      if (it.sep) { menu.appendChild(h("div.cd-em-sep", { role: "separator" })); return; }
      var b = h("button.cd-em-row" + (it.danger ? ".cd-em-danger" : ""), { type: "button", role: "menuitem" },
        [h("span", null, it.label), it.hint ? h("span.cd-em-hint", null, it.hint) : null]);
      if (it.off) b.setAttribute("aria-disabled", "true");
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function (e) { e.stopPropagation(); if (b.getAttribute("aria-disabled") === "true") return; try { it.act(); } catch (x) { } if (!it.keepOpen) close(); });
      menu.appendChild(b);
    });
    menu.appendChild(h("div.cd-em-note", { role: "status" }));
    document.body.appendChild(menu);
  }
  function paste(plain) {
    var t0 = target, rg = saved;
    CB.read().then(function (text) {
      if (!text) { note(t("ctx.empty")); return; }
      if (rg && t0.tagName !== "TEXTAREA" && t0.tagName !== "INPUT") { try { t0.focus(); var sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(rg); } catch (e) { } }
      insertText(t0, text); close();
    }, function () { note(t("ctx.pasteKeys", { k: key("V") })); });
  }
  function copy(text, cut) {
    if (!text) return;
    var rg = null;
    if (cut && target && target.tagName !== "TEXTAREA" && target.tagName !== "INPUT") { try { var sl = window.getSelection(); if (sl && sl.rangeCount) rg = sl.getRangeAt(0).cloneRange(); } catch (e) { } }
    CB.write(text);
    if (cut && target) {
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") { var a = target.selectionStart, b = target.selectionEnd; if (b > a) { target.setRangeText("", a, b, "end"); tell(target); } }
      else {
        try {
          target.focus({ preventScroll: true });
          if (rg) { var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(rg); }
          document.execCommand("delete", false, null); tell(target);
        } catch (e) { }
      }
    }
  }
  function openField(x, y, f) {
    target = f; saved = null;
    try { var sl = window.getSelection(); if (sl && sl.rangeCount && f.contains(sl.anchorNode)) saved = sl.getRangeAt(0).cloneRange(); } catch (e) { }
    var chosen = selectionIn(f), secret = f.type === "password", ro = f.readOnly || f.disabled;
    build([
      { label: t("ctx.undo"), hint: key("Z"), act: function () { f.focus(); document.execCommand("undo", false, null); tell(f); }, off: ro },
      { label: t("ctx.redo"), hint: key("Z", true), act: function () { f.focus(); document.execCommand("redo", false, null); tell(f); }, off: ro },
      { sep: true },
      { label: t("ctx.cut"), hint: key("X"), act: function () { copy(selectionIn(f), true); }, off: !chosen || secret || ro },
      { label: t("ctx.copy"), hint: key("C"), act: function () { copy(selectionIn(f)); }, off: !chosen || secret },
      { label: t("ctx.paste"), hint: key("V"), act: function () { paste(false); }, keepOpen: true, off: ro },
      { label: t("ctx.pastePlain"), hint: key("V", true), act: function () { paste(true); }, keepOpen: true, off: ro },
      { sep: true },
      { label: t("ctx.selectAll"), hint: key("A"), act: function () { f.focus(); if (f.select && (f.tagName === "INPUT" || f.tagName === "TEXTAREA")) f.select(); else { var r = document.createRange(); r.selectNodeContents(f); var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(r); } } },
      { label: t("ctx.copyField"), act: function () { copy(fieldText(f)); }, off: secret || !fieldText(f) },
      { label: t("ctx.clearField"), act: function () { if (f.tagName === "INPUT" || f.tagName === "TEXTAREA") f.value = ""; else f.innerText = ""; tell(f); f.focus(); }, danger: true, off: ro || !fieldText(f) }
    ]);
    place(x, y);
  }
  function openSel(x, y) {
    target = null;
    build([
      { label: t("ctx.copy"), hint: key("C"), act: function () { copy(String(window.getSelection() || "")); } },
      { label: t("ctx.selectAll"), hint: key("A"), act: function () { try { var root = document.getElementById("room") || document.body, r = document.createRange(); r.selectNodeContents(root); var s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(r); } catch (e) { } } }
    ]);
    place(x, y);
  }
  function answer(x, y, el) {
    var f = fieldOf(el);
    if (f) { openField(x, y, f); return true; }
    if (hasSel()) { openSel(x, y); return true; }
    return false;
  }
  E.panel = { show: function (x, y, el) { return answer(x, y, el || document.body); }, close: close };

  /* the right press: the menu where there is something to edit or copy, and nothing anywhere else */
  document.addEventListener("contextmenu", function (e) {
    if (menu && menu.contains(e.target)) { e.preventDefault(); return; }
    if (Date.now() < swallow) { e.preventDefault(); return; }
    if (answer(e.clientX, e.clientY, e.target)) { e.preventDefault(); e.stopPropagation(); }
    else close();
  }, true);
  document.addEventListener("pointerdown", function (e) { if (menu && !menu.contains(e.target)) close(); }, true);
  document.addEventListener("keydown", function (e) {
    if (!menu) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    var items = Array.prototype.filter.call(menu.querySelectorAll(".cd-em-row"), function (b) { return b.getAttribute("aria-disabled") !== "true"; }), i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
  }, true);
  window.addEventListener("scroll", close, true);
  window.addEventListener("blur", close);
  window.addEventListener("resize", close);
  /* a long press on a field, on a tablet or a phone, opens the same menu */
  var lp = null, lx = 0, ly = 0;
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return; var tt = e.touches[0], f = fieldOf(e.target); if (!f) return;
    lx = tt.clientX; ly = tt.clientY; clearTimeout(lp);
    lp = setTimeout(function () { lp = null; openField(lx, ly, f); swallow = Date.now() + 700; }, 560);
  }, { passive: true, capture: true });
  ["touchend", "touchcancel"].forEach(function (ev) { document.addEventListener(ev, function () { clearTimeout(lp); lp = null; }, { passive: true, capture: true }); });
  document.addEventListener("touchmove", function (e) { var tt = e.touches[0]; if (tt && Math.abs(tt.clientX - lx) + Math.abs(tt.clientY - ly) > 12) { clearTimeout(lp); lp = null; } }, { passive: true, capture: true });
})();
