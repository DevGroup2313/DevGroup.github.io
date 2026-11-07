/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The Team room. Everyone sees their own hours. Those with the "team" access (and the owner) see who is on the clock
   and everyone's hours, and can clock out a person who forgot. The owner, who is the administrator, adds the people,
   gives each one a user id and a level of access, sets a first password, and takes a key back. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui;
  var T = E.team = { week: 0 };
  var LEVELS = ["cashier", "stock", "manager", "custom"];

  /* the week shown: this week (0) or one before it (-1, -2 ...), starting on the store's first day of the week */
  function weekRange(offset) {
    var st = B.state(), first = st.settings.weekStart === 0 ? 0 : 1, d = new Date(); d.setHours(0, 0, 0, 0);
    var back = (d.getDay() - first + 7) % 7, start = new Date(d.getTime() - back * 86400000);
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * offset);
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    return { from: start.getTime(), to: end.getTime(), start: start, last: new Date(end.getTime() - 86400000) };
  }
  function inWeek(w) { return function (x) { var a = Date.parse(x.in); return a >= w.from && a < w.to; }; }
  function hoursText(ms) { return (ms / 3600000).toFixed(2); }
  function shiftRows(list) {
    var now = Date.now();
    return list.slice().reverse().map(function (x) {
      var d = new Date(x.in), brk = B.breakMs(x, now);
      return h("tr", { "data-shift": x.id }, [h("td", null, E.fmtDate(d, "short")), h("td", null, E.fmtTime(d)),
        h("td", null, x.out ? E.fmtTime(new Date(x.out)) : h("span.badge.ok", null, B.onBreak(x) ? t("clock.break") : t("clock.now"))),
        h("td.num", null, brk ? ui.dur(brk) : "—"), h("td.num", null, ui.dur(B.shiftMs(x, now)))]);
    });
  }
  function shiftTable(list, id) {
    var total = list.reduce(function (m, x) { return m + B.shiftMs(x); }, 0);
    return h("div.table-wrap", null, h("table.grid" + (id ? "#" + id : ""), null, [
      h("thead", null, h("tr", null, [h("th", null, t("team.day")), h("th", null, t("team.in")), h("th", null, t("team.out")), h("th.num", null, t("team.breaks")), h("th.num", null, t("team.worked"))])),
      h("tbody", null, list.length ? shiftRows(list) : [h("tr", null, h("td.muted", { colspan: "5" }, t("team.noShifts")))]),
      h("tfoot", null, h("tr", null, [h("td", { colspan: "4" }, h("b", null, t("team.total"))), h("td.num", null, h("b.week-total", null, ui.dur(total) + " · " + hoursText(total) + " h"))]))]));
  }
  function section(id, emoji, titleKey, kids, right) {
    return h("section.card.team-sec", { id: id, "aria-labelledby": id + "-h" }, [h("div.card-head", null, [h("h2", { id: id + "-h" }, [ui.emo(emoji), t(titleKey)]), right || null]), kids]);
  }

  ui.rooms.team = function (main) {
    var st = B.state(), me = B.user, w = weekRange(T.week), wk = inWeek(w);
    main.appendChild(ui.roomHead("room.team", "tip.team", B.can("owner") ? [h("button.key.primary#addPerson", { type: "button", onclick: function () { T.person(null); } }, [ui.emo("➕"), t("people.add")])] : null));
    var weekSeg = ui.seg([["0", t("team.thisWeek")], ["-1", t("team.lastWeek")], ["-2", t("team.weekBefore")]], String(T.week), function (v) { T.week = +v; ui.refresh(); }, t("team.week"));
    var weekLine = h("p.muted", null, t("team.weekOf", { a: E.fmtDate(w.start, "short"), b: E.fmtDate(w.last, "short") }));

    /* who is on the clock now */
    if (B.can("team")) {
      var on = B.onClock();
      main.appendChild(section("teamNow", "🟢", "clock.nowH", on.length ? h("ul.clock-list.big#teamOnClock", null, on.map(function (x) {
        var u = st.users[x.user];
        return h("li", null, [h("span.who-dot" + (B.onBreak(x) ? ".onbreak" : ".onclock"), { "aria-hidden": "true" }),
          h("span.who-main", null, [h("b", null, u ? u.name : x.user), h("span.muted", null, " · " + t("people.id", { n: x.no || B.numberOf(u) }))]),
          h("span.muted", null, (B.onBreak(x) ? t("clock.break") + " · " : "") + t("clock.since", { t: E.fmtTime(new Date(x.in)) }) + " · " + ui.dur(B.shiftMs(x))),
          x.user !== me.id ? h("button.key.sm", { type: "button", "data-out": x.user, onclick: function () {
            ui.confirm(t("team.outQ", { name: u ? u.name : x.user }), t("team.outP"), t("clock.out")).then(function (yes) {
              if (yes) B.clockOut(x.user).then(function () { ui.toast(t("team.outDone", { name: u ? u.name : x.user }), "good"); ui.refresh(); ui.refreshTop(); }, ui.failed);
            });
          } }, t("clock.out")) : null]);
      })) : h("p.muted#teamOnClock", null, t("clock.nobody"))));
    }

    /* my own hours */
    var mine = B.shifts(function (x) { return x.user === me.id; }).filter(wk);
    main.appendChild(section("teamMine", "🕘", "team.mine", [h("div.team-tools", null, [weekSeg, weekLine]), shiftTable(mine, "myShifts")],
      h("span.badge#myId", null, ui.personTag(me))));

    /* everyone's hours this week */
    if (B.can("team")) {
      var rows = B.people(true).map(function (u) {
        var list = B.shifts(function (x) { return x.user === u.id; }).filter(wk), ms = list.reduce(function (m, x) { return m + B.shiftMs(x); }, 0);
        if (!list.length && u.active === false) return null;
        var open = B.openShift(u.id);
        return h("tr", { "data-person": u.id }, [h("td", null, h("button.row-key", { type: "button", onclick: function () { T.card(u.id); } }, [h("span.who-dot" + (open ? (B.onBreak(open) ? ".onbreak" : ".onclock") : ""), { "aria-hidden": "true" }), h("span", null, u.name)])),
          h("td", null, String(B.numberOf(u))), h("td.num", null, String(list.length)), h("td.num", null, ui.dur(ms)), h("td.num", null, hoursText(ms))]);
      }).filter(Boolean);
      main.appendChild(section("teamAll", "📋", "team.all", h("div.table-wrap", null, h("table.grid#teamHours", null, [
        h("thead", null, h("tr", null, [h("th", null, t("people.name")), h("th", null, t("people.idH")), h("th.num", null, t("team.shifts")), h("th.num", null, t("team.worked")), h("th.num", null, t("team.hours"))])),
        h("tbody", null, rows)])), h("span.muted", null, t("team.weekOf", { a: E.fmtDate(w.start, "short"), b: E.fmtDate(w.last, "short") }))));
    }

    /* the people, for the owner */
    if (B.can("owner")) {
      var list = B.people(true);
      main.appendChild(section("teamPeople", "👥", "people.h", [h("p.hint", null, t("people.p")),
        h("div.table-wrap", null, h("table.grid#peopleList", null, [
          h("thead", null, h("tr", null, [h("th", null, t("people.name")), h("th", null, t("people.idH")), h("th", null, t("people.level")), h("th", null, t("people.access")), h("th", null, t("people.state"))])),
          h("tbody", null, list.map(function (u) {
            var owner = u.role === "owner", gone = u.active === false;
            return h("tr", { "data-person": u.id, class: gone ? "retired" : "" }, [
              h("td", null, owner ? h("span", null, [ui.emo("👑"), u.name]) : h("button.row-key", { type: "button", onclick: function () { T.person(u.id); } }, [ui.emo("🙂"), h("span", null, u.name)])),
              h("td", null, String(B.numberOf(u))), h("td", null, ui.levelName(u)),
              h("td.access-cell", null, owner ? t("people.everything") : (u.access || []).map(function (a) { return t("access." + a + ".s"); }).join(" · ") || "—"),
              h("td", null, gone ? h("span.badge", null, t("people.retired")) : u.mustChange ? h("span.badge.warn", null, t("people.firstPw")) : h("span.badge.ok", null, t("people.active")))]);
          }))])),
        h("p.hint", null, t("people.ownerOnly"))]));
    }
  };

  /* ---------- one person's time card (for the owner and those with the team access) ---------- */
  T.card = function (id) {
    var u = B.state().users[id]; if (!u) return;
    var w = weekRange(T.week), list = B.shifts(function (x) { return x.user === id; }).filter(inWeek(w));
    ui.dialog({ title: u.name, emoji: "🕘", wide: true, body: [h("p.muted", null, ui.personTag(u) + " · " + ui.levelName(u) + " · " + t("team.weekOf", { a: E.fmtDate(w.start, "short"), b: E.fmtDate(w.last, "short") })),
      shiftTable(list, "cardShifts")], actions: [{ label: t("close"), kind: "primary" }] });
  };

  /* ---------- adding a person, or changing one (the owner only) ---------- */
  function accessBoxes(chosen, onChange) {
    var boxes = {};
    var wrap = h("div.access-list", { role: "group", "aria-label": t("people.access") }, B.ACCESS.map(function (a) {
      var cb = h("input", { type: "checkbox", id: "acc-" + a, "data-access": a });
      cb.checked = chosen.indexOf(a) >= 0; boxes[a] = cb;
      cb.addEventListener("change", function () { if (onChange) onChange(); });
      return h("label.access-row", { for: "acc-" + a }, [cb, h("span", null, [h("b", null, t("access." + a + ".s")), h("small", null, t("access." + a + ".d"))])]);
    }));
    return { node: wrap, boxes: boxes, value: function () { return B.ACCESS.filter(function (a) { return boxes[a].checked; }); },
      set: function (list) { B.ACCESS.forEach(function (a) { boxes[a].checked = list.indexOf(a) >= 0; }); } };
  }
  function levelOf(list) {
    for (var i = 0; i < 3; i++) { var p = B.PRESETS[LEVELS[i]]; if (p.length === list.length && p.every(function (a) { return list.indexOf(a) >= 0; })) return LEVELS[i]; }
    return "custom";
  }
  var ERR = { name: "people.err.name", nameTaken: "people.err.taken", wrong: "people.err.ownerPw", denied: "people.denied" };
  T.person = function (id) {
    var st = B.state(), u = id ? st.users[id] : null, practice = B.mode === "practice";
    var name = ui.input({ id: "pName", value: u ? u.name : "", autocomplete: "off" });
    var acc = accessBoxes(u ? (u.access || []) : B.PRESETS.cashier, function () { level.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-v") === levelOf(acc.value()))); }); });
    var level = ui.seg(LEVELS.map(function (l) { return [l, t("level." + l)]; }), u ? levelOf(u.access || []) : "cashier", function (v) { if (B.PRESETS[v]) acc.set(B.PRESETS[v]); }, t("people.level"));
    level.id = "pLevel";
    var body = [ui.field("people.name", name, { required: true, hint: t("people.nameHint") }),
      h("div.field", null, [h("div.label-row", null, h("span.lbl", null, t("people.level"))), level]),
      acc.node, h("p.hint", null, t("people.ownerOnly"))];
    var pw = null, pw2 = null, own = null, meter = null;
    if (!u) {
      pw = ui.input({ type: "password", id: "pPw", autocomplete: "new-password" }); pw2 = ui.input({ type: "password", id: "pPw2", autocomplete: "new-password" });
      meter = h("p.hint", { "aria-live": "polite" });
      pw.addEventListener("input", function () { meter.textContent = pw.value ? t(E.crypto.passwordAdvice(pw.value).key) : ""; });
      body.push(h("h3.status-h", null, t("people.keyH")), h("p.hint", null, t("people.keyP")), ui.field("people.firstPw", pw, { required: true }), meter, ui.field("own.again", pw2, { required: true }));
      if (!practice) { own = ui.input({ type: "password", id: "pOwnerPw", autocomplete: "current-password" }); body.push(ui.field("people.ownerPw", own, { required: true, hint: t("people.ownerPwHint") })); }
    } else {
      body.unshift(h("p.muted", null, ui.personTag(u) + (u.active === false ? " · " + t("people.retired") : "")));
    }
    var actions = [{ label: t("cancel") }];
    if (u) {
      actions.push({ label: u.active === false ? t("people.giveBack") : t("people.newPw"), id: "pNewPw", onClick: function (close) { close(); T.newPassword(u.id); } });
      if (u.active !== false) actions.push({ label: t("people.retire"), kind: "danger", id: "pRetire", onClick: function (close) {
        close();
        ui.confirm(t("people.retireQ", { name: u.name }), t("people.retireP"), t("people.retire"), "danger").then(function (yes) {
          if (yes) B.retirePerson(u.id).then(function () { ui.toast(t("people.retired.done", { name: u.name }), "good"); ui.refresh(); }, ui.failed);
        });
      } });
    }
    actions.push({ label: u ? t("save") : t("people.add"), kind: "primary", id: "pSave", onClick: function (close, btn) {
      ui.fieldError(name, "");
      if (!name.value.trim()) { ui.fieldError(name, t("people.err.name")); return false; }
      var access = acc.value(), preset = levelOf(access);
      if (u) {
        btn.disabled = true;
        B.editPerson(u.id, { name: name.value, access: access, preset: preset }).then(function () { close(); ui.toast(t("people.saved"), "good"); ui.refresh(); }, function (e) {
          btn.disabled = false; if (ERR[e && e.code] && e.code !== "denied") ui.fieldError(name, t(ERR[e.code])); else ui.failed(e);
        });
        return false;
      }
      var r = E.crypto.passwordAdvice(pw.value);
      if (!r.ok) { ui.fieldError(pw, t(r.key)); return false; }
      if (pw.value !== pw2.value) { ui.fieldError(pw2, t("setup.noMatch")); return false; }
      if (own && !own.value) { ui.fieldError(own, t("door.needPassword")); return false; }
      btn.disabled = true; btn.textContent = t("people.making");
      B.addPerson({ name: name.value, access: access, preset: preset, password: pw.value }, own ? own.value : null).then(function (p) {
        close(); ui.refresh();
        ui.dialog({ title: t("people.addedH", { name: p.name }), emoji: "✅", body: [h("p", null, t("people.addedP", { name: p.name, n: p.no })),
          h("p.big-id#newPersonId", null, t("people.id", { n: p.no })), h("p.hint", null, t("people.addedHint"))], actions: [{ label: t("gotIt"), kind: "primary" }] });
      }, function (e) {
        btn.disabled = false; btn.textContent = t("people.add");
        var c = e && e.code;
        if (c === "name" || c === "nameTaken") ui.fieldError(name, t(ERR[c]));
        else if (c === "wrong" && own) ui.fieldError(own, t(ERR.wrong));
        else if (c === "password") ui.fieldError(pw, t(e.extra));
        else ui.failed(e);
      });
      return false;
    } });
    ui.dialog({ title: u ? t("people.editH", { name: u.name }) : t("people.addH"), emoji: u ? "🙂" : "➕", wide: true, body: body, actions: actions, focus: "#pName" });
  };
  /* a new first password for a person (or a key given back): they choose their own when they next sign in */
  T.newPassword = function (id) {
    var u = B.state().users[id], practice = B.mode === "practice";
    var pw = ui.input({ type: "password", id: "npPw", autocomplete: "new-password" }), pw2 = ui.input({ type: "password", id: "npPw2", autocomplete: "new-password" });
    var own = practice ? null : ui.input({ type: "password", id: "npOwner", autocomplete: "current-password" });
    ui.dialog({ title: u.active === false ? t("people.giveBack") : t("people.newPw"), emoji: "🔑", body: [h("p", null, t("people.newPwP", { name: u.name })),
      ui.field("people.firstPw", pw, { required: true }), ui.field("own.again", pw2, { required: true }), own ? ui.field("people.ownerPw", own, { required: true }) : null],
      actions: [{ label: t("cancel") }, { label: t("save"), kind: "primary", id: "npSave", onClick: function (close, btn) {
        var r = E.crypto.passwordAdvice(pw.value);
        if (!r.ok) { ui.fieldError(pw, t(r.key)); return false; }
        if (pw.value !== pw2.value) { ui.fieldError(pw2, t("setup.noMatch")); return false; }
        btn.disabled = true;
        B.setPersonPassword(id, pw.value, own ? own.value : null).then(function () { close(); ui.toast(t("people.pwSet", { name: u.name }), "good"); ui.refresh(); }, function (e) {
          btn.disabled = false; if (e && e.code === "wrong" && own) ui.fieldError(own, t(ERR.wrong)); else ui.failed(e);
        });
        return false;
      } }] });
  };
})();
