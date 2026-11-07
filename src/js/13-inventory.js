/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Inventory: the list, adding and editing items, receiving stock, correcting stock, archiving, and each item's history. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui, money = U.money;
  var I = E.inventory = { filter: "active", cat: "all", q: "" };

  ui.rooms.inventory = function (main) {
    var st = B.state(), mode = ui.inventoryMode, costs = B.can("costs"); ui.inventoryMode = null;
    if (mode === "receive" && !B.can("receive")) mode = null;
    var search = ui.input({ id: "invSearch", type: "search", placeholder: t("inv.searchPh"), "aria-label": t("inv.search"), value: I.q });
    var catSel = ui.select([["all", t("all")]].concat(ui.cats().map(function (c) { return [c.id, ui.catName(c)]; })), I.cat, { id: "invCat", "aria-label": t("inv.category") });
    var filt = ui.seg([["active", t("inv.f.active")], ["low", t("inv.f.low")], ["archived", t("inv.f.archived")]], I.filter, function (v) { I.filter = v; draw(); }, t("inv.show"));
    var body = h("tbody", { id: "invRows" }), foot = h("p.inv-foot.muted", { id: "invFoot" });
    main.appendChild(ui.roomHead("room.inventory", "tip.inventory", B.can("items") ? [h("button.key.primary", { type: "button", id: "addItem", onclick: function () { I.add(); } }, [ui.emo("🏷️"), t("inv.add")])] : null));
    if (mode === "receive") main.appendChild(h("p.banner", { role: "status" }, [ui.emo("🚚"), t("inv.chooseReceive")]));
    main.appendChild(h("div.toolbar", null, [h("div.search-row", null, [U.icon("search"), search]), catSel, filt]));
    main.appendChild(h("div.table-wrap.card", null, h("table.grid", null, [
      h("thead", null, h("tr", null, [h("th", null, t("inv.name")), h("th", null, t("inv.category")), h("th.num", null, t("inv.price")),
        costs ? h("th.num", null, t("inv.cost")) : null, h("th.num", null, t("inv.stock")), costs ? h("th.num", null, t("inv.value")) : null])), body])));
    main.appendChild(foot);
    search.addEventListener("input", U.debounce(function () { I.q = search.value; draw(); }, 80));
    catSel.addEventListener("change", function () { I.cat = catSel.value; draw(); });
    function draw() {
      U.clear(body);
      var q = U.norm(I.q), list = Object.keys(st.items).map(function (k) { return st.items[k]; }).filter(function (it) {
        if (I.filter === "archived" ? !it.archived : it.archived) return false;
        if (I.filter === "low" && !(it.reorderAt !== null && it.stock <= it.reorderAt)) return false;
        if (I.cat !== "all" && it.cat !== I.cat) return false;
        return !q || U.norm(it.name).indexOf(q) >= 0 || (it.barcode && U.norm(it.barcode).indexOf(q) >= 0) || (it.sku && U.norm(it.sku).indexOf(q) >= 0);
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      var units = 0, value = 0;
      list.forEach(function (it) {
        var low = it.reorderAt !== null && it.stock <= it.reorderAt;
        units += Math.max(0, it.stock); value += Math.max(0, it.stock) * (it.cost || 0);
        body.appendChild(h("tr", null, [
          h("td", null, h("button.row-key", { type: "button", "data-id": it.id, onclick: function () { if (mode === "receive") I.receive(it.id); else I.open(it.id); } }, [ui.emo(ui.catEmo(it.cat)), h("span", null, it.name)])),
          h("td", null, ui.catName(st.cats[it.cat])), h("td.num", null, money(it.price)), costs ? h("td.num", null, it.cost === null ? "—" : money(it.cost)) : null,
          h("td.num", null, h("span.badge" + (it.stock <= 0 ? ".bad" : low ? ".warn" : ".ok"), null, String(it.stock))),
          costs ? h("td.num", null, it.cost === null ? "—" : money(Math.max(0, it.stock) * it.cost)) : null]));
      });
      if (!list.length) body.appendChild(h("tr", null, h("td.muted", { colspan: costs ? "6" : "4" }, Object.keys(st.items).length ? t("inv.noMatch") : t("inv.empty"))));
      foot.textContent = costs ? t("inv.foot", { n: list.length, u: units, v: money(value) }) : t("inv.footNoCost", { n: list.length, u: units });
    }
    draw();
    if (mode === "receive") setTimeout(function () { search.focus(); }, 40);
  };

  /* ---------- adding and editing ---------- */
  I.add = function () { itemForm(null); };
  I.edit = function (id) { itemForm(id); };
  var ERR = { name: "inv.err.name", price: "inv.err.price", cost: "inv.err.cost", reorder: "inv.err.reorder", cat: "inv.err.cat", tax: "inv.err.tax", barcodeTaken: "inv.err.barcode", qty: "inv.err.qty" };
  function itemForm(id) {
    var st = B.state(), it = id ? st.items[id] : null;
    var name = ui.input({ id: "itName", maxlength: "120", value: it ? it.name : "" });
    var cat = ui.select(ui.cats().map(function (c) { return [c.id, ui.catName(c)]; }), it ? it.cat : (I.cat !== "all" ? I.cat : "other"), { id: "itCat" });
    var price = ui.input({ id: "itPrice", inputmode: "decimal", value: it ? U.moneyPlain(it.price) : "" });
    var cost = ui.input({ id: "itCost", inputmode: "decimal", value: it && it.cost !== null ? U.moneyPlain(it.cost) : "" });
    var barcode = ui.input({ id: "itBarcode", maxlength: "64", value: it && it.barcode ? it.barcode : "" });
    var sku = ui.input({ id: "itSku", maxlength: "64", value: it && it.sku ? it.sku : "" });
    var taxes = st.settings.taxes || [];
    var tax = ui.select([["", t("inv.noTax")]].concat(taxes.map(function (x) { return [x.id, x.name + " (" + U.rateText(x.rate) + ")"]; })), it ? (it.taxId || "") : (taxes[0] ? taxes[0].id : ""), { id: "itTax" });
    var reorder = ui.input({ id: "itReorder", inputmode: "numeric", value: it && it.reorderAt !== null ? String(it.reorderAt) : "" });
    var opening = ui.input({ id: "itOpening", inputmode: "numeric", value: "" });
    var notes = h("textarea", { id: "itNotes", rows: "2", maxlength: "500" }); notes.value = it ? it.notes || "" : "";
    var fields = { name: name, price: price, cost: cost, reorder: reorder, cat: cat, tax: tax, barcodeTaken: barcode, qty: opening };
    function read() {
      Object.keys(fields).forEach(function (k) { ui.fieldError(fields[k], ""); });
      var p = U.parseMoney(price.value), c = cost.value.trim() ? U.parseMoney(cost.value) : null, r = reorder.value.trim() ? parseInt(reorder.value, 10) : null;
      var o = opening.value.trim() ? parseInt(opening.value, 10) : 0;
      if (!name.value.trim()) { ui.fieldError(name, t(ERR.name)); return null; }
      if (p === null) { ui.fieldError(price, t(ERR.price)); return null; }
      if (cost.value.trim() && c === null) { ui.fieldError(cost, t(ERR.cost)); return null; }
      if (reorder.value.trim() && !(r >= 0 && String(r) === reorder.value.trim())) { ui.fieldError(reorder, t(ERR.reorder)); return null; }
      if (!it && opening.value.trim() && !(o >= 0 && String(o) === opening.value.trim())) { ui.fieldError(opening, t(ERR.qty)); return null; }
      var f = { name: name.value, cat: cat.value, price: p, cost: c, barcode: barcode.value, sku: sku.value, taxId: tax.value || null, reorderAt: r, notes: notes.value };
      if (!B.can("costs")) { if (it) delete f.cost; else f.cost = null; }
      if (!it) f.openingStock = o;
      return f;
    }
    function save(close, again) {
      var f = read(); if (!f) return false;
      (it ? B.editItem(it.id, f) : B.addItem(f)).then(function (saved) {
        ui.toast(t(it ? "inv.saved" : "inv.added", { name: (saved && saved.name) || f.name }), "good");
        if (again) { [name, price, cost, barcode, sku, reorder, opening].forEach(function (x) { x.value = ""; }); notes.value = ""; name.focus(); ui.refresh(); }
        else { close(); ui.refresh(); }
      }, function (e) {
        var k = e && e.code; if (ERR[k] && fields[k]) ui.fieldError(fields[k], t(ERR[k])); else ui.failed(e);
      });
      return false;
    }
    var priceHint = h("p.hint.margin", { "aria-live": "polite" });
    function margin() { var p = U.parseMoney(price.value), c = U.parseMoney(cost.value); priceHint.textContent = p && c !== null && cost.value.trim() ? t("inv.marginIs", { m: money(p - c), pc: Math.round((p - c) * 100 / p) }) : ""; }
    price.addEventListener("input", margin); cost.addEventListener("input", margin); margin();
    ui.dialog({ title: it ? t("inv.editTitle", { name: it.name }) : t("inv.addTitle"), emoji: it ? "📝" : "🏷️", wide: true, focus: "#itName",
      body: h("form.form-grid", { onsubmit: function (e) { e.preventDefault(); } }, [
        ui.field("inv.name", name, { required: true, cls: "span2" }), ui.field("inv.category", cat, { required: true }), ui.field("inv.tax", tax, { tip: "tip.tax" }),
        ui.field("inv.price", price, { required: true, tip: "tip.price" }), B.can("costs") ? ui.field("inv.cost", cost, { tip: "tip.cost" }) : null, B.can("costs") ? priceHint : null,
        ui.field("inv.barcode", barcode, { tip: "tip.barcode" }), ui.field("inv.sku", sku),
        ui.field("inv.reorder", reorder, { tip: "tip.reorder" }), it ? null : ui.field("inv.opening", opening, { tip: "tip.opening" }),
        ui.field("inv.notes", notes, { cls: "span2" })]),
      actions: [{ label: t("cancel") }].concat(it ? [] : [{ label: t("inv.saveAnother"), id: "itSaveAnother", onClick: function (c) { return save(c, true); } }])
        .concat([{ label: t("save"), kind: "primary", id: "itSave", emoji: "💾", onClick: function (c) { return save(c, false); } }]) });
  }

  /* ---------- an item's card ---------- */
  I.open = function (id) {
    var st = B.state(), it = st.items[id]; if (!it) return;
    var hist = h("ol.history", { id: "itHistory" }, h("li.muted", null, t("loading")));
    var taxN = it.taxId ? (st.settings.taxes || []).find(function (x) { return x.id === it.taxId; }) : null;
    function fact(k, v) { return h("div.fact", null, [h("dt", null, t(k)), h("dd", null, v === null || v === "" || v === undefined ? "—" : v)]); }
    var d = ui.dialog({ title: it.name, emoji: ui.catEmo(it.cat), wide: true, body: [
      h("div.item-top", null, [h("div.big-stock" + (it.stock <= 0 ? ".bad" : it.reorderAt !== null && it.stock <= it.reorderAt ? ".warn" : ""), null, [ui.emo("📦"), h("span", null, t("inv.stock")), h("strong", { id: "itStock" }, String(it.stock))]),
        h("dl.facts", null, [fact("inv.category", ui.catName(st.cats[it.cat])), fact("inv.price", money(it.price)), B.can("costs") ? fact("inv.cost", it.cost === null ? null : money(it.cost)) : null,
          fact("inv.tax", taxN ? taxN.name + " (" + U.rateText(taxN.rate) + ")" : t("inv.noTax")), fact("inv.barcode", it.barcode), fact("inv.sku", it.sku),
          fact("inv.reorder", it.reorderAt === null ? null : String(it.reorderAt)), fact("inv.notes", it.notes), it.archived ? fact("inv.status", t("inv.archived")) : null])]),
      h("div.item-keys", null, [
        B.can("receive") ? h("button.key.primary", { type: "button", id: "itReceive", onclick: function () { d.close(); I.receive(id); } }, [ui.emo("🚚"), t("inv.receive")]) : null,
        B.can("adjust") ? h("button.key", { type: "button", id: "itCorrect", onclick: function () { d.close(); I.correct(id); } }, [ui.emo("✏️"), t("inv.correct")]) : null,
        B.can("items") ? h("button.key", { type: "button", id: "itEdit", onclick: function () { d.close(); I.edit(id); } }, [ui.emo("📝"), t("inv.edit")]) : null,
        B.can("items") ? h("button.key", { type: "button", id: "itArchive", onclick: function () {
          B.setArchived(id, !it.archived).then(function () { d.close(); ui.toast(t(it.archived ? "inv.restored" : "inv.archivedNow", { name: it.name }), "good"); ui.refresh(); }, ui.failed);
        } }, [ui.emo(it.archived ? "♻️" : "🗄️"), t(it.archived ? "inv.unarchive" : "inv.archive")]) : null, B.can("items") ? ui.tip("tip.archive") : null]),
      h("h3", null, [ui.emo("📜"), " ", t("inv.history")]), hist] });
    B.lines(function (l) { var x = l.data || {}; return (x.item && x.item.id === id) || x.id === id || x.itemId === id || (x.sale && x.sale.lines.some(function (sl) { return sl.itemId === id; })); }).then(function (lines) {
      U.clear(hist);
      lines.slice(0, 200).forEach(function (l) { hist.appendChild(h("li", null, [h("span.h-when", null, ui.time(l.at)), h("span.h-what", null, ui.lineText(l, id)), h("span.h-who.muted", null, ui.userTag(l.by))])); });
      if (!lines.length) hist.appendChild(h("li.muted", null, t("inv.noHistory")));
    });
  };

  /* A ledger line in words. */
  ui.lineText = function (l, itemId) {
    var d = l.data || {}, st = B.state(), costs = B.can("costs");
    switch (l.type) {
      case "item.created": return t("line.created", { n: d.item.stock, p: money(d.item.price) });
      case "item.updated": return Object.keys(d.changes).filter(function (k) { return costs || k !== "cost"; }).map(function (k) {
        var a = d.changes[k][0], b = d.changes[k][1];
        if (k === "price" || k === "cost") { a = a === null ? "—" : money(a); b = b === null ? "—" : money(b); }
        if (k === "cat") { a = ui.catName(st.cats[a]); b = ui.catName(st.cats[b]); }
        if (k === "taxId") { a = a ? t("line.taxed") : t("inv.noTax"); b = b ? t("line.taxed") : t("inv.noTax"); }
        return t("field." + k) + ": " + (a === null || a === "" ? "—" : a) + " → " + (b === null || b === "" ? "—" : b);
      }).join("; ");
      case "item.archived": return t(d.archived ? "line.archived" : "line.restored");
      case "stock.received": return t("line.received", { n: d.qty, c: d.unitCost === null || !costs ? "—" : money(d.unitCost), s: d.stockAfter }) + (d.supplier ? " · " + d.supplier : "") + (d.note ? " · " + d.note : "");
      case "stock.adjusted": return t(d.qty < 0 ? "line.removed" : "line.addedBack", { n: Math.abs(d.qty), r: t("reason." + d.reason), s: d.stockAfter }) + (d.note ? " · " + d.note : "");
      case "sale.completed": {
        var q = 0; d.sale.lines.forEach(function (x) { if (!itemId || x.itemId === itemId) q += x.qty; });
        return t("line.sold", { n: q, no: d.sale.no, m: money(d.sale.total) });
      }
      default: return t("type." + l.type);
    }
  };

  /* ---------- receiving stock ---------- */
  I.receive = function (id) {
    var st = B.state(), it = st.items[id]; if (!it) return;
    var qty = ui.input({ id: "rcQty", inputmode: "numeric" }), cost = ui.input({ id: "rcCost", inputmode: "decimal", value: it.cost !== null ? U.moneyPlain(it.cost) : "" });
    var supplier = ui.input({ id: "rcSupplier", maxlength: "80" }), note = ui.input({ id: "rcNote", maxlength: "200" });
    var preview = h("p.preview", { "aria-live": "polite", id: "rcPreview" });
    function calc() {
      var q = parseInt(qty.value, 10), c = cost.value.trim() && B.can("costs") ? U.parseMoney(cost.value) : null;
      if (!(q > 0) || String(q) !== qty.value.trim()) { preview.textContent = ""; return null; }
      if (cost.value.trim() && B.can("costs") && c === null) { preview.textContent = ""; return null; }
      var after = B.averageCost(it.stock, it.cost, q, c);
      preview.textContent = t("rc.preview", { a: it.stock, b: it.stock + q }) + (c !== null && B.can("costs") ? " " + t("rc.costPreview", { a: it.cost === null ? "—" : money(it.cost), b: money(after) }) : "");
      return { q: q, c: c };
    }
    qty.addEventListener("input", calc); cost.addEventListener("input", calc);
    ui.dialog({ title: t("rc.title", { name: it.name }), emoji: "🚚", focus: "#rcQty",
      body: h("form", { onsubmit: function (e) { e.preventDefault(); } }, [h("p.muted", null, t("rc.now", { n: it.stock })),
        ui.field("rc.qty", qty, { required: true }), B.can("costs") ? ui.field("rc.cost", cost, { tip: "tip.avgCost" }) : null, ui.field("rc.supplier", supplier), ui.field("rc.note", note), preview]),
      actions: [{ label: t("cancel") }, { label: t("rc.save"), kind: "primary", emoji: "📥", id: "rcSave", onClick: function (close, btn) {
        var v = calc();
        if (!v) { if (cost.value.trim() && U.parseMoney(cost.value) === null) ui.fieldError(cost, t("inv.err.cost")); else ui.fieldError(qty, t("inv.err.qty")); return false; }
        btn.disabled = true;
        B.receive(id, v.q, v.c, supplier.value, note.value).then(function (x) { close(); ui.toast(t("rc.done", { n: v.q, name: it.name, s: x.stock }), "good"); ui.refresh(); },
          function (e) { btn.disabled = false; ui.failed(e); });
        return false;
      } }] });
  };

  /* ---------- correcting stock, always with a reason ---------- */
  I.correct = function (id) {
    var st = B.state(), it = st.items[id]; if (!it) return;
    var dir = "remove";
    var qty = ui.input({ id: "adQty", inputmode: "numeric" });
    var reason = ui.select([["", t("ad.chooseReason")]].concat(B.REASONS.map(function (r) { return [r, t("reason." + r)]; })), "", { id: "adReason" });
    var note = ui.input({ id: "adNote", maxlength: "200" });
    var preview = h("p.preview", { "aria-live": "polite", id: "adPreview" });
    function calc() {
      var q = parseInt(qty.value, 10);
      if (!(q > 0) || String(q) !== qty.value.trim()) { preview.textContent = ""; return null; }
      var delta = dir === "remove" ? -q : q;
      preview.textContent = t("rc.preview", { a: it.stock, b: it.stock + delta }) + (dir === "remove" && it.cost !== null && B.can("costs") ? " " + t("ad.valuePreview", { m: money(q * it.cost) }) : "");
      return delta;
    }
    qty.addEventListener("input", calc);
    var seg = ui.seg([["remove", t("ad.remove"), "minus"], ["add", t("ad.add"), "plus"]], dir, function (v) { dir = v; calc(); }, t("ad.direction"));
    ui.dialog({ title: t("ad.title", { name: it.name }), emoji: "✏️", focus: "#adQty",
      body: h("form", { onsubmit: function (e) { e.preventDefault(); } }, [h("p.muted", null, t("rc.now", { n: it.stock })), seg,
        ui.field("ad.qty", qty, { required: true }), ui.field("ad.reason", reason, { required: true, tip: "tip.reason" }), ui.field("ad.note", note, { hint: t("ad.noteHint") }), preview]),
      actions: [{ label: t("cancel") }, { label: t("ad.save"), kind: "primary", emoji: "💾", id: "adSave", onClick: function (close, btn) {
        var delta = calc();
        if (delta === null) { ui.fieldError(qty, t("inv.err.qty")); return false; }
        if (!reason.value) { ui.fieldError(reason, t("ad.needReason")); return false; }
        if (reason.value === "other" && !note.value.trim()) { ui.fieldError(note, t("ad.needNote")); return false; }
        btn.disabled = true;
        B.adjust(id, delta, reason.value, note.value).then(function (x) { close(); ui.toast(t("ad.done", { name: it.name, s: x.stock }), "good"); ui.refresh(); },
          function (e) { btn.disabled = false; ui.failed(e); });
        return false;
      } }] });
  };
})();
