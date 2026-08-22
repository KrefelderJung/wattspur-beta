'use strict';

/* Regression test for the separated §14a and supplier-tariff hint. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(read('js/messkonzept/rules.js'), context);
const rules = context.window.WattspurMesskonzeptRules;
assert(rules, 'Regelmodul konnte nicht geladen werden');
assert(rules.rulesetVersion === '2026-08-22-beta.16', 'Regelwerksstand muss zum Tarif-Hinweis passen');
assert(rules.getRuleCatalog().STEUVE_TARIFF_SEPARATION?.id === 'MK-STEUVE-001', 'Tarif-Trennungsregel muss MK-STEUVE-001 tragen');

const separatedHeatPump = rules.evaluate({ mode: 'single', assets: [
    { id: 'meter-1', type: 'meter', zone: 'single-main' },
    { id: 'hp-1', type: 'steuve', steuveType: 'Wärmepumpe', power: '8 kW', zone: 'single-main', meterId: 'meter-1' }
] }).find(check => check.ruleId === 'MK-STEUVE-001');
assert(separatedHeatPump && separatedHeatPump.level === 'info', 'Separat gemessene Wärmepumpe muss den Hinweis auslösen');
assert(separatedHeatPump.text.includes('§ 14a EnWG') && separatedHeatPump.text.includes('Netzbetreiber'), 'Hinweis muss §14a und Netzbetreiber nennen');
assert(separatedHeatPump.text.includes('Energieversorger') && separatedHeatPump.text.includes('unterschiedliche Dinge'), 'Hinweis muss den Energietarif klar vom Netzentgelt trennen');

const separatedWallbox = rules.evaluate({ mode: 'parallel', assets: [
    { id: 'wallbox-1', type: 'steuve', steuveType: 'Wallbox', power: '11 kW', zone: 'parallel-0', meterId: '' }
] }).find(check => check.ruleId === 'MK-STEUVE-001');
assert(separatedWallbox && separatedWallbox.text.includes('Wallbox-Tarif'), 'Separater Parallelzweig muss den Wallbox-Tarif erwähnen');

assert(!rules.evaluate({ mode: 'single', assets: [
    { id: 'hp-2', type: 'steuve', steuveType: 'Wärmepumpe', power: '4 kW', zone: 'single-main', meterId: '' }
] }).some(check => check.ruleId === 'MK-STEUVE-001'), 'Gemeinsam gemessene Wärmepumpe darf keinen separaten Tarif-Hinweis auslösen');

const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
assert(!renderer.includes('data-mk-tariff-separation-notice') && !editor.includes('renderTariffSeparationNotice'), 'Tarif-Hinweis darf nicht zusätzlich im Objekteditor erscheinen');

console.log('steuve-tariff-separation-test: OK');
