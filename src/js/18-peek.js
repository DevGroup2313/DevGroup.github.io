/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   See the password: every password field in Lakay, wherever it appears (the sign-in, the set-up, a new password,
   a backup, Settings), always carries a key that shows what is typed and hides it again. It helps anyone who loses
   track of what they typed, and is part of the app's AuDHD support. The field keeps the focus while the key is used. */
"use strict";
(function () {
  var h = E.util.h, t = E.t;
  function paint(inp, key) {
    var shown = inp.type !== "password", l = t(shown ? "pw.hide" : "pw.show");
    key.textContent = shown ? "🙈" : "👁️"; key.title = l; key.setAttribute("aria-label", l); key.setAttribute("aria-pressed", String(shown));
  }
  function deco(inp) {
    if (inp.getAttribute("data-peek")) return;
    inp.setAttribute("data-peek", "1");
    var wrap = h("span.pw-wrap");
    inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
    var key = h("button.pw-peek", { type: "button" });
    key.addEventListener("mousedown", function (e) { e.preventDefault(); });
    key.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      inp.type = inp.type === "password" ? "text" : "password"; paint(inp, key);
      try { var n = inp.value.length; inp.focus(); inp.setSelectionRange(n, n); } catch (x) { }
    });
    paint(inp, key);
    wrap.appendChild(key);
  }
  function scan() { Array.prototype.forEach.call(document.querySelectorAll('input[type="password"]:not([data-peek])'), deco); }
  try { new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) { }
  /* a field that another key turns to plain text (the Master Key box) keeps its key in step */
  document.addEventListener("change", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".pw-wrap > input"), function (inp) { var k = inp.parentNode.querySelector(".pw-peek"); if (k) paint(inp, k); });
  }, true);
  E.peek = { scan: scan };
})();
