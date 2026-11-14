/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Inventory (Build 15): the store's departments as real sections, each with its own tab and page (Music, Films,
   Perfume and beauty, Caribbean groceries, Drinks, Haitian patties and food, Money transfers and top-ups, and any the
   owner adds); every list drawn a page at a time from the finder (05-find.js), so a large inventory stays quick;
   a scanned code opens its item anywhere in the room; and the money transfers and top-ups as a service with its own
   log, kept apart from the store's sales. Also: adding and editing items, receiving stock, correcting stock,
   archiving, and each item's history. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui, money = U.money;
  var I = E.inventory = { dept: null, filter: "active", q: "", page: 0, svc: { period: "today", provider: "all", q: "", page: 0 } };
  var PAGE = 50;
  function fmtN(n) { try { return Number(n).toLocaleString(E.lang === "ht" ? "fr" : E.lang); } catch (e) { return String(n); } }
  I.show = function (dept) { I.dept = dept || "all"; I.q = ""; I.page = 0; U.prefSet("invDept", I.dept); if (ui.current === "inventory") draw(true); else ui.go("inventory"); };
  function deptName(id) { if (id === "all") return t("inv.allDepts"); return ui.catName(B.state().cats[id]); }
  function lede(id) { return E.has("dept." + id) ? t("dept." + id) : ""; }
  var roomMain = null, roomMode = null;
  function draw(focusTab) {
    if (!roomMain || !document.body.contains(roomMain)) return;
    var y = window.scrollY; U.clear(roomMain); render(roomMain, roomMode); roomMain.appendChild(ui.footer()); window.scrollTo(0, y);
    if (focusTab) { var tb = document.getElementById("invTab-" + I.dept); if (tb) try { tb.focus({ preventScroll: true }); } catch (e) { } }
  }

  ui.rooms.inventory = function (main) {
    var mode = ui.inventoryMode; ui.inventoryMode = null;
    if (mode === "receive" && !B.can("receive")) mode = null;
    roomMain = main; roomMode = mode;
    render(main, mode);
  };
  function render(main, mode) {
    var st = B.state(), cats = ui.cats(), figs = E.find.departments();
    var dept = I.dept || U.prefGet("invDept", "all");
    if (dept !== "all" && !st.cats[dept]) dept = "all";
    if (mode === "receive" && dept === "services") dept = "all";
    I.dept = dept;
    var keys = [];
    if (B.can("receive") && dept !== "services") keys.push(h("button.key", { type: "button", id: "invReceive", onclick: function () { roomMode = "receive"; draw(); } }, [ui.emo("🚚"), t("inv.receiveKey")]));
    if (B.can("items")) keys.push(h("button.key.primary", { type: "button", id: "addItem", onclick: function () { I.add({ cat: dept }); } }, [ui.emo("🏷️"), t("inv.add")]));
    main.appendChild(ui.roomHead("room.inventory", "tip.inventory", keys));
    if (mode === "receive") main.appendChild(h("p.banner#invReceiving", { role: "status" }, [ui.emo("🚚"), h("span", null, t("inv.chooseReceive")),
      h("button.key.sm", { type: "button", onclick: function () { roomMode = null; draw(); } }, t("inv.receiveDone"))]));

    /* the tabs: every department, each with its count; arrows move between them */
    var tabs = h("div.inv-tabs", { role: "tablist", "aria-label": t("inv.depts") });
    var order = ["all"].concat(cats.map(function (c) { return c.id; }));
    var total = 0; Object.keys(figs).forEach(function (k) { total += figs[k].items; });
    order.forEach(function (id) {
      var n = id === "all" ? total : (figs[id] ? figs[id].items : 0), on = id === dept;
      var tab = h("button.inv-tab#invTab-" + id, { type: "button", role: "tab", "aria-selected": String(on), "aria-controls": "invPanel", tabindex: on ? "0" : "-1", "data-dept": id,
        onclick: function () { I.show(id); } }, [id === "all" ? h("span.dept-jewel.sm", { "aria-hidden": "true" }, U.icon("box")) : ui.deptIcon(id, "sm"),
        h("span.inv-tab-name", null, deptName(id)), id === "services" ? null : h("span.inv-tab-n", null, fmtN(n))]);
      tabs.appendChild(tab);
    });
    tabs.addEventListener("keydown", function (e) {
      var i = order.indexOf(dept), to = null;
      if (e.key === "ArrowRight") to = order[(i + 1) % order.length]; else if (e.key === "ArrowLeft") to = order[(i - 1 + order.length) % order.length];
      else if (e.key === "Home") to = order[0]; else if (e.key === "End") to = order[order.length - 1];
      if (to) { e.preventDefault(); I.show(to); }
    });
    var wrap = h("div.inv-tabs-wrap", null, tabs);
    function edges() { wrap.classList.toggle("more-l", tabs.scrollLeft > 4); wrap.classList.toggle("more-r", tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 4); }
    tabs.addEventListener("scroll", edges, { passive: true });
    window.addEventListener("resize", edges, { passive: true });
    setTimeout(edges, 30);
    main.appendChild(wrap);
    var panel = h("section.inv-panel#invPanel", { role: "tabpanel", "aria-labelledby": "invTab-" + dept });
    main.appendChild(panel);
    if (dept === "all") { overview(panel, figs, cats); itemList(panel, null, mode); }
    else if (dept === "services") { servicesPage(panel); if (figs.services && figs.services.items) itemList(panel, "services", mode, true); }
    else { deptHead(panel, dept, figs[dept]); itemList(panel, dept, mode); }
    setTimeout(function () {
      var tb = document.getElementById("invTab-" + dept);
      if (tb && tabs.scrollWidth > tabs.clientWidth) { var l = tb.offsetLeft - tabs.offsetLeft, r = l + tb.offsetWidth; if (l < tabs.scrollLeft + 24 || r > tabs.scrollLeft + tabs.clientWidth - 24) tabs.scrollLeft = Math.max(0, l - 40); }
      edges();
    }, 0);
    /* a scanned code: its item's card, or its delivery while receiving */
    ui.onScan = function (code, ids) {
      if (!ids.length) { E.scan.unknown(code); return true; }
      act(ids[0], roomMode);
      return true;
    };
  }
  function act(id, mode) { if (mode === "receive" && B.can("receive")) I.receive(id); else I.open(id); }

  /* ---------- All: each department at a glance ---------- */
  function overview(panel, figs, cats) {
    var costs = B.can("costs"), r = B.report(U.dayKey(), U.dayKey());
    panel.appendChild(h("div.inv-depts#invDepts", null, cats.map(function (c) {
      var f = figs[c.id] || { items: 0, units: 0, atCost: 0, low: 0, out: 0 }, svc = c.id === "services";
      var line = svc ? t("dept.svcToday", { n: r.services.count, m: money(r.services.cashIn) }) : t(f.items === 1 ? "dept.figs1" : "dept.figs", { n: fmtN(f.items), u: fmtN(f.units) });
      var marks = svc ? [] : [f.out ? h("span.badge.bad", null, t("dept.out", { n: f.out })) : null, f.low - f.out > 0 ? h("span.badge.warn", null, t("dept.low", { n: f.low - f.out })) : null];
      return h("button.inv-dept", { type: "button", "data-dept": c.id, onclick: function () { I.show(c.id); } }, [ui.deptIcon(c.id, "lg"),
        h("span.inv-dept-t", null, [h("b", null, ui.catName(c)), h("small", null, line)]),
        h("span.inv-dept-m", null, marks.concat([!svc && costs && f.atCost ? h("span.inv-dept-v", null, money(f.atCost)) : null]))]);
    })));
  }

  /* ---------- one department's head: its sign, its words and its figures ---------- */
  function deptHead(panel, dept, f) {
    f = f || { items: 0, units: 0, atCost: 0, low: 0, out: 0 };
    var costs = B.can("costs");
    var stats = [[t("dept.items"), fmtN(f.items)], [t("dept.units"), fmtN(f.units)]];
    if (costs) stats.push([t("dept.atCost"), money(f.atCost)]);
    stats.push([t("dept.lowN"), fmtN(f.low)]);
    panel.appendChild(h("div.inv-dhead", null, [ui.deptIcon(dept, "xl"),
      h("div.inv-dhead-t", null, [h("h2", null, deptName(dept)), lede(dept) ? h("p", null, lede(dept)) : null]),
      h("dl.inv-stats", null, stats.map(function (x) { return h("div", null, [h("dt", null, x[0]), h("dd", null, x[1])]); }))]));
  }

  /* ---------- the list: a page at a time, however many items there are ---------- */
  function itemList(panel, dept, mode, titled) {
    var st = B.state(), costs = B.can("costs");
    var search = ui.input({ id: "invSearch", type: "search", placeholder: dept ? t("inv.searchIn", { d: deptName(dept) }) : t("inv.searchPh"), "aria-label": t("inv.search"), value: I.q, enterkeyhint: "search" });
    var cam = E.scan.cameraKey(function (code) { var ids = E.find.byCode(code); if (ids.length) act(ids[0], roomMode); else E.scan.unknown(code); });
    var filt = ui.seg([["active", t("inv.f.active")], ["low", t("inv.f.low")], ["archived", t("inv.f.archived")]], I.filter, function (v) { I.filter = v; I.page = 0; fill(); }, t("inv.show"));
    var body = h("tbody", { id: "invRows" }), pager = h("nav.inv-pager#invPager", { "aria-label": t("inv.pages") }), foot = h("p.inv-foot.muted", { id: "invFoot" });
    var cols = 3 + (dept ? 0 : 1) + (costs ? 2 : 0);
    if (titled) panel.appendChild(h("h3.inv-sub", null, t("inv.itemsHere")));
    panel.appendChild(h("div.toolbar.inv-tools", null, [h("div.search-row", null, [U.icon("search"), search, cam]), filt]));
    panel.appendChild(h("div.table-wrap.card.inv-table", null, h("table.grid", null, [
      h("thead", null, h("tr", null, [h("th", null, t("inv.name")), dept ? null : h("th", null, t("inv.dept")), h("th.num", null, t("inv.price")),
        costs ? h("th.num", null, t("inv.cost")) : null, h("th.num", null, t("inv.stock")), costs ? h("th.num", null, t("inv.value")) : null])), body])));
    panel.appendChild(h("div.inv-under", null, [foot, pager]));
    search.addEventListener("input", U.debounce(function () { I.q = search.value; I.page = 0; fill(); }, 70));
    search.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      var v = search.value.trim(); if (!v) return;
      var ids = E.find.byCode(v);
      if (ids.length) { act(ids[0], roomMode); search.select(); return; }
      var hits = E.find.search({ q: v, cat: dept || "all", show: I.filter });
      if (hits.length === 1) act(hits[0], roomMode);
      else if (!hits.length && /^\d{6,14}$/.test(v)) E.scan.unknown(v);
    });
    function fill() {
      var ids = E.find.search({ q: I.q, cat: dept || "all", show: I.filter }), n = ids.length, pages = Math.max(1, Math.ceil(n / PAGE));
      if (I.page >= pages) I.page = pages - 1;
      var from = I.page * PAGE, slice = ids.slice(from, from + PAGE);
      U.clear(body);
      slice.forEach(function (id) {
        var it = st.items[id], low = E.find.low(it);
        body.appendChild(h("tr", null, [
          h("td", null, h("button.row-key", { type: "button", "data-id": id, onclick: function () { act(id, roomMode); } }, [ui.deptIcon(it.cat, "xs"), h("span", null, it.name)])),
          dept ? null : h("td.muted", null, ui.catName(st.cats[it.cat])), h("td.num", null, money(it.price)), costs ? h("td.num", null, it.cost === null ? "—" : money(it.cost)) : null,
          h("td.num", null, h("span.badge" + (it.stock <= 0 ? ".bad" : low ? ".warn" : ".ok"), null, fmtN(it.stock))),
          costs ? h("td.num", null, it.cost === null ? "—" : money(Math.max(0, it.stock) * it.cost)) : null]));
      });
      if (!n) body.appendChild(h("tr", null, h("td.muted", { colspan: String(cols) }, Object.keys(st.items).length ? t("inv.noMatch") : t("inv.empty"))));
      /* the figures of everything that matches, not only this page */
      var units = 0, value = 0;
      for (var i = 0; i < n; i++) { var x = st.items[ids[i]]; units += Math.max(0, x.stock); value += Math.max(0, x.stock) * (x.cost || 0); }
      foot.textContent = costs ? t(n === 1 ? "inv.foot1" : "inv.foot", { n: fmtN(n), u: fmtN(units), v: money(value) }) : t(n === 1 ? "inv.footNoCost1" : "inv.footNoCost", { n: fmtN(n), u: fmtN(units) });
      U.clear(pager);
      if (pages > 1) {
        pager.appendChild(h("button.key.sm#invPrev", { type: "button", disabled: I.page === 0 ? "" : null, onclick: function () { I.page--; fill(); search.scrollIntoView({ block: "nearest" }); } }, ["‹ ", t("inv.prev")]));
        pager.appendChild(h("span.inv-page", { "aria-live": "polite" }, t("inv.pageOf", { a: fmtN(from + 1), b: fmtN(Math.min(n, from + PAGE)), n: fmtN(n) })));
        pager.appendChild(h("button.key.sm#invNext", { type: "button", disabled: I.page >= pages - 1 ? "" : null, onclick: function () { I.page++; fill(); search.scrollIntoView({ block: "nearest" }); } }, [t("inv.next"), " ›"]));
      }
    }
    fill();
    if (mode === "receive") setTimeout(function () { try { search.focus({ preventScroll: true }); } catch (e) { } }, 40);
  }

  /* ---------- Money transfers and top-ups: the service and its log ---------- */
  function provName(p) { return t("svc.p." + p); }
  function kindName(k) { return t("svc.k." + k); }
  function inPeriod(v, period) {
    if (period === "all") return true;
    var days = period === "today" ? 0 : period === "week" ? 6 : 29, from = U.dayKey(new Date(Date.now() - days * 86400000));
    return v.day >= from;
  }
  function servicesPage(panel) {
    var reports = B.can("reports"), S = I.svc, r = B.report(U.dayKey(), U.dayKey()).services;
    var k = function (x) { return r.byKind[x] || { count: 0, amount: 0 }; };
    var stats = [[t("svc.sentToday"), t("svc.nm", { n: k("send").count, m: money(k("send").amount) })], [t("svc.paidToday"), t("svc.nm", { n: k("payout").count, m: money(k("payout").amount) })],
      [t("svc.topToday"), t("svc.nm", { n: k("topup").count, m: money(k("topup").amount) })], [t("svc.fees"), money(r.fees)]];
    if (reports) stats.push([t("svc.commission"), money(r.commission)]);
    panel.appendChild(h("div.inv-dhead.svc-head", null, [ui.deptIcon("services", "xl"),
      h("div.inv-dhead-t", null, [h("h2", null, deptName("services")), h("p", null, t("dept.services"))]),
      h("dl.inv-stats", null, stats.map(function (x) { return h("div", null, [h("dt", null, x[0]), h("dd", null, x[1])]); })),
      B.can("sell") ? h("div.inv-dhead-k", null, h("button.key.primary#svcRecord", { type: "button", onclick: function () { I.recordService(); } }, [U.icon("swap"), t("svc.record")])) : null]));
    var period = ui.seg([["today", t("svc.today")], ["week", t("svc.week")], ["month", t("svc.month")], ["all", t("svc.all")]], S.period, function (v) { S.period = v; S.page = 0; fill(); }, t("svc.period"));
    var prov = ui.select([["all", t("svc.allProviders")]].concat(B.PROVIDERS.map(function (p) { return [p, provName(p)]; })), S.provider, { id: "svcProvider", "aria-label": t("svc.provider") });
    prov.addEventListener("change", function () { S.provider = prov.value; S.page = 0; fill(); });
    var q = ui.input({ id: "svcSearch", type: "search", placeholder: t("svc.searchPh"), "aria-label": t("svc.search"), value: S.q });
    q.addEventListener("input", U.debounce(function () { S.q = q.value; S.page = 0; fill(); }, 70));
    var sums = h("div.svc-sums#svcSums", { "aria-live": "polite" });
    var body = h("tbody", { id: "svcRows" }), pager = h("nav.inv-pager#svcPager", { "aria-label": t("inv.pages") });
    panel.appendChild(h("div.toolbar.inv-tools", null, [h("div.search-row", null, [U.icon("search"), q]), prov, period]));
    panel.appendChild(sums);
    panel.appendChild(h("div.table-wrap.card.inv-table", null, h("table.grid.svc-table", null, [
      h("thead", null, h("tr", null, [h("th", null, t("svc.when")), h("th", null, t("svc.provider")), h("th", null, t("svc.kind")), h("th.num", null, t("svc.amount")), h("th.num", null, t("svc.fee")),
        reports ? h("th.num", null, t("svc.commission")) : null, h("th", null, t("svc.ref")), h("th", null, t("svc.by")), reports ? h("th", null, h("span.sr-only", null, t("svc.void"))) : null])), body])));
    panel.appendChild(h("div.inv-under", null, [h("p.inv-foot.muted.svc-note", null, t("svc.note")), pager]));
    function fill() {
      var qq = U.norm(S.q), list = B.services(function (v) {
        return inPeriod(v, S.period) && (S.provider === "all" || v.provider === S.provider) && (!qq || U.norm(v.ref + " " + v.note).indexOf(qq) >= 0);
      }).reverse();
      var n = list.length, pages = Math.max(1, Math.ceil(n / PAGE)); if (S.page >= pages) S.page = pages - 1;
      var from = S.page * PAGE, cin = 0, cout = 0, fees = 0, com = 0, done = 0;
      list.forEach(function (v) { if (v.status === "void") return; var c = B.svcCash(v); cin += c.cashIn; cout += c.cashOut; fees += v.fee || 0; com += v.commission || 0; done++; });
      U.clear(sums);
      [[t("svc.entries"), fmtN(done)], [t("svc.cashIn"), money(cin)], [t("svc.cashOut"), money(cout)], [t("svc.fees"), money(fees)]].concat(reports ? [[t("svc.commission"), money(com)]] : [])
        .forEach(function (x) { sums.appendChild(h("span.svc-sum", null, [h("small", null, x[0]), h("b", null, x[1])])); });
      U.clear(body);
      list.slice(from, from + PAGE).forEach(function (v) {
        var voided = v.status === "void";
        body.appendChild(h("tr" + (voided ? ".void" : ""), { "data-id": v.id }, [
          h("td", null, ui.time(v.at)), h("td", null, h("span.svc-prov.p-" + v.provider, null, provName(v.provider))),
          h("td", null, [kindName(v.kind), voided ? h("span.badge.bad.svc-voided", { title: v.voidReason || "" }, t("svc.voided")) : null]),
          h("td.num", null, money(v.amount)), h("td.num", null, v.fee ? money(v.fee) : "—"), reports ? h("td.num", null, v.commission === null ? "—" : money(v.commission)) : null,
          h("td.mono", null, v.ref || "—"), h("td.muted", null, ui.userName(v.by)),
          reports ? h("td", null, voided ? null : h("button.key.sm.quiet.svc-void-key", { type: "button", title: t("svc.voidTip"), onclick: function () { voidService(v); } }, t("svc.void"))) : null]));
      });
      if (!n) body.appendChild(h("tr", null, h("td.muted", { colspan: String(reports ? 9 : 7) }, t(B.services().length ? "svc.noMatch" : "svc.none"))));
      U.clear(pager);
      if (pages > 1) {
        pager.appendChild(h("button.key.sm", { type: "button", disabled: S.page === 0 ? "" : null, onclick: function () { S.page--; fill(); } }, ["‹ ", t("inv.prev")]));
        pager.appendChild(h("span.inv-page", null, t("inv.pageOf", { a: fmtN(from + 1), b: fmtN(Math.min(n, from + PAGE)), n: fmtN(n) })));
        pager.appendChild(h("button.key.sm", { type: "button", disabled: S.page >= pages - 1 ? "" : null, onclick: function () { S.page++; fill(); } }, [t("inv.next"), " ›"]));
      }
    }
    fill();
  }
  /* recording one: the provider, what kind, the amounts and the provider's reference; never the customer's name */
  I.recordService = function () {
    if (!B.can("sell")) return;
    var reports = B.can("reports"), provider = "ria", kind = "send";
    var amount = ui.input({ id: "svcAmount", inputmode: "decimal", class: "money-in" }), fee = ui.input({ id: "svcFee", inputmode: "decimal" }), com = ui.input({ id: "svcCom", inputmode: "decimal" });
    var ref = ui.input({ id: "svcRef", maxlength: "40", "data-scan-field": "" }), note = ui.input({ id: "svcNote", maxlength: "200" });
    var preview = h("p.preview#svcPreview", { "aria-live": "polite" });
    var kinds = ui.seg(B.SVC_KINDS.map(function (x) { return [x, kindName(x)]; }), kind, function (v) { kind = v; calc(); }, t("svc.kind"));
    var provs = ui.seg(B.PROVIDERS.map(function (x) { return [x, provName(x)]; }), provider, function (v) {
      provider = v;
      if (v === "boss" && kind !== "topup") { kind = "topup"; Array.prototype.forEach.call(kinds.children, function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-v") === "topup")); }); }
      calc();
    }, t("svc.provider"));
    provs.id = "svcProviders"; kinds.id = "svcKinds";
    function calc() {
      var a = U.parseMoney(amount.value), f = fee.value.trim() ? U.parseMoney(fee.value) : 0;
      if (a === null || !(a > 0) || f === null) { preview.textContent = ""; return null; }
      var c = B.svcCash({ kind: kind, amount: a, fee: f });
      preview.textContent = c.cashOut ? t("svc.previewOut", { m: money(c.cashOut), f: money(f) }) : t("svc.previewIn", { m: money(c.cashIn), a: money(a), f: money(f) });
      return { a: a, f: f };
    }
    [amount, fee].forEach(function (x) { x.addEventListener("input", calc); });
    ui.dialog({ title: t("svc.recordTitle"), emoji: "💱", wide: true, focus: "#svcAmount",
      body: h("form.form-grid", { onsubmit: function (e) { e.preventDefault(); } }, [
        h("div.field.span2", null, [h("div.label-row", null, h("span.label", null, t("svc.provider"))), provs]),
        h("div.field.span2", null, [h("div.label-row", null, h("span.label", null, t("svc.kind"))), kinds]),
        ui.field("svc.amount", amount, { required: true, tip: "tip.svcAmount" }), ui.field("svc.fee", fee, { hint: t("svc.feeHint") }),
        reports ? ui.field("svc.commission", com, { tip: "tip.svcCommission" }) : null, ui.field("svc.ref", ref, { hint: t("svc.refHint") }),
        ui.field("svc.noteL", note, { cls: reports ? "span2" : null }), h("div.span2", null, [preview, h("p.hint.svc-privacy", null, t("svc.privacy"))])]),
      actions: [{ label: t("cancel") }, { label: t("svc.save"), kind: "primary", emoji: "💾", id: "svcSave", onClick: function (close, btn) {
        var v = calc();
        if (!v) { if (fee.value.trim() && U.parseMoney(fee.value) === null) ui.fieldError(fee, t("svc.err.money")); else ui.fieldError(amount, t("svc.err.amount")); return false; }
        var c = null;
        if (reports && com.value.trim()) { c = U.parseMoney(com.value); if (c === null) { ui.fieldError(com, t("svc.err.money")); return false; } }
        btn.disabled = true;
        B.recordService({ provider: provider, kind: kind, amount: v.a, fee: v.f, commission: c, ref: ref.value, note: note.value }).then(function () {
          close(); ui.toast(t("svc.done", { what: kindName(kind), p: provName(provider), m: money(v.a) }), "good"); if (ui.current === "inventory") draw(); else ui.refresh();
        }, function (e) { btn.disabled = false; ui.failed(e); });
        return false;
      } }] });
  };
  function voidService(v) {
    var reason = ui.input({ id: "svcVoidWhy", maxlength: "200" });
    ui.dialog({ title: t("svc.voidTitle"), emoji: "🚫", focus: "#svcVoidWhy",
      body: h("form", { onsubmit: function (e) { e.preventDefault(); } }, [h("p", null, t("svc.voidWhat", { what: kindName(v.kind), p: provName(v.provider), m: money(v.amount), when: ui.time(v.at) })),
        ui.field("svc.voidWhy", reason, { required: true, hint: t("svc.voidHint") })]),
      actions: [{ label: t("cancel") }, { label: t("svc.void"), kind: "danger", id: "svcVoidSave", onClick: function (close, btn) {
        if (!reason.value.trim()) { ui.fieldError(reason, t("svc.err.reason")); return false; }
        btn.disabled = true;
        B.voidService(v.id, reason.value).then(function () { close(); ui.toast(t("svc.voidedNow"), "good"); draw(); }, function (e) { btn.disabled = false; ui.failed(e); });
        return false;
      } }] });
  }

  /* ---------- adding and editing ---------- */
  /* o.barcode: a code just scanned; o.cat: the department to start in; after saving at the Register, the new item goes
     straight onto the ticket */
  I.add = function (o) { itemForm(null, o || {}); };
  I.edit = function (id) { itemForm(id, {}); };
  var ERR = { name: "inv.err.name", price: "inv.err.price", cost: "inv.err.cost", reorder: "inv.err.reorder", cat: "inv.err.cat", tax: "inv.err.tax", barcodeTaken: "inv.err.barcode", qty: "inv.err.qty" };
  function itemForm(id, o) {
    var st = B.state(), it = id ? st.items[id] : null;
    var startCat = it ? it.cat : (o.cat && o.cat !== "all" && st.cats[o.cat] ? o.cat : (I.dept && I.dept !== "all" && I.dept !== "services" && st.cats[I.dept] ? I.dept : "other"));
    var name = ui.input({ id: "itName", maxlength: "120", value: it ? it.name : "" });
    var cat = ui.select(ui.cats().map(function (c) { return [c.id, ui.catName(c)]; }), startCat, { id: "itCat" });
    var price = ui.input({ id: "itPrice", inputmode: "decimal", value: it ? U.moneyPlain(it.price) : "" });
    var cost = ui.input({ id: "itCost", inputmode: "decimal", value: it && it.cost !== null ? U.moneyPlain(it.cost) : "" });
    var barcode = ui.input({ id: "itBarcode", maxlength: "64", value: it && it.barcode ? it.barcode : (o.barcode || ""), "data-scan-field": "", inputmode: "text" });
    var cam = E.scan.cameraKey(function (code) { barcode.value = code; barcode.dispatchEvent(new Event("input", { bubbles: true })); }, t("scan.cameraBarcode"));
    var sku = ui.input({ id: "itSku", maxlength: "64", value: it && it.sku ? it.sku : "" });
    var taxes = st.settings.taxes || [];
    var tax = ui.select([["", t("inv.noTax")]].concat(taxes.map(function (x) { return [x.id, x.name + " (" + U.rateText(x.rate) + ")"]; })), it ? (it.taxId || "") : (taxes[0] ? taxes[0].id : ""), { id: "itTax" });
    var reorder = ui.input({ id: "itReorder", inputmode: "numeric", value: it && it.reorderAt !== null ? String(it.reorderAt) : "" });
    var opening = ui.input({ id: "itOpening", inputmode: "numeric", value: "" });
    var notes = h("textarea", { id: "itNotes", rows: "2", maxlength: "500" }); notes.value = it ? it.notes || "" : "";
    var fields = { name: name, price: price, cost: cost, reorder: reorder, cat: cat, tax: tax, barcodeTaken: barcode, qty: opening };
    /* a barcode another item already has is said at once, before saving */
    var taken = h("p.hint.warn-text#itBarcodeTaken", { "aria-live": "polite" });
    barcode.addEventListener("input", function () {
      var others = E.find.byCode(barcode.value).filter(function (x) { return x !== id && !st.items[x].archived; });
      taken.textContent = barcode.value.trim() && others.length ? t("inv.barcodeIs", { name: st.items[others[0]].name }) : "";
    });
    function read() {
      Object.keys(fields).forEach(function (k) { ui.fieldError(fields[k], ""); });
      var p = U.parseMoney(price.value), c = cost.value.trim() ? U.parseMoney(cost.value) : null, r = reorder.value.trim() ? parseInt(reorder.value, 10) : null;
      var op = opening.value.trim() ? parseInt(opening.value, 10) : 0;
      if (!name.value.trim()) { ui.fieldError(name, t(ERR.name)); return null; }
      if (p === null) { ui.fieldError(price, t(ERR.price)); return null; }
      if (cost.value.trim() && c === null) { ui.fieldError(cost, t(ERR.cost)); return null; }
      if (reorder.value.trim() && !(r >= 0 && String(r) === reorder.value.trim())) { ui.fieldError(reorder, t(ERR.reorder)); return null; }
      if (!it && opening.value.trim() && !(op >= 0 && String(op) === opening.value.trim())) { ui.fieldError(opening, t(ERR.qty)); return null; }
      var f = { name: name.value, cat: cat.value, price: p, cost: c, barcode: barcode.value, sku: sku.value, taxId: tax.value || null, reorderAt: r, notes: notes.value };
      if (!B.can("costs")) { if (it) delete f.cost; else f.cost = null; }
      if (!it) f.openingStock = op;
      return f;
    }
    function save(close, again) {
      var f = read(); if (!f) return false;
      (it ? B.editItem(it.id, f) : B.addItem(f)).then(function (saved) {
        ui.toast(t(it ? "inv.saved" : "inv.added", { name: (saved && saved.name) || f.name }), "good");
        var toTicket = !it && saved && ui.current === "register" && B.can("sell") && E.register && E.register.add;
        if (again) { [name, price, cost, barcode, sku, reorder, opening].forEach(function (x) { x.value = ""; }); notes.value = ""; taken.textContent = ""; name.focus(); }
        else close();
        if (toTicket) E.register.add(saved.id);
        if (ui.current === "inventory") draw(); else if (!toTicket) ui.refresh();
      }, function (e) {
        var k = e && e.code; if (ERR[k] && fields[k]) ui.fieldError(fields[k], t(ERR[k])); else ui.failed(e);
      });
      return false;
    }
    var priceHint = h("p.hint.margin", { "aria-live": "polite" });
    function margin() { var p = U.parseMoney(price.value), c = U.parseMoney(cost.value); priceHint.textContent = p && c !== null && cost.value.trim() ? t("inv.marginIs", { m: money(p - c), pc: Math.round((p - c) * 100 / p) }) : ""; }
    price.addEventListener("input", margin); cost.addEventListener("input", margin); margin();
    var bField = ui.field("inv.barcode", barcode, { tip: "tip.barcode", after: cam });
    bField.appendChild(taken);
    ui.dialog({ title: it ? t("inv.editTitle", { name: it.name }) : t("inv.addTitle"), emoji: it ? "📝" : "🏷️", wide: true, focus: o.barcode ? "#itName" : "#itName",
      body: h("form.form-grid", { onsubmit: function (e) { e.preventDefault(); } }, [
        ui.field("inv.name", name, { required: true, cls: "span2" }), ui.field("inv.dept", cat, { required: true }), ui.field("inv.tax", tax, { tip: "tip.tax" }),
        ui.field("inv.price", price, { required: true, tip: "tip.price" }), B.can("costs") ? ui.field("inv.cost", cost, { tip: "tip.cost" }) : null, B.can("costs") ? priceHint : null,
        bField, ui.field("inv.sku", sku),
        ui.field("inv.reorder", reorder, { tip: "tip.reorder" }), it ? null : ui.field("inv.opening", opening, { tip: "tip.opening" }),
        ui.field("inv.notes", notes, { cls: "span2" })]),
      actions: [{ label: t("cancel") }].concat(it ? [] : [{ label: t("inv.saveAnother"), id: "itSaveAnother", onClick: function (c) { return save(c, true); } }])
        .concat([{ label: t("save"), kind: "primary", id: "itSave", emoji: "💾", onClick: function (c) { return save(c, false); } }]) });
    if (o.barcode) barcode.dispatchEvent(new Event("input", { bubbles: true }));
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
