/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The finder (Build 15): one index of the store's items, so that a search or a scan stays quick however large the
   inventory grows. It lives beside the books, in memory only, and is never written into them: each item's words for
   searching (its name, barcode and code, without accents), its place in name order, and its codes for a scan. It
   follows each change as it is written, so Inventory, the Register and Price check always find what is there.
   A scanned code finds its item whether the shelf label and the scanner give it as EAN-13, UPC-A, EAN-8 or GTIN-14:
   the same product carries one 14-digit GTIN in all of them. */
"use strict";
(function () {
  var U = E.util, B = E.books;
  var F = E.find = {};
  var ix = null, gen = 0, collator = null, collLang = null;
  function coll() {
    if (!collator || collLang !== E.lang) {
      collLang = E.lang;
      try { collator = new Intl.Collator(E.lang || "en", { sensitivity: "base", numeric: true }); }
      catch (e) { collator = { compare: function (a, b) { return a < b ? -1 : a > b ? 1 : 0; } }; }
    }
    return collator;
  }
  /* the 14-digit GTIN of a numeric product code (8, 12, 13 or 14 digits), or null */
  function gtin(code) { var c = String(code || "").replace(/\s+/g, ""); return /^(\d{8}|\d{12,14})$/.test(c) ? ("00000000000000" + c).slice(-14) : null; }
  F.gtin = gtin;
  function words(it) { return U.norm([it.name, it.barcode || "", it.sku || ""].join(" ")); }
  function codesOf(it) {
    var out = [];
    [it.barcode, it.sku].forEach(function (c) {
      if (!c) return;
      var n = U.norm(c).replace(/\s+/g, ""); if (n) out.push(n);
      var g = gtin(c); if (g) out.push("#" + g);
    });
    return out;
  }
  function cmp(st) { var c = coll(); return function (a, b) { return c.compare(st.items[a].name, st.items[b].name) || (a < b ? -1 : a > b ? 1 : 0); }; }
  function addCodes(id, it) {
    var ks = codesOf(it); ix.keys.set(id, ks);
    ks.forEach(function (k) { var a = ix.codes.get(k); if (!a) ix.codes.set(k, [id]); else if (a.indexOf(id) < 0) a.push(id); });
  }
  function dropCodes(id) {
    (ix.keys.get(id) || []).forEach(function (k) { var a = ix.codes.get(k); if (!a) return; var j = a.indexOf(id); if (j >= 0) a.splice(j, 1); if (!a.length) ix.codes.delete(k); });
    ix.keys.delete(id);
  }
  function build() {
    var st = B.state(); if (!st) { ix = null; return null; }
    ix = { st: st, order: Object.keys(st.items), text: new Map(), codes: new Map(), keys: new Map() };
    ix.order.forEach(function (id) { var it = st.items[id]; ix.text.set(id, words(it)); addCodes(id, it); });
    ix.order.sort(cmp(st));
    gen++;
    return ix;
  }
  function index() { var st = B.state(); if (!st) return null; if (!ix || ix.st !== st || collLang !== E.lang) build(); return ix; }
  /* place one item again after it was added, renamed or given another code */
  function place(id) {
    var st = ix.st, it = st.items[id]; if (!it) return;
    var at = ix.order.indexOf(id); if (at >= 0) ix.order.splice(at, 1);
    dropCodes(id); ix.text.set(id, words(it)); addCodes(id, it);
    var c = cmp(st), lo = 0, hi = ix.order.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (c(ix.order[mid], id) < 0) lo = mid + 1; else hi = mid; }
    ix.order.splice(lo, 0, id);
    gen++;
  }
  B.on("change", function (line) {
    if (!ix || ix.st !== B.state()) { ix = null; return; }
    var d = line.data || {};
    if (line.type === "item.created" && d.item) place(d.item.id);
    else if (line.type === "item.updated" && d.changes && (d.changes.name || d.changes.barcode || d.changes.sku)) place(d.id);
    else gen++;
  });
  B.on("lock", function () { ix = null; gen++; });
  B.on("open", function () { ix = null; gen++; });

  /* the index is made again from the books as they stand (after a backup is brought back, or a large import) */
  F.reset = function () { ix = null; gen++; };
  /* a number that changes whenever what the finder would answer may have changed */
  F.gen = function () { return gen; };
  F.low = function (it) { return it.reorderAt !== null && it.reorderAt !== undefined && it.stock <= it.reorderAt; };
  /* Every item that matches, in name order, as ids. o.q: words, each of which must appear (name, barcode or code);
     o.cat: one department, or "all"; o.show: "active" (in use), "low", "archived" or "any". */
  F.search = function (o) {
    o = o || {};
    var x = index(); if (!x) return [];
    var st = x.st, ws = U.norm(o.q || "").split(/\s+/).filter(Boolean), cat = o.cat && o.cat !== "all" ? o.cat : null, show = o.show || "active";
    var out = [];
    for (var i = 0; i < x.order.length; i++) {
      var id = x.order[i], it = st.items[id]; if (!it) continue;
      if (show === "archived" ? !it.archived : show !== "any" && it.archived) continue;
      if (show === "low" && !F.low(it)) continue;
      if (cat && it.cat !== cat) continue;
      if (ws.length) {
        var tx = x.text.get(id), ok = true;
        for (var w = 0; w < ws.length; w++) if (tx.indexOf(ws[w]) < 0) { ok = false; break; }
        if (!ok) continue;
      }
      out.push(id);
    }
    return out;
  };
  /* The items a scanned or typed code names exactly (its barcode or its own code), those in use first. */
  F.byCode = function (code) {
    var x = index(); if (!x) return [];
    var n = U.norm(code).replace(/\s+/g, ""), g = gtin(code), seen = {}, out = [];
    [n, g ? "#" + g : null].forEach(function (k) { if (!k) return; (x.codes.get(k) || []).forEach(function (id) { if (!seen[id] && x.st.items[id]) { seen[id] = 1; out.push(id); } }); });
    return out.sort(function (a, b) { return (x.st.items[a].archived ? 1 : 0) - (x.st.items[b].archived ? 1 : 0); });
  };
  /* each department's figures, worked out in one pass over the items */
  F.departments = function () {
    var x = index(), st = x ? x.st : null, out = {};
    if (!st) return out;
    Object.keys(st.items).forEach(function (id) {
      var it = st.items[id]; if (it.archived) return;
      var d = out[it.cat] = out[it.cat] || { items: 0, units: 0, atCost: 0, atPrice: 0, low: 0, out: 0 };
      var q = Math.max(0, it.stock);
      d.items++; d.units += q; d.atCost += q * (it.cost || 0); d.atPrice += q * it.price;
      if (F.low(it)) d.low++;
      if (it.stock <= 0) d.out++;
    });
    return out;
  };
})();
