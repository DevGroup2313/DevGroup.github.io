/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Home (the day at a glance) and the Register (search or scan, the ticket, cash, the receipt). */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui, money = U.money;

  /* A figure in the ledger: a small caps label (with its emoji) over a serif number. */
  function stat(label, value, tone, id, emoji) {
    return h("div.stat" + (tone ? "." + tone : ""), id ? { id: id } : null, [h("span.stat-label", null, [emoji ? ui.emo(emoji) : null, label]), h("span.stat-value", null, value)]);
  }
  ui.stat = stat;
  ui.capsLabel = function (emoji, text) { return h("p.label-caps", null, [emoji ? ui.emo(emoji) : null, text]); };

  /* ---------- Home, after Ingenium's: the hero, the day's figures, the rooms as jewelled keys, the counter ---------- */
  var ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI"];
  ui.rooms.home = function (main) {
    var st = B.state(), today = U.dayKey(), r = B.report(today, today), stock = B.stockSummary(), practice = B.mode === "practice";
    var hr = new Date().getHours(), greet = hr < 12 ? "home.morning" : hr < 18 ? "home.afternoon" : "home.evening";
    var steps = firstStepList(st), done = steps.filter(function (x) { return x[1]; }).length, nextStep = steps.filter(function (x) { return !x[1]; })[0];
    var sealKey = ui.crestKey(88, { cls: "hx-seal-key", id: "heroCrest", rise: true, title: t("crest.press") });
    var me = B.user, staff = !B.isOwner(), sh = B.openShift(me.id);
    var nextBox = staff ? h("div.hx-next", null, [h("span.hx-next-h", null, t("home.yourShift")),
      h("span.hx-step#heroStepNote", null, sh ? (B.onBreak(sh) ? t("clock.onBreak", { t: E.fmtTime(new Date(sh.breaks[sh.breaks.length - 1].from)) }) : t("clock.onSince", { t: E.fmtTime(new Date(sh.in)), d: ui.dur(B.shiftMs(sh)) })) : t("clock.off")),
      h("div.hx-row", null, [B.can("sell") ? h("button.hx-btn.pri#heroNext", { type: "button", onclick: function () { ui.go("register"); } }, [ui.emo("🛒"), t("home.newSale")]) : null,
        h("button.hx-btn", { type: "button", onclick: function () { ui.go("team"); } }, [ui.emo("🕘"), t("team.mine")])]),
      h("div.hx-row", null, [h("button.hx-btn", { type: "button", onclick: ui.statusPanel }, [ui.emo(sh ? "☕" : "🕘"), sh ? t("home.clockKeys") : t("clock.in")])])])
    : h("div.hx-next", null, [h("span.hx-next-h", null, t("home.next")),
      h("span.hx-step#heroStepNote", null, practice ? t("home.practiceNext") : nextStep ? t("home.stepOf", { n: done + 1, of: steps.length, what: t(nextStep[0]) }) : t("home.allSet")),
      h("div.hx-row", null, practice
        ? [h("button.hx-btn.pri#heroNext", { type: "button", onclick: function () { E.door.startReal("app"); } }, [ui.emo("🏠"), t("practice.real")]),
           h("button.hx-btn", { type: "button", onclick: function () { ui.go("register"); } }, [ui.emo("🛒"), t("home.newSale")])]
        : [h("button.hx-btn.pri#heroNext", { type: "button", onclick: nextStep ? nextStep[2] : function () { ui.go("reports"); } }, [ui.emo(nextStep ? "➡️" : "📊"), nextStep ? t(nextStep[0]) : t("home.report")]),
           h("button.hx-btn", { type: "button", onclick: function () { ui.go("register"); } }, [ui.emo("🛒"), t("home.newSale")])]),
      h("div.hx-row", null, [h("button.hx-btn", { type: "button", onclick: function () { ui.go("guide"); } }, [ui.emo("📖"), t("home.readGuide")])])]);
    var now = new Date();
    main.appendChild(h("section.hx", { "aria-label": t("room.home") }, [
      h("header.hx-head.hx-slab", null, [h("div.hx-seal", null, sealKey),
        h("div.hx-htext", null, [h("div.hx-eyebrow", null, [h("h1", null, E.appName()), h("span.hx-date", null, ROMAN[now.getDate()] + " · " + E.fmtDate(now, "long").toUpperCase())]),
          h("p.hx-hello", null, practice && !staff ? t("home.helloPractice") : t(greet, { name: me.name || "" })),
          h("p.hx-lede", null, practice ? t("home.ledePractice") : t("home.ledeReal"))]),
        nextBox]),
      todaySlab(r, stock), workKeys(st, r, stock), counter(st, stock)]));
    ["hxSales", "hxTaken", "hxProfit"].forEach(function (id, i) {
      if (id === "hxProfit" && !B.can("costs")) return;
      var el = main.querySelector("#" + id + " .g-value"); if (el) ui.countUp(el, [r.count, r.gross, r.profit][i], i ? money : String);
    });
  };
  function gauge(id, label, value, tone, note, emoji) {
    return h("div.hx-gauge" + (tone ? "." + tone : ""), { id: id }, [h("span.g-label", null, [ui.emo(emoji), label]), h("span.g-value", null, value), note ? h("span.g-note", null, note) : null]);
  }
  function todaySlab(r, stock) {
    return h("section.hx-today.hx-slab", { "aria-label": t("home.today") }, [
      h("div.hx-sech", null, [h("h2", null, t("home.today")), h("p", null, t("home.todayP")),
        B.can("reports") ? h("button.hx-btn.quiet", { type: "button", onclick: function () { E.reports.period = "today"; ui.go("reports"); } }, t("home.seeAll")) : null]),
      h("div.hx-gauges", null, [gauge("hxSales", t("home.salesToday"), String(r.count), null, null, "🧾"), gauge("hxTaken", t("home.takenToday"), money(r.gross), null, null, "💵"),
        B.can("costs") ? gauge("hxProfit", t("home.profitToday"), money(r.profit), r.profit < 0 ? "bad" : "good", null, "📈") : gauge("hxOnClock", t("clock.nowH"), String(B.onClock().length), null, null, "🕘"),
        gauge("hxLow", t("home.lowStock"), String(stock.low.length), stock.low.length ? "warn" : null, null, "📦")])]);
  }
  function workKeys(st, r, stock) {
    var items = Object.keys(st.items).filter(function (k) { return !st.items[k].archived; }).length, last = U.prefGet("lastBackup", "");
    var keys = [
      ["register", "register", t("key.register.d"), t("km.salesToday", { n: r.count }), null],
      ["inventory", "box", t("key.inventory.d"), t("km.items", { n: items, low: stock.low.length }), stock.low.length ? "warn" : null],
      ["reports", "chart", t("key.reports.d"), t("km.taken", { m: money(r.gross) }), null],
      ["team", "people", t("key.team.d"), t("km.onClock", { n: B.onClock().length }), null],
      ["guide", "book", t("key.guide.d"), t("km.chapters", { n: E.guideCount ? E.guideCount() : 15 }), null],
      ["settings", "gear", t("key.settings.d"), last ? t("km.backup", { d: E.fmtDate(new Date(last), "short") }) : t("km.noBackup"), last ? null : "warn"],
      ["studio", "edit", t("key.studio.d"), t("km.studio"), null]];
    return h("section.hx-work", { "aria-label": t("home.storeH") }, [h("div.hx-sech", null, [h("h2", null, t("home.storeH")), h("p", null, t("home.storeP"))]),
      h("div.hx-keys", null, keys.filter(function (k) { return ui.allowed(k[0]); }).map(function (k) {
        return h("button.hx-key", { type: "button", "data-room": k[0], onclick: function () { ui.go(k[0]); } }, [h("span.hx-jewel", null, U.icon(k[1])),
          h("span.hx-kt", null, [h("span.hx-kh", null, t("room." + k[0])), h("span.hx-kd", null, k[2])]), h("span.hx-km" + (k[4] ? "." + k[4] : ""), null, k[3]), h("span.hx-arrow", { "aria-hidden": "true" }, "›")]);
      }))]);
  }
  function counter(st, stock) {
    var recent = st.sales.slice(-5).reverse();
    var low = h("div.hx-rc", null, [h("div.hx-rch", null, [U.icon("warn"), h("h3", null, t("home.lowTitle")), h("button.hx-btn.quiet", { type: "button", onclick: function () { ui.go("inventory"); } }, t("home.seeAll"))]),
      stock.low.length ? h("ul.hx-list", null, stock.low.slice(0, 5).map(function (it) {
        return h("li", null, h("button.hx-item", { type: "button", onclick: function () { ui.go("inventory"); } }, [h("span.hx-i-main", null, [ui.emo(ui.catEmo(it.cat)), it.name]),
          h("span.badge" + (it.stock <= 0 ? ".bad" : ".warn"), null, t("inv.inStock", { n: it.stock }))]));
      })) : h("div.hx-empty", null, h("span", null, t("home.lowNone")))]);
    var sales = h("div.hx-rc", null, [h("div.hx-rch", null, [U.icon("receipt"), h("h3", null, t("home.recentTitle")), B.can("reports") ? h("button.hx-btn.quiet", { type: "button", onclick: function () { ui.go("reports"); } }, t("home.seeAll")) : null]),
      recent.length ? h("ul.hx-list", null, recent.map(function (x) {
        return h("li", null, h("button.hx-item", { type: "button", onclick: function () { E.register.showReceipt(x); } }, [h("span.hx-i-main", null, x.no + " · " + ui.time(x.at)), h("span.num", null, money(x.total))]));
      })) : h("div.hx-empty", null, [h("span", null, t("home.recentNone")), h("button.hx-btn", { type: "button", onclick: function () { ui.go("register"); } }, t("home.newSale"))])]);
    return h("section.hx-recent.hx-slab", { "aria-label": t("home.counterH") }, [h("div.hx-sech", null, [h("h2", null, t("home.counterH")), h("p", null, t("home.counterP"))]),
      h("div.hx-rcols", null, [low, sales, proverbCard()])]);
  }
  function quickKey(emoji, key, fn, kind) { return h("button.key" + (kind ? "." + kind : ""), { type: "button", onclick: fn }, [ui.emo(emoji), t(key)]); }
  ui.quickKey = quickKey;

  /* A Haitian proverb for the day: the Kreyòl as it is said, with its meaning in the language of the screen. */
  var PROVERBS = ["piti", "mon", "men", "sak", "woch", "lespwa", "mapou", "kreyol"];
  function proverbCard() {
    var now = new Date(), day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000), k = PROVERBS[day % PROVERBS.length];
    return h("div.hx-rc", { "aria-label": t("prov.label") }, [h("div.hx-rch", null, [U.icon("info"), h("h3", null, t("prov.label"))]),
      h("div.hx-proverb", null, [h("span.pv-mark", { "aria-hidden": "true" }, "“"), h("p.pv-ht", { lang: "ht" }, E.dict.ht["prov." + k]),
        E.lang === "ht" ? null : h("p.pv-tr", null, t("prov." + k + ".m"))])]);
  }

  function firstStepList(st) {
    var items = Object.keys(st.items).length;
    return [
      ["first.tax", (st.settings.taxes || []).length > 0 || U.prefGet("taxSkipped", "0") === "1", function () { ui.go("settings"); }],
      ["first.items", items > 0, function () { ui.go("inventory"); setTimeout(function () { E.inventory.add(); }, 30); }],
      ["first.receive", st.moves.some(function (m) { return m.kind === "receive"; }) || Object.keys(st.items).some(function (k) { return st.items[k].stock > 0; }), function () { ui.inventoryMode = "receive"; ui.go("inventory"); }],
      ["first.sale", st.sales.length > 0, function () { ui.go("register"); }],
      ["first.backup", !!U.prefGet("lastBackup", ""), function () { ui.go("settings"); }]];
  }

  /* ---------- the Register ---------- */
  var R = E.register = {};
  var ticket = { lines: [] };
  R.ticket = ticket;
  var view = null, fresh = null, lastTotal = null;

  ui.rooms.register = function (main) {
    var st = B.state();
    var cat = "all";
    var search = ui.input({ id: "regSearch", type: "search", placeholder: t("reg.searchPh"), "aria-label": t("reg.search"), enterkeyhint: "enter" });
    var chips = h("div.chips", { role: "group", "aria-label": t("inv.category") });
    var results = h("div.products", { id: "regResults" });
    var lines = h("ul.ticket-lines", { id: "ticketLines", "aria-live": "polite" });
    var totals = h("div.totals", { id: "ticketTotals" });
    var payKey = h("button.key.primary.lg", { type: "button", id: "takeCash", onclick: takeCash }, [ui.emo("💵"), t("reg.takeCash")]);
    view = { search: search, results: results, lines: lines, totals: totals, payKey: payKey };

    [["all", t("all"), "✨"]].concat(ui.cats().map(function (c) { return [c.id, ui.catName(c), ui.catEmo(c.id)]; })).forEach(function (c) {
      chips.appendChild(h("button.chip", { type: "button", "aria-pressed": String(c[0] === cat), onclick: function (e) {
        cat = c[0]; Array.prototype.forEach.call(chips.children, function (x) { x.setAttribute("aria-pressed", String(x === e.currentTarget)); }); draw();
      } }, [ui.emo(c[2]), c[1]]));
    });
    function matches() {
      var q = U.norm(search.value);
      return Object.keys(st.items).map(function (k) { return st.items[k]; }).filter(function (it) {
        if (it.archived) return false;
        if (cat !== "all" && it.cat !== cat) return false;
        if (!q) return true;
        return U.norm(it.name).indexOf(q) >= 0 || (it.barcode && U.norm(it.barcode) === q) || (it.sku && U.norm(it.sku).indexOf(q) >= 0);
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    function draw() {
      U.clear(results);
      var list = matches();
      if (!list.length) { results.appendChild(h("p.muted.empty", null, Object.keys(st.items).length ? t("reg.noMatch") : t("reg.noItems"))); return; }
      list.slice(0, 80).forEach(function (it) {
        var low = it.reorderAt !== null && it.stock <= it.reorderAt;
        results.appendChild(h("button.product", { type: "button", "data-id": it.id, onclick: function (e) { add(it.id); ui.plusOne(e.currentTarget); search.focus(); } }, [
          h("span.p-emo.cat-" + (ui.CAT_EMO[it.cat] ? it.cat : "other"), { "aria-hidden": "true" }, ui.emo(ui.catEmo(it.cat))),
          h("span.p-name", null, it.name), h("span.p-price", null, money(it.price)),
          h("span.p-stock" + (it.stock <= 0 ? ".bad" : low ? ".warn" : ""), null, t("inv.inStock", { n: it.stock }))]));
      });
      if (list.length > 80) results.appendChild(h("p.muted", null, t("reg.more", { n: list.length - 80 })));
    }
    search.addEventListener("input", U.debounce(draw, 80));
    search.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      var q = U.norm(search.value); if (!q) return;
      var exact = Object.keys(st.items).map(function (k) { return st.items[k]; }).filter(function (it) {
        return !it.archived && ((it.barcode && U.norm(it.barcode) === q) || (it.sku && U.norm(it.sku) === q));
      });
      var list = exact.length ? exact : matches();
      if (list.length === 1) { add(list[0].id); search.value = ""; draw(); }
      else if (!list.length) ui.toast(t("reg.notFound", { q: search.value }), "bad");
    });

    main.appendChild(ui.roomHead("room.register", "tip.register", [h("span.kbd-hint", null, t("reg.keys"))]));
    if (B.mode === "practice") main.appendChild(h("div.banner.practice", null, [ui.emo("🧪"), h("span", null, t("reg.practiceBanner")),
      h("button.key.sm", { type: "button", onclick: function () { E.door.startReal("app"); } }, t("practice.real"))]));
    main.appendChild(h("div.register", null, [
      h("section.reg-pick.card", { "aria-label": t("reg.pick") }, [h("div.search-row", null, [U.icon("search"), search]), chips, results]),
      h("aside.reg-ticket.card", { "aria-label": t("reg.ticket") }, [
        h("div.card-head", null, [h("h2", null, [ui.emo("🧾"), t("reg.ticket")]), h("span.kbd-hint", null, ui.dateLong(new Date()))]),
        lines, totals, h("div.pay-row", null, [h("button.key.sm", { type: "button", id: "clearTicket", onclick: clearTicket }, [ui.emo("🧹"), t("reg.clear")]), payKey])])]));
    draw(); drawTicket();
    setTimeout(function () { search.focus(); }, 50);
  };

  function add(id, n) {
    var st = B.state(), it = st.items[id]; if (!it) return;
    var l = ticket.lines.find(function (x) { return x.itemId === id; });
    if (l) l.qty += (n || 1); else ticket.lines.push({ itemId: id, qty: n || 1 });
    var inTicket = (l ? l.qty : (n || 1));
    fresh = l ? null : id;
    if (it.stock - inTicket < 0) ui.toast(t("reg.overStock", { name: it.name, n: Math.max(0, it.stock) }), "warn");
    drawTicket();
  }
  R.add = add;
  function setQty(id, q) {
    var l = ticket.lines.find(function (x) { return x.itemId === id; }); if (!l) return;
    if (!(q >= 1)) ticket.lines = ticket.lines.filter(function (x) { return x !== l; }); else l.qty = Math.min(9999, Math.floor(q));
    drawTicket();
  }
  function drawTicket() {
    if (!view || !document.body.contains(view.lines)) return;
    var st = B.state(), tk = B.priceTicket(ticket.lines);
    U.clear(view.lines); U.clear(view.totals);
    if (!tk.lines.length) view.lines.appendChild(h("li.empty.muted", null, t("reg.emptyTicket")));
    tk.lines.forEach(function (l) {
      var it = st.items[l.itemId];
      var qty = h("input.qty", { type: "number", min: "1", max: "9999", value: String(l.qty), "aria-label": t("reg.qtyOf", { name: l.name }), inputmode: "numeric" });
      qty.addEventListener("change", function () { setQty(l.itemId, parseInt(qty.value, 10)); });
      view.lines.appendChild(h("li.tline" + (l.itemId === fresh ? ".fresh" : ""), null, [
        h("div.t-main", null, [h("span.t-name", null, l.name), h("span.t-unit.muted", null, money(l.price) + (l.taxId ? " · " + t("reg.taxed") : "")),
          it && it.stock - l.qty < 0 ? h("span.t-warn", null, [U.icon("warn"), t("reg.onlyN", { n: Math.max(0, it.stock) })]) : null]),
        h("div.t-qty", null, [
          h("button.icon-key", { type: "button", "aria-label": t("reg.less", { name: l.name }), onclick: function () { setQty(l.itemId, l.qty - 1); } }, U.icon("minus")),
          qty,
          h("button.icon-key", { type: "button", "aria-label": t("reg.more1", { name: l.name }), onclick: function () { setQty(l.itemId, l.qty + 1); } }, U.icon("plus"))]),
        h("span.t-amount.num", null, money(l.amount)),
        h("button.icon-key.danger", { type: "button", "aria-label": t("reg.remove", { name: l.name }), onclick: function () { setQty(l.itemId, 0); } }, U.icon("x"))]));
    });
    view.totals.appendChild(h("div.trow", null, [h("span", null, t("reg.subtotal")), h("span.num", { id: "tSubtotal" }, money(tk.subtotal))]));
    tk.taxes.forEach(function (x) { view.totals.appendChild(h("div.trow", null, [h("span", null, x.name + " (" + U.rateText(x.rate) + ")"), h("span.num", null, money(x.tax))])); });
    var tot = h("span.num", { id: "tTotal" }, money(tk.total));
    view.totals.appendChild(h("div.trow.total", null, [h("span", null, t("reg.total")), tot]));
    if (lastTotal !== null && lastTotal !== tk.total && !ui.still()) tot.classList.add("bump");
    lastTotal = tk.total; fresh = null;
    view.payKey.disabled = !tk.lines.length;
  }
  function clearTicket() {
    if (!ticket.lines.length) return;
    ui.confirm(t("reg.clearT"), t("reg.clearP"), t("reg.clearYes"), "danger").then(function (ok) { if (ok) { ticket.lines = []; R.ticket = ticket; drawTicket(); view.search.focus(); } });
  }

  function takeCash() {
    var tk = B.priceTicket(ticket.lines); if (!tk.lines.length) return;
    var input = ui.input({ id: "cashIn", inputmode: "decimal", class: "money-in", "aria-label": t("cash.received") });
    var changeN = h("p.change", { id: "cashChange", "aria-live": "polite" });
    var quick = h("div.quick-cash", { role: "group", "aria-label": t("cash.quick") });
    var amounts = [tk.total], whole = Math.ceil(tk.total / 100) * 100;
    if (whole !== tk.total) amounts.push(whole);
    [500, 1000, 2000, 5000, 10000].forEach(function (b) { if (b > whole) amounts.push(b); });
    amounts.filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 6).forEach(function (v, i) {
      quick.appendChild(h("button.key.sm", { type: "button", onclick: function () { input.value = U.moneyPlain(v); update(); } }, i === 0 ? t("cash.exact") + " " + money(v) : money(v)));
    });
    var d;
    function update() {
      var c = U.parseMoney(input.value), done = document.getElementById("cashDone");
      if (c === null) { changeN.textContent = input.value ? t("cash.notAmount") : ""; changeN.className = "change"; if (done) done.disabled = true; return; }
      if (c < tk.total) { changeN.textContent = t("cash.short", { m: money(tk.total - c) }); changeN.className = "change bad"; if (done) done.disabled = true; return; }
      changeN.textContent = t("cash.change", { m: money(c - tk.total) }); changeN.className = "change good"; if (done) done.disabled = false;
    }
    input.addEventListener("input", update);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); var b = document.getElementById("cashDone"); if (b && !b.disabled) b.click(); } });
    d = ui.dialog({ title: t("cash.title"), emoji: "💵", focus: "#cashIn",
      body: [h("p.due", null, [h("span", null, t("cash.due")), h("strong.num", { id: "cashDue" }, money(tk.total))]), quick, ui.field("cash.received", input), changeN],
      actions: [{ label: t("cancel") }, { label: t("cash.complete"), kind: "primary", id: "cashDone", disabled: true, emoji: "✅", onClick: function (close, btn) {
        var c = U.parseMoney(input.value); if (c === null || c < tk.total) return false;
        btn.disabled = true;
        B.completeSale(ticket.lines, c).then(function (sale) {
          ticket.lines = []; close(); drawTicket(); ui.celebrate(); R.showReceipt(sale, true);
        }, function (e) { btn.disabled = false; ui.toast(t(e && e.code === "short" ? "cash.shortErr" : "door.problem"), "bad"); console.error(e); });
        return false;
      } }] });
  }

  /* ---------- the receipt ---------- */
  R.receiptNode = function (s) {
    var st = B.state(), set = st.settings;
    return h("div.receipt", null, [
      h("div.r-head", null, [h("strong", null, set.storeName)].concat(E.receiptLines().map(function (x) { return h("span", null, x); }),
        [h("span", null, E.fmtDate(new Date(s.at), "short") + " " + E.fmtTime(new Date(s.at))), h("span", null, t("receipt.no") + " " + s.no)])),
      h("table.r-lines", null, h("tbody", null, s.lines.map(function (l) {
        return h("tr", null, [h("td", null, l.qty + " × " + l.name), h("td.num", null, money(l.amount))]);
      }))),
      h("table.r-totals", null, h("tbody", null, [
        h("tr", null, [h("td", null, t("reg.subtotal")), h("td.num", null, money(s.subtotal))])].concat(
        s.taxes.map(function (x) { return h("tr", null, [h("td", null, x.name + " (" + U.rateText(x.rate) + ")"), h("td.num", null, money(x.tax))]); }), [
        h("tr.r-total", null, [h("td", null, t("reg.total")), h("td.num", null, money(s.total))]),
        h("tr", null, [h("td", null, t("receipt.cash")), h("td.num", null, money(s.pay[0].tendered))]),
        h("tr", null, [h("td", null, t("receipt.change")), h("td.num", null, money(s.pay[0].change))])]))),
      h("p.r-by", null, t("receipt.servedBy", { name: ui.userTag(s.by) })),
      set.receiptNote ? h("p.r-note", null, set.receiptNote) : null,
      h("p.r-thanks", null, E.thanks()),
      h("p.r-build", null, E.made())]);
  };
  R.showReceipt = function (s, fresh) {
    ui.dialog({ title: fresh ? t("receipt.doneTitle") : t("receipt.title"), emoji: fresh ? "🎉" : "🧾", body: [fresh ? h("p.change.good", null, t("cash.change", { m: money(s.pay[0].change) })) : null, R.receiptNode(s)],
      actions: [{ label: t("receipt.print"), emoji: "🖨️", onClick: function () { ui.print(R.receiptNode(s)); return false; } },
                { label: fresh ? t("receipt.newSale") : t("close"), kind: "primary", id: "receiptDone", onClick: function (c) { c(); if (view && document.body.contains(view.search)) view.search.focus(); } }] });
  };

  /* keys at the register: F2 finds, F9 takes cash */
  document.addEventListener("keydown", function (e) {
    if (!B.isOpen || ui.current !== "register" || document.querySelector(".layer")) return;
    if (e.key === "F2") { e.preventDefault(); view && view.search.focus(); }
    if (e.key === "F9") { e.preventDefault(); takeCash(); }
  });
  B.on("lock", function () { view = null; });
})();
