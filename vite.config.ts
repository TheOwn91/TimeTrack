import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Erzeugt beim Build einen Service Worker, der alle Dateien der App vorab
 * zwischenspeichert – danach läuft die App komplett offline.
 */
function serviceWorker(): Plugin {
  return {
    name: 'timetrack-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = [
        './',
        ...Object.keys(bundle).map((f) => `./${f}`),
        ...readdirSync('public').map((f) => `./${f}`),
      ];
      const hash = createHash('sha256');
      for (const f of readdirSync('public')) hash.update(readFileSync(`public/${f}`));
      for (const [name, chunk] of Object.entries(bundle)) {
        hash.update(name);
        hash.update(chunk.type === 'chunk' ? chunk.code : chunk.source);
      }
      const version = hash.digest('hex').slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const CACHE = 'timetrack-${version}';
const FILES = ${JSON.stringify(files)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('timetrack-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Cache zuerst: startet sofort, auch ohne Netz. Updates kommen über einen neuen sw.js.
  const key = req.mode === 'navigate' ? './' : req;
  event.respondWith(caches.match(key, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
`,
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
});
