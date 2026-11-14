/* LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.
   The web app's service worker (Build 14). It keeps Lakay's page, its manifest and its icons, so that Lakay opens with
   no connection once it has been opened. It keeps nothing else: the store's books stay sealed in the browser's own
   store on this device, and the worker never sees them. With a connection it always fetches the newest page first;
   only when there is none does it answer from what it kept. It touches nothing but this site's own files. */
"use strict";
var CACHE = "/*@@CACHE@@*/";
var FILES = "/*@@FILES@@*/";
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("lakay-web-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok && res.type === "basic") { var copy = res.clone(); caches.open(CACHE).then(function (c) { return c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || (req.mode === "navigate" ? caches.match("index.html") : undefined); });
  }));
});
