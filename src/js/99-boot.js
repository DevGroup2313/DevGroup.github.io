/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Starting up: the door first; the rooms once the books are open; the door again whenever they lock. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui;
  E.app = {
    opened: function (fresh) {
      ui.applyLook(); ui.shell();
      var st = B.state();
      if (fresh) ui.toast(t("app.welcome"), "good");
      if (st && (st.headProblem || (st.unreadable && st.unreadable.length))) ui.toast(t("app.checkBooks"), "bad");
    }
  };
  B.on("lock", function (why) {
    Array.prototype.forEach.call(document.querySelectorAll(".layer"), function (n) { n.remove(); });
    U.clear(document.getElementById("print"));
    if (why === "restore") return;
    E.door.show(why);
  });
  window.addEventListener("hashchange", function () { if (B.isOpen) { var r = location.hash.replace("#", ""); if (r && r !== ui.current && ui.rooms[r]) ui.go(r); } });
  function fatal(e) {
    var app = document.getElementById("app"); U.clear(app);
    app.appendChild(h("div.door", null, h("main.door-main", null, h("div.door-card", null, [ui.seal(96), h("h1.brand", null, "Emporium"), h("p", null, t("app.noDb")), h("p.hint", null, String(e && e.message || e))]))));
  }
  function start() {
    E.setLang(E.lang); ui.applyLook();
    if (!window.indexedDB || !window.crypto || !crypto.subtle) { fatal(new Error(!window.indexedDB ? "IndexedDB" : "Web Crypto")); return; }
    E.door.show().catch(fatal);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
