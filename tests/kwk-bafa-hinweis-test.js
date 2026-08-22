'use strict';

/* Regression tests for the central KWK/BAFA and measurement hints. */
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
assert(rules.rulesetVersion === '2026-08-22-beta.16', 'Regelwerksstand muss zu den KWK-Hinweisen passen');
assert(rules.getRuleCatalog().KWK_BAFA?.id === 'MK-KWK-001', 'BAFA-Regel muss MK-KWK-001 tragen');
assert(rules.getRuleCatalog().KWK_MEASUREMENT?.id === 'MK-KWK-002', 'Messregel muss MK-KWK-002 tragen');

const checksFor = assets => rules.evaluate({ mode: 'single', assets });
const hasRule = (checks, id) => checks.some(check => check.ruleId === id);

const kwkWithoutMeter = { id: 'kwk-1', type: 'generation', energyCarrier: 'KWK', power: '5 kW', name: 'BHKW1', generationMeter: false };
const kwkChecks = checksFor([kwkWithoutMeter]);
const bafaCheck = kwkChecks.find(check => check.ruleId === 'MK-KWK-001');
assert(bafaCheck && bafaCheck.level === 'info', 'KWK-Anlage muss einen vorsichtigen BAFA-Infohinweis auslösen');
assert(bafaCheck.text.includes('KWKG') && bafaCheck.text.includes('BAFA'), 'BAFA-Hinweis muss KWKG und BAFA verständlich nennen');
assert(Array.isArray(bafaCheck.links) && bafaCheck.links.some(link => /bafa\.de/i.test(link.href)), 'BAFA-Hinweis muss einen offiziellen BAFA-Link enthalten');
assert(hasRule(kwkChecks, 'MK-KWK-002'), 'KWK ohne Erzeugungszähler muss die Messbarkeit prüfen lassen');

const kwkWithMeter = { ...kwkWithoutMeter, id: 'kwk-2', generationMeter: true, generationNumber: 1 };
const measuredChecks = checksFor([kwkWithMeter]);
assert(hasRule(measuredChecks, 'MK-KWK-001'), 'Auch eine gemessene KWK-Anlage muss den BAFA-Hinweis behalten');
assert(!hasRule(measuredChecks, 'MK-KWK-002'), 'Aktivierte Erzeugungsmessung darf keinen fehlenden Messhinweis auslösen');

assert(!hasRule(checksFor([{ id: 'pv-1', type: 'generation', energyCarrier: 'PV', power: '5 kWp' }]), 'MK-KWK-001'), 'PV darf keinen KWK-BAFA-Hinweis auslösen');
assert(!hasRule(checksFor([{ id: 'storage-1', type: 'storage', power: '5 kW' }]), 'MK-KWK-001'), 'Speicher darf keinen KWK-BAFA-Hinweis auslösen');

const validation = read('js/messkonzept/validation-status.js');
assert(validation.includes('check.links') && validation.includes('mk-validation-links'), 'Prüfstatus muss fachliche Quellenlinks darstellen können');
const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
assert(!renderer.includes('data-mk-kwk-notice') && !editor.includes('renderKwkNotice'), 'KWK-Hinweise dürfen nicht zusätzlich im Objekteditor erscheinen');

console.log('kwk-bafa-hinweis-test: OK');
