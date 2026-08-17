'use strict';

/*
 * Wattspur – Architektur-Smoke-Test
 *
 * Dieser Test ist bewusst browserfrei. Er prüft die technische Leitplanke des
 * Messkonzept-Konfigurators, bevor ein Browser- oder UI-Test gestartet wird:
 * Dateien, Ladereihenfolge, Modul-Schnittstellen, DOM-Grenzen, Regelkatalog
 * und Offline-Cache müssen zusammenpassen.
 *
 * Aufruf aus dem Wattspur-Projekt:
 *   node tests/architecture-smoke-test.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    try {
        return fs.readFileSync(absolutePath, 'utf8');
    } catch (error) {
        failures.push(`${relativePath}: Datei konnte nicht gelesen werden (${error.code || error.message})`);
        return '';
    }
}

function exists(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
        failures.push(`${relativePath}: erwartete Datei fehlt`);
    }
}

function assert(condition, message) {
    if (!condition) failures.push(message);
}

function normalizeScriptPath(source) {
    return source.replace(/^\.\//, '').split('?')[0];
}

const requiredFiles = [
    'index.html',
    'service-worker.js',
    'messkonzept.js',
    'messkonzept-geometry.js',
    'messkonzept-topology.js',
    'js/messkonzept/model.js',
    'js/messkonzept/presets.js',
    'js/messkonzept/preset-loader.js',
    'js/messkonzept/rules.js',
    'js/messkonzept/layout-calculations.js',
    'js/messkonzept/validation-status.js',
    'js/messkonzept/layout.js',
    'js/messkonzept/render.js',
    'js/messkonzept/connections.js',
    'js/messkonzept/export.js',
    'js/messkonzept/viewport.js',
    'js/messkonzept/history.js',
    'js/messkonzept/commands.js',
    'js/messkonzept/project-meta.js',
    'js/messkonzept/canvas-renderer.js',
    'js/messkonzept/drag-drop.js',
    'js/messkonzept/interaction.js',
    'js/messkonzept/bootstrap.js',
    'js/messkonzept/module-contracts.js'
];
requiredFiles.forEach(exists);

const indexText = read('index.html');
const serviceWorkerText = read('service-worker.js');
const rulesText = read('js/messkonzept/rules.js');
const rulebookText = read('docs/messkonzept-regelwerk.md');

const expectedOrder = [
    'js/messkonzept/model.js',
    'js/messkonzept/presets.js',
    'js/messkonzept/preset-loader.js',
    'messkonzept-geometry.js',
    'messkonzept-topology.js',
    'js/messkonzept/rules.js',
    'js/messkonzept/layout-calculations.js',
    'js/messkonzept/validation-status.js',
    'js/messkonzept/layout.js',
    'js/messkonzept/render.js',
    'js/messkonzept/connections.js',
    'js/messkonzept/export.js',
    'js/messkonzept/viewport.js',
    'js/messkonzept/history.js',
    'js/messkonzept/commands.js',
    'js/messkonzept/project-meta.js',
    'js/messkonzept/canvas-renderer.js',
    'js/messkonzept/drag-drop.js',
    'js/messkonzept/interaction.js',
    'js/messkonzept/bootstrap.js',
    'js/messkonzept/module-contracts.js',
    'messkonzept.js'
];

const scriptOrder = [...indexText.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map(match => normalizeScriptPath(match[1]));
let previousIndex = -1;
expectedOrder.forEach(scriptPath => {
    const currentIndex = scriptOrder.indexOf(scriptPath);
    assert(currentIndex >= 0, `index.html: ${scriptPath} ist nicht eingebunden`);
    if (currentIndex >= 0) {
        assert(currentIndex > previousIndex, `index.html: Ladereihenfolge verletzt bei ${scriptPath}`);
        previousIndex = currentIndex;
    }
});

const moduleContracts = [
    ['js/messkonzept/model.js', 'WattspurMesskonzeptModel', 'createState'],
    ['js/messkonzept/presets.js', 'WattspurMesskonzeptPresets', 'getCatalog'],
    ['js/messkonzept/preset-loader.js', 'WattspurMesskonzeptPresetLoader', 'createPresetLoader'],
    ['messkonzept-geometry.js', 'WattspurMesskonzeptGeometry', 'buildDynamicWire'],
    ['messkonzept-topology.js', 'WattspurMesskonzeptTopology', 'buildZoneMeterTree'],
    ['js/messkonzept/rules.js', 'WattspurMesskonzeptRules', 'evaluate'],
    ['js/messkonzept/layout-calculations.js', 'WattspurMesskonzeptLayoutCalculations', 'createLayoutCalculations'],
    ['js/messkonzept/validation-status.js', 'WattspurMesskonzeptValidationStatus', 'createValidationStatusController'],
    ['js/messkonzept/layout.js', 'WattspurMesskonzeptLayout', 'createLayout'],
    ['js/messkonzept/render.js', 'WattspurMesskonzeptRender', 'createRenderer'],
    ['js/messkonzept/connections.js', 'WattspurMesskonzeptConnections', 'createConnections'],
    ['js/messkonzept/export.js', 'WattspurMesskonzeptExport', 'createExporter'],
    ['js/messkonzept/viewport.js', 'WattspurMesskonzeptViewport', 'createViewport'],
    ['js/messkonzept/history.js', 'WattspurMesskonzeptHistory', 'createHistory'],
    ['js/messkonzept/commands.js', 'WattspurMesskonzeptCommands', 'createCommandController'],
    ['js/messkonzept/project-meta.js', 'WattspurMesskonzeptProjectMeta', 'createProjectMeta'],
    ['js/messkonzept/canvas-renderer.js', 'WattspurMesskonzeptCanvasRenderer', 'createCanvasRenderer'],
    ['js/messkonzept/drag-drop.js', 'WattspurMesskonzeptDragDrop', 'createDragDrop'],
    ['js/messkonzept/interaction.js', 'WattspurMesskonzeptInteraction', 'createInteraction'],
    ['js/messkonzept/bootstrap.js', 'WattspurMesskonzeptBootstrap', 'createBootstrap'],
    ['js/messkonzept/module-contracts.js', 'WattspurMesskonzeptModuleContracts', 'assertLoaded']
];

moduleContracts.forEach(([relativePath, globalName, factoryName]) => {
    const source = read(relativePath);
    assert(source.includes(`global.${globalName}`), `${relativePath}: öffentliche Modul-Schnittstelle ${globalName} fehlt`);
    assert(source.includes(factoryName), `${relativePath}: erwarteter Einstieg ${factoryName} fehlt`);
});

const domFreeModules = [
    'js/messkonzept/model.js',
    'messkonzept-topology.js',
    'js/messkonzept/rules.js',
    'js/messkonzept/layout-calculations.js',
    'js/messkonzept/render.js'
];
domFreeModules.forEach(relativePath => {
    const source = read(relativePath);
    assert(!/\bdocument\s*\.|\bgetBoundingClientRect\s*\(|\bquerySelector(All)?\s*\(|\bcreateElement\s*\(/.test(source), `${relativePath}: DOM-Zugriff gehört nicht in dieses Kernmodul`);
    try {
        new Function(source);
    } catch (error) {
        failures.push(`${relativePath}: JavaScript-Syntaxfehler (${error.message})`);
    }
});

const removedRuleIds = ['MK-DATA-001', 'MK-DATA-002', 'MK-TOPO-001', 'MK-PARALLEL-001', 'MK-PARALLEL-002', 'MK-SINGLE-002', 'MK-SINGLE-003'];
removedRuleIds.forEach(ruleId => {
    assert(!rulesText.includes(ruleId), `rules.js: entfernte Prüfregel ${ruleId} ist noch aktiv`);
});

const activeRuleIds = ['MK-ASSET-001', 'MK-ASSET-002', 'MK-ASSET-003', 'MK-SINGLE-001'];
activeRuleIds.forEach(ruleId => {
    assert(rulesText.includes(ruleId), `rules.js: aktive Prüfregel ${ruleId} fehlt`);
});

const rulesetVersionMatch = rulesText.match(/RULESET_VERSION\s*=\s*['"]([^'"]+)['"]/);
assert(rulesetVersionMatch, 'rules.js: RULESET_VERSION fehlt');
if (rulesetVersionMatch) {
    assert(rulebookText.includes(rulesetVersionMatch[1]), `docs/messkonzept-regelwerk.md: Regelwerksversion ${rulesetVersionMatch[1]} fehlt`);
}

const appVersionMatch = serviceWorkerText.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
assert(appVersionMatch, 'service-worker.js: APP_VERSION fehlt');
assert(serviceWorkerText.includes('const CACHE_NAME = `lastgang-analyse-${APP_VERSION}`'), 'service-worker.js: Cache muss an APP_VERSION gekoppelt sein');
requiredFiles.filter(relativePath => relativePath.endsWith('.js') && relativePath !== 'service-worker.js')
    .forEach(relativePath => assert(serviceWorkerText.includes(`'${relativePath}'`), `service-worker.js: ${relativePath} wird nicht offline gecacht`));

const staleUiSources = [
    'index.html',
    'messkonzept.js',
    'js/messkonzept/rules.js',
    'js/messkonzept/validation-status.js',
    'js/messkonzept/canvas-renderer.js'
];
removedRuleIds.forEach(ruleId => {
    staleUiSources.forEach(relativePath => {
        assert(!read(relativePath).includes(ruleId), `${relativePath}: entfernte Regel-ID ${ruleId} ist noch im UI-/Regelcode enthalten`);
    });
});

if (failures.length > 0) {
    console.error(`Architektur-Smoke-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log(`Architektur-Smoke-Test: OK (${requiredFiles.length} Dateien, ${expectedOrder.length} Ladepositionen, ${moduleContracts.length} Schnittstellen)`);
    if (appVersionMatch) console.log(`- Offline-Cache: ${appVersionMatch[1]}`);
    if (rulesetVersionMatch) console.log(`- Prüfregelwerk: ${rulesetVersionMatch[1]}`);
}
