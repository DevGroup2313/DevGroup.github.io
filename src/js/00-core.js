/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The core: drawing the screen safely, money in whole cents, dates by the store's own calendar. */
"use strict";

var E = window.Emporium = window.Emporium || {};
E.BUILD = { number: "/*@@BUILD@@*/", date: "/*@@DATE@@*/" };

/* ---------- drawing: every piece of text goes in as text, never as markup ---------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

/* h("button.key.primary", {type: "button", onclick: fn, "aria-label": "Open"}, "Open")
   Children may be strings (drawn as text), nodes, arrays, or null (skipped). No HTML string is ever parsed. */
function h(tag, attrs, children) {
  var m = /^([a-z0-9]+)((?:[.#][A-Za-z0-9_-]+)*)$/.exec(tag);
  if (!m) throw new Error("bad tag " + tag);
  var node = document.createElement(m[1]);
  (m[2].match(/[.#][A-Za-z0-9_-]+/g) || []).forEach(function (p) {
    if (p[0] === ".") node.classList.add(p.slice(1)); else node.id = p.slice(1);
  });
  if (attrs) Object.keys(attrs).forEach(function (k) {
    var v = attrs[k];
    if (v === null || v === undefined || v === false) return;
    if (k.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "class") String(v).split(/\s+/).filter(Boolean).forEach(function (c) { node.classList.add(c); });
    else if (k === "text") node.textContent = String(v);
    else if (k === "value") node.value = v;
    else if (k === "checked") node.checked = !!v;
    else if (k === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
    else node.setAttribute(k, v === true ? "" : String(v));
  });
  add(node, children);
  return node;
}
function add(node, children) {
  if (children === null || children === undefined || children === false) return node;
  if (Array.isArray(children)) { children.forEach(function (c) { add(node, c); }); return node; }
  if (children instanceof Node) { node.appendChild(children); return node; }
  node.appendChild(document.createTextNode(String(children)));
  return node;
}
function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

/* The icons are drawn from fixed paths that live in this page (never from data). */
var ICONS = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9.5h5v-6h3v6h5V10",
  register: "M4 5h16v10H4zM8 19h8M12 15v4M7 9h4M7 12h7",
  box: "M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9",
  chart: "M4 20h16M7 16v-5M12 16V7M17 16v-8",
  book: "M5 4.5h9a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3zM17 7.5h2V20h-2M8 8.5h6M8 11.5h6",
  gear: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1",
  lock: "M6 10.5h12V20H6zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2.5",
  sun: "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  auto: "M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c-2.5 3-2.5 15 0 18M12 3c2.5 3 2.5 15 0 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 20 20",
  print: "M7 9V4h10v5M7 17H5v-7h14v7h-2M7 14h10v6H7z",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  upload: "M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14",
  check: "M5 12.5 10 17l9-10",
  warn: "M12 4 2.5 20h19zM12 10v4.5M12 17.2v.3",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.3",
  tip: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  x: "M6 6l12 12M18 6 6 18",
  chevron: "M6 9.5l6 6 6-6",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  archive: "M3.5 4.5h17v4h-17zM5 8.5V20h14V8.5M10 12h4",
  receipt: "M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21zM9 8h6M9 12h6M9 16h4",
  cash: "M3 6.5h18v11H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 9.5v.2M18 14.3v.2",
  key: "M14.5 3.5a5 5 0 0 0-4.6 7L3.5 17v3.5H7v-2h2v-2h2l1.5-1.5a5 5 0 1 0 2-11.5zM16 7.5v.2",
  shield: "M12 3 4.5 6v6c0 4.6 3.2 8 7.5 9 4.3-1 7.5-4.4 7.5-9V6z M9 12l2 2 4-4",
  back: "M10 6 4 12l6 6M4 12h16",
  next: "M14 6l6 6-6 6M20 12H4",
  tag: "M3.5 12V4.5H11l9.5 9.5-7.5 7.5zM7.5 8.5v.2",
  truck: "M2.5 6h11v10h-11zM13.5 9.5H18l3.5 3.5V16h-8M6 18.5a1.5 1.5 0 1 0 0-.1M17 18.5a1.5 1.5 0 1 0 0-.1",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2",
  list: "M8 6.5h12M8 12h12M8 17.5h12M4 6.5v.2M4 12v.2M4 17.5v.2"
};
function icon(name, cls) {
  var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
  svg.setAttribute("class", "ico" + (cls ? " " + cls : ""));
  var p = document.createElementNS(ns, "path"); p.setAttribute("d", ICONS[name] || ICONS.info); svg.appendChild(p);
  return svg;
}

/* ---------- money: whole cents, always ---------- */
/* Reads what a person types ("12", "12.5", "12,50", "$1,234.50") into whole cents, or null if it is not an amount. */
function parseMoney(text) {
  var s = String(text === undefined || text === null ? "" : text).trim().replace(/[\s$€£]|US/g, "");
  if (!s) return null;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, "");         // 1,234.50
  else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); // 1.234,50
  else s = s.replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  var parts = s.split("."), whole = parseInt(parts[0], 10), frac = (parts[1] || "").padEnd(2, "0");
  var cents = whole * 100 + parseInt(frac, 10);
  return Number.isSafeInteger(cents) && cents <= 1e11 ? cents : null;
}
/* Whole cents to a string a person reads. The store's money is written the way the store writes it (US style by default),
   whatever the language of the screen, so figures never change shape at the counter. */
function money(cents, opts) {
  var c = Math.round(Number(cents) || 0), neg = c < 0, a = Math.abs(c);
  var cur = (opts && opts.currency) || (E.settings && E.settings.currency) || "USD";
  var sym = { USD: "$", CAD: "$", EUR: "€", HTG: "G " }[cur] || "";
  var whole = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), frac = String(a % 100).padStart(2, "0");
  return (neg ? "−" : "") + sym + whole + "." + frac + (cur === "CAD" ? " CAD" : "");
}
function moneyPlain(cents) { var c = Math.round(Number(cents) || 0), a = Math.abs(c); return (c < 0 ? "-" : "") + Math.floor(a / 100) + "." + String(a % 100).padStart(2, "0"); }
/* Integer rounding, half away from zero, of a / b (b > 0), exact for any size (BigInt). */
function divRound(a, b) {
  var A = BigInt(a), B = BigInt(b), neg = A < BigInt(0); if (neg) A = -A;
  var r = (A * BigInt(2) / B + BigInt(1)) / BigInt(2); return Number(neg ? -r : r);
}
/* Tax rates are kept in thousandths of a percent: 7.25% is 7250. */
function parseRate(text) {
  var s = String(text || "").trim().replace("%", "").replace(",", ".");
  if (!/^\d{1,2}(\.\d{0,3})?$/.test(s)) return null;
  var p = s.split("."); return parseInt(p[0], 10) * 1000 + parseInt((p[1] || "").padEnd(3, "0"), 10);
}
function rateText(milli) { var s = (milli / 1000).toFixed(3).replace(/\.?0+$/, ""); return s + "%"; }
function taxOn(cents, milli) { return divRound(BigInt(Math.round(cents)) * BigInt(Math.round(milli)), 100000); }

/* ---------- dates: the store's own calendar (the device's time zone) ---------- */
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function fromDayKey(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
function startOfWeek(d, weekStart) { var wd = d.getDay(), back = (wd - (weekStart === 0 ? 0 : 1) + 7) % 7; return addDays(d, -back); }

/* ---------- bytes, text, fingerprints ---------- */
var TE = new TextEncoder(), TD = new TextDecoder();
function b64e(u8) { var s = "", i, c = 0x8000; u8 = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8); for (i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c)); return btoa(s); }
function b64d(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join(""); }
function rnd(n) { return crypto.getRandomValues(new Uint8Array(n)); }
function uid(prefix) { var u = rnd(9), a = "abcdefghijkmnpqrstuvwxyz23456789", s = ""; for (var i = 0; i < u.length; i++) s += a[u[i] % a.length]; return (prefix || "") + s; }
/* Canonical JSON: keys in order, so the same line always gives the same fingerprint. */
function canon(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  return "{" + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ":" + canon(v[k]); }).join(",") + "}";
}
function sha256hex(text) { return crypto.subtle.digest("SHA-256", typeof text === "string" ? TE.encode(text) : text).then(hex); }

/* ---------- small things ---------- */
function debounce(fn, ms) { var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }
function prefGet(k, d) { try { var v = localStorage.getItem("emporium." + k); return v === null ? d : v; } catch (e) { return d; } }
function prefSet(k, v) { try { localStorage.setItem("emporium." + k, String(v)); } catch (e) { } }

E.util = { h: h, add: add, clear: clear, icon: icon, parseMoney: parseMoney, money: money, moneyPlain: moneyPlain, divRound: divRound,
  parseRate: parseRate, rateText: rateText, taxOn: taxOn, dayKey: dayKey, fromDayKey: fromDayKey, addDays: addDays,
  startOfWeek: startOfWeek, b64e: b64e, b64d: b64d, hex: hex, rnd: rnd, uid: uid, canon: canon, sha256hex: sha256hex,
  norm: norm, debounce: debounce, prefGet: prefGet, prefSet: prefSet, pad2: pad2, TE: TE, TD: TD };
