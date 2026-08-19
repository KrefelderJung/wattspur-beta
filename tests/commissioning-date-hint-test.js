'use strict';

/* Regression tests for the optional commissioning-date Prüfstatus information. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const missing = { id: 'generation-1', type: 'generation', commissioningDate: '' };
const rulesContext = { console, window: {} };
vm.createContext(rulesContext);
vm.runInContext(read('js/messkonzept/rules.js'), rulesContext);
const rules = rulesContext.window.WattspurMesskonzeptRules;
assert(rules, 'Regelmodul konnte nicht geladen werden');
const missingCheck = rules.evaluate({ assets: [missing, { id: 'steuve-1', type: 'steuve', commissioningDate: '' }] }).find(check => check.ruleKey === 'COMMISSIONING_DATE_MISSING');
assert(missingCheck && missingCheck.level === 'info' && missingCheck.text.includes('optional'), 'Leere Datumsfelder müssen als kompakter Info-Hinweis im Prüfstatus erscheinen');
assert(!rules.evaluate({ assets: [{ ...missing, commissioningDate: '2025-01-01' }] }).some(check => check.ruleKey === 'COMMISSIONING_DATE_MISSING'), 'Ausgefülltes Datum darf keinen fehlenden-Datum-Hinweis auslösen');
assert(!rules.evaluate({ assets: [{ id: 'consumer-1', type: 'consumer', commissioningDate: '' }] }).some(check => check.ruleKey === 'COMMISSIONING_DATE_MISSING'), 'Nicht relevante Objekte dürfen keinen Datums-Hinweis auslösen');

const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
assert(renderer.includes('data-mk-field="commissioningDate"') && !renderer.includes('data-mk-commissioning-date-notice'), 'Editor muss das Datum anbieten, aber keinen Prüfstatus-Hinweis duplizieren');
assert(!editor.includes('renderCommissioningDateHint') && !editor.includes('data-mk-commissioning-date-notice'), 'Der Prüfhinweis darf nicht im Objekteditor aktualisiert werden');

console.log('commissioning-date-hint-test: OK');
