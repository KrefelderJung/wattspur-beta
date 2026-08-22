'use strict';

/* Regressionstest: Speicher-Ladeleistung über 4,2 kW ist §14a-relevant. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function loadModule(relativePath, exportName) {
    const context = { window: {}, console };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'), context, { filename: relativePath });
    const exported = context.window[exportName];
    if (!exported) throw new Error(`${relativePath}: ${exportName} wurde nicht geladen`);
    return exported;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const model = loadModule('js/messkonzept/model.js', 'WattspurMesskonzeptModel');
const rules = loadModule('js/messkonzept/rules.js', 'WattspurMesskonzeptRules');
const assetDisplay = loadModule('js/messkonzept/asset-display.js', 'WattspurMesskonzeptAssetDisplay');

const state = model.createState();
const storage = model.createAsset(state, 'storage', 'single-main');
storage.storageChargePower = '4,3';
state.assets.push(storage);

assert(rules.getSteuveEffectivePower(storage) === 4.3, 'Die Speicher-Ladeleistung muss als §14a-Leistung gelesen werden');
const thresholdCheck = rules.evaluate(state).find(check => check.ruleKey === 'STEUVE_THRESHOLD');
assert(thresholdCheck && thresholdCheck.text.includes('maximale Ladeleistung'), 'Speicher über 4,2 kW muss einen verständlichen §14a-Hinweis erhalten');

const display = assetDisplay.createAssetDisplayController({
    getPowerNumber: value => rules.parsePowerNumber(value),
    getSteuveEffectivePower: asset => rules.getSteuveEffectivePower(asset),
    renderSelectOptions: () => '',
    steuveModuleOptions: []
});
assert(display.renderSteuveModuleFields(storage).includes('data-mk-field="steuveModule"'), 'Bei Speicher-Ladeleistung über 4,2 kW muss das §14a-Modulfeld erscheinen');

storage.storageChargePower = '4,2';
assert(!display.renderSteuveModuleFields(storage), 'Bei genau 4,2 kW darf keine §14a-Modulabfrage erscheinen');
assert(!rules.evaluate(state).some(check => check.ruleKey === 'STEUVE_THRESHOLD'), 'Bei genau 4,2 kW darf kein §14a-Schwellenhinweis erscheinen');

console.log('Speicher-SteuVE-Test: OK (Ladeleistung, Modulabfrage und Grenzwert geprüft)');
