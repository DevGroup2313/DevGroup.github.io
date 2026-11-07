/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The door and the sign-in, after Ingenium 6.50's own: the introduction card (Enter opens the practice store at once,
   with no set-up), the sign-in of the store's own books (user name and password), "Can't sign in?" (the Master Key,
   or a backup), and the three dialogs that protect the real store with a sign-in (the details, the Master Key in a
   numbered grid, two of its groups to be sure). Nothing here changes how the books are sealed: that is 04-books.js. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, C = E.crypto, ui = E.ui;
  var door = E.door = {};
  var info = null, draft = {};

  /* ---------- pieces ---------- */
  function clearApp() { var app = document.getElementById("app"); U.clear(app); return app; }
  /* Each screen is remembered, so that a change of language draws the same screen again. */
  function screen(fn) { return function () { var a = arguments; door.view = function () { fn.apply(null, a); }; return fn.apply(null, a); }; }
  function segOf(items, current, onPick, label, cls) {
    var g = h("div.i-seg", { role: "group", "aria-label": label });
    items.forEach(function (o) {
      var b = h("button.seg-btn" + (cls ? "." + cls : "") + (o[0] === current ? ".active" : ""), { type: "button", title: o[2] || o[1], "aria-label": o[2] || o[1], "aria-pressed": String(o[0] === current) }, o[1]);
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(g.children, function (x) { x.classList.toggle("active", x === b); x.setAttribute("aria-pressed", String(x === b)); });
        onPick(o[0]);
      });
      g.appendChild(b);
    });
    return g;
  }
  function themeSeg() {
    return segOf([["day", "☀", t("intro.light")], ["auto", "◐", t("intro.system")], ["night", "☾", t("intro.dark")]], U.prefGet("theme", "auto"),
      function (m) { U.prefSet("theme", m); ui.applyLook(); }, t("intro.themeGroup"));
  }
  function langSeg() {
    return segOf([["en", "EN", "English"], ["fr", "FR", "Français"], ["ht", "KR", "Kreyòl"]], E.lang,
      function (l) { E.setLang(l); if (door.view) door.view(); }, t("language"), "lang");
  }
  function label(text, input) { return h("label", null, [h("span", null, text), input]); }
  function field(id, type, auto, value) {
    return h("input#" + id, { type: type || "text", autocomplete: auto || "off", autocapitalize: "off", spellcheck: "false", value: value || "" });
  }

  /* The sign-in card, over everything (or, for the set-up, over the introduction card, in its place). */
  function lockDoor(mode) {
    var app = document.getElementById("app");
    var d = document.getElementById("lockDoor");
    if (!d) { d = h("div#lockDoor", { role: "dialog", "aria-modal": "true", "aria-label": t("ld.aria", { app: E.appName() }) }, h("div.ild-card")); app.appendChild(d); }
    d.hidden = false;
    d.classList.toggle("ild-over", mode === "intro" || mode === "app");
    d.classList.toggle("ild-indoor", mode === "intro");
    var intro = document.getElementById("introDoor");
    if (intro) intro.classList.toggle("ild-card-away", mode === "intro");
    var card = d.firstChild; U.clear(card); card.scrollTop = 0;
    return card;
  }
  function hideLock() {
    var d = document.getElementById("lockDoor"); if (d) d.remove();
    var intro = document.getElementById("introDoor"); if (intro) intro.classList.remove("ild-card-away");
  }
  door.hideLock = hideLock;
  function fill(card, kids) {
    kids.forEach(function (k) { if (k) card.appendChild(k); });
    setTimeout(function () {
      var ins = card.querySelectorAll("input:not([type=hidden]):not([type=file]),textarea"), f = null;
      for (var i = 0; i < ins.length; i++) if (!ins[i].value) { f = ins[i]; break; }
      f = f || ins[0] || card.querySelector("button.ild-key:not(.ild-ghost)");
      if (f) try { f.focus(); } catch (e) { }
    }, 40);
    return card;
  }
  function err(card, msg) {
    var e = card.querySelector(".ild-err");
    if (!e) {
      e = h("p.ild-err", { role: "alert" });
      var f = card.querySelector("form") || card, at = null;
      for (var i = 0; i < f.children.length; i++) { var ch = f.children[i]; if (ch.tagName === "LABEL" || /ild-(words|keys|pair)/.test(ch.className || "") || ch.querySelector("label")) { at = ch; break; } }
      f.insertBefore(e, at);
    }
    e.textContent = msg || ""; e.hidden = !msg;
    return false;
  }
  function busy(card, on) { Array.prototype.forEach.call(card.querySelectorAll(".ild-key"), function (b) { b.disabled = !!on; }); }
  function corner() { return h("div.ild-corner", null, langSeg()); }

  /* ---------- where the door starts ---------- */
  door.show = function (why) {
    if (B.mode === "practice") B.useBooks(false);
    return B.boot().then(function (r) {
      info = r;
      if (!r.hasStore) return intro();
      return signIn(why);
    });
  };

  /* ---------- the introduction (no store of its own yet) ---------- */
  var intro = screen(function () {
    var app = clearApp();
    var ghost = h("div.intro-ghost", { "aria-hidden": "true" }, [
      h("div.g-rail", null, [h("i"), h("i"), h("i"), h("i"), h("i"), h("i"), h("i")]),
      h("div.g-main", null, [h("i"), h("i"), h("div.g-row", null, [h("i"), h("i"), h("i")])])]);
    var enter = h("button.i-primary#introEnter", { type: "button" }, t("intro.enter"));
    var msg = h("p.intro-tourline.intro-msg", { role: "status" });
    function go() {
      enter.disabled = true; enter.textContent = t("intro.opening");
      B.openPractice(function (f) { msg.textContent = t("intro.preparing", { n: Math.round(f * 100) }); }).then(function () {
        E.app.opened(true);
      }, function (e) { enter.disabled = false; enter.textContent = t("intro.enter"); msg.textContent = t("door.problem"); console.error(e); });
    }
    enter.addEventListener("click", go);
    var seal = ui.crestKey(112, { cls: "intro-seal", id: "introSeal", rise: true, flourish: "burst", title: t("intro.knock"), onPress: function () { setTimeout(go, E.crest.still() ? 60 : 520); } });
    var card = h("div.intro-card", { role: "dialog", "aria-label": t("intro.aria", { app: E.appName() }) }, [
      h("div.intro-corner.intro-corner-l", null, langSeg()),
      h("div.intro-corner", null, themeSeg()),
      seal,
      h("div.intro-word", null, E.appName()),
      h("div.intro-subword", null, E.tagline()),
      h("p.intro-lede", null, t("intro.lede")),
      h("p.intro-tourline", null, [h("span", null, t("intro.moving") + " "), h("button.intro-tour#introRestore", { type: "button", onclick: function () { restore("intro"); } }, t("intro.restore"))]),
      enter, msg,
      h("p.intro-tourline.intro-protect", null, [h("button.intro-tour#introProtect", { type: "button", onclick: function () { door.startReal("intro"); } }, t("intro.protect")),
        h("br"), h("span", null, t("intro.protectP"))]),
      h("p.intro-credit", null, t("intro.credit"))]);
    app.appendChild(h("div#introDoor.intro-door", null, [ghost, h("div.intro-frost"), card]));
    setTimeout(function () { try { enter.focus(); } catch (e) { } }, 60);
  });

  /* ---------- the sign-in of the store's own books ---------- */
  function waitLeft() { var until = +U.prefGet("waitUntil", "0"); return Math.max(0, until - Date.now()); }
  var signIn = screen(function (why) {
    clearApp();
    var card = lockDoor("door");
    var known = (info && info.door && info.door.user) || "";
    var nm = field("ldName", "text", "username", known), pw = field("ldPw", "password", "current-password");
    var go = h("button.ild-key#ldGo", { type: "submit" }, t("ld.signIn"));
    function wrong() {
      var n = (+U.prefGet("fails", "0")) + 1; U.prefSet("fails", n);
      if (n >= 5) { var s = Math.min(900, 30 * Math.pow(2, n - 5)); U.prefSet("waitUntil", Date.now() + s * 1000); err(card, t("door.tooMany", { s: s })); }
      else err(card, t("ld.wrongPair"));
      busy(card, false); try { pw.select(); } catch (e) { }
    }
    var form = h("form#ldSign", { autocomplete: "on", onsubmit: function (e) {
      e.preventDefault();
      var left = waitLeft();
      if (left > 0) return err(card, t("door.wait", { s: Math.ceil(left / 1000) }));
      if (!pw.value) return err(card, t("door.needPassword"));
      busy(card, true); err(card, "");
      B.openWithPassword(pw.value).then(function () {
        if (known && !B.sameName(nm.value, known)) { B.lock("quiet"); return wrong(); }
        pw.value = ""; U.prefSet("fails", "0"); U.prefSet("waitUntil", "0");
        var p = known ? Promise.resolve() : B.setDoorUser(nm.value).catch(function () { });
        return p.then(function () { E.app.opened(); });
      }, function (x) {
        if (x && x.code === "wrong") return wrong();
        busy(card, false); err(card, t("door.problem")); console.error(x);
      });
    } }, [label(t("ld.yourName"), nm), label(t("ld.yourPw"), pw),
      h("div.ild-keys", null, [h("button.ild-link#ldForgot", { type: "button", onclick: ways }, t("ld.cant")), go])]);
    fill(card, [corner(), h("h1", null, E.appName()),
      (info && info.door && info.door.storeName) ? h("p.ild-store", null, info.door.storeName) : null,
      h("p.ild-sub", null, known ? t("ld.welcomeName", { name: known }) : t("ld.welcome")),
      why === "idle" ? h("p.ild-hint", null, t("door.lockedIdle")) : null,
      form,
      h("p.ild-note", null, [t("ld.note") + " ", h("button.ild-link#ldPractice", { type: "button", onclick: openPracticeFromDoor }, t("ld.practice"))])]);
  });
  function openPracticeFromDoor() {
    var d = document.getElementById("lockDoor"), card = d && d.firstChild;
    if (card) busy(card, true);
    B.openPractice().then(function () { E.app.opened(); }, function (e) { if (card) { busy(card, false); err(card, t("door.problem")); } console.error(e); });
  }

  /* ---------- can't sign in ---------- */
  function way(n, key, id, fn) {
    return h("button.ild-way#" + id, { type: "button", onclick: fn }, [h("i", null, n), h("div", null, [h("b", null, t(key + ".b")), h("small", null, t(key + ".s"))])]);
  }
  var ways = screen(function () {
    var card = lockDoor("door");
    fill(card, [h("h2", null, t("ld.ways.h")), h("p", null, t("ld.ways.p")),
      h("div.ild-ways", null, [way("1", "ld.way1", "ldWayMaster", masterOpen), way("2", "ld.way2", "ldWayBackup", function () { restore("door"); })]),
      h("div.ild-keys", null, [h("button.ild-link#ldBackSign", { type: "button", onclick: function () { door.show(); } }, t("ld.toSignIn"))])]);
  });
  var masterOpen = screen(function () {
    var card = lockDoor("door");
    var code = h("textarea#ldMaster", { rows: "3", spellcheck: "false", autocapitalize: "characters", autocomplete: "off" });
    var form = h("form#ldMk", { autocomplete: "off", onsubmit: function (e) {
      e.preventDefault(); busy(card, true); err(card, "");
      B.checkMaster(code.value).then(function (handle) { code.value = ""; newPassword(handle); }, function (x) {
        busy(card, false); err(card, t(x && x.code === "badcode" ? "master.badcode" : "master.wrong"));
      });
    } }, [label(t("ld.mk.label"), code),
      h("div.ild-keys", null, [h("button.ild-link#ldWays", { type: "button", onclick: ways }, t("ld.otherWays")), h("button.ild-key#ldMasterGo", { type: "submit" }, t("ld.mk.go"))])]);
    fill(card, [h("h2", null, t("ld.mk.h")), h("p", null, t("ld.mk.p")), form]);
  });
  var newPassword = screen(function (handle) {
    var card = lockDoor("door");
    var p1 = field("ldP1", "password", "new-password"), p2 = field("ldP2", "password", "new-password");
    var form = h("form#ldNp", { autocomplete: "off", onsubmit: function (e) {
      e.preventDefault();
      var a = C.passwordAdvice(p1.value); if (!a.ok) return err(card, t(a.key));
      if (p1.value !== p2.value) return err(card, t("setup.noMatch"));
      busy(card, true); err(card, "");
      B.resetPasswordWithMaster(handle, p1.value).then(function () {
        p1.value = p2.value = ""; U.prefSet("fails", "0"); U.prefSet("waitUntil", "0"); E.app.opened(); ui.toast(t("master.done"), "good");
      }, function (x) { busy(card, false); err(card, t("door.problem")); console.error(x); });
    } }, [label(t("ld.pw1"), p1), label(t("ld.pw2"), p2), h("div.ild-keys", null, [h("button.ild-key#ldSave", { type: "submit" }, t("ld.np.go"))])]);
    fill(card, [h("h2", null, t("ld.np.h")), h("p", null, t("ld.np.p")), form]);
  });

  /* ---------- protecting the real store with a sign-in (from the introduction, or from inside the practice store) ---------- */
  door.startReal = function (from) { draft = { from: from || "intro" }; setup1(); };
  function setupMode() { return draft.from === "app" && B.isOpen ? "app" : draft.from === "intro" ? "intro" : "door"; }
  function cancelSetup() {
    var from = draft.from; draft = {};
    if (from === "app" && B.isOpen) { hideLock(); return; }
    if (from === "intro" && document.getElementById("introDoor")) { hideLock(); door.view = intro; return; }
    door.show();
  }
  var setup1 = screen(function () {
    var card = lockDoor(setupMode());
    var store = field("ldStore", "text", "organization", draft.storeName), user = field("ldUser", "text", "username", draft.user);
    var p1 = field("ldP1", "password", "new-password"), p2 = field("ldP2", "password", "new-password");
    var form = h("form#ldSet", { autocomplete: "off", onsubmit: function (e) {
      e.preventDefault();
      var sn = store.value.trim(), un = user.value.trim();
      if (!sn) return err(card, t("setup.needStore"));
      if (!un) return err(card, t("ld.needUser"));
      var a = C.passwordAdvice(p1.value); if (!a.ok) return err(card, t(a.key));
      if (p1.value !== p2.value) return err(card, t("setup.noMatch"));
      draft.storeName = sn; draft.user = un; busy(card, true); err(card, "");
      var pwd = p1.value; p1.value = p2.value = "";
      B.boot().then(function (r) {
        /* the real store is made in its own database, never in the practice one */
        var reopen = B.mode === "practice";
        if (reopen) return B.useBooks(false), B.boot().then(function (r2) { return r2; });
        return r;
      }).then(function (r) {
        if (r.hasStore) throw Object.assign(new Error("exists"), { code: "exists" });
        return B.prepareSetup({ storeName: sn, ownerName: un, currency: "USD", password: pwd });
      }).then(function (prep) { draft.prep = prep; draft.ab = null; setup2(); }, function (x) {
        busy(card, false); err(card, t(x && x.code === "exists" ? "ld.exists" : "door.problem")); if (!x || x.code !== "exists") console.error(x);
      });
    } }, [label(t("ld.storeName"), store), label(t("ld.user"), user), label(t("ld.pw1"), p1), label(t("ld.pw2"), p2),
      h("div.ild-keys", null, [h("button.ild-key.ild-ghost#ldCancel", { type: "button", onclick: cancelSetup }, t("ld.notNow")), h("button.ild-key#ldNext", { type: "submit" }, t("ld.next"))])]);
    fill(card, [h("h2", null, t("ld.setup.h")), h("p", null, t("ld.setup.p")), form]);
  });
  function keyGrid(code) {
    return h("ol.ild-words", { "aria-label": t("master.title") }, C.groups(code).map(function (g, i) { return h("li", null, [h("b", null, String(i + 1)), g]); }));
  }
  var setup2 = screen(function () {
    var prep = draft.prep, card = lockDoor(setupMode());
    fill(card, [h("h2", null, t("ld.key.h")), h("p", null, t("ld.key.p")), keyGrid(prep.code),
      h("div.ild-keys", null, [
        h("button.ild-key.ild-ghost#ldPrint", { type: "button", onclick: function () { printMaster(prep.code, draft.storeName); } }, t("setup.print")),
        h("button.ild-key#ldWrote", { type: "button", onclick: setup3 }, t("ld.wrote"))])]);
  });
  var setup3 = screen(function () {
    var prep = draft.prep, groups = C.groups(prep.code);
    if (!draft.ab) draft.ab = [1 + Math.floor(Math.random() * 6), 7 + Math.floor(Math.random() * 7)];
    var a = draft.ab[0], b = draft.ab[1], card = lockDoor(setupMode());
    var g1 = h("input#ldG1.mono", { type: "text", maxlength: "4", autocapitalize: "characters", autocomplete: "off", spellcheck: "false" });
    var g2 = h("input#ldG2.mono", { type: "text", maxlength: "4", autocapitalize: "characters", autocomplete: "off", spellcheck: "false" });
    var form = h("form#ldCf", { autocomplete: "off", onsubmit: function (e) {
      e.preventDefault();
      if (C.cleanMasterText(g1.value) !== groups[a - 1] || C.cleanMasterText(g2.value) !== groups[b - 1]) return err(card, t("ld.groupsWrong"));
      busy(card, true); err(card, "");
      prep.finish().then(function () { draft = {}; hideLock(); E.app.opened(true); }, function (x) { busy(card, false); err(card, t("door.problem")); console.error(x); });
    } }, [h("div.ild-pair", null, [label(t("ld.group", { n: a }), g1), label(t("ld.group", { n: b }), g2)]),
      h("div.ild-keys", null, [h("button.ild-key.ild-ghost#ldAgain", { type: "button", onclick: setup2 }, t("ld.showAgain")), h("button.ild-key#ldSeal", { type: "submit" }, t("ld.seal"))])]);
    fill(card, [h("h2", null, t("ld.two.h")), h("p", null, t("ld.two.p", { a: a, b: b })), form]);
  });

  /* ---------- the Master Key card, and its grid (also used by Settings) ---------- */
  door.masterGrid = function (code) {
    return h("ol.master-grid", { "aria-label": t("master.title") }, C.groups(code).map(function (g, i) {
      return h("li", null, [h("span.mg-n", null, String(i + 1)), h("span.mg-g.mono", null, g)]);
    }));
  };
  door.printMaster = printMaster;
  function printMaster(code, storeName) {
    ui.print(h("div.print-card", null, [ui.seal(90), h("h1", null, t("master.card.h")), h("p", null, storeName),
      door.masterGrid(code), h("p", null, t("master.card.p1")), h("p", null, t("master.card.p2")),
      h("p.small", null, t("master.card.made", { d: ui.dateLong(new Date()) }) + " · Lakay " + t("build") + " " + E.BUILD.number)]));
  }

  /* ---------- bringing a store from a backup (at the door, or from Settings while open) ---------- */
  var restore = door.restore = screen(function (from) {
    var mode = from === "intro" ? "intro" : B.isOpen ? "app" : "door";
    var card = lockDoor(mode);
    var file = h("input#restoreFile", { type: "file", accept: ".lakay,.emporium,.json,application/json", hidden: true });
    var picked = h("span.ild-file", null, t("ld.rs.none"));
    var pick = h("button.ild-key.ild-ghost#restorePick", { type: "button", onclick: function () { file.click(); } }, t("ld.rs.choose"));
    var body = h("div");
    function back() { if (mode === "app") hideLock(); else if (mode === "intro") { hideLock(); door.view = intro; } else ways(); }
    file.addEventListener("change", function () {
      var f = file.files && file.files[0]; if (!f) return;
      picked.textContent = f.name; err(card, "");
      f.text().then(B.readBackup).then(chosen, function (x) { err(card, t(x && x.code === "corrupt" ? "restore.corrupt" : "restore.notBackup")); });
    });
    function chosen(bk) {
      U.clear(body);
      var secret = field("restoreSecret", "password", "off"), useMaster = h("input#restoreMaster", { type: "checkbox" });
      useMaster.addEventListener("change", function () { secret.type = useMaster.checked ? "text" : "password"; });
      var go = h("button.ild-key#restoreGo", { type: "submit" }, t("ld.rs.go")), armed = false;
      body.appendChild(h("p.ild-hint", null, [h("b", null, (bk.door && bk.door.storeName) || "Lakay"), " · ",
        t("restore.summary", { d: E.fmtDate(new Date(bk.at), "long") + " " + E.fmtTime(new Date(bk.at)), n: bk.journal.length, b: bk.build })]));
      body.appendChild(h("form#ldRs", { autocomplete: "off", onsubmit: function (e) {
        e.preventDefault();
        if (!secret.value) return err(card, t("restore.needSecret"));
        B.useBooks(false);
        B.boot().then(function (r) {
          info = r;
          if (r.hasStore && !armed) { armed = true; go.classList.add("ild-danger"); go.textContent = t("ld.rs.replace"); err(card, t("restore.replaceP")); return; }
          busy(card, true); err(card, "");
          return B.restoreBackup(bk, secret.value, useMaster.checked).then(function () { secret.value = ""; hideLock(); E.app.opened(); ui.toast(t("restore.done"), "good"); }, function (x) {
            busy(card, false);
            err(card, t(x && (x.code === "wrong" || x.code === "wrongmaster" || x.code === "badcode") ? "restore.wrong" : x && x.code === "chain" ? "restore.chain" : "door.problem"));
          });
        });
      } }, [label(t("restore.secret"), secret), h("label.ild-check", null, [useMaster, h("span", null, t("restore.isMaster"))]),
        h("div.ild-keys", null, [h("button.ild-link#restoreBack", { type: "button", onclick: back }, t("back")), go])]));
    }
    fill(card, [h("h2", null, t("ld.rs.h")), h("p", null, t("ld.rs.p")),
      h("div.ild-filepick", null, [file, pick, picked]), body,
      h("div.ild-keys.ild-keys-back", null, [h("button.ild-link#restoreCancel", { type: "button", onclick: back }, t("back"))])]);
  });
})();
