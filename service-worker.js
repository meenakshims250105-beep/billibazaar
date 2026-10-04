const BASE_PATH = new URL('.', self.location).pathname;
const CACHE = 'billi-bazaar-shell-v3';
const APP_FILES = ['index.html', 'checkout.html', 'styles.css', 'design-system.css', 'brand.css', 'checkout.css', 'app.js', 'checkout.js', 'manifest.webmanifest', 'icon.svg'];
const APP_SHELL = [BASE_PATH, ...APP_FILES.map(file => `${BASE_PATH}${file}`)];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match(`${BASE_PATH}index.html`))));
});
