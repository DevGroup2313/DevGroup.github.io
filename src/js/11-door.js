/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The door: signing in, setting up a store (one question per page), the Master Key, recovery, restoring a backup. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, C = E.crypto, ui = E.ui;
  var door = E.door = {};
  var info = null;

  function langRow() {
    return ui.seg([["en", "English"], ["fr", "Français"], ["ht", "Kreyòl"]], E.lang, function (l) { E.setLang(l); (door.view || door.show)(); }, t("language"));
  }
  function themeRow() {
    return ui.seg([["day", t("theme.day"), "sun"], ["night", t("theme.night"), "moon"], ["auto", t("theme.auto"), "auto"]], U.prefGet("theme", "auto"),
      function (v) { U.prefSet("theme", v); ui.applyLook(); }, t("theme"));
  }
  function frame(children, wide) {
    var app = document.getElementById("app"); U.clear(app);
    var card = h("div.door-card" + (wide ? ".wide" : ""), null, children);
    app.appendChild(h("div.door", null, [h("main.door-main", { "aria-label": "Emporium" }, card),
      h("footer.door-foot", null, [h("div.door-choices", null, [langRow(), themeRow()]),
        h("p", null, t("build") + " " + E.BUILD.number + " · © 2026 Yannie D. Forest · " + t("door.offline"))])]));
    var f = card.querySelector("input,button.primary"); if (f) setTimeout(function () { f.focus(); }, 40);
    return card;
  }
  function crest(sub) {
    return h("div.crest", null, [h("span.seal-ring", null, ui.sealWrap(108, "Emporium")), h("h1.brand", null, "Emporium"),
      h("div.door-rule", null, [h("span"), h("em", null, sub || t("door.tag")), h("span")])]);
  }

  /* each screen is remembered, so that changing the language draws the same screen again */
  function screen(fn) { return function () { var a = arguments; door.view = function () { fn.apply(null, a); }; return fn.apply(null, a); }; }
  door.show = function (why) {
    return B.boot().then(function (r) {
      info = r;
      if (!r.hasStore) return welcome();
      return signIn(why);
    });
  };

  /* ---------- signing in ---------- */
  function waitLeft() {
    var until = +U.prefGet("waitUntil", "0"); return Math.max(0, until - Date.now());
  }
  var signIn = screen(function (why) {
    var pw = ui.input({ type: "password", autocomplete: "current-password", id: "doorPassword" });
    var msg = h("p.door-msg", { role: "status" }, why === "idle" ? t("door.lockedIdle") : why === "hand" ? t("door.lockedHand") : "");
    var go = h("button.key.primary.big", { type: "submit", id: "doorOpen" }, [ui.emo("🔓"), t("door.open")]);
    var form = h("form.door-form", { onsubmit: function (e) {
      e.preventDefault();
      var left = waitLeft();
      if (left > 0) { msg.textContent = t("door.wait", { s: Math.ceil(left / 1000) }); return; }
      if (!pw.value) { ui.fieldError(pw, t("door.needPassword")); return; }
      go.disabled = true; msg.textContent = t("door.opening");
      B.openWithPassword(pw.value).then(function () {
        pw.value = ""; U.prefSet("fails", "0"); U.prefSet("waitUntil", "0"); E.app.opened();
      }, function (e) {
        go.disabled = false; pw.select();
        if (e && e.code === "wrong") {
          var n = (+U.prefGet("fails", "0")) + 1; U.prefSet("fails", n);
          if (n >= 5) { var s = Math.min(900, 30 * Math.pow(2, n - 5)); U.prefSet("waitUntil", Date.now() + s * 1000); msg.textContent = t("door.tooMany", { s: s }); }
          else msg.textContent = "";
          ui.fieldError(pw, t("door.wrong"));
        } else { msg.textContent = t("door.problem"); console.error(e); }
      });
    } }, [ui.field("door.password", pw), go, msg]);
    frame([crest(), h("p.door-store", null, (info.door && info.door.storeName) || ""), h("p.door-date", null, ui.dateLong(new Date())), form,
      h("div.door-links", null, [
        h("button.link", { type: "button", onclick: masterRecovery }, [ui.emo("🗝️"), t("door.useMaster")]),
        h("button.link", { type: "button", onclick: function () { restore(true); } }, [ui.emo("💾"), t("door.restore")])])]);
  });

  /* ---------- a new store ---------- */
  var welcome = screen(function () {
    frame([crest(), h("p.door-lead", null, t("setup.lead")),
      h("button.key.hero.big", { type: "button", id: "setupBegin", onclick: function () { setup.step1(); } }, [ui.emo("✨"), t("setup.begin")]),
      h("div.door-links", null, [h("button.link", { type: "button", onclick: function () { restore(false); } }, [ui.emo("💾"), t("door.restoreHere")])])]);
  });
  var draft = {};
  function steps(n) {
    return h("div.steps", { "aria-label": t("setup.stepOf", { n: n, of: 5 }) }, [1, 2, 3, 4, 5].map(function (i) {
      return h("span.dot" + (i < n ? ".done" : i === n ? ".now" : ""), { "aria-hidden": "true" });
    }).concat([h("span.steps-text", null, t("setup.stepOf", { n: n, of: 5 }))]));
  }
  var setup = {
    step1: function () {
      door.view = setup.step1;
      frame([steps(1), h("h2.door-h", null, [ui.emo("👋"), t("setup.s1.h")]), h("p", null, t("setup.s1.p1")),
        h("ul.plain-list", null, [h("li", null, [ui.emo("🏪"), t("setup.s1.need1")]), h("li", null, [ui.emo("🔐"), t("setup.s1.need2")]), h("li", null, [ui.emo("✍️"), t("setup.s1.need3")])]),
        h("p.hint", null, t("setup.s1.p2")),
        h("div.door-actions", null, [h("button.key", { type: "button", onclick: welcome }, [U.icon("back"), t("back")]),
          h("button.key.primary", { type: "button", id: "s1Next", onclick: setup.step2 }, [t("next"), U.icon("next")])])], true);
    },
    step2: function () {
      door.view = setup.step2;
      var name = ui.input({ id: "setupStore", value: draft.storeName || "", maxlength: "80", autocomplete: "organization" });
      var owner = ui.input({ id: "setupOwner", value: draft.ownerName || "", maxlength: "80", autocomplete: "name" });
      var cur = ui.select([["USD", t("cur.USD")], ["CAD", t("cur.CAD")], ["EUR", t("cur.EUR")], ["HTG", t("cur.HTG")]], draft.currency || "USD", { id: "setupCurrency" });
      function next() {
        if (!name.value.trim()) return ui.fieldError(name, t("setup.needStore"));
        ui.fieldError(name, "");
        if (!owner.value.trim()) return ui.fieldError(owner, t("setup.needOwner"));
        draft.storeName = name.value.trim(); draft.ownerName = owner.value.trim(); draft.currency = cur.value;
        setup.step3();
      }
      frame([steps(2), h("h2.door-h", null, [ui.emo("🏪"), t("setup.s2.h")]),
        h("form", { onsubmit: function (e) { e.preventDefault(); next(); } }, [
          ui.field("setup.storeName", name, { required: true, hint: t("setup.storeHint") }),
          ui.field("setup.ownerName", owner, { required: true }),
          ui.field("setup.currency", cur, { tip: "tip.currency" }),
          h("div.door-actions", null, [h("button.key", { type: "button", onclick: setup.step1 }, [U.icon("back"), t("back")]),
            h("button.key.primary", { type: "submit", id: "s2Next" }, [t("next"), U.icon("next")])])])], true);
    },
    step3: function () {
      door.view = setup.step3;
      var p1 = ui.input({ type: "password", id: "setupPw1", autocomplete: "new-password" }), p2 = ui.input({ type: "password", id: "setupPw2", autocomplete: "new-password" });
      var advice = h("p.advice", { "aria-live": "polite" });
      var show = h("input", { type: "checkbox", id: "setupShow" });
      show.addEventListener("change", function () { p1.type = p2.type = show.checked ? "text" : "password"; });
      p1.addEventListener("input", function () { var a = C.passwordAdvice(p1.value); advice.textContent = p1.value ? t(a.key) : ""; advice.className = "advice " + (a.ok ? "ok" : "bad"); });
      var go = h("button.key.primary", { type: "submit", id: "s3Next" }, [t("next"), U.icon("next")]);
      var wait = h("p.door-msg", { role: "status" });
      frame([steps(3), h("h2.door-h", null, [ui.emo("🔐"), t("setup.s3.h")]), h("p", null, t("setup.s3.p1")),
        h("form", { onsubmit: function (e) {
          e.preventDefault();
          var a = C.passwordAdvice(p1.value);
          if (!a.ok) return ui.fieldError(p1, t(a.key));
          ui.fieldError(p1, "");
          if (p1.value !== p2.value) return ui.fieldError(p2, t("setup.noMatch"));
          go.disabled = true; wait.textContent = t("setup.preparing");
          B.prepareSetup({ storeName: draft.storeName, ownerName: draft.ownerName, currency: draft.currency, password: p1.value }).then(function (prep) {
            p1.value = p2.value = ""; setup.step4(prep);
          }, function (e) { go.disabled = false; wait.textContent = t("door.problem"); console.error(e); });
        } }, [ui.field("setup.password", p1, { required: true, tip: "tip.password" }), advice, ui.field("setup.password2", p2, { required: true }),
          h("label.check", { for: "setupShow" }, [show, t("setup.show")]), wait,
          h("div.door-actions", null, [h("button.key", { type: "button", onclick: setup.step2 }, [U.icon("back"), t("back")]), go])])], true);
    },
    step4: function (prep) {
      door.view = function () { setup.step4(prep); };
      frame([steps(4), h("h2.door-h", null, [ui.emo("🗝️"), t("setup.s4.h")]), h("p", null, t("setup.s4.p1")),
        masterGrid(prep.code), h("p.hint", null, t("setup.s4.p2")),
        h("div.door-actions", null, [
          h("button.key", { type: "button", onclick: function () { printMaster(prep.code, draft.storeName); } }, [ui.emo("🖨️"), t("setup.print")]),
          h("button.key.primary", { type: "button", id: "s4Next", onclick: function () { setup.step5(prep); } }, [t("setup.written"), U.icon("next")])])], true);
    },
    step5: function (prep) {
      door.view = function () { setup.step5(prep); };
      var groups = C.groups(prep.code), a = 1 + Math.floor(Math.random() * 6), b = 7 + Math.floor(Math.random() * 6);
      var ga = ui.input({ id: "confirmA", maxlength: "4", autocapitalize: "characters", class: "mono" }), gb = ui.input({ id: "confirmB", maxlength: "4", autocapitalize: "characters", class: "mono" });
      var go = h("button.key.hero", { type: "submit", id: "s5Finish" }, [ui.emo("🎉"), t("setup.finish")]);
      var wait = h("p.door-msg", { role: "status" });
      frame([steps(5), h("h2.door-h", null, [ui.emo("✅"), t("setup.s5.h")]), h("p", null, t("setup.s5.p1")),
        h("form", { onsubmit: function (e) {
          e.preventDefault();
          if (C.cleanMasterText(ga.value) !== groups[a - 1]) return ui.fieldError(ga, t("setup.groupWrong"));
          ui.fieldError(ga, "");
          if (C.cleanMasterText(gb.value) !== groups[b - 1]) return ui.fieldError(gb, t("setup.groupWrong"));
          go.disabled = true; wait.textContent = t("setup.writing");
          prep.finish().then(function () { draft = {}; E.app.opened(true); }, function (e) { go.disabled = false; wait.textContent = t("door.problem"); console.error(e); });
        } }, [h("div.pair", null, [ui.field(t("setup.group", { n: a }), ga, { required: true }), ui.field(t("setup.group", { n: b }), gb, { required: true })]), wait,
          h("div.door-actions", null, [h("button.key", { type: "button", onclick: function () { setup.step4(prep); } }, [U.icon("back"), t("setup.seeAgain")]), go])])], true);
    }
  };
  door.masterGrid = masterGrid;
  function masterGrid(code) {
    return h("ol.master-grid", { "aria-label": t("master.title") }, C.groups(code).map(function (g, i) {
      return h("li", null, [h("span.mg-n", null, String(i + 1)), h("span.mg-g.mono", null, g)]);
    }));
  }
  door.printMaster = printMaster;
  function printMaster(code, storeName) {
    ui.print(h("div.print-card", null, [ui.seal(90), h("h1", null, "🗝️ " + t("master.card.h")), h("p", null, storeName),
      masterGrid(code), h("p", null, t("master.card.p1")), h("p", null, t("master.card.p2")),
      h("p.small", null, t("master.card.made", { d: ui.dateLong(new Date()) }) + " · Emporium " + t("build") + " " + E.BUILD.number)]));
  }

  /* ---------- the Master Key opens the store and sets a new password ---------- */
  var masterRecovery = screen(function () {
    var code = h("textarea.mono", { id: "masterIn", rows: "3", spellcheck: "false", autocapitalize: "characters", autocomplete: "off" });
    var msg = h("p.door-msg", { role: "status" });
    var go = h("button.key.primary", { type: "submit", id: "masterCheck" }, [ui.emo("🗝️"), t("master.check")]);
    frame([crest(t("master.title")), h("p", null, t("master.p1")),
      h("form", { onsubmit: function (e) {
        e.preventDefault(); go.disabled = true; msg.textContent = t("master.checking");
        B.checkMaster(code.value).then(function (handle) { code.value = ""; newPassword(handle); }, function (e) {
          go.disabled = false; msg.textContent = "";
          ui.fieldError(code, t(e && e.code === "badcode" ? "master.badcode" : "master.wrong"));
        });
      } }, [ui.field("master.label", code, { hint: t("master.hint") }), msg,
        h("div.door-actions", null, [h("button.key", { type: "button", onclick: function () { door.show(); } }, [U.icon("back"), t("back")]), go])])], true);
  });
  var newPassword = screen(function (handle) {
    var p1 = ui.input({ type: "password", id: "newPw1", autocomplete: "new-password" }), p2 = ui.input({ type: "password", id: "newPw2", autocomplete: "new-password" });
    var go = h("button.key.primary", { type: "submit", id: "newPwSave" }, [U.icon("check"), t("master.save")]);
    var msg = h("p.door-msg", { role: "status" });
    frame([crest(t("master.newPw")), h("p", null, t("master.newPwP")),
      h("form", { onsubmit: function (e) {
        e.preventDefault();
        var a = C.passwordAdvice(p1.value);
        if (!a.ok) return ui.fieldError(p1, t(a.key));
        ui.fieldError(p1, "");
        if (p1.value !== p2.value) return ui.fieldError(p2, t("setup.noMatch"));
        go.disabled = true; msg.textContent = t("setup.writing");
        B.resetPasswordWithMaster(handle, p1.value).then(function () { p1.value = p2.value = ""; U.prefSet("fails", "0"); U.prefSet("waitUntil", "0"); E.app.opened(); ui.toast(t("master.done"), "good"); },
          function (e) { go.disabled = false; msg.textContent = t("door.problem"); console.error(e); });
      } }, [ui.field("setup.password", p1, { required: true, tip: "tip.password" }), ui.field("setup.password2", p2, { required: true }), msg, h("div.door-actions", null, [go])])], true);
  });

  /* ---------- restoring a backup (at the door, or from Settings) ---------- */
  var restore = screen(function (fromDoor) {
    var file = h("input", { type: "file", id: "restoreFile", accept: ".emporium,.json,application/json" });
    var msg = h("p.door-msg", { role: "status" });
    var body = h("div");
    function back() { if (B.isOpen) ui.shell(); else door.show(); }
    file.addEventListener("change", function () {
      var f = file.files && file.files[0]; if (!f) return;
      msg.textContent = t("restore.reading");
      f.text().then(B.readBackup).then(function (bk) { msg.textContent = ""; chosen(bk); }, function (e) {
        msg.textContent = t(e && e.code === "corrupt" ? "restore.corrupt" : "restore.notBackup");
      });
    });
    function chosen(bk) {
      U.clear(body);
      var secret = ui.input({ type: "password", id: "restoreSecret", autocomplete: "off" }), useMaster = h("input", { type: "checkbox", id: "restoreMaster" });
      useMaster.addEventListener("change", function () { secret.type = useMaster.checked ? "text" : "password"; });
      var go = h("button.key.primary", { type: "submit", id: "restoreGo" }, [ui.emo("💾"), t("restore.go")]);
      body.appendChild(h("div.card.inset", null, [h("p", null, [h("strong", null, (bk.door && bk.door.storeName) || "Emporium")]),
        h("p.hint", null, t("restore.summary", { d: E.fmtDate(new Date(bk.at), "long") + " " + E.fmtTime(new Date(bk.at)), n: bk.journal.length, b: bk.build }))]));
      body.appendChild(h("form", { onsubmit: function (e) {
        e.preventDefault();
        if (!secret.value) return ui.fieldError(secret, t("restore.needSecret"));
        var go2 = function () {
          go.disabled = true; msg.textContent = t("restore.working");
          B.restoreBackup(bk, secret.value, useMaster.checked).then(function () { secret.value = ""; E.app.opened(); ui.toast(t("restore.done"), "good"); }, function (e) {
            go.disabled = false; msg.textContent = "";
            ui.fieldError(secret, t(e && (e.code === "wrong" || e.code === "wrongmaster" || e.code === "badcode") ? "restore.wrong" : e && e.code === "chain" ? "restore.chain" : "door.problem"));
          });
        };
        if (info && info.hasStore) ui.confirm(t("restore.replaceT"), t("restore.replaceP"), t("restore.replaceYes"), "danger").then(function (ok) { if (ok) go2(); });
        else go2();
      } }, [ui.field("restore.secret", secret, { hint: t("restore.secretHint") }), h("label.check", { for: "restoreMaster" }, [useMaster, t("restore.isMaster")]), msg,
        h("div.door-actions", null, [h("button.key", { type: "button", onclick: back }, [U.icon("back"), t("back")]), go])]));
    }
    B.boot().then(function (r) {
      info = r;
      frame([crest(t("restore.title")), h("p", null, t("restore.p1")), ui.field("restore.file", file), msg, body,
        h("div.door-actions", null, [h("button.key", { type: "button", onclick: back }, [U.icon("back"), t("back")])])], true);
    });
  });
  door.restore = restore;
})();
