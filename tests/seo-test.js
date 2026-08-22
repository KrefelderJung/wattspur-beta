'use strict';

/* Statischer SEO-/URL-Test für die indexierbaren Wattspur-Einstiegsseiten. */
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

function assertSeoPage(file, canonical, titlePart, descriptionPart) {
    const source = read(file);
    assert(/<title>[^<]+<\/title>/i.test(source), `${file}: Meta-Titel fehlt`);
    assert(source.includes('<meta name="description"'), `${file}: Meta-Beschreibung fehlt`);
    assert(source.includes('<meta name="robots" content="index,follow">'), `${file}: indexierbare robots-Angabe fehlt`);
    assert(source.includes(`<link rel="canonical" href="https://wattspur.de/${canonical}">`), `${file}: stabiler Canonical fehlt`);
    assert(source.includes(titlePart), `${file}: passender Meta-Titel fehlt`);
    assert(source.includes(descriptionPart), `${file}: Beschreibung deckt Suchintention nicht ab`);
}

const index = read('index.html');
const lastgang = read('lastgang-analyse.html');
const messkonzept = read('messkonzept-konfigurator.html');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
const serviceWorker = read('service-worker.js');
const messkonzeptRuntime = read('messkonzept.js');
const headerPages = ['index.html', 'lastgang-analyse.html', 'messkonzept-konfigurator.html', 'kontakt.html', 'impressum.html', 'datenschutz.html', 'lizenz.html'];

assertSeoPage('index.html', '', 'Wattspur | Energiewerkzeuge im Browser', 'Lastganganalyse');
assertSeoPage('lastgang-analyse.html', 'lastgang-analyse.html', 'Wattspur | Lastganganalyse', 'CSV- und MSCONS-Lastgänge');
assertSeoPage('messkonzept-konfigurator.html', 'messkonzept-konfigurator.html', 'Wattspur | Messkonzept-Konfigurator', 'Messkonzept-Konfigurator');
assertSeoPage('kontakt.html', 'kontakt.html', 'Wattspur | Kontakt', 'Kontakt zu Wattspur');
assertSeoPage('impressum.html', 'impressum.html', 'Impressum | Wattspur', 'Impressum und Betreiberinformationen');
assertSeoPage('datenschutz.html', 'datenschutz.html', 'Datenschutz | Wattspur', 'Datenschutzerklärung von Wattspur');
assertSeoPage('lizenz.html', 'lizenz.html', 'Lizenz | Wattspur', 'Lizenzhinweise für Wattspur');

headerPages.forEach(file => {
    const source = read(file);
    assert(/class="[^"]*\bwattspur-brand\b/.test(source), `${file}: gemeinsamer Wattspur-Header fehlt`);
    assert(/class="[^"]*\bwattspur-brand-copy\b/.test(source), `${file}: gemeinsame Wortmarken-Klasse fehlt`);
    assert(source.includes('styles.css?v=279'), `${file}: gemeinsamer Stylesheet-Stand fehlt`);
});

assert(index.includes('href="lastganganalyse/"'), 'Startseite: Lastganganalyse muss auf die stabile Werkzeugroute verlinken');
assert(index.includes('href="messkonzeptkonfigurator/"'), 'Startseite: Messkonzept muss auf die stabile Werkzeugroute verlinken');
assert(lastgang.includes('href="lastganganalyse/"'), 'Lastganganalyse: interner Einstieg muss die stabile Werkzeugroute nutzen');
assert(messkonzept.includes('href="messkonzeptkonfigurator/"'), 'Messkonzept: interner Einstieg muss die stabile Werkzeugroute nutzen');
assert(!/<a[^>]+href="[^"]*\?tool=lastgang/i.test(index), 'Startseite: alter Lastgang-Query-Link darf nicht mehr verwendet werden');
assert(!lastgang.includes('http-equiv="refresh"') && !lastgang.includes("location.replace('index.html?tool=lastgang')"), 'Lastganganalyse: alte Query-Weiterleitung darf nicht zurückkehren');
assert(lastgang.includes('href="lastganganalyse/"'), 'Lastganganalyse: Startbutton muss die stabile Werkzeugroute nutzen');
assert(messkonzept.includes('href="messkonzeptkonfigurator/"'), 'Messkonzept: Startbutton muss die stabile Werkzeugroute nutzen');
assert(messkonzeptRuntime.includes("window.location.hash === '#messkonzept'") && messkonzeptRuntime.includes("cleanPath === '/messkonzeptkonfigurator'") && messkonzeptRuntime.includes('MK_START_FLOW.showScreen()'), 'Messkonzept: Hash- und Clean-Route-Einstieg müssen die Konfiguratoransicht öffnen');
assert((index.match(/class="app-legal-footer"/g) || []).length === 2, 'Start-App: dynamische Werkzeugansichten müssen eigene Rechtshinweise anbieten');
assert(index.includes('class="app-legal-footer"') && (index.match(/href="(kontakt|impressum|datenschutz)\.html"/g) || []).length >= 6, 'Start-App: Impressum, Datenschutz und Kontakt müssen in beiden Werkzeugansichten erreichbar sein');
assert(index.includes('href="lizenz.html"'), 'Start-App: Die Lizenz muss aus der Werkzeugansicht erreichbar sein');
assert(read('lizenz.html').includes('href="index.html#top"') && read('lizenz.html').includes('Zur Startseite'), 'Lizenzseite: sichtbarer Rückweg zur Startseite fehlt');

assert(robots.includes('Allow: /') && robots.includes('Disallow: /tests.html') && robots.includes('Sitemap: https://wattspur.de/sitemap.xml'), 'robots.txt: Indexierungsregeln oder Sitemap-Verweis fehlen');
['https://wattspur.de/', 'https://wattspur.de/lastganganalyse/', 'https://wattspur.de/messkonzeptkonfigurator/', 'https://wattspur.de/lastgang-analyse.html', 'https://wattspur.de/messkonzept-konfigurator.html', 'https://wattspur.de/kontakt.html', 'https://wattspur.de/impressum.html', 'https://wattspur.de/datenschutz.html', 'https://wattspur.de/lizenz.html'].forEach(url => {
    assert(sitemap.includes(`<loc>${url}</loc>`), `sitemap.xml: ${url} fehlt`);
});
assert(serviceWorker.includes("'lastgang-analyse.html'") && serviceWorker.includes("'lastganganalyse/index.html'") && serviceWorker.includes("'messkonzept-konfigurator.html'") && serviceWorker.includes("'messkonzeptkonfigurator/index.html'") && serviceWorker.includes("'lizenz.html'") && serviceWorker.includes("'route-loader.js'") && /beta\.357/.test(serviceWorker), 'Offline-Cache: stabile Einstiegsseiten, Clean-Routen oder Versionsstand fehlen');

if (failures.length) {
    console.error(`SEO-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('SEO-Test: OK (URLs, Meta-Daten, robots.txt, Sitemap und Crawl-Einstiege)');
}
