/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The sounds, made as Ingenium makes its own: drawn live from tones and grains of noise (no recordings, nothing
   fetched), quiet, short and natural, in a small warm room so that they feel near and real. The door welcomes with
   a bell chord that rises and spreads from left to right over a soft latch; keys answer with a felt tap; a room
   opens with the sound of a page set down; the mark winds up with a breath of air and a glass note; the books lock
   with a book shut; the lamp clicks between day and night; a sale is sealed with two clear notes.
   They play only after a press of the person's own hand, never in Calm, and can be turned off or softened in
   Display. */
"use strict";
(function () {
  var U = E.util;
  var S = E.sound = {};
  var c = null, master = null, room = null, OUT = null, ROOM = null;
  function enabled() {
    if (U.prefGet("sound", "1") !== "1") return false;
    try { if (document.documentElement.getAttribute("data-calm") === "1") return false; } catch (e) { }
    return true;
  }
  function level() { var v = parseFloat(U.prefGet("soundVol", "0.7")); return isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v)); }
  /* a small warm room: a short echo made from noise that fades away */
  function makeRoom() {
    var len = Math.floor(c.sampleRate * 1.3), buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = buf.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    var cv = c.createConvolver(); cv.buffer = buf;
    var tone = c.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 3200;
    cv.connect(tone); return { input: cv, output: tone };
  }
  function live() {
    if (!enabled()) return null;
    try {
      if (!c) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        c = new AC();
        var comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
        master = c.createGain(); master.connect(comp); comp.connect(c.destination);
        var r = makeRoom(); room = c.createGain(); room.gain.value = .22; room.connect(r.input); r.output.connect(comp);
      }
      if (c.state === "suspended") c.resume();
      master.gain.setValueAtTime(level(), c.currentTime);
      return c;
    } catch (e) { return null; }
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  /* where a sound sits, from left (-1) to right (1); it is heard dry and in the room */
  function bus(pan) {
    var g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(master); p.connect(room); } else { g.connect(master); g.connect(room); }
    return g;
  }
  function tone(t, f, a, d, peak, type, drift, pan) {
    var o = c.createOscillator(), g = c.createGain(), out = bus(pan);
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (drift) o.frequency.exponentialRampToValueAtTime(f * drift, t + a + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + 0.05);
  }
  /* a bell: its note and two quieter partials that do not quite agree, as real bells do */
  function bell(t, f, peak, len, pan) { tone(t, f, .004, len, peak, "sine", 0, pan); tone(t, f * 2.76, .003, len * .45, peak * .22, "sine", 0, pan); tone(t, f * 5.4, .002, len * .2, peak * .07, "sine", 0, pan); }
  function grain(t, dur, peak, f, q, pan) {
    var n = Math.max(2, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { last = last * .55 + (Math.random() * 2 - 1) * .45; d[i] = last; }
    var s = c.createBufferSource(); s.buffer = buf; var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    var g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + dur * .3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(bus(pan)); s.start(t); s.stop(t + dur + .02);
  }
  function cloud(t, len, count, lo, hi, peak, pan) {
    for (var i = 0; i < count; i++) { var u = Math.random(), at = t + Math.pow(u, .6) * len, env = Math.sin(Math.PI * Math.min(1, (at - t) / len)); grain(at, rnd(.008, .026), peak * rnd(.35, 1) * (.35 + .65 * env), rnd(lo, hi), rnd(1.2, 4), pan); }
  }
  function tap(t, peak, cut, dur, pan) {
    var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    var s = c.createBufferSource(); s.buffer = buf; var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = cut; bp.Q.value = .9;
    var g = c.createGain(); g.gain.value = peak; s.connect(bp); bp.connect(g); g.connect(bus(pan)); s.start(t);
    tone(t, cut * .35, .001, dur, peak * .7, "sine", 0, pan);
  }
  var V = {
    /* the door: a soft latch, then D major rising and opening from left to right, over a warm low note */
    welcome: function (t) {
      tap(t, .16, 520, .07, -.1); grain(t + .01, .09, .05, 300, .8);
      tone(t + .04, 146.83, .05, 1.6, .06, "sine", 0, 0);
      [587.33, 739.99, 880, 1174.66].forEach(function (f, i) { bell(t + .1 + i * .12, f, .11 - i * .012, 1.5 - i * .15, -.55 + i * .37); });
      bell(t + .62, 1479.98, .028, .9, .5);
    },
    tap: function (t) { tap(t, .14, 640, .05, rnd(-.15, .15)); },
    soft: function (t) { tap(t, .07, 1400, .02, 0); },
    page: function (t) { cloud(t, .09, 26, 440, 1600, .04, .1); tone(t, 72, .01, .36, .1, "sine", .9); tone(t, 112, .01, .22, .04, "sine", .92); },
    whirl: function (t) {
      for (var i = 0; i < 18; i++) { var at = t + i * .045; grain(at, .05, .025 * (1 - i / 22), 500 + i * 70, 2.2, -.4 + i * .045); }
      bell(t + .18, 1567.98, .04, .9, .25);
    },
    shut: function (t) { cloud(t, .14, 38, 760, 2600, .045, 0); tone(t + .05, 78, .012, .42, .11, "sine", .88); tone(t + .05, 150, .012, .26, .05, "sine", .9); },
    lamp: function (t) { tap(t, .12, 1900, .025, .2); tone(t + .02, 180, .02, .5, .07); tone(t + .06, 720, .01, .4, .03); },
    sale: function (t) { bell(t, 783.99, .08, .7, -.2); bell(t + .09, 1174.66, .07, .9, .2); },
    nope: function (t) { tap(t, .1, 300, .06, 0); tap(t + .1, .08, 260, .06, 0); }
  };
  var lastAt = 0, GAP = 45;
  S.play = function (name) {
    var now = Date.now(); if (now - lastAt < GAP && name !== "welcome") return false;
    var ctx = live(); if (!ctx || !V[name]) return false;
    try { V[name](ctx.currentTime + .02); lastAt = now; return true; } catch (e) { return false; }
  };
  S.enabled = enabled;
  if (E.books && E.books.on) {
    E.books.on("lock", function (why) { if (why === "hand") S.play("shut"); });
    E.books.on("change", function (line) { if (line && line.type === "sale.completed") S.play("sale"); });
  }

  /* keys answer with a felt tap */
  document.addEventListener("pointerdown", function (e) {
    var k = e.target && e.target.closest && e.target.closest("button, [role=button], .sel-opt, a.key");
    if (!k || k.disabled || k.closest(".crest-key, #introEnter, #introSeal")) return;
    S.play(k.matches(".cl-key, .pw-peek, .sel-opt, .cd-em-row") ? "soft" : "tap");
  }, true);
})();
