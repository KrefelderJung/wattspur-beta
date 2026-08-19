'use strict';

/* Regression tests for the NSH plus new SteuVE measurement hint. */
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
assert(rules.rulesetVersion === '2026-08-19-beta.15', 'Regelwerksstand muss zur NSH-Regel passen');
assert(rules.getRuleCatalog().NSH_STEUVE_MIXED?.id === 'MK-NSH-001', 'NSH-Regel muss MK-NSH-001 tragen');

const hasHint = checks => checks.some(check => check.ruleId === 'MK-NSH-001');
const nsh = { id: 'nsh-1', type: 'nsh', zone: 'single-main', name: 'Nachtspeicherheizung 1' };
const currentHeatPump = { id: 'hp-1', type: 'steuve', steuveType: 'Wärmepumpe', commissioningDate: '2024-02-01', zone: 'single-main', name: 'Wärmepumpe 1' };
const currentChecks = rules.evaluate({ mode: 'single', assets: [nsh, currentHeatPump] });
const currentHint = currentChecks.find(check => check.ruleId === 'MK-NSH-001');
assert(currentHint && currentHint.level === 'info', 'NSH plus neue SteuVE am selben Messpunkt muss einen Infohinweis auslösen');
assert(currentHint.text.includes('Bestandsregelungen') && currentHint.text.includes('§14a-Regeln'), 'Hinweis muss alte und neue Regelung verständlich unterscheiden');
assert(Array.isArray(currentHint.links) && currentHint.links.some(link => /bundesnetzagentur\.de/i.test(link.href)), 'NSH-Hinweis muss auf die offizielle BNetzA-Quelle verweisen');

const missingDateChecks = rules.evaluate({ mode: 'single', assets: [nsh, { ...currentHeatPump, id: 'hp-unknown', commissioningDate: '' }] });
assert(hasHint(missingDateChecks), 'Fehlendes SteuVE-Datum darf die Prüfung nicht unterdrücken');
assert(missingDateChecks.find(check => check.ruleId === 'MK-NSH-001').text.includes('zeitliche Einordnung offen'), 'Fehlendes Datum muss als offene Einordnung benannt werden');

assert(!hasHint(rules.evaluate({ mode: 'single', assets: [nsh, { ...currentHeatPump, id: 'hp-old', commissioningDate: '2023-12-31' }] })), 'SteuVE vor 2024 darf die neue Mischregel nicht auslösen');
assert(!hasHint(rules.evaluate({ mode: 'single', assets: [nsh, { ...currentHeatPump, id: 'hp-other-zone', zone: 'single-secondary' }] })), 'Getrennte Messbereiche dürfen keinen Mischhinweis auslösen');

const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
assert(!renderer.includes('data-mk-nsh-steuve-notice') && !editor.includes('renderNshSteuveNotice'), 'NSH-Mischhinweis darf nicht im Objekteditor dupliziert werden');

console.log('nsh-steuve-gemeinsame-messung-test: OK');
