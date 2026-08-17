'use strict';

/* Regressionstests für die 800-VA-Grenze von Steckersolargeräten. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const loadModule = (relativePath, exportName) => {
    const context = { window: {}, console };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), context, { filename: relativePath });
    return context.window[exportName];
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const model = loadModule('js/messkonzept/model.js', 'WattspurMesskonzeptModel');
const rules = loadModule('js/messkonzept/rules.js', 'WattspurMesskonzeptRules');
assert(rules.STECKER_PV_MAX_INVERTER_VA === undefined || rules.parseInverterPowerVa, 'Stecker-PV-Prüffunktionen fehlen');

const exactState = model.createState();
const exact = model.createAsset(exactState, 'generation', 'single-main', '', 'Balkonkraftwerk');
exact.inverterPower = '800 VA';
exactState.assets.push(exact);
assert(rules.getSteckerPvInverterPowerVa(exact) === 800, '800 VA müssen korrekt eingelesen werden');
assert(!rules.evaluate(exactState).some(check => check.level === 'error' && check.ruleKey === 'STECKER_PV_INVERTER_LIMIT'), 'Genau 800 VA dürfen keinen Fehler auslösen');

const overState = model.createState();
const over = model.createAsset(overState, 'generation', 'single-main', '', 'Balkonkraftwerk');
over.inverterPower = '801 VA';
overState.assets.push(over);
const overCheck = rules.evaluate(overState).find(check => check.ruleKey === 'STECKER_PV_INVERTER_LIMIT' && check.level === 'error');
assert(overCheck && overCheck.text.includes('801 VA') && overCheck.text.includes('800 VA'), '801 VA müssen als Fehler mit klarer Grenze erscheinen');

const legacyUnitState = model.createState();
const legacyUnit = model.createAsset(legacyUnitState, 'generation', 'single-main', '', 'Balkonkraftwerk');
legacyUnit.inverterPower = '0,8 kVA';
legacyUnitState.assets.push(legacyUnit);
assert(rules.getSteckerPvInverterPowerVa(legacyUnit) === 800, 'Importierte kVA-Angaben müssen in VA umgerechnet werden');
assert(!rules.evaluate(legacyUnitState).some(check => check.level === 'error' && check.ruleKey === 'STECKER_PV_INVERTER_LIMIT'), '0,8 kVA entsprechen genau 800 VA');

const groupedState = model.createState();
const first = model.createAsset(groupedState, 'generation', 'single-main', '', 'Balkonkraftwerk');
first.inverterPower = '500 VA';
const second = model.createAsset(groupedState, 'generation', 'single-main', '', 'Balkonkraftwerk');
second.inverterPower = '301 VA';
groupedState.assets.push(first, second);
const groupedCheck = rules.evaluate(groupedState).find(check => check.ruleKey === 'STECKER_PV_INVERTER_LIMIT' && check.level === 'error');
assert(groupedCheck && groupedCheck.text.includes('801 VA'), 'Mehrere Steckersolargeräte am selben Messbereich müssen zusammengerechnet werden');

const missingState = model.createState();
const missing = model.createAsset(missingState, 'generation', 'single-main', '', 'Balkonkraftwerk');
missingState.assets.push(missing);
const missingCheck = rules.evaluate(missingState).find(check => check.ruleKey === 'STECKER_PV_INVERTER_LIMIT' && check.level === 'warning');
assert(missingCheck && missingCheck.text.includes('800-VA-Grenze'), 'Fehlende Wechselrichterleistung muss als prüfbarer Hinweis erscheinen');

const normalPvState = model.createState();
const normalPv = model.createAsset(normalPvState, 'generation', 'single-main', '', 'PV');
normalPv.inverterPower = '20 kVA';
normalPvState.assets.push(normalPv);
assert(!rules.evaluate(normalPvState).some(check => check.ruleKey === 'STECKER_PV_INVERTER_LIMIT'), 'Normale PV darf nicht unter die Stecker-PV-Grenze fallen');

console.log('Stecker-PV-Grenztest: OK (800 VA je Anschluss, Summierung und Einheitenumrechnung geprüft)');
