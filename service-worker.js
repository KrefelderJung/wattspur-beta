const APP_VERSION = '2026.09.03-beta.385';
const CACHE_NAME = `lastgang-analyse-${APP_VERSION}`;

const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'lastgang-analyse.html',
    'lastganganalyse/index.html',
    'kontakt.html',
    'impressum.html',
    'datenschutz.html',
    'lizenz.html',
    'tests.html',
    'styles.css',
    'theme.js',
    'assets/hero-wattspur-trail.png',
    'state.js',
    'utils.js',
    'parser.js',
    'charts.js',
    'app.js',
    'messkonzept-konfigurator.html',
    'messkonzeptkonfigurator/index.html',
    'route-loader.js',
    'robots.txt',
    'sitemap.xml',
    'js/lastgang/data-editor.js',
    'js/messkonzept/model.js',
    'js/messkonzept/presets.js',
    'js/messkonzept/preset-loader.js',
    'js/messkonzept/rules.js',
    'js/messkonzept/validation-status.js',
    'js/messkonzept/identifiers.js',
    'js/messkonzept/meter-policy.js',
    'js/messkonzept/asset-display.js',
    'js/messkonzept/layout-calculations.js',
    'js/messkonzept/layout.js',
    'messkonzept-geometry.js',
    'messkonzept-topology.js',
    'js/messkonzept/render.js',
    'js/messkonzept/zone-renderer.js',
    'js/messkonzept/connections.js',
    'js/messkonzept/geometry-runtime.js',
    'messkonzept.js',
    'js/messkonzept/export.js',
    'js/messkonzept/viewport.js',
    'js/messkonzept/history.js',
    'js/messkonzept/commands.js',
    'js/messkonzept/project-meta.js',
    'js/messkonzept/canvas-renderer.js',
    'js/messkonzept/annotations.js',
    'js/messkonzept/editor.js',
    'js/messkonzept/start-flow.js',
    'js/messkonzept/render-cycle.js',
    'js/messkonzept/drag-drop.js',
    'js/messkonzept/pointer-drag.js',
    'js/messkonzept/interaction.js',
    'js/messkonzept/bootstrap.js',
    'js/messkonzept/module-contracts.js',
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
    'lib/papaparse.min.js',
    'lib/jszip.min.js',
    'js/import/xlsx-parser.js'
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

    // HTML-Seiten zuerst frisch laden: So sehen Besucher neue Veröffentlichungen
    // unmittelbar. Nur ohne Verbindung dient die zuvor gespeicherte Seite als Fallback.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                }
                return response;
            }).catch(() => caches.match(event.request).then(cachedResponse => cachedResponse || caches.match('./index.html')))
        );
        return;
    }

    const requestUrl = new URL(event.request.url);
    // Cache-busting query parameters (used by versioned assets and the
    // client-side test suite) must not be served from an older cache entry.
    // Otherwise a browser can keep testing or executing stale JavaScript even
    // after the files on the server have changed.
    const bypassCache = event.request.cache === 'no-store' || requestUrl.search;
    const networkResponse = () => fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
        }
        if (!bypassCache) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
            });
        }
        return response;
    });

    event.respondWith(
        bypassCache
            ? networkResponse().catch(() => undefined)
            : caches.match(event.request).then(cachedResponse => cachedResponse || networkResponse().catch(() => {
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('./index.html');
                }
            }))
    );
});
