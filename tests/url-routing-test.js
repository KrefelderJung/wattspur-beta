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

assert(routeLoader.includes("fetch(fallback") && routeLoader.includes("<base href=\"/\">") && routeLoader.includes('document.open()'), 'Routen-Loader: statischer App-Loader ist unvollständig');
assert(index.includes("routePath === '/lastganganalyse'") && index.includes("routePath === '/messkonzeptkonfigurator'"), 'index.html: Clean-Routen werden nicht erkannt');
assert(index.includes("document.documentElement.dataset.tool = activeRoute"), 'index.html: aktiver Werkzeugmodus wird nicht gesetzt');
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
