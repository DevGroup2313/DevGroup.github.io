/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The books: setting up a store, opening and locking it, the ledger, stock, sales, reports, backups, and verification.
   Every change is one ledger line, written in the same transaction as the records it changes. */
"use strict";
(function () {
  var U = E.util, C = E.crypto, D = E.db;
  var B = E.books = { isOpen: false };
  var KEY = null, ID = null, state = null, listeners = {}, doorMeta = null;
  var ZERO = "0000000000000000000000000000000000000000000000000000000000000000";

  B.on = function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); };
  function emit(name, data) { (listeners[name] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }

  function aadEnv(id, which) { return "emporium|v1|" + id + "|" + which; }
  function aadRec(id, k) { return "emporium|r|" + id + "|" + k; }
  function aadLine(id, seq) { return "emporium|j|" + id + "|" + seq; }
  function idBytes(id) { var u = new Uint8Array(id.length / 2); for (var i = 0; i < u.length; i++) u[i] = parseInt(id.substr(i * 2, 2), 16); return u; }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function err(code, extra) { var e = new Error(code); e.code = code; if (extra) e.extra = extra; return e; }

  /* ---------- the device and the door ---------- */
  B.device = null;
  B.boot = function () {
    return D.get("meta", "device").then(function (dev) {
      if (dev) return dev;
      dev = { id: U.uid("d"), code: "A", created: new Date().toISOString() };
      return D.write([{ store: "meta", key: "device", value: dev }]).then(function () { return dev; });
    }).then(function (dev) {
      B.device = dev;
      return Promise.all([D.get("meta", "vault"), D.get("meta", "door"), D.get("meta", "custom")]);
    }).then(function (r) {
      E.custom = E.cleanCustom ? E.cleanCustom(r[2]) : (r[2] || null);
      doorMeta = r[1] || null;
      return { hasStore: !!r[0], door: r[1] || null, vault: r[0] || null, practice: !!(r[0] && r[0].practice) };
    });
  };

  /* ---------- one clock for the books ----------
     Every time the books write comes from here. Only the practice store may set it back (B._at), to lay down its
     sample weeks of sales; the store's own books always write the time it is. */
  function clock() { return (B.mode === "practice" && B._at) ? new Date(B._at) : new Date(); }
  B.mode = "real";

  /* ---------- the owner's user name at the door (as Ingenium keeps its own: plain, so the sign-in can greet) ---------- */
  B.setDoorUser = function (name) {
    var n = String(name || "").normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 60);
    if (!n) return Promise.resolve(false);
    return D.get("meta", "door").then(function (d) {
      d = d || {}; if (d.user === n) return false;
      d.user = n; doorMeta = d; return D.write([{ store: "meta", key: "door", value: d }]).then(function () { return true; });
    });
  };
  B.sameName = function (a, b) { function n(x) { return String(x || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase(); } return n(a) === n(b); };

  /* ---------- the default shelves of the store ---------- */
  var DEFAULT_CATS = ["music", "movies", "perfume", "grocery", "drinks", "food", "services", "other"];

  /* ---------- setting up a store: prepared in memory, written only once the Master Key is confirmed ---------- */
  B.prepareSetup = function (o) {
    var pending = { o: o };
    return C.newStoreKey().then(function (k) {
      pending.key = k;
      return C.newMaster();
    }).then(function (m) {
      pending.master = m;
      pending.id = U.hex(U.rnd(16));
      pending.salt = U.rnd(16);
      return C.passwordKey(o.password, pending.salt);
    }).then(function (kek) {
      pending.kek = kek;
      return C.wrap(pending.key, kek, aadEnv(pending.id, "owner"));
    }).then(function (envOwner) {
      pending.envOwner = envOwner;
      return C.masterKey(pending.master.secret, idBytes(pending.id));
    }).then(function (kekM) {
      return C.wrap(pending.key, kekM, aadEnv(pending.id, "master"));
    }).then(function (envMaster) {
      pending.envMaster = envMaster;
      delete pending.o.password;
      return { code: pending.master.code, finish: function () { return finishSetup(pending); } };
    });
  };
  function finishSetup(p) {
    var o = p.o, now = new Date(), id = p.id;
    var vault = { v: 1, app: "emporium", storeId: id, created: now.toISOString(),
      kdf: { name: "PBKDF2", hash: "SHA-256", iterations: C.ITERATIONS },
      owner: { salt: U.b64e(p.salt), iv: p.envOwner.iv, ct: p.envOwner.ct }, master: p.envMaster };
    var settings = { storeName: o.storeName, ownerName: o.ownerName, currency: o.currency || "USD", taxes: [],
      weekStart: 1, lockMinutes: 15, receiptNote: "", created: now.toISOString() };
    var recs = [{ kind: "settings", id: "main", value: settings },
      { kind: "user", id: "owner", value: { id: "owner", name: o.ownerName, role: "owner", created: now.toISOString() } },
      { kind: "counter", id: "receipt", value: { next: 1 } }];
    DEFAULT_CATS.forEach(function (c, i) { recs.push({ kind: "cat", id: c, value: { id: c, key: "cat." + c, order: i } }); });
    var line = { seq: 1, at: now.toISOString(), day: U.dayKey(now), by: "owner", dev: B.device.id, type: "store.created",
      data: { storeName: o.storeName, ownerName: o.ownerName, currency: settings.currency }, prev: ZERO, build: E.BUILD.number };
    return U.sha256hex(U.canon(line)).then(function (hash) {
      var head = { seq: 1, hash: hash, at: line.at };
      return Promise.all([C.seal(p.key, line, aadLine(id, 1)), C.seal(p.key, head, aadRec(id, "head:main"))]
        .concat(recs.map(function (r) { return C.seal(p.key, r.value, aadRec(id, r.kind + ":" + r.id)); })));
    }).then(function (sealed) {
      var ops = [{ store: "meta", key: "vault", value: vault }, { store: "meta", key: "door", value: { storeName: o.storeName, user: o.ownerName, created: now.toISOString() } },
        { store: "journal", key: 1, value: sealed[0], add: true }, { store: "rec", key: "head:main", value: sealed[1] }];
      recs.forEach(function (r, i) { ops.push({ store: "rec", key: r.kind + ":" + r.id, value: sealed[i + 2] }); });
      return D.write(ops);
    }).then(function () {
      D.persist();
      /* the new store is opened with a key that cannot be copied out of memory: the owner's envelope, opened again */
      return C.unwrap(p.envOwner, p.kek, aadEnv(id, "owner"), false);
    }).then(function (key) { p.key = null; p.kek = null; return load(vault, key); });
  }

  /* ---------- opening ---------- */
  B.openWithPassword = function (password) {
    return D.get("meta", "vault").then(function (v) {
      if (!v) throw err("nostore");
      return C.passwordKey(password, U.b64d(v.owner.salt), v.kdf.iterations).then(function (kek) {
        return C.unwrap(v.owner, kek, aadEnv(v.storeId, "owner"), false);
      }).then(function (key) { return load(v, key); }, function (e) { if (e && e.code) throw e; throw err("wrong"); });
    });
  };
  /* The Master Key opens the store and leaves a key in hand with which a new password is set. */
  B.checkMaster = function (text) {
    return C.readMaster(text).then(function (secret) {
      if (!secret) throw err("badcode");
      return D.get("meta", "vault").then(function (v) {
        return C.masterKey(secret, idBytes(v.storeId)).then(function (kek) {
          return C.unwrap(v.master, kek, aadEnv(v.storeId, "master"), true);
        }).then(function (key) { return { vault: v, key: key }; }, function () { throw err("wrongmaster"); });
      });
    });
  };
  B.resetPasswordWithMaster = function (handle, newPassword) {
    var v = clone(handle.vault), salt = U.rnd(16);
    var kek;
    return C.passwordKey(newPassword, salt).then(function (k) { kek = k; return C.wrap(handle.key, kek, aadEnv(v.storeId, "owner")); }).then(function (env) {
      v.owner = { salt: U.b64e(salt), iv: env.iv, ct: env.ct };
      return D.write([{ store: "meta", key: "vault", value: v }]).then(function () { return C.unwrap(v.owner, kek, aadEnv(v.storeId, "owner"), false); });
    }).then(function (key) { handle.key = null; return load(v, key); }).then(function () {
      return B.change(function () { return { type: "owner.password.reset", data: { with: "master" } }; });
    });
  };

  function load(vault, key, userId) {
    ID = vault.storeId;
    return D.entries("rec").then(function (entries) {
      var st = { settings: null, users: {}, cats: {}, items: {}, sales: [], moves: [], shifts: [], counters: {}, pad: {}, notes: {}, head: null, unreadable: [] };
      return Promise.all(entries.map(function (e) {
        return C.open(key, e[1], aadRec(ID, e[0])).then(function (val) { return [e[0], val]; }, function () { st.unreadable.push(e[0]); return null; });
      })).then(function (rows) {
        rows.forEach(function (r) { if (r) put(st, r[0], r[1]); });
        st.sales.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
        st.moves.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
        st.shifts.sort(function (a, b) { return a.in < b.in ? -1 : a.in > b.in ? 1 : 0; });
        if (!st.head || !st.settings) throw err("damaged");
        return D.get("journal", st.head.seq).then(function (env) {
          if (!env) { st.headProblem = true; return; }
          return C.open(key, env, aadLine(ID, st.head.seq)).then(function (line) {
            return U.sha256hex(U.canon(line)).then(function (h) { if (h !== st.head.hash) st.headProblem = true; });
          }, function () { st.headProblem = true; });
        }).then(function () { return st; });
      });
    }).then(function (st) {
      var u = st.users[userId || "owner"];
      if (!u && (userId || "owner") === "owner") throw err("damaged");
      if (!u || (u.role !== "owner" && u.active === false)) throw err("wrong");
      KEY = key; state = st; B.isOpen = true;
      B.user = u;
      E.settings = st.settings;
      emit("open", st);
      return st;
    });
  }
  function put(st, k, v) {
    var i = k.indexOf(":"), kind = k.slice(0, i), id = k.slice(i + 1);
    if (kind === "settings") st.settings = v;
    else if (kind === "head") st.head = v;
    else if (kind === "user") st.users[id] = v;
    else if (kind === "cat") st.cats[id] = v;
    else if (kind === "item") st.items[id] = v;
    else if (kind === "sale") { var j = st.sales.findIndex(function (s) { return s.id === v.id; }); if (j >= 0) st.sales[j] = v; else st.sales.push(v); }
    else if (kind === "move") st.moves.push(v);
    else if (kind === "shift") { var q = st.shifts.findIndex(function (x) { return x.id === v.id; }); if (q >= 0) st.shifts[q] = v; else st.shifts.push(v); }
    else if (kind === "counter") st.counters[id] = v;
    else if (kind === "pad") st.pad[id] = v;
    else if (kind === "notes") st.notes[id] = (v && Array.isArray(v.notes)) ? v.notes : [];
  }

  B.lock = function (why) {
    var flushed = writeNotes();
    KEY = null; state = null; B.isOpen = false; B.user = null; E.settings = null; ID = null;
    emit("lock", why || "hand");
    return flushed;
  };
  B.state = function () { return state; };

  /* ---------- the practice store ----------
     A store of its own, in its own database, with sample goods and two weeks of sample sales, that opens with no
     sign-in: to see every page, and to train. Its Store Key is sealed by a key kept on this device only, made so that
     it cannot be copied out of the browser; nothing in the practice store is real, and it never touches the store's
     own books, which stay sealed with the owner's password and the Master Key. */
  B.PRACTICE_DB = "emporium-practice";
  function quietLock() { writeNotes(); KEY = null; state = null; B.isOpen = false; B.user = null; E.settings = null; ID = null; }
  B.useBooks = function (practice) {
    quietLock();
    D.use(practice ? B.PRACTICE_DB : "emporium");
    B.mode = practice ? "practice" : "real";
  };
  B.openPractice = function (progress) {
    B.useBooks(true);
    return B.boot().then(function (r) {
      if (r.vault && r.vault.device) {
        return D.get("meta", "devkey").then(function (kek) {
          if (!kek) throw err("damaged");
          return C.unwrap(r.vault.device, kek, aadEnv(r.vault.storeId, "device"), false).then(function (key) { return load(r.vault, key); });
        });
      }
      if (r.vault) throw err("damaged");
      return createPractice(progress);
    });
  };
  B.resetPractice = function (progress) {
    B.useBooks(true);
    return notesSettled().then(function () { return D.wipe(); }).then(function () { return createPractice(progress); });
  };
  function createPractice(progress) {
    var id = U.hex(U.rnd(16)), now = new Date(), storeKey, kek, env;
    return C.newStoreKey().then(function (k) {
      storeKey = k;
      return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["wrapKey", "unwrapKey"]);
    }).then(function (k2) { kek = k2; return C.wrap(storeKey, kek, aadEnv(id, "device")); }).then(function (e) {
      env = e;
      var start = new Date(now.getTime() - 16 * 86400000);
      var settings = { storeName: E.t("practice.store"), ownerName: E.t("practice.owner"), currency: "USD",
        taxes: [{ id: "tx1", name: E.t("practice.tax"), rate: 7000 }], weekStart: 1, lockMinutes: 15, receiptNote: "", created: start.toISOString(), practice: true };
      var recs = [{ kind: "settings", id: "main", value: settings },
        { kind: "user", id: "owner", value: { id: "owner", no: 1001, name: settings.ownerName, role: "owner", created: start.toISOString() } },
        { kind: "counter", id: "receipt", value: { next: 1 } }];
      /* two sample people, to see the store as they see it: a cashier and a manager */
      SAMPLE_PEOPLE.forEach(function (x) {
        recs.push({ kind: "user", id: x[0], value: { id: x[0], no: x[1], name: x[2], role: "staff", preset: x[3], access: B.PRESETS[x[3]].slice(), active: true,
          mustChange: false, created: start.toISOString(), updated: start.toISOString() } });
      });
      DEFAULT_CATS.forEach(function (c, i) { recs.push({ kind: "cat", id: c, value: { id: c, key: "cat." + c, order: i } }); });
      var line = { seq: 1, at: start.toISOString(), day: U.dayKey(start), by: "owner", dev: B.device.id, type: "store.created",
        data: { storeName: settings.storeName, ownerName: settings.ownerName, currency: "USD", practice: true }, prev: ZERO, build: E.BUILD.number };
      var vault = { v: 1, app: "emporium", storeId: id, created: now.toISOString(), practice: true, device: env };
      return U.sha256hex(U.canon(line)).then(function (hash) {
        var head = { seq: 1, hash: hash, at: line.at };
        return Promise.all([C.seal(storeKey, line, aadLine(id, 1)), C.seal(storeKey, head, aadRec(id, "head:main"))]
          .concat(recs.map(function (r) { return C.seal(storeKey, r.value, aadRec(id, r.kind + ":" + r.id)); })));
      }).then(function (sealed) {
        var ops = [{ store: "meta", key: "vault", value: vault }, { store: "meta", key: "devkey", value: kek },
          { store: "meta", key: "door", value: { storeName: settings.storeName, practice: true, created: now.toISOString() } },
          { store: "journal", key: 1, value: sealed[0], add: true }, { store: "rec", key: "head:main", value: sealed[1] }];
        recs.forEach(function (r, i) { ops.push({ store: "rec", key: r.kind + ":" + r.id, value: sealed[i + 2] }); });
        return D.write(ops);
      }).then(function () { return C.unwrap(env, kek, aadEnv(id, "device"), false); })
        .then(function (key) { storeKey = null; return load(vault, key); })
        .then(function () { return seedPractice(start, progress); });
    });
  }
  /* The practice store's sample people: [user id, staff number, name, level of access]. */
  var SAMPLE_PEOPLE = [["u_practice_marie", 1002, "Marie", "cashier"], ["u_practice_jean", 1003, "Jean", "manager"]];
  /* The sample goods of a Caribbean store: [shelf, name, price, cost (cents), stock, reorder at, taxed, barcode]. */
  var SAMPLE = [
    ["music", "Kompa classics, volume 1 (CD)", 1299, 650, 18, 5, 1, "0850001000017"], ["music", "Konpa love songs (CD)", 1299, 650, 14, 5, 1, "0850001000024"],
    ["music", "Rara and carnival hits (CD)", 1499, 760, 9, 4, 1, "0850001000031"], ["music", "Zouk evenings (CD)", 1299, 640, 4, 5, 1, "0850001000048"],
    ["music", "Haitian gospel favourites (CD)", 1199, 600, 12, 4, 1, ""], ["movies", "Haitian comedy night (DVD)", 999, 480, 15, 5, 1, "0850002000016"],
    ["movies", "Carnival in Jacmel (DVD)", 1499, 720, 7, 3, 1, ""], ["movies", "Family drama, season 1 (DVD set)", 1999, 1050, 5, 2, 1, ""],
    ["perfume", "Florida water, 7.5 oz", 699, 310, 24, 8, 1, "0850003000015"], ["perfume", "Kananga water, 7.5 oz", 599, 270, 16, 6, 1, ""],
    ["perfume", "Bay rum aftershave", 799, 380, 10, 4, 1, ""], ["perfume", "Eau de parfum, vanilla musk", 3499, 1600, 6, 2, 1, "0850003000039"],
    ["grocery", "Djon djon mushrooms, 1 oz", 999, 520, 22, 8, 0, "0850004000014"], ["grocery", "Pikliz, 16 oz jar", 649, 300, 20, 6, 0, ""],
    ["grocery", "Haitian coffee, 1 lb", 1199, 640, 13, 5, 0, "0850004000038"], ["grocery", "Akasan mix, 1 lb", 499, 230, 17, 6, 0, ""],
    ["grocery", "Peanut butter (manba), 16 oz", 799, 380, 11, 4, 0, ""], ["grocery", "Coconut candy (tablèt)", 249, 100, 30, 10, 0, ""],
    ["grocery", "Plantain chips", 199, 80, 40, 12, 0, "0850004000076"], ["grocery", "Rice, 5 lb", 849, 520, 19, 6, 0, ""],
    ["drinks", "Cola champagne, 12 oz", 175, 70, 60, 24, 1, "0850005000013"], ["drinks", "Malta, 12 oz", 199, 85, 48, 24, 1, "0850005000020"],
    ["drinks", "Ginger beer, 12 oz", 199, 90, 36, 12, 1, ""], ["drinks", "Coconut water, 16 oz", 249, 120, 30, 12, 1, ""],
    ["drinks", "Spring water, 16 oz", 125, 40, 72, 24, 1, ""], ["food", "Patty, beef", 275, 110, 40, 12, 1, ""],
    ["food", "Patty, chicken", 275, 110, 40, 12, 1, ""], ["food", "Patty, herring", 300, 125, 24, 8, 1, ""],
    ["food", "Patty, codfish", 300, 125, 6, 8, 1, ""], ["other", "Phone charger, USB-C", 999, 400, 8, 3, 1, ""]
  ];
  function seedPractice(start, progress) {
    var seed = 20261107;
    function rnd(n) { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; }
    var made = [], left = {}, chain = Promise.resolve(), steps = SAMPLE.length + 3, done = 0;
    function tick() { done++; if (progress) try { progress(Math.min(1, done / steps)); } catch (e) { } }
    B._at = start.toISOString();
    SAMPLE.forEach(function (s) {
      chain = chain.then(function () {
        return B.addItem({ name: s[1], cat: s[0], price: s[2], cost: s[3], openingStock: s[4] <= s[5] ? s[4] : s[4] + 30, reorderAt: s[5], taxId: s[6] ? "tx1" : null, barcode: s[7] }).then(function (it) {
          made.push(it); left[it.id] = it.stock; tick();
        });
      });
    });
    /* fourteen days of sales, from two weeks ago to an hour ago, in the order they happened */
    chain = chain.then(function () {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var plan = [];
      for (var d = 14; d >= 0; d--) {
        var day = new Date(today.getTime() - d * 86400000), n = 4 + rnd(6);
        for (var k = 0; k < n; k++) {
          var at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9 + rnd(11), rnd(60), rnd(60));
          if (at.getTime() < Date.now() - 3600000) plan.push(at);
        }
      }
      plan.sort(function (a, b) { return a - b; });
      steps = SAMPLE.length + plan.length + 3;
      var c2 = Promise.resolve();
      plan.forEach(function (at, j) {
        c2 = c2.then(function () {
          var lines = [], n = 1 + rnd(3);
          for (var x = 0; x < n; x++) {
            var it = made[rnd(made.length)], q = 1 + rnd(it.cat === "drinks" || it.cat === "food" ? 3 : 1);
            if (left[it.id] - q < 2 || lines.some(function (l) { return l.itemId === it.id; })) continue;
            left[it.id] -= q; lines.push({ itemId: it.id, qty: q });
          }
          if (!lines.length) { tick(); return null; }
          B._at = at.toISOString();
          /* the morning's sales are Marie's, the afternoon's Jean's, and one in four the owner's own */
          var seller = j % 4 === 3 ? "owner" : at.getHours() < 13 ? SAMPLE_PEOPLE[0][0] : SAMPLE_PEOPLE[1][0];
          B.user = state.users[seller] || state.users.owner;
          var total = B.priceTicket(lines).total, paid = total <= 2000 ? Math.ceil(total / 500) * 500 : Math.ceil(total / 1000) * 1000;
          return B.completeSale(lines, paid).then(function () { B.user = state.users.owner; tick(); });
        });
        if (j === plan.length - 1) c2 = c2.then(function () { return sampleShifts(today); });
        if (j === Math.floor(plan.length / 2)) {
          c2 = c2.then(function () {
            var patty = made.filter(function (m) { return m.cat === "food"; })[0];
            B._at = new Date(at.getTime() + 60000).toISOString();
            return B.adjust(patty.id, -3, "expired", "").then(function () { left[patty.id] -= 3; tick(); });
          });
        }
      });
      return c2;
    });
    return chain.then(function () { B._at = null; B.user = state.users.owner; return state; }, function (e) { B._at = null; B.user = state && state.users.owner; throw e; });
  }
  /* the sample people's shifts for the days before today: Marie from a quarter to nine, Jean from a quarter to one,
     each with a half-hour break */
  function sampleShifts(today) {
    var c = Promise.resolve();
    for (var d = 14; d >= 1; d--) {
      [[SAMPLE_PEOPLE[0], 8, 45, 15, 15, 12, 0], [SAMPLE_PEOPLE[1], 12, 45, 20, 15, 16, 30]].forEach(function (x) {
        var base = new Date(today.getTime() - d * 86400000);
        function at(hh, mm) { return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm + (d % 3) * 2, 0); }
        var sh = { id: "t_practice_" + x[0][0] + "_" + d, user: x[0][0], no: x[0][1], in: at(x[1], x[2]).toISOString(), out: at(x[3], x[4]).toISOString(),
          breaks: [{ from: at(x[5], x[6]).toISOString(), to: at(x[5], x[6] + 30).toISOString() }], day: U.dayKey(base), dev: B.device.id };
        c = c.then(function () { B._at = sh.out; return recordShift(sh); });
      });
    }
    return c;
  }

  /* ---------- the side rail's own notes: each person's reminders and caught thoughts, sealed like the rest ---------- */
  B.pad = function () {
    var u = (B.user && B.user.id) || "owner", p = state && state.pad && state.pad[u];
    p = clone(p) || {}; p.thoughts = p.thoughts || []; p.reminders = p.reminders || []; return p;
  };
  B.savePad = function (pad, what) {
    var u = (B.user && B.user.id) || "owner";
    return B.change(function () { return { type: "pad.updated", data: { what: what || "pad", thoughts: pad.thoughts.length, reminders: pad.reminders.length }, recs: [{ kind: "pad", id: u, value: pad }] }; });
  };

  /* ---------- the people of the store: the owner, who is the administrator, and the staff ----------
     Every person has a user id (kept on every ledger line, sale, stock move and shift they make) and a staff number
     the screens show: 1001 is the owner. Each person signs in with a password of their own, which opens their own
     envelope of the Store Key (vault.people). What each person may do is kept in their sealed record; the books keep
     to it as well as the screens. Only the owner adds people, sets what they may do, gives them a first password, and
     takes a key back. The names are kept plain at the door, as the owner's own name is, so the sign-in can find the
     right envelope. A person's key opens the same sealed books as the owner's: the limits are kept by Lakay itself. */
  B.ACCESS = ["sell", "items", "receive", "adjust", "costs", "reports", "team"];
  B.PRESETS = { cashier: ["sell"], stock: ["sell", "items", "receive", "adjust"], manager: B.ACCESS.slice() };
  B.isOwner = function () { return !!(B.user && B.user.role === "owner"); };
  B.can = function (what) {
    var u = B.user; if (!u) return false;
    if (u.role === "owner") return true;
    return what !== "owner" && (u.access || []).indexOf(what) >= 0;
  };
  function need(what) { if (!B.can(what)) throw err("denied"); }
  B.numberOf = function (u) { return u ? (u.no || (u.role === "owner" ? 1001 : 0)) : 0; };
  B.people = function (all) {
    var st = state; if (!st) return [];
    return Object.keys(st.users).map(function (k) { return st.users[k]; })
      .filter(function (u) { return all || u.role === "owner" || u.active !== false; })
      .sort(function (a, b) { return B.numberOf(a) - B.numberOf(b); });
  };
  function cleanName(n) { return String(n || "").normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 60); }
  function nameTaken(st, name, selfId) {
    if (/^\d+$/.test(cleanName(name))) return true;
    return Object.keys(st.users).some(function (k) { return k !== selfId && B.sameName(st.users[k].name, name); });
  }
  function doorWith(ch) {
    var d = clone(doorMeta) || {};
    Object.keys(ch).forEach(function (k) { if (ch[k] === undefined) delete d[k]; else d[k] = clone(ch[k]); });
    return d;
  }
  function peopleOf(users) {
    return Object.keys(users).map(function (k) { return users[k]; }).filter(function (u) { return u.role !== "owner" && u.active !== false; })
      .map(function (u) { return { id: u.id, no: u.no, name: u.name }; }).sort(function (a, b) { return a.no - b.no; });
  }
  function nextNo(st) { return Object.keys(st.users).reduce(function (m, k) { return Math.max(m, B.numberOf(st.users[k])); }, 1001) + 1; }
  function cleanAccess(list) { return B.ACCESS.filter(function (a) { return (list || []).indexOf(a) >= 0; }); }
  function iterations(v) { return (v && v.kdf && v.kdf.iterations) || C.ITERATIONS; }
  /* The Store Key, in a form that can be sealed into a new envelope: the owner's password opens it (in the practice
     store, the key this device keeps for it). */
  function keyToShare(ownerPassword) {
    if (B.mode === "practice") {
      return Promise.all([D.get("meta", "vault"), D.get("meta", "devkey")]).then(function (r) {
        return C.unwrap(r[0].device, r[1], aadEnv(r[0].storeId, "device"), true).then(function (k) { return { vault: r[0], key: k }; });
      });
    }
    return ownerKeyExtractable(ownerPassword);
  }
  function personEnvelope(hk, id, password) {
    var salt = U.rnd(16);
    return C.passwordKey(password, salt).then(function (kek) { return C.wrap(hk.key, kek, aadEnv(hk.vault.storeId, "person:" + id)); })
      .then(function (env) { return { salt: U.b64e(salt), iv: env.iv, ct: env.ct }; });
  }
  function checkPw(pw) { var a = C.passwordAdvice(pw || ""); if (!a.ok) throw err("password", a.key); }

  B.addPerson = function (f, ownerPassword) {
    var name = cleanName(f.name), id = U.uid("u"), access = cleanAccess(f.access);
    try {
      need("owner");
      if (!name) throw err("name");
      if (nameTaken(state, name)) throw err("nameTaken");
      checkPw(f.password);
    } catch (e) { return Promise.reject(e); }
    return keyToShare(ownerPassword).then(function (hk) {
      return personEnvelope(hk, id, f.password).then(function (env) {
        return B.change(function (st) {
          need("owner");
          if (nameTaken(st, name)) throw err("nameTaken");
          var now = clock().toISOString(), no = nextNo(st);
          var u = { id: id, no: no, name: name, role: "staff", preset: B.PRESETS[f.preset] ? f.preset : "custom", access: access, active: true,
            mustChange: true, created: now, updated: now };
          var v = clone(hk.vault); v.people = v.people || {}; v.people[id] = env;
          var users = clone(st.users); users[id] = u;
          return { type: "person.added", data: { id: id, no: no, name: name, preset: u.preset, access: access },
            recs: [{ kind: "user", id: id, value: u }], meta: [{ key: "vault", value: v }, { key: "door", value: doorWith({ people: peopleOf(users) }) }], result: u };
        });
      });
    });
  };
  B.editPerson = function (id, f) {
    return B.change(function (st) {
      need("owner");
      var u = clone(st.users[id]); if (!u || u.role === "owner") throw err("noperson");
      var diff = {};
      if (f.name !== undefined) {
        var n = cleanName(f.name); if (!n) throw err("name");
        if (!B.sameName(n, u.name) && nameTaken(st, n, id)) throw err("nameTaken");
        if (n !== u.name) { diff.name = [u.name, n]; u.name = n; }
      }
      if (f.access !== undefined) {
        var a = cleanAccess(f.access), p = B.PRESETS[f.preset] ? f.preset : "custom";
        if (JSON.stringify(a) !== JSON.stringify(u.access)) { diff.access = [u.access, a]; u.access = a; }
        if (p !== u.preset) { diff.preset = [u.preset, p]; u.preset = p; }
      }
      if (!Object.keys(diff).length) return null;
      u.updated = clock().toISOString();
      var users = clone(st.users); users[id] = u;
      return { type: "person.updated", data: { id: id, no: u.no, changes: diff }, recs: [{ kind: "user", id: id, value: u }],
        meta: diff.name ? [{ key: "door", value: doorWith({ people: peopleOf(users) }) }] : [], result: u };
    });
  };
  /* A new first password for a person (they forgot theirs, or they come back): they choose their own at their next sign-in. */
  B.setPersonPassword = function (id, password, ownerPassword) {
    try { need("owner"); checkPw(password); if (!state.users[id] || state.users[id].role === "owner") throw err("noperson"); } catch (e) { return Promise.reject(e); }
    return keyToShare(ownerPassword).then(function (hk) {
      return personEnvelope(hk, id, password).then(function (env) {
        return B.change(function (st) {
          need("owner");
          var u = clone(st.users[id]); if (!u) throw err("noperson");
          var back = u.active === false;
          u.active = true; u.mustChange = true; u.updated = clock().toISOString();
          var v = clone(hk.vault); v.people = v.people || {}; v.people[id] = env;
          var users = clone(st.users); users[id] = u;
          return { type: back ? "person.restored" : "person.password.set", data: { id: id, no: u.no }, recs: [{ kind: "user", id: id, value: u }],
            meta: [{ key: "vault", value: v }, { key: "door", value: doorWith({ people: peopleOf(users) }) }], result: u };
        });
      });
    });
  };
  /* Taking a key back: the person can no longer sign in; everything they did stays in the books, under their name. */
  B.retirePerson = function (id) {
    return D.get("meta", "vault").then(function (vault) {
      return B.change(function (st) {
        need("owner");
        var u = clone(st.users[id]); if (!u || u.role === "owner") throw err("noperson");
        if (u.active === false) return null;
        var now = clock().toISOString(), recs = [];
        var open = B.openShift(id);
        if (open) { var sh = clone(open); (sh.breaks || []).forEach(function (b) { if (!b.to) b.to = now; }); sh.out = now; sh.outBy = B.user.id; recs.push({ kind: "shift", id: sh.id, value: sh }); }
        u.active = false; u.mustChange = false; u.updated = now; recs.unshift({ kind: "user", id: id, value: u });
        var v = clone(vault); if (v.people) delete v.people[id];
        var users = clone(st.users); users[id] = u;
        return { type: "person.retired", data: { id: id, no: u.no, clockedOut: !!open }, recs: recs,
          meta: [{ key: "vault", value: v }, { key: "door", value: doorWith({ people: peopleOf(users) }) }], result: u };
      });
    });
  };
  /* A person's own password, changed by them (and chosen by them the first time they sign in). */
  B.changeMyPassword = function (current, next) {
    if (B.isOwner()) return B.changePassword(current, next);
    var id = B.user && B.user.id;
    try { checkPw(next); } catch (e) { return Promise.reject(e); }
    return D.get("meta", "vault").then(function (v) {
      var e = v.people && v.people[id]; if (!e) throw err("wrong");
      return C.passwordKey(current, U.b64d(e.salt), iterations(v)).then(function (kek) { return C.unwrap(e, kek, aadEnv(v.storeId, "person:" + id), true); })
        .then(function (k) { return { vault: v, key: k }; }, function () { throw err("wrong"); });
    }).then(function (hk) {
      return personEnvelope(hk, id, next).then(function (env) {
        return B.change(function (st) {
          var u = clone(st.users[id]); u.mustChange = false; u.updated = clock().toISOString();
          var v = clone(hk.vault); v.people[id] = env;
          return { type: "person.password.changed", data: { id: id, no: u.no }, recs: [{ kind: "user", id: id, value: u }], meta: [{ key: "vault", value: v }], result: u };
        });
      }).then(function (u) { B.user = state.users[id]; return u; });
    });
  };

  /* ---------- signing in: the owner, or one of the people, each with their own password ---------- */
  /* Whose envelopes a typed name may open, in order: the person it names (by name or staff number), then the owner.
     The owner's envelope is always tried, whatever name was typed or none: the password is the key, never the name,
     so the owner is never shut out by a name remembered differently. */
  function whoIs(d, typed) {
    var n = cleanName(typed), num = /^\d{3,6}$/.test(n) ? parseInt(n, 10) : null, people = (d && d.people) || [], out = [];
    for (var i = 0; i < people.length; i++) { var x = people[i]; if (num ? x.no === num : B.sameName(x.name, n)) out.push(x.id); }
    out.push("owner");
    return out;
  }
  B.signIn = function (name, password) {
    return Promise.all([D.get("meta", "vault"), D.get("meta", "door")]).then(function (r) {
      var v = r[0], d = r[1] || {}, who = whoIs(d, name), id = null;
      if (!v) throw err("nostore");
      function attempt(i) {
        if (i >= who.length) throw err("wrong");
        var cand = who[i], env = cand === "owner" ? v.owner : v.people ? v.people[cand] : null;
        if (!env) return attempt(i + 1);
        return C.passwordKey(String(password), U.b64d(env.salt), iterations(v)).then(function (kek) {
          return C.unwrap(env, kek, aadEnv(v.storeId, cand === "owner" ? "owner" : "person:" + cand), false);
        }).then(function (key) { id = cand; return key; }, function () { return attempt(i + 1); });
      }
      return attempt(0).then(function (key) { return load(v, key, id); }).then(function (st) {
        var nd = clone(d); nd.last = B.user.name;
        if (id === "owner" && !nd.user) nd.user = cleanName(name) || B.user.name;
        doorMeta = nd;
        return D.write([{ store: "meta", key: "door", value: nd }]).catch(function () { }).then(function () { return st; });
      });
    });
  };
  /* The practice store opens with no sign-in; there the owner can see Lakay as any of the people sees it. */
  B.practiceAs = function (id) {
    if (B.mode !== "practice" || !state || !state.users[id] || state.users[id].active === false) return Promise.reject(err("denied"));
    B.user = state.users[id]; emit("user", B.user);
    return Promise.resolve(B.user);
  };

  /* ---------- the time clock: each person's shifts, with their breaks ---------- */
  B.openShift = function (userId) {
    var st = state; if (!st) return null;
    for (var i = st.shifts.length - 1; i >= 0; i--) { var x = st.shifts[i]; if (x.user === userId && !x.out) return x; }
    return null;
  };
  B.onClock = function () { return state ? state.shifts.filter(function (x) { return !x.out; }) : []; };
  B.onBreak = function (sh) { var b = sh && sh.breaks && sh.breaks[sh.breaks.length - 1]; return !!(b && !b.to); };
  B.breakMs = function (sh, now) {
    var end = sh.out ? Date.parse(sh.out) : (now || Date.now());
    return (sh.breaks || []).reduce(function (m, b) { return m + Math.max(0, (b.to ? Date.parse(b.to) : end) - Date.parse(b.from)); }, 0);
  };
  B.shiftMs = function (sh, now) {
    var end = sh.out ? Date.parse(sh.out) : (now || Date.now());
    return Math.max(0, end - Date.parse(sh.in) - B.breakMs(sh, now));
  };
  B.shifts = function (filter) { return state ? state.shifts.filter(function (x) { return !filter || filter(x); }) : []; };
  function shiftChange(userId, type, fn) {
    return B.change(function (st) {
      if (userId !== B.user.id) need("team");
      var sh = B.openShift(userId); if (!sh) return null;
      sh = clone(sh);
      var now = clock().toISOString(), data = fn(sh, now); if (!data) return null;
      data.shift = sh.id; data.user = userId; data.at = now;
      return { type: type, data: data, recs: [{ kind: "shift", id: sh.id, value: sh }], result: sh };
    });
  }
  B.clockIn = function () {
    return B.change(function () {
      if (B.openShift(B.user.id)) return null;
      var now = clock(), sh = { id: U.uid("t"), user: B.user.id, no: B.numberOf(B.user), in: now.toISOString(), out: null, breaks: [], day: U.dayKey(now), dev: B.device.id };
      return { type: "clock.in", data: { shift: sh.id, user: sh.user, at: sh.in }, recs: [{ kind: "shift", id: sh.id, value: sh }], result: sh };
    });
  };
  B.clockOut = function (userId) {
    userId = userId || (B.user && B.user.id);
    return shiftChange(userId, "clock.out", function (sh, now) {
      (sh.breaks || []).forEach(function (b) { if (!b.to) b.to = now; });
      sh.out = now; if (userId !== B.user.id) sh.outBy = B.user.id;
      return { worked: B.shiftMs(sh), breaks: B.breakMs(sh) };
    });
  };
  B.breakStart = function () {
    return shiftChange(B.user.id, "break.started", function (sh, now) { if (B.onBreak(sh)) return null; sh.breaks = (sh.breaks || []).concat([{ from: now, to: null }]); return {}; });
  };
  B.breakEnd = function () {
    return shiftChange(B.user.id, "break.ended", function (sh, now) { if (!B.onBreak(sh)) return null; sh.breaks[sh.breaks.length - 1].to = now; return {}; });
  };
  /* the practice store's sample shifts, each written whole in one line */
  function recordShift(sh) {
    return B.change(function () { return { type: "shift.recorded", data: { shift: sh.id, user: sh.user, in: sh.in, out: sh.out, practice: true }, recs: [{ kind: "shift", id: sh.id, value: sh }] }; });
  }

  /* ---------- Schedae: each person's sticky notes (Carpe Diem's, in exact parity) ----------
     Sealed with the Store Key like everything in the books, kept per person, and carried in backups. They are a
     person's own scribbles, not the store's books, so a keystroke is not a ledger line: the notes are written quietly
     half a second after typing stops, and at once when the books lock (with the key that was in hand). */
  var notesWait = null, notesDue = null, notesWriting = Promise.resolve(true);
  function noteOwner() { return (B.user && B.user.id) || "owner"; }
  /* the live list of the signed-in person's notes: the screen changes these objects, then calls B.saveNotes() */
  B.notes = function () {
    if (!state) return [];
    var u = noteOwner();
    if (!state.notes) state.notes = {};
    if (!Array.isArray(state.notes[u])) state.notes[u] = [];
    return state.notes[u];
  };
  B.saveNotes = function (now) {
    if (!state || !KEY) return Promise.resolve(false);
    var u = noteOwner();
    notesDue = { key: KEY, id: ID, db: D.NAME, u: u, list: B.notes() };
    clearTimeout(notesWait); notesWait = null;
    if (now) return writeNotes();
    notesWait = setTimeout(writeNotes, 500);
    return Promise.resolve(true);
  };
  /* One write at a time, in order, each into the books it was made in (the practice store's or the store's own),
     so an older copy never lands after a newer one, and a switch of books never loses the last words typed. */
  function writeNotes() {
    var p = notesDue; notesDue = null; clearTimeout(notesWait); notesWait = null;
    if (!p) return notesWriting;
    var value = { v: 1, notes: clone(p.list) };
    notesWriting = notesWriting.then(function () {
      return C.seal(p.key, value, aadRec(p.id, "notes:" + p.u));
    }).then(function (sealed) {
      return D.writeTo(p.db, [{ store: "rec", key: "notes:" + p.u, value: sealed }]);
    }).then(function () { return true; }, function (e) { console.error(e); return false; });
    return notesWriting;
  }
  B.flushNotes = writeNotes;
  /* Wiping or replacing the books waits for this, so no note sealed with the old key lands in the new books. */
  function notesSettled() { return notesWriting.then(function () { return true; }, function () { return true; }); }
  B.notesSettled = notesSettled;

  /* ---------- writing: one change at a time, each worked out from the books as they stand at that moment ---------- */
  var queue = Promise.resolve();
  B.change = function (fn) {
    var p = queue.then(function () {
      if (!KEY || !state) throw err("locked");
      var c = fn(state);
      if (!c) return null;
      return commit(c.type, c.data, c.recs || [], c.meta || []).then(function (line) { return c.result !== undefined ? c.result : line; });
    });
    queue = p.catch(function () { });
    return p;
  };
  function commit(type, data, recs, metaOps) {
    var now = clock(), seq = state.head.seq + 1;
    var line = { seq: seq, at: now.toISOString(), day: U.dayKey(now), by: B.user.id, dev: B.device.id, type: type, data: data,
      prev: state.head.hash, build: E.BUILD.number };
    var key = KEY, id = ID;
    return U.sha256hex(U.canon(line)).then(function (hash) {
      var head = { seq: seq, hash: hash, at: line.at };
      return Promise.all([C.seal(key, line, aadLine(id, seq)), C.seal(key, head, aadRec(id, "head:main"))]
        .concat(recs.map(function (r) { return C.seal(key, r.value, aadRec(id, r.kind + ":" + r.id)); }))).then(function (sealed) {
        var ops = [{ store: "journal", key: seq, value: sealed[0], add: true }, { store: "rec", key: "head:main", value: sealed[1] }];
        recs.forEach(function (r, i) { ops.push({ store: "rec", key: r.kind + ":" + r.id, value: sealed[i + 2] }); });
        metaOps.forEach(function (m) { ops.push({ store: "meta", key: m.key, value: m.value }); });
        return D.write(ops).then(function () {
          metaOps.forEach(function (m) { if (m.key === "door") doorMeta = clone(m.value); });
          if (state) {
            state.head = head;
            recs.forEach(function (r) { put(state, r.kind + ":" + r.id, clone(r.value)); });
          }
          emit("change", line);
          return line;
        });
      });
    });
  }

  /* ---------- settings, people, shelves ---------- */
  B.updateSettings = function (changes) {
    return B.change(function (st) {
      need("owner");
      var s = clone(st.settings), diff = {};
      Object.keys(changes).forEach(function (k) {
        if (JSON.stringify(s[k]) !== JSON.stringify(changes[k])) { diff[k] = [s[k] === undefined ? null : s[k], changes[k]]; s[k] = clone(changes[k]); }
      });
      if (!Object.keys(diff).length) return null;
      var meta = [];
      if (diff.ownerName && nameTaken(st, s.ownerName, "owner")) throw err("nameTaken");
      if (diff.storeName || diff.ownerName) meta.push({ key: "door", value: doorWith(diff.ownerName ? { storeName: s.storeName, user: cleanName(s.ownerName) } : { storeName: s.storeName }) });
      if (diff.ownerName) {
        var u = clone(st.users.owner); u.name = s.ownerName;
        return { type: "settings.updated", data: { changes: diff }, recs: [{ kind: "settings", id: "main", value: s }, { kind: "user", id: "owner", value: u }], meta: meta };
      }
      return { type: "settings.updated", data: { changes: diff }, recs: [{ kind: "settings", id: "main", value: s }], meta: meta };
    }).then(function (r) { if (state) E.settings = state.settings; return r; });
  };
  B.addCategory = function (name) {
    name = String(name || "").trim();
    if (!name) return Promise.reject(err("name"));
    return B.change(function (st) {
      need("items");
      var id = U.uid("c"), order = Object.keys(st.cats).length;
      var c = { id: id, name: name, order: order };
      return { type: "category.created", data: { cat: c }, recs: [{ kind: "cat", id: id, value: c }], result: c };
    });
  };

  /* The Author Studio's choices (names, words, look, receipt) are kept beside the envelopes, so the door can wear them
     before the store is opened; each change is also a ledger line, written in the same transaction. */
  B.saveCustom = function (custom, changed) {
    return B.change(function () { need("owner"); return { type: "author.changed", data: { changed: changed }, meta: [{ key: "custom", value: custom }] }; })
      .then(function (r) { E.custom = custom; return r; });
  };

  /* ---------- items ---------- */
  var ITEM_FIELDS = ["name", "cat", "price", "cost", "barcode", "sku", "taxId", "reorderAt", "notes"];
  function checkItem(it, st, selfId) {
    if (!it.name || !String(it.name).trim()) return "name";
    if (!Number.isSafeInteger(it.price) || it.price < 0) return "price";
    if (it.cost !== null && (!Number.isSafeInteger(it.cost) || it.cost < 0)) return "cost";
    if (it.reorderAt !== null && (!Number.isSafeInteger(it.reorderAt) || it.reorderAt < 0)) return "reorder";
    if (!st.cats[it.cat]) return "cat";
    if (it.taxId && !(st.settings.taxes || []).some(function (t) { return t.id === it.taxId; })) return "tax";
    if (it.barcode) {
      var dup = Object.keys(st.items).some(function (k) { var o = st.items[k]; return k !== selfId && !o.archived && o.barcode && o.barcode === it.barcode; });
      if (dup) return "barcodeTaken";
    }
    return null;
  }
  B.addItem = function (f) {
    return B.change(function (st) {
      need("items");
      var now = clock().toISOString();
      var it = { id: U.uid("i"), name: String(f.name || "").trim(), cat: f.cat, price: f.price, cost: f.cost === undefined ? null : f.cost,
        barcode: String(f.barcode || "").trim() || null, sku: String(f.sku || "").trim() || null, taxId: f.taxId || null,
        reorderAt: f.reorderAt === undefined ? null : f.reorderAt, notes: String(f.notes || "").trim(), stock: 0, archived: false, created: now, updated: now };
      var opening = f.openingStock || 0;
      if (!Number.isSafeInteger(opening) || opening < 0) throw err("qty");
      var bad = checkItem(it, st, it.id); if (bad) throw err(bad);
      it.stock = opening;
      return { type: "item.created", data: { item: clone(it) }, recs: [{ kind: "item", id: it.id, value: it }], result: it };
    });
  };
  B.editItem = function (id, f) {
    return B.change(function (st) {
      need("items");
      var old = st.items[id]; if (!old) throw err("noitem");
      var it = clone(old), diff = {};
      ITEM_FIELDS.forEach(function (k) {
        if (!(k in f)) return;
        var v = f[k];
        if (typeof v === "string") v = v.trim();
        if ((k === "barcode" || k === "sku" || k === "taxId") && !v) v = null;
        if (JSON.stringify(it[k]) !== JSON.stringify(v)) { diff[k] = [it[k] === undefined ? null : it[k], v]; it[k] = v; }
      });
      if (!Object.keys(diff).length) return null;
      var bad = checkItem(it, st, id); if (bad) throw err(bad);
      it.updated = clock().toISOString();
      return { type: "item.updated", data: { id: id, changes: diff }, recs: [{ kind: "item", id: id, value: it }], result: it };
    });
  };
  B.setArchived = function (id, flag) {
    return B.change(function (st) {
      need("items");
      var it = clone(st.items[id]); if (!it) throw err("noitem");
      if (!!it.archived === !!flag) return null;
      it.archived = !!flag; it.updated = clock().toISOString();
      return { type: "item.archived", data: { id: id, archived: !!flag }, recs: [{ kind: "item", id: id, value: it }], result: it };
    });
  };
  /* Weighted average cost: what is on the shelf is valued at the average of what it cost. */
  function averageCost(stockBefore, costBefore, qty, unitCost) {
    if (unitCost === null || unitCost === undefined) return costBefore;
    var have = Math.max(0, stockBefore);
    if (have === 0 || costBefore === null) return unitCost;
    return U.divRound(have * costBefore + qty * unitCost, have + qty);
  }
  B.averageCost = averageCost;
  B.receive = function (id, qty, unitCost, supplier, note) {
    return B.change(function (st) {
      need("receive");
      var it = clone(st.items[id]); if (!it) throw err("noitem");
      if (!Number.isSafeInteger(qty) || qty <= 0) throw err("qty");
      if (unitCost !== null && (!Number.isSafeInteger(unitCost) || unitCost < 0)) throw err("cost");
      var before = it.stock, costBefore = it.cost, costAfter = averageCost(before, costBefore, qty, unitCost);
      it.stock = before + qty; it.cost = costAfter; it.updated = clock().toISOString();
      var mv = { id: U.uid("m"), kind: "receive", itemId: id, qty: qty, unitCost: unitCost, costBefore: costBefore, costAfter: costAfter,
        stockBefore: before, stockAfter: it.stock, supplier: String(supplier || "").trim(), note: String(note || "").trim(),
        at: clock().toISOString(), day: U.dayKey(clock()), by: B.user.id };
      return { type: "stock.received", data: clone(mv), recs: [{ kind: "item", id: id, value: it }, { kind: "move", id: mv.id, value: mv }], result: it };
    });
  };
  B.REASONS = ["count", "damaged", "expired", "lost", "stolen", "personal", "returned", "other"];
  B.adjust = function (id, delta, reason, note) {
    return B.change(function (st) {
      need("adjust");
      var it = clone(st.items[id]); if (!it) throw err("noitem");
      if (!Number.isSafeInteger(delta) || delta === 0) throw err("qty");
      if (B.REASONS.indexOf(reason) < 0) throw err("reason");
      if (reason === "other" && !String(note || "").trim()) throw err("note");
      var before = it.stock; it.stock = before + delta; it.updated = clock().toISOString();
      var mv = { id: U.uid("m"), kind: "adjust", itemId: id, qty: delta, reason: reason, unitCost: it.cost, stockBefore: before, stockAfter: it.stock,
        note: String(note || "").trim(), at: clock().toISOString(), day: U.dayKey(clock()), by: B.user.id };
      return { type: "stock.adjusted", data: clone(mv), recs: [{ kind: "item", id: id, value: it }, { kind: "move", id: mv.id, value: mv }], result: it };
    });
  };

  /* ---------- the ticket and the sale ---------- */
  /* Prices a ticket from the books as they stand: lines [{itemId, qty}] give lines with prices, the tax of each rate
     (worked out on the total taxed at that rate, rounded half up to the cent) and the totals. */
  B.priceTicket = function (lines, st) {
    st = st || state;
    var out = { lines: [], subtotal: 0, taxes: [], tax: 0, total: 0, items: 0 }, byRate = {};
    lines.forEach(function (l) {
      var it = st.items[l.itemId]; if (!it || !(l.qty > 0)) return;
      var rate = null, tx = it.taxId ? (st.settings.taxes || []).find(function (t) { return t.id === it.taxId; }) : null;
      if (tx) rate = tx.rate;
      var amount = it.price * l.qty;
      out.lines.push({ itemId: it.id, name: it.name, cat: it.cat, qty: l.qty, price: it.price, cost: it.cost, taxId: tx ? tx.id : null, rate: rate, amount: amount });
      out.subtotal += amount; out.items += l.qty;
      if (tx) { byRate[tx.id] = byRate[tx.id] || { id: tx.id, name: tx.name, rate: tx.rate, base: 0, tax: 0 }; byRate[tx.id].base += amount; }
    });
    Object.keys(byRate).forEach(function (k) { var r = byRate[k]; r.tax = U.taxOn(r.base, r.rate); out.taxes.push(r); out.tax += r.tax; });
    out.total = out.subtotal + out.tax;
    return out;
  };
  B.completeSale = function (lines, tendered) {
    return B.change(function (st) {
      need("sell");
      var t = B.priceTicket(lines, st);
      if (!t.lines.length) throw err("empty");
      if (!Number.isSafeInteger(tendered) || tendered < t.total) throw err("short");
      var counter = clone(st.counters.receipt || { next: 1 }), no = B.device.code + "-" + String(counter.next).padStart(6, "0");
      counter.next += 1;
      var now = clock();
      var sale = { id: U.uid("s"), no: no, at: now.toISOString(), day: U.dayKey(now), hour: now.getHours(), by: B.user.id, byNo: B.numberOf(B.user), dev: B.device.id,
        lines: t.lines, subtotal: t.subtotal, taxes: t.taxes, tax: t.tax, total: t.total, items: t.items,
        pay: [{ method: "cash", amount: t.total, tendered: tendered, change: tendered - t.total }], status: "completed" };
      var recs = [{ kind: "sale", id: sale.id, value: sale }, { kind: "counter", id: "receipt", value: counter }];
      var touched = {};
      t.lines.forEach(function (l) { touched[l.itemId] = (touched[l.itemId] || 0) + l.qty; });
      Object.keys(touched).forEach(function (iid) {
        var it = clone(st.items[iid]); it.stock -= touched[iid]; it.updated = sale.at;
        recs.push({ kind: "item", id: iid, value: it });
      });
      return { type: "sale.completed", data: { sale: clone(sale) }, recs: recs, result: sale };
    });
  };

  /* ---------- reports ---------- */
  /* A report for whole days (fromKey to toKey, by the store's calendar), or for part of a day: win = { from, to } in
     milliseconds narrows it to the sales and moves made in that window (this hour, this morning, this afternoon). */
  B.report = function (fromKey, toKey, win, who) {
    function inWin(x) { if (!win) return true; var at = Date.parse(x.at); return at >= win.from && at < win.to; }
    function mine(x) { return !who || x.by === who; }
    var st = state, r = { from: fromKey, to: toKey, win: win || null, who: who || null, count: 0, items: 0, net: 0, tax: 0, gross: 0, cogs: 0, noCost: 0, profit: 0,
      byCat: {}, byItem: {}, byHour: [], byDay: {}, byMethod: {}, byPerson: {}, losses: { value: 0, qty: 0, byReason: {} }, received: { qty: 0, value: 0 } };
    for (var h = 0; h < 24; h++) r.byHour.push({ count: 0, gross: 0 });
    st.sales.forEach(function (s) {
      if (s.status !== "completed" || s.day < fromKey || s.day > toKey || !inWin(s) || !mine(s)) return;
      r.count++; r.items += s.items; r.net += s.subtotal; r.tax += s.tax; r.gross += s.total;
      var pp = r.byPerson[s.by] = r.byPerson[s.by] || { count: 0, items: 0, gross: 0 };
      pp.count++; pp.items += s.items; pp.gross += s.total;
      r.byHour[s.hour].count++; r.byHour[s.hour].gross += s.total;
      var d = r.byDay[s.day] = r.byDay[s.day] || { count: 0, gross: 0, net: 0, profit: 0 };
      d.count++; d.gross += s.total; d.net += s.subtotal;
      s.pay.forEach(function (p) { r.byMethod[p.method] = (r.byMethod[p.method] || 0) + p.amount; });
      s.lines.forEach(function (l) {
        var cost = l.cost === null ? null : l.cost * l.qty;
        if (cost === null) r.noCost += l.amount; else r.cogs += cost;
        var prof = cost === null ? 0 : l.amount - cost;
        d.profit += prof;
        var c = r.byCat[l.cat] = r.byCat[l.cat] || { qty: 0, net: 0, cogs: 0, profit: 0 };
        c.qty += l.qty; c.net += l.amount; c.cogs += cost || 0; c.profit += prof;
        var it = r.byItem[l.itemId] = r.byItem[l.itemId] || { itemId: l.itemId, name: l.name, cat: l.cat, qty: 0, net: 0, cogs: 0, profit: 0 };
        it.qty += l.qty; it.net += l.amount; it.cogs += cost || 0; it.profit += prof;
      });
    });
    /* profit counts only lines whose cost is known; sales of items with no cost are shown apart */
    r.profit = r.net - r.noCost - r.cogs;
    st.moves.forEach(function (m) {
      if (m.day < fromKey || m.day > toKey || !inWin(m) || !mine(m)) return;
      if (m.kind === "receive") { r.received.qty += m.qty; r.received.value += (m.unitCost || 0) * m.qty; }
      if (m.kind === "adjust" && m.qty < 0) {
        var v = (m.unitCost || 0) * -m.qty;
        r.losses.qty += -m.qty; r.losses.value += v;
        var b = r.losses.byReason[m.reason] = r.losses.byReason[m.reason] || { qty: 0, value: 0 };
        b.qty += -m.qty; b.value += v;
      }
    });
    return r;
  };
  B.stockSummary = function () {
    var s = { items: 0, units: 0, atCost: 0, atPrice: 0, noCost: 0, low: [], negative: [] };
    Object.keys(state.items).forEach(function (k) {
      var it = state.items[k]; if (it.archived) return;
      s.items++;
      var q = Math.max(0, it.stock); s.units += q; s.atPrice += q * it.price;
      if (it.cost === null) { if (q > 0) s.noCost++; } else s.atCost += q * it.cost;
      if (it.stock < 0) s.negative.push(it);
      if (it.reorderAt !== null && it.stock <= it.reorderAt) s.low.push(it);
    });
    s.low.sort(function (a, b) { return a.stock - b.stock; });
    return s;
  };

  /* ---------- verifying the books: every line read, every fingerprint recomputed, every stock figure replayed ---------- */
  B.verify = function (progress) {
    var key = KEY, id = ID, st = state;
    if (!key) return Promise.reject(err("locked"));
    return D.entries("journal").then(function (entries) {
      var res = { ok: true, lines: entries.length, problems: [] }, prev = ZERO, expect = 1, items = {}, i = 0;
      function next() {
        if (i >= entries.length) return Promise.resolve();
        var e = entries[i++];
        return C.open(key, e[1], aadLine(id, e[0])).then(function (line) {
          if (line.seq !== e[0] || e[0] !== expect) res.problems.push({ seq: e[0], what: "order" });
          if (line.prev !== prev) res.problems.push({ seq: e[0], what: "chain" });
          replay(items, line, res);
          expect = e[0] + 1;
          return U.sha256hex(U.canon(line)).then(function (hsh) { prev = hsh; });
        }, function () { res.problems.push({ seq: e[0], what: "unreadable" }); prev = null; expect = e[0] + 1; }).then(function () {
          if (progress && i % 200 === 0) progress(i, entries.length);
          return next();
        });
      }
      return next().then(function () {
        if (!st.head || st.head.seq !== entries.length || st.head.hash !== prev) res.problems.push({ seq: st.head ? st.head.seq : 0, what: "head" });
        Object.keys(st.items).forEach(function (k) {
          var a = st.items[k], b = items[k];
          if (!b) { res.problems.push({ item: k, what: "missing" }); return; }
          ["stock", "price", "cost", "archived", "name"].forEach(function (f) {
            if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) res.problems.push({ item: k, what: "differs", field: f, books: a[f], ledger: b[f] });
          });
        });
        Object.keys(items).forEach(function (k) { if (!st.items[k]) res.problems.push({ item: k, what: "extra" }); });
        (st.unreadable || []).forEach(function (k) { res.problems.push({ rec: k, what: "unreadable" }); });
        res.ok = res.problems.length === 0;
        return res;
      });
    });
  };
  function replay(items, line, res) {
    var d = line.data || {};
    switch (line.type) {
      case "item.created": items[d.item.id] = clone(d.item); break;
      case "item.updated": if (items[d.id]) Object.keys(d.changes).forEach(function (k) { items[d.id][k] = clone(d.changes[k][1]); }); break;
      case "item.archived": if (items[d.id]) items[d.id].archived = d.archived; break;
      case "stock.received":
        if (items[d.itemId]) {
          var it = items[d.itemId], want = averageCost(it.stock, it.cost, d.qty, d.unitCost);
          if (it.stock !== d.stockBefore || want !== d.costAfter) res.problems.push({ seq: line.seq, what: "receive" });
          it.stock += d.qty; it.cost = want;
        }
        break;
      case "stock.adjusted": if (items[d.itemId]) { if (items[d.itemId].stock !== d.stockBefore) res.problems.push({ seq: line.seq, what: "adjust" }); items[d.itemId].stock += d.qty; } break;
      case "sale.completed": (d.sale.lines || []).forEach(function (l) { if (items[l.itemId]) items[l.itemId].stock -= l.qty; }); break;
    }
  }

  /* The ledger, read back for people (newest first), for the History of an item and the ledger viewer. */
  B.lines = function (filter) {
    var key = KEY, id = ID;
    return D.entries("journal").then(function (entries) {
      return Promise.all(entries.map(function (e) { return C.open(key, e[1], aadLine(id, e[0])).catch(function () { return null; }); }));
    }).then(function (lines) { return lines.filter(function (l) { return l && (!filter || filter(l)); }).reverse(); });
  };

  /* ---------- passwords and the Master Key ---------- */
  function ownerKeyExtractable(password) {
    return D.get("meta", "vault").then(function (v) {
      return C.passwordKey(password, U.b64d(v.owner.salt), v.kdf.iterations).then(function (kek) {
        return C.unwrap(v.owner, kek, aadEnv(v.storeId, "owner"), true);
      }).then(function (k) { return { vault: v, key: k }; }, function () { throw err("wrong"); });
    });
  }
  B.checkPassword = function (password) { return ownerKeyExtractable(password).then(function () { return true; }); };
  B.changePassword = function (current, next) {
    return ownerKeyExtractable(current).then(function (h) {
      var v = clone(h.vault), salt = U.rnd(16);
      return C.passwordKey(next, salt).then(function (kek) { return C.wrap(h.key, kek, aadEnv(v.storeId, "owner")); }).then(function (env) {
        v.owner = { salt: U.b64e(salt), iv: env.iv, ct: env.ct };
        return B.change(function () { return { type: "owner.password.changed", data: {}, meta: [{ key: "vault", value: v }] }; });
      });
    });
  };
  /* A new Master Key replaces the old one; the old card stops working once the new one is confirmed. */
  B.prepareNewMaster = function (password) {
    return ownerKeyExtractable(password).then(function (h) {
      return C.newMaster().then(function (m) {
        return C.masterKey(m.secret, idBytes(h.vault.storeId)).then(function (kek) { return C.wrap(h.key, kek, aadEnv(h.vault.storeId, "master")); }).then(function (env) {
          return { code: m.code, finish: function () {
            var v = clone(h.vault); v.master = env;
            return B.change(function () { return { type: "master.replaced", data: {}, meta: [{ key: "vault", value: v }] }; });
          } };
        });
      });
    });
  };

  /* ---------- backups: the sealed books as they are, in one file ---------- */
  B.makeBackup = function () {
    if (B.user && !B.can("owner")) return Promise.reject(err("denied"));
    return Promise.all([D.get("meta", "vault"), D.get("meta", "door"), D.entries("rec"), D.entries("journal"), D.get("meta", "custom")]).then(function (r) {
      var body = { format: "emporium-backup", v: 1, build: E.BUILD.number, at: new Date().toISOString(), door: r[1], vault: r[0], custom: r[4] || null,
        rec: r[2].map(function (e) { return [e[0], U.b64e(e[1].iv), U.b64e(e[1].ct)]; }),
        journal: r[3].map(function (e) { return [e[0], U.b64e(e[1].iv), U.b64e(e[1].ct)]; }) };
      return U.sha256hex(U.canon(body)).then(function (sum) { body.sum = sum; return JSON.stringify(body); });
    });
  };
  B.readBackup = function (text) {
    var body;
    try { body = JSON.parse(text); } catch (e) { return Promise.reject(err("notbackup")); }
    if (!body || body.format !== "emporium-backup" || body.v !== 1 || !body.vault || !Array.isArray(body.rec) || !Array.isArray(body.journal)) return Promise.reject(err("notbackup"));
    var sum = body.sum; delete body.sum;
    return U.sha256hex(U.canon(body)).then(function (s) {
      if (s !== sum) throw err("corrupt");
      return body;
    });
  };
  /* Opens a backup's own envelope with the password (or the Master Key) that was valid when it was made, reads every
     line of its ledger, and only then replaces the books on this device, in one transaction. */
  B.restoreBackup = function (body, secret, isMaster) {
    var v = body.vault, keyP;
    if (isMaster) keyP = C.readMaster(secret).then(function (s) { if (!s) throw err("badcode"); return C.masterKey(s, idBytes(v.storeId)); })
      .then(function (kek) { return C.unwrap(v.master, kek, aadEnv(v.storeId, "master"), false); });
    else keyP = C.passwordKey(secret, U.b64d(v.owner.salt), v.kdf.iterations).then(function (kek) { return C.unwrap(v.owner, kek, aadEnv(v.storeId, "owner"), false); });
    return keyP.catch(function (e) { if (e && e.code) throw e; throw err(isMaster ? "wrongmaster" : "wrong"); }).then(function (key) {
      var journal = body.journal.map(function (e) { return [e[0], { iv: U.b64d(e[1]), ct: U.b64d(e[2]) }]; });
      var rec = body.rec.map(function (e) { return [e[0], { iv: U.b64d(e[1]), ct: U.b64d(e[2]) }]; });
      var prev = ZERO, i = 0;
      function next() {
        if (i >= journal.length) return Promise.resolve();
        var e = journal[i++];
        return C.open(key, e[1], aadLine(v.storeId, e[0])).then(function (line) {
          if (line.prev !== prev || line.seq !== i) throw err("chain");
          return U.sha256hex(U.canon(line)).then(function (h) { prev = h; return next(); });
        });
      }
      return next().then(function () { return B.lock("restore"); }).then(function () {
        var meta = [["vault", v], ["door", body.door], ["device", B.device]];
        if (body.custom) meta.push(["custom", E.cleanCustom ? E.cleanCustom(body.custom) : body.custom]);
        return D.replaceAll(meta, rec, journal);
      }).then(function () { doorMeta = body.door || null; E.custom = body.custom && E.cleanCustom ? E.cleanCustom(body.custom) : null; if (E.ui && E.ui.applyLook) E.ui.applyLook(); return load(v, key); });
    });
  };

  /* ---------- erasing the store from this device (the owner only, with the password) ---------- */
  B.erase = function (password) {
    return B.checkPassword(password).then(function () { return B.lock("erase"); }).then(function () { return D.wipe(); }).then(function () {
      return D.write([{ store: "meta", key: "device", value: B.device }]);
    });
  };
  /* The Reset key at the door: the store leaves this device with no password asked. The books are sealed, so nothing
     in them can be read this way; they are only gone from this device. The door offers a sealed backup first. */
  B.eraseAtDoor = function () {
    if (B.isOpen) return Promise.reject(err("denied"));
    B.useBooks(false);
    return notesSettled().then(function () { return D.wipe(); }).then(function () { doorMeta = null; return D.write([{ store: "meta", key: "device", value: B.device }]); });
  };
  /* The sign-in's memory on this device: the waits after wrong tries, and the last name typed. */
  B.forgetSignIn = function () {
    U.prefSet("fails", "0"); U.prefSet("waitUntil", "0");
    return D.get("meta", "door").then(function (d) {
      if (!d || !d.last) return false;
      delete d.last; doorMeta = d;
      return D.write([{ store: "meta", key: "door", value: d }]).then(function () { return true; });
    }).catch(function () { return false; });
  };
})();
