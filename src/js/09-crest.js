/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The mark: the Spiral, a nautilus cut in facets like a jewel, on an enamel plate with a fine champagne rim, a pearl at its
   heart: a nod to the lambi that calls people together, and to a business that grows turn by turn. Chosen and approved by
   the owner on 7 November 2026; the drawing stays as approved.
   It is made as a real object is, in depth, and lives as Ingenium's seal does. The coin has an edge (four planes behind
   the face, so its thickness shows as it turns). The halo and the shell cast their shadows on the plate, and float above
   them. The shell has sides (three planes under its faceted top). The engraving, the halo, the lattice, the pearl and the
   sparkles each stand at their own depth. The whole mark sways and leans toward the pointer; the halo, the shell and the
   pearl breathe in and out of depth out of step; the engraving and the shell turn one way, the halo and the sparkles the
   other; a gleam crosses the shell. A press winds it up like a flywheel, or turns it over, or brings the pearl forward.
   Each plane is a picture drawn once (src/brand/lakay-mark), by day and by night, put in the page by the build. Calm, and
   the system's "reduce motion", keep it still. */
"use strict";
(function () {
  var h = E.util.h;
  var K = E.crest = {};
  var MARK = "/*@@MARK@@*/";
  /* the planes, back to front: [picture, depth (a share of the width), group] */
  var PLANES = [
    ["edge", -0.07], ["edge", -0.0525], ["edge", -0.035], ["edge", -0.0175],
    ["plate", 0], ["engr", 0.012], ["hshadow", 0.018], ["sshadow", 0.022], ["halo", 0.10],
    ["sside", 0.17], ["sside", 0.185], ["sside", 0.20], ["shell", 0.215], ["lattice", 0.245],
    ["pearl", 0.33], ["sparks", 0.42]];
  var SMALL = { edge: 1, plate: 1, sside: 1, shell: 1, lattice: 1, pearl: 1 };
  var SHELL_Z = 0.215;
  function night() { try { return document.documentElement.getAttribute("data-theme") === "night"; } catch (e) { return false; } }
  function pics() { return (MARK && MARK[night() ? "night" : "day"]) || {}; }
  function still() {
    try { if (document.documentElement.getAttribute("data-calm") === "1") return true; } catch (e) { }
    try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }
  K.still = still;
  function picture(role, src) {
    var im = h("img.lk-l.lk-" + role, { alt: "", draggable: "false", decoding: "async", "data-role": role });
    im.src = src;
    return im;
  }

  /* The still mark: the same planes laid flat (for printing, and wherever a still emblem is wanted). */
  K.flat = function (size, label) {
    var p = pics(), box = h("span.lk-flat", label ? { role: "img", "aria-label": label } : { "aria-hidden": "true" });
    box.style.width = size + "px"; box.style.height = size + "px";
    ["plate", "engr", "hshadow", "sshadow", "halo", "sside", "shell", "lattice", "pearl", "sparks"].forEach(function (r) { if (p[r]) box.appendChild(picture(r, p[r])); });
    return box;
  };

  /* The live mark. o.label names it for screen readers; o.rise lets its planes gather when it first appears. */
  var SWAY = 0;
  K.make = function (size, o) {
    o = o || {};
    var W = Math.round(size), small = W < 30, p = pics();
    var root = h("span.lk-crest" + (small ? ".lk-small" : ""), o.label ? { role: "img", "aria-label": o.label } : { "aria-hidden": "true" });
    root.style.setProperty("--W", W + "px");
    var tilt = h("span.lk-tilt"), idle = h("span.lk-idle");
    idle.style.animationDelay = (-((SWAY++) * 1.7) % 8).toFixed(1) + "s";
    idle.appendChild(h("i.lk-cast"));
    var seenEdge = 0;
    PLANES.forEach(function (pl) {
      var role = pl[0];
      if (small && (!SMALL[role] || (role === "edge" && seenEdge++) || (role === "sside" && pl[1] !== 0.20))) return;
      if (!p[role]) return;
      var im = picture(role, p[role]); im.style.setProperty("--z", String(pl[1])); idle.appendChild(im);
      if (role === "shell" && !small) { var g = h("i.lk-gleam"); g.style.setProperty("--z", String(SHELL_Z + 0.004)); idle.appendChild(g); }
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
      var p = pics();
      Array.prototype.forEach.call(document.querySelectorAll("img.lk-l"), function (im) {
        var r = im.getAttribute("data-role"); if (p[r] && im.getAttribute("src") !== p[r]) im.src = p[r];
      });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  } catch (e) { }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wire(root) {
    root.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch" || still()) return; var r = root.getBoundingClientRect(); if (!r.width) return;
      var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; root.classList.add("hov");
      root.style.setProperty("--ry", (clamp(px, -.7, .7) * 30).toFixed(1) + "deg"); root.style.setProperty("--rx", (-clamp(py, -.7, .7) * 22).toFixed(1) + "deg");
    }, { passive: true });
    root.addEventListener("pointerleave", function () { root.classList.remove("hov", "down"); root.style.removeProperty("--rx"); root.style.removeProperty("--ry"); }, { passive: true });
    root.addEventListener("pointerdown", function () { root.classList.add("down"); }, { passive: true });
    ["pointerup", "pointercancel"].forEach(function (ev) { root.addEventListener(ev, function () { root.classList.remove("down"); }, { passive: true }); });
  }

  /* ---------- the flourishes ---------- */
  function anim(el, frames, opts) { if (!el || !el.animate) return null; try { opts.composite = "add"; return el.animate(frames, opts); } catch (e) { try { delete opts.composite; return el.animate(frames, opts); } catch (x) { return null; } } }
  function all(root, roles) { return Array.prototype.filter.call(root.querySelectorAll("img.lk-l"), function (im) { return roles.indexOf(im.getAttribute("data-role")) >= 0; }); }
  var SPRING = "cubic-bezier(.2,.8,.25,1)";
  /* the flywheel: the planes' own turning, wound up and let go */
  function wind(root, peak, ms) {
    var list = [];
    all(root, ["engr", "hshadow", "halo", "sshadow", "sside", "shell", "lattice", "sparks"]).forEach(function (el) {
      if (el.getAnimations) el.getAnimations().forEach(function (a) { if (/lkCW|lkCCW/.test(a.animationName || "")) list.push(a); });
    });
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
    /* the planes gather from the plate into their places */
    rise: function (r) {
      var W = r.__W || 88;
      Array.prototype.forEach.call(r.querySelectorAll("img.lk-l"), function (im, i) {
        var z = parseFloat(im.style.getPropertyValue("--z")) || 0; if (z <= 0) return;
        anim(im, [{ translate: "0 0 " + (-W * z).toFixed(1) + "px", opacity: 0 }, { translate: "0 0 0", opacity: 1 }], { duration: 900 + z * 1800, easing: SPRING });
      });
      wind(r, 22, 1800);
    },
    /* the rings and the shell whirl in counter motion, then slow back down like a flywheel */
    spin: function (r) { wind(r, 60, 2400); },
    /* the whole mark turns over, and its edge shows */
    turn: function (r) {
      wind(r, 18, 1600);
      anim(r.querySelector(".lk-idle"), [{ transform: "rotateY(0deg)" }, { transform: "rotateY(360deg)" }], { duration: 1400, easing: "cubic-bezier(.45,.05,.25,1)" });
    },
    /* the pearl comes forward, the shell and the halo lift after it */
    pulse: function (r) {
      var W = r.__W || 88;
      all(r, ["pearl"]).forEach(function (el) { anim(el, [{ translate: "0 0 0" }, { translate: "0 0 " + (W * .16).toFixed(1) + "px", offset: .35 }, { translate: "0 0 0" }], { duration: 950, easing: "ease-out" }); });
      all(r, ["sside", "shell", "lattice"]).forEach(function (el) { anim(el, [{ translate: "0 0 0" }, { translate: "0 0 " + (W * .08).toFixed(1) + "px", offset: .4 }, { translate: "0 0 0" }], { duration: 1050, easing: "ease-out" }); });
      all(r, ["halo"]).forEach(function (el) { anim(el, [{ translate: "0 0 0" }, { translate: "0 0 " + (W * .07).toFixed(1) + "px", offset: .45 }, { translate: "0 0 0" }], { duration: 1150, easing: "ease-out" }); });
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
    if (E.sound && name !== "rise") E.sound.play(name === "spin" ? "whirl" : name === "turn" ? "page" : "soft");
  };
  K.order = ORDER.slice();
})();
