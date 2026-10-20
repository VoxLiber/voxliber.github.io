/* Vox Liber · service worker: permite instalar la app y abrirla con mala conexión. */
var VERSION = 'voxliber-v1';
var BASE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // La API, el inicio de sesión de Google y la radio siempre van directo a la red.
  if (/script\.google\.com|googleusercontent\.com|accounts\.google\.com|zeno\.fm/.test(url.hostname)) return;

  // Páginas y archivos del sitio: primero la red (siempre lo más nuevo), y si no hay conexión, la copia guardada.
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      var copia = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); return res;
    }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); }));
    return;
  }

  // Tipografías: se guardan para que el sitio se vea bien sin conexión.
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) { var copia = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); return res; });
    }));
  }
});
