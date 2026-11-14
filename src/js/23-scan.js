/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   Scanning barcodes everywhere (Build 15).
   * A scanner that types (USB or Bluetooth, the kind most counters use) sends a code's characters within a few
     milliseconds of each other and ends with Enter. Lakay hears it in every room, even when no field has the focus:
     the Register adds the item to the ticket, Inventory opens its card (or its delivery, when receiving), and anywhere
     else Price check shows it. A code no item has offers to add a new item with that barcode.
   * The camera, where the device allows: the device's own barcode reader when it has one; otherwise Lakay's own
     reader, which reads the codes on store goods (EAN-13, UPC-A and EAN-8) and accepts a code only when it reads the
     same one twice and its check digit is right. The picture never leaves the device and is never kept. */
"use strict";
(function () {
  var U = E.util, h = U.h, t = E.t, B = E.books, ui = E.ui;
  var S = E.scan = {};
  function snd(n) { if (E.sound) E.sound.play(n); }

  /* ---------- what a code does, wherever it is scanned ---------- */
  S.found = function (code) {
    code = String(code || "").trim(); if (!code || !B.isOpen) return;
    var layer = document.querySelector(".layer");
    if (layer) {
      /* with a window open, a scan fills its barcode field, if it has one, and does nothing else */
      var bc = layer.querySelector("[data-scan-field]");
      if (bc && !bc.disabled) { bc.value = code; bc.dispatchEvent(new Event("input", { bubbles: true })); snd("scan"); }
      return;
    }
    var ids = E.find.byCode(code);
    if (ids.length) snd("scan");
    if (ui.onScan && ui.onScan(code, ids) !== false) return;
    if (!ids.length) return S.unknown(code);
    if (E.rail && E.rail.showItem) E.rail.showItem(code);
  };
  S.unknown = function (code) {
    snd("nope");
    return ui.toast(t("scan.unknown", { code: code }), "warn", B.can("items") ? { label: t("scan.addIt"), fn: function () { E.inventory.add({ barcode: code }); } } : null);
  };

  /* ---------- a scanner that types ---------- */
  var buf = "", first = 0, prev = 0;
  function editable(el) { return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); }
  document.addEventListener("keydown", function (e) {
    if (!B.isOpen || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (editable(e.target)) { buf = ""; return; }
    var now = performance.now();
    if (e.key === "Enter" || e.key === "Tab") {
      var fast = buf.length >= 4 && now - prev < 100 && (prev - first) / Math.max(1, buf.length - 1) < 45;
      var code = buf; buf = "";
      if (fast) { e.preventDefault(); e.stopPropagation(); S.found(code); }
      return;
    }
    if (e.key.length !== 1) return;
    if (now - prev > 80) { buf = ""; first = now; }
    buf += e.key; prev = now;
  }, true);

  /* ---------- the camera ---------- */
  var hasCamera = null;
  S.cameraLikely = function () {
    if (hasCamera !== null) return Promise.resolve(hasCamera);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || window.isSecureContext === false) return Promise.resolve(hasCamera = false);
    if (!navigator.mediaDevices.enumerateDevices) return Promise.resolve(hasCamera = true);
    return navigator.mediaDevices.enumerateDevices().then(function (list) {
      return (hasCamera = list.some(function (d) { return d.kind === "videoinput"; }));
    }, function () { return (hasCamera = true); });
  };
  /* a key that opens the camera; it shows itself only on a device that has one */
  S.cameraKey = function (onCode, label) {
    var b = h("button.icon-key.cam-key", { type: "button", title: label || t("scan.camera"), "aria-label": label || t("scan.camera"), hidden: "",
      onclick: function () { S.camera().then(function (code) { if (code) onCode(code); }); } }, U.icon("camera"));
    S.cameraLikely().then(function (yes) { if (yes) b.removeAttribute("hidden"); });
    return b;
  };
  function nativeReader() {
    if (!("BarcodeDetector" in window)) return Promise.resolve(null);
    try {
      return window.BarcodeDetector.getSupportedFormats().then(function (have) {
        var want = ["ean_13", "upc_a", "ean_8", "upc_e", "code_128", "code_39", "itf", "codabar", "qr_code"].filter(function (f) { return have.indexOf(f) >= 0; });
        return want.length ? new window.BarcodeDetector({ formats: want }) : null;
      }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  /* Opens the camera and resolves with the code it reads, or null when the person closes it. */
  S.camera = function () {
    return new Promise(function (resolve) {
      var stream = null, stopped = false, timer = 0, reader = null, last = null, lastAt = 0, d;
      var video = h("video.scan-video", { autoplay: "", playsinline: "", "aria-hidden": "true" });
      video.muted = true;
      var status = h("p.scan-status", { "aria-live": "polite" }, t("scan.starting"));
      var view = h("div.scan-view", null, [video, h("div.scan-guide", { "aria-hidden": "true" }, [h("span.scan-beam")])]);
      var canvas = document.createElement("canvas"), g = canvas.getContext("2d", { willReadFrequently: true });
      function stop() { stopped = true; clearTimeout(timer); if (stream) stream.getTracks().forEach(function (x) { x.stop(); }); stream = null; try { video.srcObject = null; } catch (e) { } }
      function done(code) { if (stopped) return; stop(); snd("scan"); if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) { } resolve(code); if (d) d.close(); }
      d = ui.dialog({ title: t("scan.title"), emoji: "📷", body: [view, status, h("p.hint", null, t("scan.hint"))],
        actions: [{ label: t("cancel") }], onClose: function () { stop(); resolve(null); } });
      function readFrame() {
        var vw = video.videoWidth, vh = video.videoHeight, k = Math.min(1, 960 / vw), w = Math.round(vw * k), hh = Math.round(vh * k);
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== hh) canvas.height = hh;
        g.drawImage(video, 0, 0, w, hh);
        var y0 = Math.round(hh * 0.22), bh = Math.round(hh * 0.56), px = g.getImageData(0, y0, w, bh).data, gray = new Uint8Array(w * bh);
        for (var i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
        var r = S.decodeGray(gray, w, bh);
        return r ? r.code : null;
      }
      function loop() {
        if (stopped) return;
        if (video.readyState < 2 || !video.videoWidth) { timer = setTimeout(loop, 120); return; }
        var p = reader ? reader.detect(video).then(function (list) { return list && list[0] ? list[0].rawValue : null; }, function () { return null; })
          : Promise.resolve().then(readFrame);
        p.then(function (code) {
          if (stopped) return;
          if (code) {
            var now = Date.now();
            /* the device's reader is trusted at once; Lakay's own must read the same code twice */
            if (reader || (code === last && now - lastAt < 2500)) { done(code); return; }
            last = code; lastAt = now;
          }
          timer = setTimeout(loop, reader ? 120 : 70);
        });
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status.textContent = t("scan.noCamera"); status.classList.add("bad"); return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (s) {
        if (stopped) { s.getTracks().forEach(function (x) { x.stop(); }); return null; }
        stream = s; video.srcObject = s;
        return Promise.resolve(video.play()).catch(function () { }).then(nativeReader);
      }).then(function (r) {
        if (stopped) return;
        reader = r; status.textContent = t("scan.looking"); loop();
      }, function (e) {
        hasCamera = e && e.name === "NotFoundError" ? false : hasCamera;
        status.textContent = t(e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "scan.denied" : "scan.noCamera"); status.classList.add("bad");
      });
    });
  };

  /* ---------- Lakay's own reader: EAN-13 (and UPC-A, which is EAN-13 beginning with 0) and EAN-8 ----------
     Each digit is four bars and spaces, seven modules wide. The widths below are those of the left-hand "L" set,
     space first; the "G" set is the same widths reversed, and the right-hand "R" set the same widths, bar first. */
  var DIG = ["3211", "2221", "2122", "1411", "1132", "1231", "1114", "1312", "1213", "3112"].map(function (x) { return x.split("").map(Number); });
  var GIG = DIG.map(function (x) { return x.slice().reverse(); });
  var FIRST = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
  /* one digit's four runs from r[o]; bars are made narrower by the spread, and spaces wider by it */
  function digit(r, o, barFirst, spread, sets) {
    var w = [], i;
    for (i = 0; i < 4; i++) w.push(r[o + i] + ((i % 2 === 0) === barFirst ? -spread : spread));
    var sum = w[0] + w[1] + w[2] + w[3]; if (sum <= 0) return null;
    var best = null, bestErr = 99, second = 99;
    sets.forEach(function (set, si) {
      set.forEach(function (p, d) {
        var err = 0; for (var i = 0; i < 4; i++) err += Math.abs(w[i] * 7 / sum - p[i]);
        if (err < bestErr) { second = bestErr; bestErr = err; best = { d: d, set: si }; } else if (err < second) second = err;
      });
    });
    return bestErr <= 1.6 && second - bestErr >= 0.25 ? best : null;
  }
  function guardOk(r, from, n, m) { for (var i = 0; i < n; i++) { var x = r[from + i] / m; if (x < 0.45 || x > 1.75) return false; } return true; }
  function checksum(ds) {
    var s = 0, n = ds.length;
    for (var i = 0; i < n - 1; i++) s += ds[n - 2 - i] * (i % 2 ? 1 : 3);
    return (10 - s % 10) % 10 === ds[n - 1];
  }
  /* r: widths of the runs along a line; r[j] is the first bar of the start guard (even indexes are bars from j) */
  function ean13(r, j) {
    if (j + 59 > r.length) return null;
    var tot = 0; for (var i = 0; i < 59; i++) tot += r[j + i];
    var m = tot / 95;
    if (j > 0 && r[j - 1] < 3 * m) return null;
    if (j + 59 < r.length && r[j + 59] < 3 * m) return null;
    if (!guardOk(r, j, 3, m) || !guardOk(r, j + 27, 5, m) || !guardOk(r, j + 56, 3, m)) return null;
    /* the guards say how much wider the bars print than the spaces; each digit is read with that taken back */
    var bars = (r[j] + r[j + 2] + r[j + 28] + r[j + 30] + r[j + 56] + r[j + 58]) / 6, spaces = (r[j + 1] + r[j + 27] + r[j + 29] + r[j + 31] + r[j + 57]) / 5;
    var spread = (bars - spaces) / 2;
    var ds = [], par = "";
    for (var k = 0; k < 6; k++) { var x = digit(r, j + 3 + 4 * k, false, spread, [DIG, GIG]); if (!x) return null; ds.push(x.d); par += x.set ? "G" : "L"; }
    for (k = 0; k < 6; k++) { var y = digit(r, j + 32 + 4 * k, true, spread, [DIG]); if (!y) return null; ds.push(y.d); }
    var f = FIRST.indexOf(par); if (f < 0) return null;
    ds.unshift(f);
    if (!checksum(ds)) return null;
    var code = ds.join("");
    return f === 0 ? { code: code.slice(1), format: "upc_a" } : { code: code, format: "ean_13" };
  }
  function ean8(r, j) {
    if (j + 43 > r.length) return null;
    var tot = 0; for (var i = 0; i < 43; i++) tot += r[j + i];
    var m = tot / 67;
    if (j > 0 && r[j - 1] < 3 * m) return null;
    if (j + 43 < r.length && r[j + 43] < 3 * m) return null;
    if (!guardOk(r, j, 3, m) || !guardOk(r, j + 19, 5, m) || !guardOk(r, j + 40, 3, m)) return null;
    var bars = (r[j] + r[j + 2] + r[j + 20] + r[j + 22] + r[j + 40] + r[j + 42]) / 6, spaces = (r[j + 1] + r[j + 19] + r[j + 21] + r[j + 23] + r[j + 41]) / 5;
    var spread = (bars - spaces) / 2, ds = [];
    for (var k = 0; k < 4; k++) { var x = digit(r, j + 3 + 4 * k, false, spread, [DIG]); if (!x) return null; ds.push(x.d); }
    for (k = 0; k < 4; k++) { var y = digit(r, j + 24 + 4 * k, true, spread, [DIG]); if (!y) return null; ds.push(y.d); }
    return checksum(ds) ? { code: ds.join(""), format: "ean_8" } : null;
  }
  /* The runs along one line of light: the edges fall where the light crosses the threshold, found between pixels. */
  function runsOf(line, thr) {
    var edges = [], dark0 = line[0] < thr[0];
    for (var i = 1; i < line.length; i++) {
      var a = line[i - 1] < thr[i - 1], b = line[i] < thr[i];
      if (a !== b) {
        var v0 = line[i - 1] - thr[i - 1], v1 = line[i] - thr[i], f = v0 === v1 ? 0.5 : v0 / (v0 - v1);
        edges.push(i - 1 + Math.max(0, Math.min(1, f)));
      }
    }
    var runs = [], at = 0;
    edges.forEach(function (x) { runs.push(x - at); at = x; });
    runs.push(line.length - at);
    return { runs: runs, dark0: dark0 };
  }
  function decodeRuns(o) {
    var r = o.runs, firstBar = o.dark0 ? 0 : 1;
    for (var j = firstBar; j < r.length; j += 2) {
      var x = ean13(r, j) || ean8(r, j);
      if (x) return x;
    }
    return null;
  }
  function decodeLine(line) {
    var n = line.length, win = Math.max(15, Math.round(n / 10)), half = win >> 1, pre = new Float64Array(n + 1), i;
    for (i = 0; i < n; i++) pre[i + 1] = pre[i] + line[i];
    var local = new Float64Array(n), lo = 255, hi = 0;
    for (i = 0; i < n; i++) {
      var a = Math.max(0, i - half), b = Math.min(n, i + half + 1);
      local[i] = (pre[b] - pre[a]) / (b - a);
      if (i > n * 0.1 && i < n * 0.9) { if (line[i] < lo) lo = line[i]; if (line[i] > hi) hi = line[i]; }
    }
    if (hi - lo < 28) return null;
    /* two thresholds (the light around each point, and the middle of the line's darkest and lightest), each read both
       ways, for a barcode held upside down */
    var mid = new Float64Array(n).fill((lo + hi) / 2), back = new Float64Array(n), lineBack = new Float64Array(n);
    for (i = 0; i < n; i++) { lineBack[i] = line[n - 1 - i]; back[i] = local[n - 1 - i]; }
    return decodeRuns(runsOf(line, local)) || decodeRuns(runsOf(line, mid)) || decodeRuns(runsOf(lineBack, back)) || decodeRuns(runsOf(lineBack, mid));
  }
  /* gray: one byte of light per pixel, w by h; a few lines across the middle are read, each the average of three rows */
  S.decodeGray = function (gray, w, h) {
    var lines = 14, seen = {};
    for (var k = 0; k < lines; k++) {
      /* from the middle outward: 0, +1, -1, +2, -2 ... */
      var off = (k % 2 ? 1 : -1) * Math.ceil(k / 2), y = Math.round(h / 2 + off * (h * 0.84 / lines));
      y = Math.max(1, Math.min(h - 2, y));
      var line = new Float64Array(w);
      for (var x = 0; x < w; x++) line[x] = (gray[(y - 1) * w + x] + gray[y * w + x] + gray[(y + 1) * w + x]) / 3;
      var r = decodeLine(line);
      if (r) { seen[r.code] = (seen[r.code] || 0) + 1; if (seen[r.code] >= 2) return r; }
    }
    var best = Object.keys(seen)[0];
    return best ? { code: best, format: best.length === 8 ? "ean_8" : best.length === 12 ? "upc_a" : "ean_13", lines: seen[best] } : null;
  };
  S.decodeLine = decodeLine;
})();
