/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The panel of the right press, as in Ingenium and the rest of the Offline Project: Undo, Redo, Cut, Copy, Paste, Paste as
   plain text and Select all, on any field or chosen text, everywhere in the app (a long press on a tablet or a phone).
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
      try { var s = window.EmporiumHost.readClipboard(); if (s !== null && s !== undefined) return Promise.resolve(String(s)); } catch (e) { }
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
    try { var ta = h("textarea", { readonly: "" }); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0"; document.body.appendChild(ta); ta.select();
      var ok = document.execCommand("copy"); ta.remove(); return ok; } catch (e) { return false; }
  }

  /* ---------- what was pressed: a field, a piece of chosen text, or nothing to edit ---------- */
  function editableOf(n) {
    while (n && n !== document.body) {
      if (n.nodeType === 1) {
        if (n.tagName === "TEXTAREA") return n;
        if (n.tagName === "INPUT" && /^(text|search|password|number|email|tel|url|date|time)?$/i.test(n.type || "text")) return n;
        if (n.isContentEditable) return n;
      }
      n = n.parentNode;
    }
    return null;
  }
  function fieldSel(ed) { try { return ed.selectionEnd > ed.selectionStart; } catch (e) { return false; } }
  function selText() { try { return String(window.getSelection() || ""); } catch (e) { return ""; } }
  function fieldSelText(ed) { try { return ed.value.slice(ed.selectionStart, ed.selectionEnd); } catch (e) { return ""; } }
  function exec(ed, cmd) { try { if (ed && ed.focus) ed.focus(); } catch (e) { } try { document.execCommand(cmd, false, null); } catch (e) { } try { if (ed) ed.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) { } }
  function insertAt(ed, text) {
    if (!ed || text === null || text === undefined) return;
    if (ed.tagName === "INPUT" || ed.tagName === "TEXTAREA") {
      try {
        var s = ed.selectionStart, en = ed.selectionEnd, v = ed.value; if (s === null) { s = v.length; en = v.length; }
        if (ed.maxLength > 0) text = text.slice(0, Math.max(0, ed.maxLength - (v.length - (en - s))));
        ed.value = v.slice(0, s) + text + v.slice(en); ed.selectionStart = ed.selectionEnd = s + text.length;
        ed.dispatchEvent(new Event("input", { bubbles: true })); ed.focus(); return;
      } catch (e) { }
    }
    try { ed.focus(); document.execCommand("insertText", false, text); ed.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) { }
  }
  var APPLE = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "") || /Mac OS X|iPhone|iPad/.test(navigator.userAgent || "");
  function key(k, shift) { return APPLE ? (shift ? "⇧" : "") + "⌘" + k : "Ctrl+" + (shift ? "Shift+" : "") + k; }

  /* ---------- the panel ---------- */
  var menu = null;
  function close() { if (menu) { menu.remove(); menu = null; } document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", onKey, true); window.removeEventListener("blur", close); }
  function outside(e) { if (menu && !menu.contains(e.target)) close(); }
  function onKey(e) {
    if (!menu) return;
    var items = Array.prototype.filter.call(menu.querySelectorAll("button"), function (b) { return !b.disabled; }), i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
  }
  function note(text) { if (menu) menu.appendChild(h("div.ctx-note", { role: "status" }, text)); }
  E.panel = { show: show, close: close };
  function show(x, y, ed) {
    close();
    var isField = ed && (ed.tagName === "INPUT" || ed.tagName === "TEXTAREA"), readOnly = ed && (ed.readOnly || ed.disabled);
    var chosen = isField ? fieldSelText(ed) : selText(), canCopy = isField ? fieldSel(ed) && ed.type !== "password" : chosen.length > 0;
    var range = null; try { var sl = window.getSelection(); if (sl && sl.rangeCount && !isField) range = sl.getRangeAt(0).cloneRange(); } catch (e) { }
    menu = h("div.ctx", { role: "menu", "aria-label": t("ctx.label") });
    function row(label, k, fn, disabled) {
      menu.appendChild(h("button", { type: "button", role: "menuitem", disabled: disabled ? true : null, onmousedown: function (e) { e.preventDefault(); }, onclick: function (e) {
        e.stopPropagation(); var keep = fn(); if (keep !== true) close();
      } }, [h("span", null, label), k ? h("kbd", null, k) : null]));
    }
    function sep() { menu.appendChild(h("hr")); }
    function paste() {
      CB.read().then(function (text) { if (range && !isField) { try { var sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(range); } catch (e) { } } insertAt(ed, text); close(); },
        function () { note(t("ctx.pasteKeys", { k: key("V") })); });
      return true;
    }
    if (ed && !readOnly) {
      row(t("ctx.undo"), key("Z"), function () { exec(ed, "undo"); });
      row(t("ctx.redo"), key("Z", true), function () { exec(ed, "redo"); });
      sep();
      row(t("ctx.cut"), key("X"), function () { var txt = chosen; CB.write(txt).then(function () { if (isField) insertAt(ed, ""); else exec(ed, "delete"); }); }, !canCopy);
      row(t("ctx.copy"), key("C"), function () { CB.write(chosen); }, !canCopy);
      row(t("ctx.paste"), key("V"), paste);
      row(t("ctx.pastePlain"), key("V", true), paste);
      sep();
      row(t("ctx.selectAll"), key("A"), function () { try { ed.focus(); if (isField) ed.select(); else { var r = document.createRange(); r.selectNodeContents(ed); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } } catch (e) { } });
    } else {
      row(t("ctx.copy"), key("C"), function () { CB.write(chosen); }, !canCopy);
      row(t("ctx.selectAll"), key("A"), function () { try { var root = document.getElementById("room") || document.body, r = document.createRange(); r.selectNodeContents(root); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { } });
    }
    document.body.appendChild(menu);
    var mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(6, Math.min(x, window.innerWidth - mw - 6)) + "px";
    menu.style.top = Math.max(6, Math.min(y, window.innerHeight - mh - 6)) + "px";
    setTimeout(function () { document.addEventListener("pointerdown", outside, true); document.addEventListener("keydown", onKey, true); window.addEventListener("blur", close); }, 0);
    var first = menu.querySelector("button:not([disabled])"); if (first && !(x || y)) first.focus();
  }
  /* the right press, everywhere: the app's own panel always takes the place of the system's */
  document.addEventListener("contextmenu", function (e) {
    if (e.target && e.target.closest && e.target.closest(".ctx")) { e.preventDefault(); return; }
    e.preventDefault();
    show(e.clientX, e.clientY, editableOf(e.target));
  }, true);
  /* a long press on a touch screen opens the same panel */
  var lp = null, lx = 0, ly = 0;
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return; var tt = e.touches[0]; lx = tt.clientX; ly = tt.clientY; var target = e.target;
    clearTimeout(lp); lp = setTimeout(function () { lp = null; var ed = editableOf(target); if (ed || selText()) show(lx, ly, ed); }, 560);
  }, { passive: true, capture: true });
  ["touchend", "touchcancel"].forEach(function (ev) { document.addEventListener(ev, function () { clearTimeout(lp); lp = null; }, { passive: true, capture: true }); });
  document.addEventListener("touchmove", function (e) { var tt = e.touches[0]; if (tt && Math.abs(tt.clientX - lx) + Math.abs(tt.clientY - ly) > 12) { clearTimeout(lp); lp = null; } }, { passive: true, capture: true });
  window.addEventListener("scroll", close, true);
})();
