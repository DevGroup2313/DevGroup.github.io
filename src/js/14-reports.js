/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Reports: any period, worked out from the sales and stock movements in the books; CSV files for the accountant. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui, money = U.money;
  var R = E.reports = { period: "today", from: null, to: null };
  var PERIODS = ["today", "yesterday", "week", "lastweek", "month", "lastmonth", "year", "custom"];

  R.range = function (p, now) {
    now = now || new Date();
    var k = U.dayKey, ws = E.settings && E.settings.weekStart === 0 ? 0 : 1, y = now.getFullYear(), m = now.getMonth();
    switch (p) {
      case "today": return [k(now), k(now)];
      case "yesterday": var d = U.addDays(now, -1); return [k(d), k(d)];
      case "week": return [k(U.startOfWeek(now, ws)), k(now)];
      case "lastweek": var s = U.addDays(U.startOfWeek(now, ws), -7); return [k(s), k(U.addDays(s, 6))];
      case "month": return [k(new Date(y, m, 1)), k(now)];
      case "lastmonth": return [k(new Date(y, m - 1, 1)), k(new Date(y, m, 0))];
      case "year": return [k(new Date(y, 0, 1)), k(now)];
      default: return [R.from || k(now), R.to || k(now)];
    }
  };

  ui.rooms.reports = function (main) {
    var st = B.state();
    var chips = h("div.chips", { role: "group", "aria-label": t("rep.period") });
    var from = h("input", { type: "date", id: "repFrom", value: R.from || U.dayKey() }), to = h("input", { type: "date", id: "repTo", value: R.to || U.dayKey() });
    var custom = h("div.custom-range" + (R.period === "custom" ? "" : ".hidden"), null, [ui.field("rep.from", from), ui.field("rep.to", to),
      h("button.key", { type: "button", id: "repShow", onclick: function () {
        if (!from.value || !to.value) return;
        R.from = from.value <= to.value ? from.value : to.value; R.to = from.value <= to.value ? to.value : from.value; draw();
      } }, t("rep.show"))]);
    PERIODS.forEach(function (p) {
      chips.appendChild(h("button.chip", { type: "button", "data-p": p, "aria-pressed": String(R.period === p), onclick: function (e) {
        R.period = p; Array.prototype.forEach.call(chips.children, function (x) { x.setAttribute("aria-pressed", String(x === e.currentTarget)); });
        custom.classList.toggle("hidden", p !== "custom");
        if (p === "custom") { R.from = from.value; R.to = to.value; }
        draw();
      } }, t("rep.p." + p)));
    });
    var out = h("div#repOut");
    main.appendChild(ui.roomHead("room.reports", "tip.reports", [
      h("button.key", { type: "button", id: "repCsv", onclick: function () { csvLines(); } }, [ui.emo("📄"), t("rep.csvLines")]),
      h("button.key", { type: "button", id: "repCsvReceipts", onclick: function () { csvReceipts(); } }, [ui.emo("🧾"), t("rep.csvReceipts")]),
      h("button.key", { type: "button", id: "repCsvStock", onclick: function () { csvStock(); } }, [ui.emo("📦"), t("rep.csvStock")]),
      h("button.key", { type: "button", id: "repPrint", onclick: function () { ui.print(build(true)); } }, [ui.emo("🖨️"), t("rep.print")])]));
    main.appendChild(h("div.card.period-card", null, [chips, custom]));
    main.appendChild(out);
    function draw() { U.clear(out); out.appendChild(build(false)); }
    draw();
  };

  function build(forPrint) {
    var st = B.state(), rg = R.range(R.period), r = B.report(rg[0], rg[1]), stock = B.stockSummary();
    var label = rg[0] === rg[1] ? E.fmtDate(U.fromDayKey(rg[0]), "long") : t("rep.range", { a: E.fmtDate(U.fromDayKey(rg[0]), "short"), b: E.fmtDate(U.fromDayKey(rg[1]), "short") });
    var margin = r.net - r.noCost > 0 ? Math.round(r.profit * 1000 / (r.net - r.noCost)) / 10 : null;
    var node = h("div.report" + (forPrint ? ".for-print" : ""), null, [
      forPrint ? h("div.print-head", null, [ui.seal(56), h("div", null, [h("h1", null, st.settings.storeName), h("p", null, t("room.reports") + " · " + label)])]) : h("h2.rep-range", { id: "repRange" }, [ui.emo("📅"), label]),
      h("div.stats", null, [
        ui.stat(t("rep.sales"), String(r.count), null, "rSales", "🧾"), ui.stat(t("rep.items"), String(r.items), null, "rItems", "🛍️"),
        ui.stat(t("rep.net"), money(r.net), null, "rNet", "💵"), ui.stat(t("rep.tax"), money(r.tax), null, "rTax", "🏛️"),
        ui.stat(t("rep.gross"), money(r.gross), null, "rGross", "💰"), ui.stat(t("rep.cogs"), money(r.cogs), null, "rCogs", "🏷️"),
        ui.stat(t("rep.profit") + (margin !== null ? " (" + margin + "%)" : ""), money(r.profit), r.profit < 0 ? "bad" : "good", "rProfit", "📈"),
        ui.stat(t("rep.avg"), r.count ? money(U.divRound(r.gross, r.count)) : "—", null, "rAvg", "⚖️")]),
      r.noCost ? h("p.note", null, [ui.emo("ℹ️"), t("rep.noCostNote", { m: money(r.noCost) })]) : null,
      r.count ? null : h("p.muted", null, [ui.emo("🌙"), " ", t("rep.none")])]);
    if (r.count) {
      var days = Object.keys(r.byDay).sort();
      if (rg[0] !== rg[1]) {
        var maxD = Math.max.apply(null, days.map(function (d) { return r.byDay[d].gross; }).concat([1]));
        node.appendChild(section("📅 " + t("rep.byDay"), table([t("rep.day"), t("rep.sales"), t("rep.gross"), t("rep.profit"), ""], days.map(function (d) {
          var x = r.byDay[d]; return [E.fmtDate(U.fromDayKey(d), "short"), x.count, money(x.gross), money(x.profit), bar(x.gross / maxD)];
        }), [1, 2, 3])));
      }
      var cats = Object.keys(r.byCat).sort(function (a, b) { return r.byCat[b].net - r.byCat[a].net; });
      node.appendChild(section("🗂️ " + t("rep.byCat"), table([t("inv.category"), t("rep.items"), t("rep.net"), t("rep.profit")], cats.map(function (c) {
        var x = r.byCat[c]; return [ui.catEmo(c) + " " + (ui.catName(st.cats[c]) || c), x.qty, money(x.net), money(x.profit)];
      }), [1, 2, 3])));
      var items = Object.keys(r.byItem).map(function (k) { return r.byItem[k]; }).sort(function (a, b) { return b.net - a.net; });
      node.appendChild(section("🏆 " + t("rep.top"), table([t("inv.name"), t("rep.items"), t("rep.net"), t("rep.profit")], items.slice(0, 10).map(function (x) {
        return [x.name, x.qty, money(x.net), money(x.profit)];
      }), [1, 2, 3])));
      var hours = r.byHour.map(function (x, i) { return [i, x]; }).filter(function (p) { return p[1].count; });
      var maxH = Math.max.apply(null, hours.map(function (p) { return p[1].gross; }).concat([1]));
      node.appendChild(section("🕐 " + t("rep.byHour"), table([t("rep.hour"), t("rep.sales"), t("rep.gross"), ""], hours.map(function (p) {
        return [(p[0] < 10 ? "0" : "") + p[0] + ":00", p[1].count, money(p[1].gross), bar(p[1].gross / maxH)];
      }), [1, 2])));
    }
    var sold = {}; Object.keys(r.byItem).forEach(function (k) { sold[k] = 1; });
    var slow = Object.keys(st.items).map(function (k) { return st.items[k]; }).filter(function (it) { return !it.archived && it.stock > 0 && !sold[it.id]; })
      .sort(function (a, b) { return (b.stock * (b.cost || 0)) - (a.stock * (a.cost || 0)); });
    if (slow.length) node.appendChild(section("🐢 " + t("rep.slow"), table([t("inv.name"), t("inv.stock"), t("inv.value")], slow.slice(0, 10).map(function (it) {
      return [it.name, it.stock, it.cost === null ? "—" : money(it.stock * it.cost)];
    }), [1, 2]), t("rep.slowHint")));
    var reasons = Object.keys(r.losses.byReason);
    node.appendChild(section("💔 " + t("rep.losses"), reasons.length ? table([t("ad.reason"), t("rep.items"), t("inv.value")], reasons.map(function (k) {
      var x = r.losses.byReason[k]; return [t("reason." + k), x.qty, money(x.value)];
    }).concat([[t("rep.total"), r.losses.qty, money(r.losses.value)]]), [1, 2]) : h("p.muted", null, t("rep.noLosses")), t("rep.lossesHint")));
    node.appendChild(section("📦 " + t("rep.stockNow"), h("div.stats.small", null, [
      ui.stat(t("rep.atCost"), money(stock.atCost)), ui.stat(t("rep.atPrice"), money(stock.atPrice)), ui.stat(t("rep.units"), String(stock.units)),
      ui.stat(t("rep.received"), t("rep.receivedVal", { n: r.received.qty, m: money(r.received.value) })),
      ui.stat(t("home.lowStock"), String(stock.low.length), stock.low.length ? "warn" : null), ui.stat(t("rep.negative"), String(stock.negative.length), stock.negative.length ? "bad" : null)])));
    node.appendChild(h("p.stamp", { id: "repStamp" }, t("rep.stamp", { b: E.BUILD.number, d: E.fmtDate(new Date(), "short") + " " + E.fmtTime(new Date()), n: st.head.seq, f: st.head.hash.slice(0, 16) })));
    return node;
  }
  function bar(f) { var fill = h("span.bar-fill"); fill.style.width = Math.max(2, Math.round(f * 100)) + "%"; return h("span.bar", { "aria-hidden": "true" }, fill); }
  function section(title, content, hint) { return h("section.card.rep-sec", null, [h("h3", null, title), hint ? h("p.hint", null, hint) : null, content]); }
  function table(head, rows, numCols) {
    numCols = numCols || [];
    return h("div.table-wrap", null, h("table.grid.compact", null, [h("thead", null, h("tr", null, head.map(function (x, i) { return h("th" + (numCols.indexOf(i) >= 0 ? ".num" : ""), null, x); }))),
      h("tbody", null, rows.map(function (row) { return h("tr", null, row.map(function (x, i) { return h("td" + (numCols.indexOf(i) >= 0 ? ".num" : ""), null, x instanceof Node ? x : String(x)); })); }))]));
  }

  /* ---------- CSV: cells that a spreadsheet could take for a formula are written as text ---------- */
  function cell(v) {
    var s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  R.csv = function (rows) { return "﻿" + rows.map(function (r) { return r.map(cell).join(","); }).join("\r\n") + "\r\n"; };
  function rangeSales() { var rg = R.range(R.period); return { rg: rg, list: B.state().sales.filter(function (s) { return s.status === "completed" && s.day >= rg[0] && s.day <= rg[1]; }) }; }
  function fname(kind, rg) { return "Emporium " + kind + " " + rg[0] + (rg[1] !== rg[0] ? " to " + rg[1] : "") + ".csv"; }
  function csvLines() {
    var x = rangeSales(), st = B.state();
    var rows = [["receipt", "date", "time", "cashier", "item", "category", "quantity", "unit_price", "amount", "unit_cost", "cost", "profit", "tax_rate_percent"]];
    x.list.forEach(function (s) {
      var d = new Date(s.at);
      s.lines.forEach(function (l) {
        var cost = l.cost === null ? null : l.cost * l.qty;
        rows.push([s.no, s.day, E.fmtTime(d, true), ui.userName(s.by), l.name, ui.catName(st.cats[l.cat]) || l.cat, l.qty, U.moneyPlain(l.price), U.moneyPlain(l.amount),
          l.cost === null ? "" : U.moneyPlain(l.cost), cost === null ? "" : U.moneyPlain(cost), cost === null ? "" : U.moneyPlain(l.amount - cost), l.rate === null ? "" : (l.rate / 1000).toString()]);
      });
    });
    ui.saveFile(fname("sales lines", x.rg), "text/csv", R.csv(rows)).then(function () { ui.toast(t("rep.saved"), "good"); });
  }
  function csvReceipts() {
    var x = rangeSales();
    var rows = [["receipt", "date", "time", "cashier", "items", "subtotal", "tax", "total", "method", "tendered", "change"]];
    x.list.forEach(function (s) {
      var p = s.pay[0];
      rows.push([s.no, s.day, E.fmtTime(new Date(s.at), true), ui.userName(s.by), s.items, U.moneyPlain(s.subtotal), U.moneyPlain(s.tax), U.moneyPlain(s.total), p.method, U.moneyPlain(p.tendered), U.moneyPlain(p.change)]);
    });
    ui.saveFile(fname("receipts", x.rg), "text/csv", R.csv(rows)).then(function () { ui.toast(t("rep.saved"), "good"); });
  }
  function csvStock() {
    var st = B.state();
    var rows = [["item", "category", "barcode", "sku", "price", "cost", "in_stock", "reorder_at", "value_at_cost", "archived"]];
    Object.keys(st.items).map(function (k) { return st.items[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (it) {
      rows.push([it.name, ui.catName(st.cats[it.cat]) || it.cat, it.barcode || "", it.sku || "", U.moneyPlain(it.price), it.cost === null ? "" : U.moneyPlain(it.cost), it.stock,
        it.reorderAt === null ? "" : it.reorderAt, it.cost === null ? "" : U.moneyPlain(Math.max(0, it.stock) * it.cost), it.archived ? "yes" : "no"]);
    });
    ui.saveFile("Emporium stock " + U.dayKey() + ".csv", "text/csv", R.csv(rows)).then(function () { ui.toast(t("rep.saved"), "good"); });
  }
})();
