'use strict';

/* Technische Mindestprüfung für eine veröffentlichungsfähige Arbeitskopie. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
    try {
        return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    } catch (error) {
        failures.push(`${relativePath}: nicht lesbar (${error.code || error.message})`);
        return '';
    }
}

function assert(condition, message) {
    if (!condition) failures.push(message);
}

const requiredFiles = [
    'index.html',
    'lastgang-analyse.html',
    'messkonzept-konfigurator.html',
    'app.js',
    'messkonzept.js',
    'service-worker.js',
    'tests.html',
    'package.json',
    '.github/workflows/quality.yml',
    'docs/release-gate-anforderungen.md'
];
for (const relativePath of requiredFiles) {
    assert(fs.existsSync(path.join(ROOT, relativePath)), `${relativePath}: Pflichtdatei fehlt`);
}

const packageJson = read('package.json');
let packageData = null;
try {
    packageData = JSON.parse(packageJson);
} catch (error) {
    failures.push(`package.json: ungültiges JSON (${error.message})`);
}
assert(packageData && packageData.scripts && packageData.scripts.test, 'package.json: npm-Testskript fehlt');
assert(packageData && packageData.scripts && packageData.scripts['test:syntax'], 'package.json: Syntaxskript fehlt');
assert(packageData && packageData.scripts && packageData.scripts['test:release'], 'package.json: Release-Gate-Skript fehlt');

const testPage = read('tests.html');
assert((testPage.match(/\baddTest\s*\(/g) || []).length > 0, 'tests.html: keine registrierten Browser-Tests gefunden');

const worker = read('service-worker.js');
assert(/const\s+APP_VERSION\s*=\s*['"][^'"]+['"]/.test(worker), 'service-worker.js: APP_VERSION fehlt');
assert(/['"]tests\.html['"]/.test(worker), 'service-worker.js: tests.html fehlt im Offline-Cache');

const requirements = read('docs/release-gate-anforderungen.md');
for (const phrase of ['Browser-Smoke-Test', 'Tablet', 'Service-Worker', 'Arbeitsbaum']) {
    assert(requirements.includes(phrase), `Release-Dokumentation: Abschnitt „${phrase}“ fehlt`);
}

if (failures.length > 0) {
    console.error(`Release-Gate: FEHLER\n- ${failures.join('\n- ')}`);
    process.exit(1);
}

console.log('Release-Gate: OK (Pflichtdateien, Testverkabelung und Offline-Cache geprüft)');
