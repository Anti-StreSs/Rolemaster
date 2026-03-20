const CACHE_NAME = 'rolemaster-v10';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/engine/data-loader.js',
  './js/engine/character.js',
  './js/engine/stats.js',
  './js/engine/stat_potentials.js',
  './js/engine/classes.js',
  './js/engine/skills.js',
  './js/engine/spells.js',
  './js/engine/equipment.js',
  './js/engine/export.js',
  './js/ui/wizard.js',
  './js/ui/sheet.js',
  './js/ui/components.js',
  './js/ui/settings.js',
  './js/i18n/fr.js',
  './js/i18n/en.js',
  './data/carac_tables.json',
  './data/classes.json',
  './data/competences.json',
  './data/sorts.json',
  './data/couts.json',
  './data/categories.json',
  './data/simil.json',
  './data/options.json',
  './data/monde.json',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
