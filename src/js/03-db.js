/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The device's own database (IndexedDB). Three shelves:
     meta     the few plain facts needed before the store is opened (the envelopes, the store's name at the door);
     rec      the store's records, each sealed, under keys such as "item:7xk2...";
     journal  the ledger, one sealed line per number, never changed once written. */
"use strict";
(function () {
  var D = E.db = {};
  D.NAME = "emporium";
  D.VERSION = 1;
  var dbp = null;

  D.open = function () {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      var r;
      try { r = indexedDB.open(D.NAME, D.VERSION); } catch (e) { reject(e); return; }
      r.onupgradeneeded = function () {
        var db = r.result;
        ["meta", "rec", "journal"].forEach(function (n) { if (!db.objectStoreNames.contains(n)) db.createObjectStore(n); });
      };
      r.onsuccess = function () {
        var db = r.result;
        db.onversionchange = function () { try { db.close(); } catch (e) { } dbp = null; };
        resolve(db);
      };
      r.onerror = function () { dbp = null; reject(r.error || new Error("IndexedDB")); };
      r.onblocked = function () { reject(new Error("blocked")); };
    });
    return dbp;
  };
  function req(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }

  D.get = function (store, key) {
    return D.open().then(function (db) { return req(db.transaction(store, "readonly").objectStore(store).get(key)); });
  };
  /* Every [key, value] of a shelf, in key order. */
  D.entries = function (store) {
    return D.open().then(function (db) {
      return new Promise(function (res, rej) {
        var out = [], r = db.transaction(store, "readonly").objectStore(store).openCursor();
        r.onsuccess = function () { var c = r.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); };
        r.onerror = function () { rej(r.error); };
      });
    });
  };
  D.count = function (store) { return D.open().then(function (db) { return req(db.transaction(store, "readonly").objectStore(store).count()); }); };

  /* One atomic write: everything in `ops` is written, or nothing is. Each op is
     {store, key, value, add} (add: refuse to replace an existing key, which keeps the ledger's numbers unique). */
  D.write = function (ops) {
    return D.open().then(function (db) {
      var names = ops.map(function (o) { return o.store; }).filter(function (n, i, a) { return a.indexOf(n) === i; });
      return new Promise(function (res, rej) {
        var tx = db.transaction(names, "readwrite");
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { rej(tx.error || new Error("write")); };
        tx.onabort = function () { rej(tx.error || new Error("aborted")); };
        ops.forEach(function (o) {
          var s = tx.objectStore(o.store);
          if (o.del) s.delete(o.key); else if (o.add) s.add(o.value, o.key); else s.put(o.value, o.key);
        });
      });
    });
  };
  /* Empties every shelf (used only when the owner erases the store from this device, or restores a backup). */
  D.wipe = function () {
    return D.open().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(["meta", "rec", "journal"], "readwrite");
        tx.oncomplete = function () { res(true); }; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error); };
        ["meta", "rec", "journal"].forEach(function (n) { tx.objectStore(n).clear(); });
      });
    });
  };
  /* Replaces everything in one transaction (restoring a backup): either the whole backup is in place, or nothing changed. */
  D.replaceAll = function (meta, rec, journal) {
    return D.open().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(["meta", "rec", "journal"], "readwrite");
        tx.oncomplete = function () { res(true); }; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error || new Error("aborted")); };
        var m = tx.objectStore("meta"), r = tx.objectStore("rec"), j = tx.objectStore("journal");
        m.clear(); r.clear(); j.clear();
        meta.forEach(function (e) { m.put(e[1], e[0]); });
        rec.forEach(function (e) { r.put(e[1], e[0]); });
        journal.forEach(function (e) { j.add(e[1], e[0]); });
      });
    });
  };
  /* Ask the browser to keep this database even when the device runs short of room. */
  D.persist = function () {
    try { if (navigator.storage && navigator.storage.persist) return navigator.storage.persist().catch(function () { return false; }); } catch (e) { }
    return Promise.resolve(false);
  };
  D.estimate = function () {
    try { if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate().catch(function () { return null; }); } catch (e) { }
    return Promise.resolve(null);
  };
})();
