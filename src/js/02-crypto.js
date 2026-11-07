/* EMPORIUM | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The seal. Methods and numbers are those of docs/02-DESIGN-AND-SECURITY.md (appendix); a change here changes that page. */
"use strict";
(function () {
  var U = E.util, S = crypto.subtle, TE = U.TE, TD = U.TD;
  var C = E.crypto = {};
  C.ITERATIONS = 600000;                       // PBKDF2-HMAC-SHA-256 (OWASP Password Storage Cheat Sheet)
  C.MIN_PASSWORD = 10;

  /* The Store Key: one random AES-GCM key that seals the whole store. Extractable only so it can be put in envelopes. */
  C.newStoreKey = function () { return S.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]); };

  /* A key made from a password, good only for opening and closing envelopes. */
  C.passwordKey = function (password, salt, iterations) {
    return S.importKey("raw", TE.encode(String(password).normalize("NFC")), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return S.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: iterations || C.ITERATIONS }, base,
        { name: "AES-GCM", length: 256 }, false, ["wrapKey", "unwrapKey"]);
    });
  };
  /* A key made from the Master Key's secret (240 random bits need no slow derivation; HKDF binds it to this store). */
  C.masterKey = function (secret, storeIdBytes) {
    return S.importKey("raw", secret, "HKDF", false, ["deriveKey"]).then(function (base) {
      return S.deriveKey({ name: "HKDF", hash: "SHA-256", salt: storeIdBytes, info: TE.encode("emporium master wrap v1") }, base,
        { name: "AES-GCM", length: 256 }, false, ["wrapKey", "unwrapKey"]);
    });
  };
  /* An envelope: the Store Key sealed under another key. The additional data names the store and the envelope, so an
     envelope cannot be moved to another store or another place. */
  C.wrap = function (storeKey, kek, aad) {
    var iv = U.rnd(12);
    return S.wrapKey("raw", storeKey, kek, { name: "AES-GCM", iv: iv, additionalData: TE.encode(aad) }).then(function (ct) {
      return { iv: U.b64e(iv), ct: U.b64e(new Uint8Array(ct)) };
    });
  };
  C.unwrap = function (env, kek, aad, extractable) {
    return S.unwrapKey("raw", U.b64d(env.ct), kek, { name: "AES-GCM", iv: U.b64d(env.iv), additionalData: TE.encode(aad) },
      { name: "AES-GCM", length: 256 }, !!extractable, ["encrypt", "decrypt"]);
  };

  /* Sealing a record or a ledger line. IndexedDB keeps the bytes as they are. */
  C.seal = function (key, obj, aad) {
    var iv = U.rnd(12);
    return S.encrypt({ name: "AES-GCM", iv: iv, additionalData: TE.encode(aad) }, key, TE.encode(JSON.stringify(obj))).then(function (ct) {
      return { iv: iv, ct: new Uint8Array(ct) };
    });
  };
  C.open = function (key, env, aad) {
    return S.decrypt({ name: "AES-GCM", iv: env.iv, additionalData: TE.encode(aad) }, key, env.ct).then(function (pt) {
      return JSON.parse(TD.decode(pt));
    });
  };

  /* ---------- the Master Key, written for people ----------
     30 random bytes (240 bits) and a 2-byte checksum (the first bytes of their SHA-256), written in Crockford's Base32
     (no I, L, O or U, so nothing is mistaken for 1 or 0): 52 characters in 13 groups of 4. */
  var ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  function toB32(bytes) {
    var out = "", acc = 0, bits = 0;
    for (var i = 0; i < bytes.length; i++) { acc = (acc << 8) | bytes[i]; bits += 8; while (bits >= 5) { out += ALPHA[(acc >>> (bits - 5)) & 31]; bits -= 5; } acc &= (1 << bits) - 1; }
    if (bits > 0) out += ALPHA[(acc << (5 - bits)) & 31];
    return out;
  }
  function fromB32(text) {
    var out = [], acc = 0, bits = 0;
    for (var i = 0; i < text.length; i++) {
      var v = ALPHA.indexOf(text[i]); if (v < 0) return null;
      acc = (acc << 5) | v; bits += 5;
      if (bits >= 8) { out.push((acc >>> (bits - 8)) & 255); bits -= 8; }
      acc &= (1 << bits) - 1;
    }
    if (acc !== 0) return null;                   // the unused bits of the last character must be zero
    return new Uint8Array(out);
  }
  C.cleanMasterText = function (text) {
    return String(text || "").toUpperCase().replace(/[\s\-–—.·_]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  };
  C.groups = function (code) { return code.match(/.{1,4}/g); };
  C.newMaster = function () {
    var secret = U.rnd(30);
    return S.digest("SHA-256", secret).then(function (d) {
      var all = new Uint8Array(32); all.set(secret, 0); all.set(new Uint8Array(d).subarray(0, 2), 30);
      return { secret: secret, code: toB32(all) };
    });
  };
  /* Reads a Master Key typed by a person. Resolves to its secret, or null if it is not a Master Key (wrong length,
     a character that is not used, or a checksum that does not match: a typing mistake is caught before anything else). */
  C.readMaster = function (text) {
    var t = C.cleanMasterText(text);
    if (t.length !== 52) return Promise.resolve(null);
    var all = fromB32(t);
    if (!all || all.length !== 32) return Promise.resolve(null);
    var secret = all.subarray(0, 30);
    return S.digest("SHA-256", secret).then(function (d) {
      var dd = new Uint8Array(d);
      return dd[0] === all[30] && dd[1] === all[31] ? new Uint8Array(secret) : null;
    });
  };

  /* How strong a password is, in words a person can act on (never a promise of safety). */
  C.passwordAdvice = function (pw) {
    pw = String(pw || "");
    if (pw.length < C.MIN_PASSWORD) return { ok: false, key: "pw.tooShort" };
    var kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(pw); }).length;
    if (/^(.)\1+$/.test(pw) || /^(0123456789|1234567890|password|motdepasse|azerty|qwerty)/i.test(pw)) return { ok: false, key: "pw.tooSimple" };
    if (pw.length >= 16 || (pw.length >= 12 && kinds >= 3)) return { ok: true, key: "pw.strong" };
    return { ok: true, key: "pw.fair" };
  };
})();
