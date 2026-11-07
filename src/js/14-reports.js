/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Reports: any period, worked out from the sales and stock movements in the books; CSV files for the accountant. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui, money = U.money;
  var R = E.reports = { period: "today", from: null, to: null, day: null };
  /* The periods, in three rows a person can read: parts of today; days and weeks; months and years. */
  var GROUPS = [["rep.g.today", ["hour", "morning", "afternoon", "evening", "today"]],
                ["rep.g.days", ["yesterday", "day", "week", "lastweek"]],
                ["rep.g.months", ["month", "lastmonth", "m2", "m3", "m6", "m12", "year", "custom"]]];
  var PERIODS = [].concat.apply([], GROUPS.map(function (g) { return g[1]; }));
  var LABEL = { today: "rep.p.allday" };

  /* The period's days by the store's calendar, its time window when it is part of a day, and a line that names it. */
  R.range = function (p, now) {
    now = now || new Date();
    var k = U.dayKey, ws = E.settings && E.settings.weekStart === 0 ? 0 : 1, y = now.getFullYear(), m = now.getMonth(), d0 = new Date(y, m, now.getDate());
    function at(hh) { return new Date(y, m, now.getDate(), hh).getTime(); }
    function part(a, b) { return { from: k(now), to: k(now), win: { from: a, to: b }, label: t("rep.win", { d: E.fmtDate(now, "long"), a: E.fmtTime(new Date(a)), b: E.fmtTime(new Date(b)) }) }; }
    function days(a, b) { return { from: k(a), to: k(b), win: null, label: k(a) === k(b) ? E.fmtDate(a, "long") : t("rep.range", { a: E.fmtDate(a, "short"), b: E.fmtDate(b, "short") }) }; }
    function months(n) { return days(new Date(y, m - (n - 1), 1), d0); }
    switch (p) {
      case "hour": var h0 = new Date(y, m, now.getDate(), now.getHours()).getTime(); return part(h0, h0 + 3600000);
      case "morning": return part(at(0), at(12));
      case "afternoon": return part(at(12), at(18));
      case "evening": return part(at(18), at(24));
      case "today": return days(d0, d0);
      case "yesterday": var yd = U.addDays(d0, -1); return days(yd, yd);
      case "day": var dd = R.day ? U.fromDayKey(R.day) : U.addDays(d0, -1); return days(dd, dd);
      case "week": return days(U.startOfWeek(now, ws), d0);
      case "lastweek": var s0 = U.addDays(U.startOfWeek(now, ws), -7); return days(s0, U.addDays(s0, 6));
      case "month": return months(1);
      case "lastmonth": return days(new Date(y, m - 1, 1), new Date(y, m, 0));
      case "m2": return months(2);
      case "m3": return months(3);
      case "m6": return months(6);
      case "m12": return months(12);
      case "year": return days(new Date(y, 0, 1), d0);
      default: var f = R.from ? U.fromDayKey(R.from) : d0, to = R.to ? U.fromDayKey(R.to) : d0; return days(f, to);
    }
  };
  function inRange(s, rg) { if (s.status !== "completed" || s.day < rg.from || s.day > rg.to) return false; if (!rg.win) return true; var a = Date.parse(s.at); return a >= rg.win.from && a < rg.win.to; }

  ui.rooms.reports = function (main) {
    var rows = h("div.period-rows");
    var from = h("input", { type: "date", id: "repFrom", value: R.from || U.dayKey() }), to = h("input", { type: "date", id: "repTo", value: R.to || U.dayKey() });
    var custom = h("div.custom-range" + (R.period === "custom" ? "" : ".hidden"), null, [ui.field("rep.from", from), ui.field("rep.to", to),
      h("button.key.primary", { type: "button", id: "repShow", onclick: function () {
        if (!from.value || !to.value) return;
        R.from = from.value <= to.value ? from.value : to.value; R.to = from.value <= to.value ? to.value : from.value; draw();
      } }, t("rep.show"))]);
    /* another day: one day at a time, with a key for the day before and the day after */
    if (!R.day) R.day = U.dayKey(U.addDays(new Date(), -1));
    var dayLabel = h("strong.day-label", { id: "repDayLabel" });
    var dayInput = h("input", { type: "date", id: "repDay", value: R.day, "aria-label": t("rep.pickDay") });
    function setDay(k) { if (!k) return; R.day = k; dayInput.value = k; dayLabel.textContent = E.fmtDate(U.fromDayKey(k), "long"); draw(); }
    var dayRow = h("div.day-step" + (R.period === "day" ? "" : ".hidden"), null, [
      h("button.icon-key", { type: "button", id: "repDayPrev", "aria-label": t("rep.dayPrev"), title: t("rep.dayPrev"), onclick: function () { setDay(U.dayKey(U.addDays(U.fromDayKey(R.day), -1))); } }, U.icon("back")),
      dayLabel,
      h("button.icon-key", { type: "button", id: "repDayNext", "aria-label": t("rep.dayNext"), title: t("rep.dayNext"), onclick: function () {
        var n = U.addDays(U.fromDayKey(R.day), 1); if (U.dayKey(n) <= U.dayKey()) setDay(U.dayKey(n)); } }, U.icon("next")),
      h("label.day-pick", null, [h("span", null, t("rep.pickDay")), dayInput])]);
    dayLabel.textContent = E.fmtDate(U.fromDayKey(R.day), "long");
    dayInput.addEventListener("change", function () { if (dayInput.value) setDay(dayInput.value > U.dayKey() ? U.dayKey() : dayInput.value); });
    GROUPS.forEach(function (g) {
      var chips = h("div.chips", { role: "group", "aria-label": t(g[0]) });
      g[1].forEach(function (p) {
        chips.appendChild(h("button.chip", { type: "button", "data-p": p, "aria-pressed": String(R.period === p), onclick: function (e) {
          R.period = p;
          Array.prototype.forEach.call(rows.querySelectorAll(".chip"), function (x) { x.setAttribute("aria-pressed", String(x === e.currentTarget)); });
          custom.classList.toggle("hidden", p !== "custom"); dayRow.classList.toggle("hidden", p !== "day");
          if (p === "custom") { R.from = from.value; R.to = to.value; }
          draw();
        } }, t(LABEL[p] || "rep.p." + p)));
      });
      rows.appendChild(h("div.period-row", null, [h("span.eyebrow", null, t(g[0])), chips]));
    });
    var out = h("div#repOut");
    main.appendChild(ui.roomHead("room.reports", "tip.reports", [
      h("button.key", { type: "button", id: "repCsv", onclick: function () { csvLines(); } }, [ui.emo("📄"), t("rep.csvLines")]),
      h("button.key", { type: "button", id: "repCsvReceipts", onclick: function () { csvReceipts(); } }, [ui.emo("🧾"), t("rep.csvReceipts")]),
      h("button.key", { type: "button", id: "repCsvStock", onclick: function () { csvStock(); } }, [ui.emo("📦"), t("rep.csvStock")]),
      h("button.key", { type: "button", id: "repPrint", onclick: function () { ui.print(build(true)); } }, [ui.emo("🖨️"), t("rep.print")])]));
    main.appendChild(h("div.card.period-card", null, [rows, dayRow, custom]));
    main.appendChild(out);
    function draw() { U.clear(out); out.appendChild(build(false)); }
    draw();
  };

  function build(forPrint) {
    var st = B.state(), rg = R.range(R.period), r = B.report(rg.from, rg.to, rg.win), stock = B.stockSummary();
    var label = rg.label;
    var margin = r.net - r.noCost > 0 ? Math.round(r.profit * 1000 / (r.net - r.noCost)) / 10 : null;
    var node = h("div.report" + (forPrint ? ".for-print" : ""), null, [
      forPrint ? h("div.print-head", null, [ui.seal(56), h("div", null, [h("h1", null, st.settings.storeName), h("p", null, t("room.reports") + " · " + label)])]) : h("h2.rep-range", { id: "repRange" }, [ui.emo("📅"), label]),
      h("section.card", null, h("div.ledger.eight", null, [
        ui.stat(t("rep.sales"), String(r.count), null, "rSales", "🧾"), ui.stat(t("rep.items"), String(r.items), null, "rItems", "🛍️"),
        ui.stat(t("rep.net"), money(r.net), null, "rNet", "💵"), ui.stat(t("rep.tax"), money(r.tax), null, "rTax", "🏛️"),
        ui.stat(t("rep.gross"), money(r.gross), null, "rGross", "💰"), ui.stat(t("rep.cogs"), money(r.cogs), null, "rCogs", "🏷️"),
        ui.stat(t("rep.profit") + (margin !== null ? " (" + margin + "%)" : ""), money(r.profit), r.profit < 0 ? "bad" : "good", "rProfit", "📈"),
        ui.stat(t("rep.avg"), r.count ? money(U.divRound(r.gross, r.count)) : "—", null, "rAvg", "⚖️")])),
      r.noCost ? h("p.note", null, [ui.emo("ℹ️"), t("rep.noCostNote", { m: money(r.noCost) })]) : null,
      r.count ? null : h("p.muted", null, [ui.emo("🌙"), " ", t("rep.none")])]);
    if (r.count) {
      var days = Object.keys(r.byDay).sort();
      var list = st.sales.filter(function (s) { return inRange(s, rg); }).reverse();
      var shown = list.slice(0, forPrint ? 60 : 150);
      node.appendChild(section("🧾 " + t("rep.tx") + " (" + list.length + ")", h("div.table-wrap", null, h("table.grid.compact.tx", { id: "repTx" }, [
        h("thead", null, h("tr", null, [h("th", null, t("rep.when")), h("th", null, t("rep.receipt")), h("th", null, t("rep.cashier")), h("th.num", null, t("rep.items")), h("th.num", null, t("rep.total"))])),
        h("tbody", null, shown.map(function (s) {
          var d = new Date(s.at), when = (rg.from === rg.to ? "" : E.fmtDate(d, "short") + " ") + E.fmtTime(d);
          return h("tr", null, [h("td", null, when), h("td", null, forPrint ? s.no : h("button.row-key", { type: "button", onclick: function () { E.register.showReceipt(s); } }, [ui.emo("🧾"), h("span", null, s.no)])),
            h("td", null, ui.userName(s.by)), h("td.num", null, String(s.items)), h("td.num", null, money(s.total))]);
        }))])), list.length > shown.length ? t("rep.txMore", { n: list.length - shown.length }) : t("rep.txHint")));
      if (rg.from !== rg.to) {
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
    node.appendChild(section("📦 " + t("rep.stockNow"), h("div.stats-sm", null, [
      ui.stat(t("rep.atCost"), money(stock.atCost)), ui.stat(t("rep.atPrice"), money(stock.atPrice)), ui.stat(t("rep.units"), String(stock.units)),
      ui.stat(t("rep.received"), t("rep.receivedVal", { n: r.received.qty, m: money(r.received.value) })),
      ui.stat(t("home.lowStock"), String(stock.low.length), stock.low.length ? "warn" : null), ui.stat(t("rep.negative"), String(stock.negative.length), stock.negative.length ? "bad" : null)])));
    /* (the line with the build, the time and the ledger fingerprint is no longer printed under the report) */
    return node;
  }
  function bar(f) { var fill = h("span.bar-fill"); fill.style.width = Math.max(2, Math.round(f * 100)) + "%"; return h("span.bar", { "aria-hidden": "true" }, fill); }
  function section(title, content, hint) { return h("section.card.rep-sec", null, [h("p.label-caps", null, title), hint ? h("p.hint", null, hint) : null, content]); }
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
  function rangeSales() { var rg = R.range(R.period); return { rg: rg, list: B.state().sales.filter(function (s) { return inRange(s, rg); }) }; }
  function fname(kind, rg) {
    var hm = function (ms) { var d = new Date(ms); return U.pad2(d.getHours()) + U.pad2(d.getMinutes()); };
    return "Lakay " + kind + " " + rg.from + (rg.to !== rg.from ? " to " + rg.to : "") + (rg.win ? " " + hm(rg.win.from) + "-" + hm(rg.win.to) : "") + ".csv";
  }
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
    ui.saveFile("Lakay stock " + U.dayKey() + ".csv", "text/csv", R.csv(rows)).then(function () { ui.toast(t("rep.saved"), "good"); });
  }
})();
