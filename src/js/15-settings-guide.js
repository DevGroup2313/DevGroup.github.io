/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Settings (the store, sales tax, shelves, display, security, backups, verification, storage, about) and the Guidebook. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, C = E.crypto, ui = E.ui, money = U.money;

  var SET_EMO = { store: "🏪", tax: "🧾", cats: "🗂️", display: "🎨", security: "🔐", backup: "💾", verify: "🛡️", storage: "🗄️", about: "ℹ️", erase: "🧹" };
  function sec(id, titleKey, tipKey, children) {
    return h("section.card.set-sec", { id: id, "aria-labelledby": id + "-h" }, [h("div.card-head", null, [h("h2", { id: id + "-h" }, [ui.emo(SET_EMO[id.replace("set-", "")] || "⚙️"), t(titleKey)]), tipKey ? ui.tip(tipKey) : null]), children]);
  }

  ui.rooms.settings = function (main) {
    var st = B.state(), s = st.settings;
    main.appendChild(ui.roomHead("room.settings", null));
    var nav = h("nav.set-nav", { "aria-label": t("set.sections") }, ["store", "tax", "cats", "display", "security", "backup", "verify", "storage", "about", "erase"].map(function (k) {
      return h("button.chip", { type: "button", onclick: function () { var n = document.getElementById("set-" + k); if (n) n.scrollIntoView({ behavior: ui.still() ? "auto" : "smooth", block: "start" }); } }, [ui.emo(SET_EMO[k]), t("set." + k)]);
    }));
    main.appendChild(nav);

    /* the store */
    var name = ui.input({ id: "setStore", value: s.storeName, maxlength: "80" }), owner = ui.input({ id: "setOwner", value: s.ownerName, maxlength: "80" });
    var cur = ui.select([["USD", t("cur.USD")], ["CAD", t("cur.CAD")], ["EUR", t("cur.EUR")], ["HTG", t("cur.HTG")]], s.currency, { id: "setCurrency" });
    var note = ui.input({ id: "setReceiptNote", value: s.receiptNote || "", maxlength: "160" });
    var week = ui.select([["1", t("set.monday")], ["0", t("set.sunday")]], String(s.weekStart === 0 ? 0 : 1), { id: "setWeek" });
    main.appendChild(sec("set-store", "set.store", null, h("form.form-grid", { onsubmit: function (e) {
      e.preventDefault();
      if (!name.value.trim()) return ui.fieldError(name, t("setup.needStore"));
      if (!owner.value.trim()) return ui.fieldError(owner, t("setup.needOwner"));
      B.updateSettings({ storeName: name.value.trim(), ownerName: owner.value.trim(), currency: cur.value, receiptNote: note.value.trim(), weekStart: +week.value })
        .then(function () { ui.toast(t("set.saved"), "good"); ui.shell(); ui.go("settings", true); }, function (e) { ui.toast(t("door.problem"), "bad"); console.error(e); });
    } }, [ui.field("setup.storeName", name), ui.field("setup.ownerName", owner), ui.field("setup.currency", cur, { tip: "tip.currency" }), ui.field("set.week", week),
      ui.field("set.receiptNote", note, { cls: "span2", hint: t("set.receiptNoteHint") }), h("div.span2", null, h("button.key.primary", { type: "submit", id: "setStoreSave" }, [U.icon("check"), t("save")]))])));

    /* sales tax */
    var taxes = (s.taxes || []).slice();
    var used = {}; Object.keys(st.items).forEach(function (k) { var it = st.items[k]; if (it.taxId) used[it.taxId] = (used[it.taxId] || 0) + 1; });
    var tlist = h("ul.list", { id: "taxList" }, taxes.length ? taxes.map(function (x) {
      return h("li", null, [h("span", null, [h("strong", null, x.name), " · " + U.rateText(x.rate) + (used[x.id] ? " · " + t("set.taxUsed", { n: used[x.id] }) : "")]),
        h("span.row-keys", null, [h("button.link", { type: "button", onclick: function () { taxDialog(x); } }, [U.icon("edit"), t("edit")]),
          used[x.id] ? null : h("button.link.danger", { type: "button", onclick: function () {
            ui.confirm(t("set.taxRemoveT"), t("set.taxRemoveP", { name: x.name }), t("set.taxRemoveYes"), "danger").then(function (ok) {
              if (ok) B.updateSettings({ taxes: taxes.filter(function (y) { return y.id !== x.id; }) }).then(function () { ui.refresh(); });
            });
          } }, [U.icon("trash"), t("remove")])])]);
    }) : h("li.muted", null, t("set.noTax")));
    function taxDialog(x) {
      var tn = ui.input({ id: "taxName", value: x ? x.name : t("set.taxDefaultName"), maxlength: "40" }), tr = ui.input({ id: "taxRate", inputmode: "decimal", value: x ? String(x.rate / 1000) : "" });
      ui.dialog({ title: t(x ? "set.taxEdit" : "set.taxAdd"), focus: "#taxRate", body: [h("p.hint", null, t("set.taxHint")), ui.field("set.taxName", tn, { required: true }), ui.field("set.taxRate", tr, { required: true, hint: t("set.taxRateHint") })],
        actions: [{ label: t("cancel") }, { label: t("save"), kind: "primary", id: "taxSave", onClick: function (close) {
          var rate = U.parseRate(tr.value);
          if (!tn.value.trim()) { ui.fieldError(tn, t("set.taxNeedName")); return false; }
          if (rate === null || rate > 30000) { ui.fieldError(tr, t("set.taxBadRate")); return false; }
          var next = x ? taxes.map(function (y) { return y.id === x.id ? { id: y.id, name: tn.value.trim(), rate: rate } : y; }) : taxes.concat([{ id: U.uid("t"), name: tn.value.trim(), rate: rate }]);
          B.updateSettings({ taxes: next }).then(function () { close(); ui.toast(t("set.saved"), "good"); ui.refresh(); });
          return false;
        } }] });
    }
    main.appendChild(sec("set-tax", "set.tax", "tip.tax", [h("p.hint", null, t("set.taxIntro")), tlist,
      h("div.row-keys", null, [h("button.key", { type: "button", id: "taxAdd", onclick: function () { taxDialog(null); } }, [ui.emo("➕"), t("set.taxAdd")]),
        (s.taxes || []).length ? null : h("button.link", { type: "button", onclick: function () { U.prefSet("taxSkipped", "1"); ui.toast(t("set.taxSkipped"), "good"); } }, t("set.taxSkip"))])]));

    /* shelves */
    var catName = ui.input({ id: "catNew", maxlength: "40", placeholder: t("set.catPh") });
    main.appendChild(sec("set-cats", "set.cats", null, [h("ul.chips.static", null, ui.cats().map(function (c) { return h("li.chip", null, [ui.emo(ui.catEmo(c.id)), ui.catName(c)]); })),
      h("form.inline", { onsubmit: function (e) {
        e.preventDefault(); if (!catName.value.trim()) return;
        B.addCategory(catName.value).then(function () { ui.toast(t("set.saved"), "good"); ui.refresh(); });
      } }, [ui.field("set.catAdd", catName), h("button.key", { type: "submit", id: "catAddKey" }, [U.icon("plus"), t("add")])])]));

    /* display */
    main.appendChild(sec("set-display", "set.display", "tip.calm", h("div.form-grid", null, [
      h("div.field", null, [h("p.label", null, t("language")), ui.seg([["en", "English"], ["fr", "Français"], ["ht", "Kreyòl"]], E.lang, function (l) { E.setLang(l); ui.shell(); ui.go("settings", true); }, t("language"))]),
      h("div.field", null, [h("p.label", null, t("theme")), ui.seg([["day", t("theme.day"), "sun"], ["night", t("theme.night"), "moon"], ["auto", t("theme.auto"), "auto"]], U.prefGet("theme", "auto"), function (v) { U.prefSet("theme", v); ui.applyLook(); }, t("theme"))]),
      h("div.field", null, [h("p.label", null, t("set.size")), ui.seg([["m", t("set.sizeM")], ["l", t("set.sizeL")], ["xl", t("set.sizeXL")]], U.prefGet("size", "m"), function (v) { U.prefSet("size", v); ui.applyLook(); }, t("set.size"))]),
      h("div.field", null, [h("p.label", null, t("set.calm")), ui.seg([["0", t("off")], ["1", t("on")]], U.prefGet("calm", "0"), function (v) { U.prefSet("calm", v); ui.applyLook(); }, t("set.calm")), h("p.hint", null, t("set.calmHint"))])])));

    /* security */
    var lockSel = ui.select([5, 10, 15, 30, 60].map(function (m) { return [String(m), t("set.minutes", { n: m })]; }), String(s.lockMinutes || 15), { id: "setLock" });
    lockSel.addEventListener("change", function () { B.updateSettings({ lockMinutes: +lockSel.value }).then(function () { ui.toast(t("set.saved"), "good"); }); });
    main.appendChild(sec("set-security", "set.security", "tip.lock", [ui.field("set.lockAfter", lockSel),
      h("div.row-keys", null, [
        h("button.key", { type: "button", onclick: function () { B.lock("hand"); } }, [ui.emo("🔒"), t("lockNow")]),
        h("button.key", { type: "button", id: "changePw", onclick: changePassword }, [ui.emo("🔑"), t("set.changePw")]),
        h("button.key", { type: "button", id: "newMaster", onclick: newMaster }, [ui.emo("🗝️"), t("set.newMaster")])]),
      h("p.hint", null, t("set.securityHint"))]));

    /* backups */
    var lastB = U.prefGet("lastBackup", "");
    main.appendChild(sec("set-backup", "set.backup", "tip.backup", [h("p", { id: "lastBackup" }, lastB ? t("set.lastBackup", { d: E.fmtDate(new Date(lastB), "long") + " " + E.fmtTime(new Date(lastB)) }) : t("set.noBackup")),
      h("div.row-keys", null, [h("button.key.hero", { type: "button", id: "saveBackup", onclick: saveBackup }, [ui.emo("💾"), t("set.saveBackup")]),
        h("button.key", { type: "button", id: "restoreBackup", onclick: function () { E.door.restore(false); } }, [ui.emo("📂"), t("set.restore")])]),
      h("p.hint", null, t("set.backupHint"))]));

    /* verify */
    var vOut = h("div#verifyOut", { "aria-live": "polite" });
    main.appendChild(sec("set-verify", "set.verify", "tip.verify", [h("p", null, t("set.verifyIntro")),
      h("button.key", { type: "button", id: "verifyKey", onclick: function (e) {
        var b = e.currentTarget; b.disabled = true; U.clear(vOut); vOut.appendChild(h("p.muted", null, t("set.verifying")));
        B.verify().then(function (r) {
          b.disabled = false; U.clear(vOut);
          if (r.ok) vOut.appendChild(h("p.good-line", { id: "verifyResult", "data-ok": "1" }, [ui.emo("✅"), t("set.verifyOk", { n: r.lines })]));
          else {
            vOut.appendChild(h("p.bad-line", { id: "verifyResult", "data-ok": "0" }, [ui.emo("🚨"), t("set.verifyBad", { n: r.problems.length })]));
            vOut.appendChild(h("ul.list", null, r.problems.slice(0, 20).map(function (p) { return h("li", null, t("problem." + p.what) + (p.seq ? " · " + t("set.line") + " " + p.seq : "") + (p.item ? " · " + ((B.state().items[p.item] || {}).name || p.item) : "") + (p.field ? " · " + p.field : "")); })));
          }
        }, function (err) { b.disabled = false; U.clear(vOut); vOut.appendChild(h("p.bad-line", null, t("door.problem"))); console.error(err); });
      } }, [ui.emo("🛡️"), t("set.verifyKey")]), vOut]));

    /* storage */
    var stOut = h("p", { id: "storageOut" }, t("loading"));
    main.appendChild(sec("set-storage", "set.storage", null, [stOut]));
    Promise.all([E.db.estimate(), navigator.storage && navigator.storage.persisted ? navigator.storage.persisted().catch(function () { return null; }) : Promise.resolve(null)]).then(function (r) {
      var est = r[0], kept = r[1];
      stOut.textContent = (est && est.usage !== undefined ? t("set.used", { mb: (est.usage / 1048576).toFixed(1) }) + " " : "") + t(kept === true ? "set.kept" : kept === false ? "set.notKept" : "set.keptUnknown");
    });

    /* about */
    main.appendChild(sec("set-about", "set.about", null, [h("div.about", null, [ui.sealWrap(84, "Emporium"), h("div", null, [
      h("p", null, [h("strong", null, "Emporium"), " · " + t("build") + " " + E.BUILD.number + " · " + E.BUILD.date]),
      h("p", null, t("about.p1")), h("p", null, "Copyright © 2026 Yannie D. Forest. " + t("about.rights")), h("p.hint", null, t("about.p2"))])])]));

    /* erase */
    main.appendChild(sec("set-erase", "set.erase", null, [h("p", null, t("set.eraseP")), h("button.key.danger", { type: "button", id: "eraseKey", onclick: erase }, [ui.emo("🧹"), t("set.eraseKey")])]));
  };

  function saveBackup() {
    B.makeBackup().then(function (text) {
      var st = B.state(), nm = "Emporium backup " + st.settings.storeName.replace(/[^\p{L}\p{N} _-]/gu, "") + " " + U.dayKey() + ".emporium";
      return ui.saveFile(nm, "application/json", text);
    }).then(function (ok) {
      if (ok) { U.prefSet("lastBackup", new Date().toISOString()); ui.toast(t("set.backupSaved"), "good"); ui.refresh(); }
    }, function (e) { ui.toast(t("door.problem"), "bad"); console.error(e); });
  }
  E.saveBackup = saveBackup;

  function changePassword() {
    var cur = ui.input({ type: "password", id: "cpCur", autocomplete: "current-password" }), p1 = ui.input({ type: "password", id: "cpNew1", autocomplete: "new-password" }), p2 = ui.input({ type: "password", id: "cpNew2", autocomplete: "new-password" });
    ui.dialog({ title: t("set.changePw"), focus: "#cpCur", body: [ui.field("set.currentPw", cur, { required: true }), ui.field("setup.password", p1, { required: true, tip: "tip.password" }), ui.field("setup.password2", p2, { required: true })],
      actions: [{ label: t("cancel") }, { label: t("save"), kind: "primary", id: "cpSave", onClick: function (close, btn) {
        var a = C.passwordAdvice(p1.value);
        if (!cur.value) { ui.fieldError(cur, t("door.needPassword")); return false; }
        if (!a.ok) { ui.fieldError(p1, t(a.key)); return false; }
        if (p1.value !== p2.value) { ui.fieldError(p2, t("setup.noMatch")); return false; }
        btn.disabled = true;
        B.changePassword(cur.value, p1.value).then(function () { close(); ui.toast(t("set.pwChanged"), "good"); }, function (e) {
          btn.disabled = false; if (e && e.code === "wrong") ui.fieldError(cur, t("door.wrong")); else { ui.toast(t("door.problem"), "bad"); console.error(e); }
        });
        return false;
      } }] });
  }
  function newMaster() {
    var cur = ui.input({ type: "password", id: "nmPw", autocomplete: "current-password" });
    ui.dialog({ title: t("set.newMaster"), focus: "#nmPw", body: [h("p", null, t("set.newMasterP")), ui.field("set.currentPw", cur, { required: true })],
      actions: [{ label: t("cancel") }, { label: t("next"), kind: "primary", id: "nmNext", onClick: function (close, btn) {
        if (!cur.value) { ui.fieldError(cur, t("door.needPassword")); return false; }
        btn.disabled = true;
        B.prepareNewMaster(cur.value).then(function (prep) { cur.value = ""; close(); showNewMaster(prep); }, function (e) {
          btn.disabled = false; if (e && e.code === "wrong") ui.fieldError(cur, t("door.wrong")); else { ui.toast(t("door.problem"), "bad"); console.error(e); }
        });
        return false;
      } }] });
  }
  function showNewMaster(prep) {
    var groups = C.groups(prep.code), a = 1 + Math.floor(Math.random() * 6), b = 7 + Math.floor(Math.random() * 6);
    var ga = ui.input({ id: "nmA", maxlength: "4", class: "mono" }), gb = ui.input({ id: "nmB", maxlength: "4", class: "mono" });
    ui.dialog({ title: t("master.title"), wide: true, noClose: true, body: [h("p", null, t("setup.s4.p1")), E.door.masterGrid(prep.code),
      h("p.hint", null, t("set.newMasterConfirm")), h("div.pair", null, [ui.field(t("setup.group", { n: a }), ga), ui.field(t("setup.group", { n: b }), gb)])],
      actions: [{ label: t("set.newMasterCancel"), onClick: function (close) { close(); ui.toast(t("set.newMasterKept"), "good"); } },
        { label: t("setup.print"), icon: "print", onClick: function () { E.door.printMaster(prep.code, B.state().settings.storeName); return false; } },
        { label: t("set.newMasterSave"), kind: "primary", id: "nmSave", onClick: function (close, btn) {
          if (C.cleanMasterText(ga.value) !== groups[a - 1]) { ui.fieldError(ga, t("setup.groupWrong")); return false; }
          if (C.cleanMasterText(gb.value) !== groups[b - 1]) { ui.fieldError(gb, t("setup.groupWrong")); return false; }
          btn.disabled = true;
          prep.finish().then(function () { close(); ui.toast(t("set.newMasterDone"), "good"); }, function (e) { btn.disabled = false; ui.toast(t("door.problem"), "bad"); console.error(e); });
          return false;
        } }] });
  }
  function erase() {
    var st = B.state(), pw = ui.input({ type: "password", id: "erPw", autocomplete: "current-password" }), nm = ui.input({ id: "erName" });
    ui.dialog({ title: t("set.erase"), alert: true, focus: "#erPw", body: [h("p", null, t("set.eraseWarn")), ui.field("set.currentPw", pw, { required: true }), ui.field(t("set.eraseType", { name: st.settings.storeName }), nm, { required: true })],
      actions: [{ label: t("cancel") }, { label: t("set.eraseKey"), kind: "danger", id: "erGo", onClick: function (close, btn) {
        if (nm.value.trim() !== st.settings.storeName) { ui.fieldError(nm, t("set.eraseNameWrong")); return false; }
        btn.disabled = true;
        B.erase(pw.value).then(function () { close(); }, function (e) { btn.disabled = false; if (e && e.code === "wrong") ui.fieldError(pw, t("door.wrong")); else { ui.toast(t("door.problem"), "bad"); console.error(e); } });
        return false;
      } }] });
  }

  /* ---------- the Guidebook ---------- */
  var ARTICLES = ["start", "door", "master", "sale", "items", "receive", "correct", "reports", "backup", "sealed", "verify", "display", "build", "limits"];
  var ART_EMO = { start: "🌟", door: "🚪", master: "🗝️", sale: "🛒", items: "🏷️", receive: "🚚", correct: "✏️", reports: "📊", backup: "💾", sealed: "🔐", verify: "🛡️", display: "🎨", build: "🔢", limits: "🧭" };
  ui.rooms.guide = function (main) {
    var q = ui.input({ id: "guideSearch", type: "search", placeholder: t("guide.searchPh"), "aria-label": t("guide.search") });
    var list = h("ul.guide-list", { id: "guideList" }), art = h("article.guide-article.card", { id: "guideArticle", tabindex: "-1" });
    main.appendChild(ui.roomHead("room.guide", null));
    main.appendChild(h("div.guide", null, [h("div.guide-side", null, [h("div.search-row", null, [U.icon("search"), q]), list]), art]));
    function show(id) {
      U.clear(art);
      var paras = t("guide." + id + ".b").split("\n");
      art.appendChild(h("h2", null, [ui.emo(ART_EMO[id]), t("guide." + id + ".t")]));
      paras.forEach(function (p) { art.appendChild(h("p", null, p)); });
      art.appendChild(h("div.tip-box", null, [ui.emo("💡"), h("p", null, [h("strong", null, t("tip") + ": "), t("guide." + id + ".tip")])]));
      var ra = ui.readAloud(t("guide." + id + ".t") + ". " + paras.join(" ") + " " + t("guide." + id + ".tip")); if (ra) art.appendChild(ra);
      Array.prototype.forEach.call(list.querySelectorAll("button"), function (b) { if (b.getAttribute("data-a") === id) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    }
    function draw() {
      U.clear(list);
      var n = U.norm(q.value), first = null;
      ARTICLES.forEach(function (id) {
        var hay = U.norm(t("guide." + id + ".t") + " " + t("guide." + id + ".b") + " " + t("guide." + id + ".tip"));
        if (n && hay.indexOf(n) < 0) return;
        if (!first) first = id;
        list.appendChild(h("li", null, h("button.guide-key", { type: "button", "data-a": id, onclick: function () { show(id); art.focus(); } }, [ui.emo(ART_EMO[id]), t("guide." + id + ".t")])));
      });
      if (!first) list.appendChild(h("li.muted", null, t("guide.none")));
      return first;
    }
    q.addEventListener("input", U.debounce(function () { var f = draw(); if (f) show(f); }, 120));
    show(draw() || "start");
  };
})();
