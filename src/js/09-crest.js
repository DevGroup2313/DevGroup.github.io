/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The mark: the Spiral, a shell cut in facets like a jewel and set in gold, a nod to the lambi that calls people
   together and to a business that grows turn by turn. Chosen by the owner on 7 November 2026.
   As the marks of the Offline Project are made, it is layers at different depths, and it lives as Ingenium's seal does:
   seven layers (the plate, the engraved guilloche, the gold halo with its beads, the faceted shell, its gold lattice,
   the pearl, three sparkles), each moving on its own. The whole mark sways and leans toward the pointer; the layers
   breathe in and out of depth out of step with one another; the engraving and the shell turn one way, the halo and
   the sparkles the other; a gleam of light crosses the shell; the pearl breathes. A press winds it all up like a
   flywheel (the rings and the shell whirl in counter motion and slow back down), or turns the mark over, or brings
   the pearl forward. Each layer is a picture drawn once
   (src/brand/lakay-mark), by day and by night, put in the page by the build. Calm, and the system's "reduce motion",
   keep it still. */
"use strict";
(function () {
  var h = E.util.h;
  var K = E.crest = {};
  var MARK = "/*@@MARK@@*/";
  var Z = [0, 0.012, 0.05, 0.14, 0.2, 0.27, 0.32];
  var SHELL = 3;
  function night() { try { return document.documentElement.getAttribute("data-theme") === "night"; } catch (e) { return false; } }
  function layers() { return (MARK && MARK[night() ? "night" : "day"]) || []; }
  function still() {
    try { if (document.documentElement.getAttribute("data-calm") === "1") return true; } catch (e) { }
    try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }
  K.still = still;
  function picture(i, src) {
    var im = h("img.lk-l.lk-l" + i, { alt: "", draggable: "false", decoding: "async", "data-i": String(i) });
    im.src = src;
    return im;
  }

  /* The still mark: the same layers, flat (for printing, and wherever a still emblem is wanted). */
  K.flat = function (size, label) {
    var s = layers(), box = h("span.lk-flat", label ? { role: "img", "aria-label": label } : { "aria-hidden": "true" });
    box.style.width = size + "px"; box.style.height = size + "px";
    s.forEach(function (src, i) { box.appendChild(picture(i, src)); });
    return box;
  };

  /* The live mark. o.label names it for screen readers; o.rise lets its layers gather when it first appears. */
  var SWAY = 0;
  K.make = function (size, o) {
    o = o || {};
    var W = Math.round(size);
    var root = h("span.lk-crest" + (W < 30 ? ".lk-small" : ""), o.label ? { role: "img", "aria-label": o.label } : { "aria-hidden": "true" });
    root.style.setProperty("--W", W + "px");
    var tilt = h("span.lk-tilt"), idle = h("span.lk-idle");
    idle.style.animationDelay = (-((SWAY++) * 1.7) % 7).toFixed(1) + "s";
    idle.appendChild(h("i.lk-cast"));
    var s = layers();
    s.forEach(function (src, i) {
      var im = picture(i, src); im.style.setProperty("--z", String(Z[i])); idle.appendChild(im);
      if (i === SHELL) { var g = h("i.lk-gleam"); g.style.setProperty("--z", String(Z[SHELL] + .004)); idle.appendChild(g); }
    });
    tilt.appendChild(idle); root.appendChild(tilt);
    wire(root);
    root.__crest = true; root.__W = W;
    if (o.rise && !still()) setTimeout(function () { K.play(root, "rise", true); }, 60);
    return root;
  };

  /* by night the mark wears its night dress */
  try {
    new MutationObserver(function () {
      var s = layers();
      Array.prototype.forEach.call(document.querySelectorAll("img.lk-l"), function (im) {
        var i = +im.getAttribute("data-i"); if (s[i] && im.getAttribute("src") !== s[i]) im.src = s[i];
      });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  } catch (e) { }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wire(root) {
    root.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch" || still()) return; var r = root.getBoundingClientRect(); if (!r.width) return;
      var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; root.classList.add("hov");
      root.style.setProperty("--ry", (clamp(px, -.7, .7) * 26).toFixed(1) + "deg"); root.style.setProperty("--rx", (-clamp(py, -.7, .7) * 18).toFixed(1) + "deg");
    }, { passive: true });
    root.addEventListener("pointerleave", function () { root.classList.remove("hov", "down"); root.style.removeProperty("--rx"); root.style.removeProperty("--ry"); }, { passive: true });
    root.addEventListener("pointerdown", function () { root.classList.add("down"); }, { passive: true });
    ["pointerup", "pointercancel"].forEach(function (ev) { root.addEventListener(ev, function () { root.classList.remove("down"); }, { passive: true }); });
  }

  /* ---------- the flourishes ---------- */
  function anim(el, frames, opts) { if (!el || !el.animate) return null; try { opts.composite = "add"; return el.animate(frames, opts); } catch (e) { try { delete opts.composite; return el.animate(frames, opts); } catch (x) { return null; } } }
  function layer(root, i) { return root.querySelector("img.lk-l" + i); }
  var SPRING = "cubic-bezier(.2,.8,.25,1)";
  /* the flywheel: the rings' own turning, wound up and let go */
  function wind(root, peak, ms) {
    var list = [];
    [1, 2, 3, 4, 6].forEach(function (i) { var el = layer(root, i); if (el && el.getAnimations) el.getAnimations().forEach(function (a) { if (/lkCW|lkCCW/.test(a.animationName || "")) list.push(a); }); });
    if (!list.length) return;
    var t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / ms), rate = 1 + (peak - 1) * Math.pow(1 - t, 2.4);
      list.forEach(function (a) { try { if (a.updatePlaybackRate) a.updatePlaybackRate(rate); else a.playbackRate = rate; } catch (e) { } });
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var FL = {
    /* the layers gather from the plate into their places */
    rise: function (r) {
      var W = r.__W || 88;
      for (var i = 1; i < Z.length; i++) {
        anim(layer(r, i), [{ translate: "0 0 " + (-W * Z[i]).toFixed(1) + "px", opacity: 0 }, { translate: "0 0 0", opacity: 1 }], { duration: 900 + i * 110, easing: SPRING });
      }
      wind(r, 22, 1800);
    },
    /* the rings and the shell whirl in counter motion, then slow back down like a flywheel */
    spin: function (r) { wind(r, 60, 2400); },
    /* the whole mark turns over */
    turn: function (r) {
      wind(r, 18, 1600);
      anim(r.querySelector(".lk-idle"), [{ transform: "rotateY(0deg)" }, { transform: "rotateY(360deg)" }], { duration: 1250, easing: "cubic-bezier(.45,.05,.25,1)" });
    },
    /* the pearl comes forward, the halo lifts after it */
    pulse: function (r) {
      var W = r.__W || 88;
      anim(layer(r, 5), [{ translate: "0 0 0" }, { translate: "0 0 " + (W * .14).toFixed(1) + "px", offset: .35 }, { translate: "0 0 0" }], { duration: 950, easing: "ease-out" });
      anim(layer(r, 2), [{ translate: "0 0 0" }, { translate: "0 0 " + (W * .07).toFixed(1) + "px", offset: .45 }, { translate: "0 0 0" }], { duration: 1100, easing: "ease-out" });
      wind(r, 12, 1400);
    }
  };
  var ORDER = ["spin", "turn", "pulse"];
  /* plays one flourish (named, or the next in turn); a calm screen keeps the mark still */
  K.play = function (root, name, force) {
    if (!root) return;
    if (!root.__crest) root = root.querySelector(".lk-crest"); if (!root) return;
    if (still()) return;
    if (!name) { root.__n = ((root.__n || 0) + 1) % ORDER.length; name = ORDER[(root.__n + ORDER.length - 1) % ORDER.length]; }
    (FL[name] || FL.spin)(root);
  };
  K.order = ORDER.slice();
})();
