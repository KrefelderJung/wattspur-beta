const APP_VERSION = '2026.08.09-beta.11';
const CACHE_NAME = `lastgang-analyse-${APP_VERSION}`;

const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'styles.css',
    'state.js',
    'utils.js',
    'parser.js',
    'charts.js',
    'app.js',
    'messkonzept.js',
    'import/parser.js',
    'data-quality/quality.js',
    'energy/energy.js',
    'agnes/agnes.js',
    'export/export.js',
    'ui/ui.js',
    'tests/test-suite.js',
    'js/shared/identifiers.js',
    'js/shared/numbers.js',
    'js/shared/dates.js',
    'js/shared/html.js',
    'js/shared/download.js',
    'js/domain/measurement-model.js',
    'js/domain/energy-calculation.js',
    'js/domain/data-quality.js',
    'js/domain/tariff-calculation.js',
    'js/domain/profile-calculation.js',
    'js/domain/aggregation.js',
    'js/agnes/agnes-cost-model.js',
    'js/agnes/agnes-input.js',
    'js/agnes/agnes-validation.js',
    'js/agnes/agnes-result.js',
    'js/agnes/agnes-optimizer.js',
    'js/agnes/agnes-multi-year.js',
    'js/state/app-state.js',
    'js/import/csv-parser.js',
    'js/import/file-import.js',
    'js/import/import-validator.js',
    'js/import/mscons-parser.js',
    'js/ui/dashboard-controller.js',
    'js/ui/dashboard-view.js',
    'js/ui/navigation-controller.js',
    'js/ui/quality-view.js',
    'js/ui/modal-view.js',
    'js/ui/chart-view.js',
    'js/ui/editor-view.js',
    'js/ui/editor-controller.js',
    'js/ui/agnes-view.js',
    'js/ui/agnes-controller.js',
    'js/export/csv-export.js',
    'js/export/agnes-export.js',
    'js/export/report-export.js',
    'js/export/project-export.js',
    'js/app.js',
    'manifest.json',
    'wattspur-mark.svg',
    'icon-192.png',
    'icon-512.png',
    'lib/echarts.min.js',
    'lib/papaparse.min.js'
];

// Install Event - Resilient per-asset caching (Punkt 20)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async cache => {
                console.log('[Service Worker] Pre-caching assets:', CACHE_NAME);
                for (const asset of ASSETS_TO_CACHE) {
                    try {
                        await cache.add(asset);
                    } catch (err) {
                        console.warn('[Service Worker] Skipped non-critical asset:', asset, err);
                    }
                }
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Cache-First with Network-Fallback
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || 
        (!event.request.url.startsWith('http') && !event.request.url.startsWith('https'))) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                }).catch(() => {
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
