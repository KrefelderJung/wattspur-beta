'use strict';

/* Prüft die statische Verkabelung der direkt teilbaren Werkzeugrouten. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(file) {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function assert(condition, message) {
    if (!condition) failures.push(message);
}

const index = read('index.html');
const app = read('app.js');
const routeLoader = read('route-loader.js');
const messkonzept = read('messkonzept.js');
const sitemap = read('sitemap.xml');

['lastganganalyse/index.html', 'messkonzeptkonfigurator/index.html'].forEach(file => {
    assert(fs.existsSync(path.join(ROOT, file)), `${file}: Alias-Seite fehlt`);
    const source = read(file);
    assert(source.includes('../route-loader.js'), `${file}: gemeinsamer Routen-Loader fehlt`);
    assert(source.includes('data-route='), `${file}: Werkzeugroute fehlt`);
    assert(source.includes('rel="canonical"'), `${file}: Canonical fehlt`);
});

assert(routeLoader.includes("window.location.protocol === 'file:'") && routeLoader.includes('window.location.replace(`${fallback}#${route}`)') && routeLoader.includes("fetch(fallback") && routeLoader.includes("<base href=\"/\">") && routeLoader.includes('document.open()'), 'Routen-Loader: Web- und file://-Einstieg sind unvollständig');
assert(index.includes("routePath === '/lastganganalyse'") && index.includes("routePath === '/lastganganalyse/index.html'") && index.includes("routePath === '/messkonzeptkonfigurator'") && index.includes("routePath === '/messkonzeptkonfigurator/index.html'"), 'index.html: Clean-Routen und direkte Alias-Dateien werden nicht erkannt');
assert(index.includes("document.documentElement.dataset.tool = activeRoute"), 'index.html: aktiver Werkzeugmodus wird nicht gesetzt');
assert(app.includes("window.addEventListener('hashchange'") && app.includes("a[href$=\"index.html#top\"]") && app.includes("window.location.hash === '#top'") && app.includes("messkonzept-screen") && app.includes("screens.upload?.classList.remove('hidden')") && app.includes("screens.dashboard?.classList.add('hidden')"), 'Lastgang: Logo-Rückweg zum Hauptmenü reagiert nicht auf Hash-Navigation oder Direktklick');
assert(index.includes('canonical: \'https://wattspur.de/lastganganalyse/\'') && index.includes('canonical: \'https://wattspur.de/messkonzeptkonfigurator/\''), 'index.html: Clean-Route-Metadaten fehlen');
assert(messkonzept.includes("cleanPath === '/messkonzeptkonfigurator'"), 'Messkonzept: Clean-Route wird nicht geöffnet');
assert(sitemap.includes('<loc>https://wattspur.de/lastganganalyse/</loc>') && sitemap.includes('<loc>https://wattspur.de/messkonzeptkonfigurator/</loc>'), 'Sitemap: Clean-Routen fehlen');

if (failures.length) {
    console.error(`URL-Routing-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('URL-Routing-Test: OK (Alias-Seiten, Clean-Routen, Metadaten und Sitemap)');
}
