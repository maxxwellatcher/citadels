import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  plugins: [{
    name: 'offline-package',
    generateBundle(_options, bundle) {
      const assets = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
        ...Object.keys(bundle).map(file => './' + file)];
      const version = createHash('sha256').update(JSON.stringify(Object.entries(bundle).map(([name, item]) =>
        [name, item.type === 'asset' ? String(item.source) : item.code]))).digest('hex').slice(0, 16);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'citadels-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('citadels-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || fetch(event.request);
    return fetch(event.request);
  }));
});
` });
    },
  }],
});
