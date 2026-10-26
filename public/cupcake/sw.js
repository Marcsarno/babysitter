/* Arianna's Cupcakes service worker: plays offline, always fetches the newest files when online.
   Cache names start with "cupcake-" and never end in "-core", so Babcia's Mahjong worker leaves them alone. */
const CACHE = 'cupcake-files-v2';
const SHELL = [
  '/cupcake/', '/cupcake/style.css', '/cupcake/manifest.webmanifest', '/cupcake/icon.svg', '/cupcake/icon-192.png', '/cupcake/icon-512.png', '/cupcake/apple-touch-icon.png',
  '/cupcake/art/manifest.json', '/cupcake/js/main.js', '/cupcake/js/logic.js', '/cupcake/js/town.js', '/cupcake/js/draw.js', '/cupcake/js/art.js', '/cupcake/js/audio.js',
  '/cupcake/js/say.js', '/cupcake/js/shops.js', '/cupcake/js/salon.js',
];

self.addEventListener('install', e => {
  // one missing file must not stop the install, so cache each file on its own
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('cupcake-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  // voice lines are byte ranges of a voice pack: let those go straight to the network
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!font && (url.origin !== location.origin || !url.pathname.startsWith('/cupcake/'))) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || (req.mode === 'navigate' ? caches.match('/cupcake/') : Response.error()))));
});
