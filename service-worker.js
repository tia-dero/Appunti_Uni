/* Service worker: uso offline + aggiornamenti rapidi.
   - Pagina, manifest e script: prima la rete (versione piu' recente), la copia salvata solo se offline o rete lenta.
   - Immagini e pdf.js: dalla copia salvata (non cambiano quasi mai).
   Cambia VERSION se vuoi forzare la pulizia della cache. */
const VERSION = 'appunti-v77-cerebral-atlas';
const CORE = ['./', 'index.html', 'manifest.json', 'logo-48.png', 'logo-96.png', 'logo-128.png', 'logo-192.png', 'logo-256.png', 'logo-384.png', 'logo-512.png', 'logo-maskable-512.png',
  'matter-core.js', 'ttsmaker-file-2026-11-10-10-58-55.mp3', 'pdf.min.js', 'pdf.worker.min.js', 'orario.html', 'piano-studio.html', 'anatomia.html', 'font-bricolage-800.woff2', 'font-dmsans-400.woff2', 'font-dmsans-500.woff2', 'font-dmsans-700.woff2'];
const STATIC = /\.(png|jpe?g|ico|webp|woff2)$|pdf(\.worker)?\.min\.js$/;
const NETWORK_TIMEOUT = 4000;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE.map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (STATIC.test(url.pathname) && cached) return cached;
    const network = fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    try {
      if (!cached) return await network;
      return await Promise.race([network, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT))]);
    } catch (error) {
      network.catch(() => {});
      if (cached) return cached;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
