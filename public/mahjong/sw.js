/* Babcia's Mahjong service worker: plays offline, picks up new versions on the next launch. */
const VERSION = 'babcia-dev';
const CORE = `${VERSION}-core`, MUSIC = 'babcia-music', FONTS = 'babcia-fonts';
const SHELL = [
  '/mahjong/', '/mahjong/manifest.webmanifest', '/mahjong/splash.webp', '/mahjong/babcia.webp',
  '/mahjong/dziadziu.webp', '/mahjong/yola.webp', '/mahjong/dave.webp', '/mahjong/chris.webp',
  '/mahjong/favicon.png', '/mahjong/apple-touch-icon.png', '/mahjong/icon-192.png', '/mahjong/icon-512.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.endsWith('-core') && k !== CORE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return e.respondWith(staleWhileRevalidate(req, FONTS));
  if (url.origin !== location.origin || !url.pathname.startsWith('/mahjong/')) return;
  if (url.pathname.endsWith('.mp3')) return e.respondWith(music(req, url));
  if (req.mode === 'navigate' || url.pathname === '/mahjong/' || url.pathname.endsWith('.html')) return e.respondWith(networkFirst(req));
  e.respondWith(staleWhileRevalidate(req, CORE));
});

// the page: always the newest version when online, the saved copy when offline
async function networkFirst(req) {
  const c = await caches.open(CORE);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) c.put('/mahjong/', res.clone());
    return res;
  } catch (err) {
    return (await c.match('/mahjong/')) || Response.error();
  }
}
async function staleWhileRevalidate(req, name) {
  const c = await caches.open(name), hit = await c.match(req);
  const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

// songs: downloaded whole the first time, saved, then served (with seeking) from the saved copy
const inflight = new Map();
async function music(req, url) {
  const c = await caches.open(MUSIC), key = url.pathname;
  let hit = await c.match(key);
  if (!hit) {
    if (!inflight.has(key)) inflight.set(key, fetch(key).then(async res => { if (res.ok) await c.put(key, res.clone()); return res; }).finally(() => inflight.delete(key)));
    try { await inflight.get(key); } catch (err) { return fetch(req); }
    hit = await c.match(key);
    if (!hit) return fetch(req);
  }
  const range = req.headers.get('range');
  if (!range) return hit;
  const buf = await hit.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  if (!m[1] && m[2]) { start = size - +m[2]; end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}
