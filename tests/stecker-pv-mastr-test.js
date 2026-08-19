'use strict';

/* Regression test for the central MaStR hint for Steckersolargeräte. */
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
assert(rules.rulesetVersion === '2026-08-19-beta.15', 'Regelwerksstand muss zum MaStR-Hinweis passen');
assert(rules.getRuleCatalog().STECKER_PV_MASTR?.id === 'MK-ASSET-009', 'MaStR-Regel muss MK-ASSET-009 tragen');

const steckerPv = { id: 'stecker-pv-1', type: 'generation', energyCarrier: 'Balkonkraftwerk', power: '0,8 kWp', inverterPower: '800 VA' };
const check = rules.evaluate({ mode: 'single', assets: [steckerPv] }).find(item => item.ruleId === 'MK-ASSET-009');
assert(check && check.level === 'info', 'Stecker-PV muss den zentralen MaStR-Hinweis auslösen');
assert(check.text.includes('innerhalb eines Monats') && check.text.includes('Marktstammdatenregister'), 'MaStR-Hinweis muss Frist und Register nennen');
assert(check.text.includes('separate Meldung beim Netzbetreiber'), 'MaStR-Hinweis muss die vereinfachte Meldung verständlich abgrenzen');
assert(!rules.evaluate({ mode: 'single', assets: [{ id: 'pv-1', type: 'generation', energyCarrier: 'PV', power: '8 kWp' }] }).some(item => item.ruleId === 'MK-ASSET-009'), 'Normale PV darf keinen Stecker-PV-MaStR-Hinweis auslösen');

const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
assert(!renderer.includes('data-mk-mastr-notice') && !editor.includes('renderMastrNotice'), 'MaStR-Hinweis darf nicht zusätzlich im Objekteditor erscheinen');

console.log('stecker-pv-mastr-test: OK');
