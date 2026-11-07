/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The books: setting up a store, opening and locking it, the ledger, stock, sales, reports, backups, and verification.
   Every change is one ledger line, written in the same transaction as the records it changes. */
"use strict";
(function () {
  var U = E.util, C = E.crypto, D = E.db;
  var B = E.books = { isOpen: false };
  var KEY = null, ID = null, state = null, listeners = {};
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
      return Promise.all([D.get("meta", "vault"), D.get("meta", "door")]);
    }).then(function (r) { return { hasStore: !!r[0], door: r[1] || null, vault: r[0] || null }; });
  };

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
      var ops = [{ store: "meta", key: "vault", value: vault }, { store: "meta", key: "door", value: { storeName: o.storeName, created: now.toISOString() } },
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

  function load(vault, key) {
    ID = vault.storeId;
    return D.entries("rec").then(function (entries) {
      var st = { settings: null, users: {}, cats: {}, items: {}, sales: [], moves: [], counters: {}, head: null, unreadable: [] };
      return Promise.all(entries.map(function (e) {
        return C.open(key, e[1], aadRec(ID, e[0])).then(function (val) { return [e[0], val]; }, function () { st.unreadable.push(e[0]); return null; });
      })).then(function (rows) {
        rows.forEach(function (r) { if (r) put(st, r[0], r[1]); });
        st.sales.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
        st.moves.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
        if (!st.head || !st.settings) throw err("damaged");
        return D.get("journal", st.head.seq).then(function (env) {
          if (!env) { st.headProblem = true; return; }
          return C.open(key, env, aadLine(ID, st.head.seq)).then(function (line) {
            return U.sha256hex(U.canon(line)).then(function (h) { if (h !== st.head.hash) st.headProblem = true; });
          }, function () { st.headProblem = true; });
        }).then(function () { return st; });
      });
    }).then(function (st) {
      KEY = key; state = st; B.isOpen = true;
      B.user = st.users.owner;
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
    else if (kind === "counter") st.counters[id] = v;
  }

  B.lock = function (why) {
    KEY = null; state = null; B.isOpen = false; B.user = null; E.settings = null; ID = null;
    emit("lock", why || "hand");
  };
  B.state = function () { return state; };

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
    var now = new Date(), seq = state.head.seq + 1;
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
      var s = clone(st.settings), diff = {};
      Object.keys(changes).forEach(function (k) {
        if (JSON.stringify(s[k]) !== JSON.stringify(changes[k])) { diff[k] = [s[k] === undefined ? null : s[k], changes[k]]; s[k] = clone(changes[k]); }
      });
      if (!Object.keys(diff).length) return null;
      var meta = [];
      if (diff.storeName) meta.push({ key: "door", value: { storeName: s.storeName, created: s.created } });
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
      var id = U.uid("c"), order = Object.keys(st.cats).length;
      var c = { id: id, name: name, order: order };
      return { type: "category.created", data: { cat: c }, recs: [{ kind: "cat", id: id, value: c }], result: c };
    });
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
      var now = new Date().toISOString();
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
      it.updated = new Date().toISOString();
      return { type: "item.updated", data: { id: id, changes: diff }, recs: [{ kind: "item", id: id, value: it }], result: it };
    });
  };
  B.setArchived = function (id, flag) {
    return B.change(function (st) {
      var it = clone(st.items[id]); if (!it) throw err("noitem");
      if (!!it.archived === !!flag) return null;
      it.archived = !!flag; it.updated = new Date().toISOString();
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
      var it = clone(st.items[id]); if (!it) throw err("noitem");
      if (!Number.isSafeInteger(qty) || qty <= 0) throw err("qty");
      if (unitCost !== null && (!Number.isSafeInteger(unitCost) || unitCost < 0)) throw err("cost");
      var before = it.stock, costBefore = it.cost, costAfter = averageCost(before, costBefore, qty, unitCost);
      it.stock = before + qty; it.cost = costAfter; it.updated = new Date().toISOString();
      var mv = { id: U.uid("m"), kind: "receive", itemId: id, qty: qty, unitCost: unitCost, costBefore: costBefore, costAfter: costAfter,
        stockBefore: before, stockAfter: it.stock, supplier: String(supplier || "").trim(), note: String(note || "").trim(),
        at: new Date().toISOString(), day: U.dayKey(), by: B.user.id };
      return { type: "stock.received", data: clone(mv), recs: [{ kind: "item", id: id, value: it }, { kind: "move", id: mv.id, value: mv }], result: it };
    });
  };
  B.REASONS = ["count", "damaged", "expired", "lost", "stolen", "personal", "returned", "other"];
  B.adjust = function (id, delta, reason, note) {
    return B.change(function (st) {
      var it = clone(st.items[id]); if (!it) throw err("noitem");
      if (!Number.isSafeInteger(delta) || delta === 0) throw err("qty");
      if (B.REASONS.indexOf(reason) < 0) throw err("reason");
      if (reason === "other" && !String(note || "").trim()) throw err("note");
      var before = it.stock; it.stock = before + delta; it.updated = new Date().toISOString();
      var mv = { id: U.uid("m"), kind: "adjust", itemId: id, qty: delta, reason: reason, unitCost: it.cost, stockBefore: before, stockAfter: it.stock,
        note: String(note || "").trim(), at: new Date().toISOString(), day: U.dayKey(), by: B.user.id };
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
      var t = B.priceTicket(lines, st);
      if (!t.lines.length) throw err("empty");
      if (!Number.isSafeInteger(tendered) || tendered < t.total) throw err("short");
      var counter = clone(st.counters.receipt || { next: 1 }), no = B.device.code + "-" + String(counter.next).padStart(6, "0");
      counter.next += 1;
      var now = new Date();
      var sale = { id: U.uid("s"), no: no, at: now.toISOString(), day: U.dayKey(now), hour: now.getHours(), by: B.user.id, dev: B.device.id,
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
  B.report = function (fromKey, toKey) {
    var st = state, r = { from: fromKey, to: toKey, count: 0, items: 0, net: 0, tax: 0, gross: 0, cogs: 0, noCost: 0, profit: 0,
      byCat: {}, byItem: {}, byHour: [], byDay: {}, byMethod: {}, losses: { value: 0, qty: 0, byReason: {} }, received: { qty: 0, value: 0 } };
    for (var h = 0; h < 24; h++) r.byHour.push({ count: 0, gross: 0 });
    st.sales.forEach(function (s) {
      if (s.status !== "completed" || s.day < fromKey || s.day > toKey) return;
      r.count++; r.items += s.items; r.net += s.subtotal; r.tax += s.tax; r.gross += s.total;
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
      if (m.day < fromKey || m.day > toKey) return;
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
    return Promise.all([D.get("meta", "vault"), D.get("meta", "door"), D.entries("rec"), D.entries("journal")]).then(function (r) {
      var body = { format: "emporium-backup", v: 1, build: E.BUILD.number, at: new Date().toISOString(), door: r[1], vault: r[0],
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
      return next().then(function () {
        B.lock("restore");
        return D.replaceAll([["vault", v], ["door", body.door], ["device", B.device]], rec, journal);
      }).then(function () { return load(v, key); });
    });
  };

  /* ---------- erasing the store from this device (the owner only, with the password) ---------- */
  B.erase = function (password) {
    return B.checkPassword(password).then(function () { B.lock("erase"); return D.wipe(); }).then(function () {
      return D.write([{ store: "meta", key: "device", value: B.device }]);
    });
  };
})();
