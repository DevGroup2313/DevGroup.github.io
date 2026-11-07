/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The crest: Soleil, a gold sun rising over the sea, its rays set like an Art Deco fan, engraved on a periwinkle coin with a
   knurled rim and a brass hairline. Built as the crests of the Offline Project are: thin layers set at different depths, so
   that the coin sways slowly in three dimensions, leans toward the pointer, and answers a press with a flourish (the sun
   rises again, the rays burst, the coin turns over, a glint crosses its face). A flat copy of the same drawing serves for
   printing and for the app's icons. Calm, and the system's "reduce motion", keep it still. */
"use strict";
(function () {
  var h = E.util.h;
  var K = E.crest = {};
  var SUN = "M48.40 68.00A11.6 11.6 0 0 1 71.60 68.00Z";
  var RAYS = "M46.57 60.71L38.29 59.01L45.34 63.66ZM50.60 55.91L39.85 47.85L47.91 58.60ZM55.66 53.34L51.01 46.29L52.71 54.57ZM61.90 52.80L60.00 39.50L58.10 52.80ZM67.29 54.57L68.99 46.29L64.34 53.34ZM72.09 58.60L80.15 47.85L69.40 55.91ZM74.66 63.66L81.71 59.01L73.43 60.71Z";
  var SEA = "M35 68.2H85M43 74.4H77M51.5 80.4H68.5";
  function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  /* the knurled edge of the coin: 72 fine ticks */
  var TICKS = (function () { var p = ""; for (var i = 0; i < 72; i++) { var a = i * Math.PI / 36, c = Math.cos(a), s = Math.sin(a);
    p += "M" + f2(60 + 53.7 * c) + " " + f2(60 + 53.7 * s) + "L" + f2(60 + 55.5 * c) + " " + f2(60 + 55.5 * s); } return p; })();
  /* the engraving behind the sun: fine lines fanning out over the sky, as on a coin or a banknote */
  var ENGRAVE = (function () { var p = ""; for (var d = 186; d <= 354; d += 4) { var a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    p += "M" + f2(60 + 17.7 * c) + " " + f2(69.1 + 17.7 * s) + "L" + f2(60 + 43.5 * c) + " " + f2(69.1 + 43.5 * s); } return p; })();
  /* four small diamonds on the turning ring, at the points of the compass */
  var DIAMONDS = "M60 12.6L61.5 14.5L60 16.4L58.5 14.5ZM60 103.6L61.5 105.5L60 107.4L58.5 105.5ZM12.6 60L14.5 58.5L16.4 60L14.5 61.5ZM103.6 60L105.5 58.5L107.4 60L105.5 61.5Z";

  var GOLD = '<linearGradient id="q_gold" x1="0" y1="0" x2="0" y2="1"><stop class="lk-g0" offset="0" stop-color="#ffe9a8"/><stop class="lk-g1" offset=".55" stop-color="#f2c66c"/><stop class="lk-g2" offset="1" stop-color="#cf8a34"/></linearGradient>';
  var SUNG = '<radialGradient id="q_sun" cx=".5" cy=".95" r=".95"><stop class="lk-s0" offset="0" stop-color="#fff4cf"/><stop class="lk-g1" offset=".55" stop-color="#f4c766"/><stop class="lk-g2" offset="1" stop-color="#d08a35"/></radialGradient>';
  var LIFT = '<filter id="q_lift" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation=".9" result="b"/><feOffset in="b" dx=".5" dy="1.3" result="o"/>' +
    '<feFlood class="lk-castc" flood-color="#5a3a10" flood-opacity=".26"/><feComposite in2="o" operator="in" result="cast"/><feOffset in="SourceAlpha" dx="-.45" dy="-.55" result="a"/>' +
    '<feComposite in="SourceAlpha" in2="a" operator="out" result="e"/><feGaussianBlur in="e" stdDeviation=".2" result="eb"/><feComposite in="eb" in2="SourceAlpha" operator="in" result="ec"/>' +
    '<feFlood flood-color="#fffbe8" flood-opacity=".55"/><feComposite in2="ec" operator="in" result="hi"/>' +
    '<feMerge><feMergeNode in="cast"/><feMergeNode in="SourceGraphic"/><feMergeNode in="hi"/></feMerge></filter>';
  var BIG = 'transform="translate(60 62) scale(1.18) translate(-60 -62)"';
  var HZ = '<clipPath id="q_hz"><rect x="0" y="0" width="120" height="68.7"/></clipPath>';

  /* the layers, back to front, and how far each stands out of the coin (a share of its width) */
  var LAYERS = [
    { k: "side", z: -0.04, svg: '<defs><linearGradient id="q_edge" x1="0" y1="0" x2="1" y2="1"><stop class="lk-e0" offset="0" stop-color="#5c63c6"/><stop class="lk-e1" offset="1" stop-color="#2a2d78"/></linearGradient></defs>' +
      '<circle cx="60" cy="60" r="56.8" fill="url(#q_edge)"/>' },
    { k: "base", z: 0, svg: '<defs><linearGradient id="q_rim" x1="0" y1="0" x2="1" y2="1"><stop class="lk-r0" offset="0" stop-color="#ebe6ff"/><stop class="lk-r1" offset=".48" stop-color="#8f9cec"/><stop class="lk-r2" offset="1" stop-color="#4f56b8"/></linearGradient>' +
      '<linearGradient id="q_bev" x1="0" y1="0" x2="1" y2="1"><stop class="lk-i0" offset="0" stop-color="#4f56b8"/><stop class="lk-i1" offset="1" stop-color="#f1eeff"/></linearGradient>' +
      '<linearGradient id="q_face" x1="0" y1="0" x2="0" y2="1"><stop class="lk-f0" offset="0" stop-color="#fbfaff"/><stop class="lk-f1" offset=".6" stop-color="#f6f2fb"/><stop class="lk-f2" offset="1" stop-color="#e9e8fa"/></linearGradient>' +
      '<radialGradient id="q_dawn" cx=".5" cy=".58" r=".46"><stop class="lk-d0" offset="0" stop-color="#ffcfa6" stop-opacity=".78"/><stop class="lk-d1" offset=".55" stop-color="#ffdcc0" stop-opacity=".28"/><stop class="lk-d1" offset="1" stop-color="#ffdcc0" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="q_sea" x1="0" y1="0" x2="0" y2="1"><stop class="lk-w0" offset="0" stop-color="#d4d8fa" stop-opacity=".22"/><stop class="lk-w1" offset="1" stop-color="#b3baf0" stop-opacity=".62"/></linearGradient>' +
      '<linearGradient id="q_spec" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".4" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="q_in"><circle cx="60" cy="60" r="51.2"/></clipPath></defs>' +
      '<circle cx="60" cy="60" r="56.6" fill="url(#q_rim)"/>' +
      '<path class="lk-tk" d="' + TICKS + '" stroke="#ffffff" stroke-opacity=".5" stroke-width=".55" stroke-linecap="round"/>' +
      '<circle cx="60" cy="60" r="52.5" fill="url(#q_bev)"/>' +
      '<g clip-path="url(#q_in)"><circle cx="60" cy="60" r="51.2" fill="url(#q_face)"/><circle cx="60" cy="67" r="50" fill="url(#q_dawn)"/>' +
      '<rect x="0" y="69.6" width="120" height="44" fill="url(#q_sea)"/>' +
      '<path class="lk-en" d="' + ENGRAVE + '" stroke="#6f78d8" stroke-opacity=".17" stroke-width=".4" stroke-linecap="round"/></g>' +
      '<circle class="lk-br" cx="60" cy="60" r="49" fill="none" stroke="#c08b2f" stroke-opacity=".7" stroke-width=".55"/>' +
      '<circle cx="60" cy="60" r="56.2" fill="none" stroke="url(#q_spec)" stroke-width=".8"/>' },
    { k: "ring", z: 0.025, svg: '<g class="lk-ring-g"><circle class="lk-rg" cx="60" cy="60" r="45.5" fill="none" stroke="#6f78d8" stroke-opacity=".42" stroke-width=".7" stroke-dasharray=".6 2.4" stroke-linecap="round"/>' +
      '<path class="lk-dm" d="' + DIAMONDS + '" fill="#c08b2f" fill-opacity=".8"/></g>' },
    { k: "glow", z: 0.045, svg: '<defs><radialGradient id="q_glow" cx=".5" cy=".5" r=".5"><stop class="lk-h0" offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop class="lk-h0" offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>' +
      '<circle class="lk-glow" cx="60" cy="65" r="31" fill="url(#q_glow)"/>' },
    { k: "sea", z: 0.06, svg: '<defs>' + GOLD + LIFT + '</defs><g ' + BIG + '><path d="' + SEA + '" fill="none" stroke="url(#q_gold)" stroke-width="2.3" stroke-linecap="round" filter="url(#q_lift)"/></g>' },
    { k: "rays", z: 0.085, svg: '<defs>' + GOLD + LIFT + HZ + '</defs><g ' + BIG + '><g clip-path="url(#q_hz)"><g class="lk-rays-g"><path d="' + RAYS + '" fill="url(#q_gold)" filter="url(#q_lift)"/></g></g></g>' },
    { k: "sun", z: 0.105, svg: '<defs>' + SUNG + LIFT + HZ + '</defs><g ' + BIG + '><g clip-path="url(#q_hz)"><g class="lk-sun-g"><path d="' + SUN + '" fill="url(#q_sun)" filter="url(#q_lift)"/>' +
      '<path d="M51.6 66.2A8.6 8.6 0 0 1 60 59.4" fill="none" stroke="#fffbe8" stroke-opacity=".75" stroke-width=".8" stroke-linecap="round"/></g></g></g>' },
    { k: "glint", z: 0.012, svg: '<defs><linearGradient id="q_band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="q_gc"><circle cx="60" cy="60" r="51"/></clipPath></defs><g clip-path="url(#q_gc)"><g class="lk-glint-g"><rect x="-30" y="-20" width="22" height="160" fill="url(#q_band)" transform="rotate(24 60 60)"/></g></g>' }
  ];

  var N = 0;
  function parse(inner, n) {
    var src = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' + inner.split("q_").join("k" + n + "_") + "</svg>";
    return document.importNode(new DOMParser().parseFromString(src, "image/svg+xml").documentElement, true);
  }
  function still() {
    try { if (document.documentElement.getAttribute("data-calm") === "1") return true; } catch (e) { }
    try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }
  K.still = still;

  /* The flat drawing: every layer in one picture (for printing, the icons, and wherever a still emblem is wanted). */
  K.flat = function (size, label) {
    var n = ++N, inner = "";
    LAYERS.forEach(function (L) { if (L.k !== "glint" && L.k !== "side") inner += L.svg; });
    var svg = parse(inner, n);
    svg.setAttribute("width", size); svg.setAttribute("height", size); svg.setAttribute("class", "seal lk-flat");
    if (label) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label); } else svg.setAttribute("aria-hidden", "true");
    return svg;
  };
  K.flatSource = function () {
    var inner = ""; LAYERS.forEach(function (L) { if (L.k !== "glint" && L.k !== "side") inner += L.svg; });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' + inner.split("q_").join("f_") + "</svg>";
  };

  /* The live crest. o.label names it for screen readers; o.rise lets the sun rise when it first appears. */
  var SWAY = 0;
  K.make = function (size, o) {
    o = o || {};
    var n = ++N, W = Math.round(size);
    var root = h("span.lk-crest" + (W < 30 ? ".lk-small" : ""), o.label ? { role: "img", "aria-label": o.label } : { "aria-hidden": "true" });
    root.style.setProperty("--W", W + "px");
    var tilt = h("span.lk-tilt"), idle = h("span.lk-idle");
    idle.style.animationDelay = (-((SWAY++) * 1.7) % 7).toFixed(1) + "s";
    idle.appendChild(h("i.lk-cast"));
    LAYERS.forEach(function (L) {
      if (W < 30 && (L.k === "glint" || L.k === "ring")) return;
      var s = parse(L.svg, n); s.setAttribute("class", "lk-l lk-" + L.k); s.setAttribute("aria-hidden", "true"); s.style.setProperty("--z", String(L.z));
      idle.appendChild(s);
    });
    tilt.appendChild(idle); root.appendChild(tilt);
    wire(root);
    root.__crest = true;
    if (o.rise && !still()) setTimeout(function () { K.play(root, "rise", true); }, 80);
    return root;
  };

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
  function anim(el, frames, opts) { if (!el || !el.animate) return null; try { return el.animate(frames, opts); } catch (e) { return null; } }
  function part(root, sel) { return root.querySelector(sel); }
  var SPRING = "cubic-bezier(.2,.8,.25,1)";
  var FL = {
    rise: function (r) {
      anim(part(r, ".lk-sun-g"), [{ transform: "translateY(15px)" }, { transform: "translateY(-1.2px)", offset: .72 }, { transform: "translateY(0)" }], { duration: 1300, easing: SPRING });
      anim(part(r, ".lk-rays-g"), [{ transform: "translateY(16px) scale(.7)", opacity: 0 }, { transform: "translateY(0) scale(1.06)", opacity: 1, offset: .75 }, { transform: "translateY(0) scale(1)", opacity: 1 }], { duration: 1500, easing: SPRING });
      anim(part(r, ".lk-glow"), [{ opacity: 0 }, { opacity: 1, offset: .7 }, { opacity: 1 }], { duration: 1500, easing: "ease-out" });
    },
    burst: function (r) {
      anim(part(r, ".lk-rays-g"), [{ transform: "scale(1)" }, { transform: "scale(1.2)", offset: .3 }, { transform: "scale(.96)", offset: .62 }, { transform: "scale(1)" }], { duration: 950, easing: "ease-out" });
      anim(part(r, ".lk-glow"), [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.35)", opacity: 1, offset: .3 }, { transform: "scale(1)", opacity: 1 }], { duration: 1000, easing: "ease-out" });
      anim(part(r, ".lk-ring-g"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-90deg)" }], { duration: 1200, easing: SPRING });
    },
    turn: function (r) {
      anim(part(r, ".lk-idle"), [{ transform: "rotateY(0deg)" }, { transform: "rotateY(360deg)" }], { duration: 1250, easing: "cubic-bezier(.45,.05,.25,1)" });
    },
    glint: function (r) {
      anim(part(r, ".lk-glint-g"), [{ transform: "translateX(0)" }, { transform: "translateX(150px)" }], { duration: 900, easing: "ease-in-out" });
      anim(part(r, ".lk-ring-g"), [{ transform: "rotate(0deg)" }, { transform: "rotate(120deg)" }], { duration: 1400, easing: SPRING });
    }
  };
  var ORDER = ["burst", "turn", "rise", "glint"];
  /* plays one flourish (named, or the next in turn); a calm screen gets a short glow instead */
  K.play = function (root, name, force) {
    if (!root) return;
    if (!root.__crest) root = root.querySelector(".lk-crest"); if (!root) return;
    if (still() && !force) { anim(part(root, ".lk-glow"), [{ opacity: 1 }, { opacity: .4 }, { opacity: 1 }], { duration: 600 }); return; }
    if (still()) return;
    if (!name) { root.__n = ((root.__n || 0) + 1) % ORDER.length; name = ORDER[(root.__n + ORDER.length - 1) % ORDER.length]; }
    (FL[name] || FL.burst)(root);
  };
  K.order = ORDER.slice();
})();
