'use strict';

/* §14a-Regressionstest für eine Wärmepumpe mit Gesamtleistung inklusive Heizstab. */
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
const heatPump = model.createAsset(state, 'steuve', 'single-main', 'Wärmepumpe');
heatPump.power = '4,3';
state.assets.push(heatPump);

assert(!Object.prototype.hasOwnProperty.call(heatPump, 'heatingRodPower'), 'Wärmepumpenobjekt darf kein separates Heizstabfeld mehr erzeugen');
assert(Math.abs(rules.getSteuveEffectivePower(heatPump) - 4.3) < 0.0001, 'Die elektrische Gesamtleistung muss direkt geprüft werden');
const overThreshold = rules.evaluate(state).find(check => check.ruleKey === 'STEUVE_THRESHOLD');
assert(overThreshold && overThreshold.text.includes('einschließlich Heizstab'), 'Die §14a-Warnung muss die inklusive Gesamtleistung erklären');
assert(overThreshold.effectivePowerKw?.[0]?.value === 4.3, 'Die Prüfregel muss die eingetragene Gesamtleistung ausgeben');

// Anlagen hinter demselben Zähler bilden eine gemeinsame 14a-Leistungsgruppe.
// Das ist der zentrale Regressionsfall: 2,6 kW Wärmepumpe plus 2,6 kW
// Klimaanlagen überschreiten zusammen die 4,2-kW-Grenze.
const groupedState = model.createState();
const groupMeter = model.createAsset(groupedState, 'meter', 'single-main');
groupMeter.meterScope = 'asset';
const groupedHeatPump = model.createAsset(groupedState, 'steuve', 'single-main', 'Wärmepumpe');
groupedHeatPump.power = '2,6';
groupedHeatPump.meterId = groupMeter.id;
groupMeter.targetAssetId = groupedHeatPump.id;
const groupedClimate = model.createAsset(groupedState, 'steuve', 'single-main', 'Klimaanlage');
groupedClimate.power = '2,6';
groupedClimate.meterId = groupMeter.id;
groupedState.assets.push(groupMeter, groupedHeatPump, groupedClimate);
const measurementGroups = rules.getSteuveMeasurementGroups(groupedState);
assert(measurementGroups.length === 1, 'SteuVE hinter demselben Zähler muss als eine Messgruppe erkannt werden');
assert(measurementGroups[0].meterId === groupMeter.id && measurementGroups[0].totalPowerKw === 5.2, 'Die gemeinsame Leistung hinter dem Zähler muss 5,2 kW betragen');
const groupedCheck = rules.evaluate(groupedState).find(check => check.ruleKey === 'STEUVE_THRESHOLD');
assert(groupedCheck && groupedCheck.text.includes('gemeinsam gemessen') && groupedCheck.text.includes('5,2 kW'), 'Die Prüfmeldung muss die gemeinsame Zählergruppe verständlich erklären');
assert(groupedCheck.measurementGroups?.[0]?.assetIds.length === 2, 'Die Prüfmeldung muss die beiden zugeordneten Anlagen ausweisen');

const separatedState = model.createState();
const firstMeter = model.createAsset(separatedState, 'meter', 'single-main');
const secondMeter = model.createAsset(separatedState, 'meter', 'single-main');
const firstLoad = model.createAsset(separatedState, 'steuve', 'single-main', 'Wärmepumpe');
firstLoad.power = '2,6';
firstLoad.meterId = firstMeter.id;
const secondLoad = model.createAsset(separatedState, 'steuve', 'single-main', 'Klimaanlage');
secondLoad.power = '2,6';
secondLoad.meterId = secondMeter.id;
separatedState.assets.push(firstMeter, secondMeter, firstLoad, secondLoad);
assert(rules.getSteuveMeasurementGroups(separatedState).length === 2, 'SteuVE an getrennten Zählern dürfen nicht gemeinsam summiert werden');
assert(!rules.evaluate(separatedState).some(check => check.ruleKey === 'STEUVE_THRESHOLD'), 'Getrennte 2,6-kW-Anlagen dürfen allein keine gemeinsame 4,2-kW-Warnung auslösen');

const legacyState = model.createState();
const legacyHeatPump = model.createAsset(legacyState, 'steuve', 'single-main', 'Wärmepumpe');
legacyHeatPump.commissioningDate = '2023-12-31';
legacyState.assets.push(legacyHeatPump);
const legacyCheck = rules.evaluate(legacyState).find(check => check.ruleKey === 'STEUVE_LEGACY_REGIME');
assert(legacyCheck && legacyCheck.text.includes('vor dem 01.01.2024') && legacyCheck.text.includes('konzessionierter Elektrofachbetrieb'), 'Bestandsanlagen vor 2024 müssen einen Hinweis auf das mögliche Regimewechsel-Verfahren erhalten');

const currentState = model.createState();
const currentHeatPump = model.createAsset(currentState, 'steuve', 'single-main', 'Wärmepumpe');
currentHeatPump.commissioningDate = '2024-01-01';
currentState.assets.push(currentHeatPump);
assert(!rules.evaluate(currentState).some(check => check.ruleKey === 'STEUVE_LEGACY_REGIME'), 'Anlagen ab dem 01.01.2024 dürfen keinen Bestandsanlagenhinweis erhalten');

heatPump.power = '4,2';
assert(Math.abs(rules.getSteuveEffectivePower(heatPump) - 4.2) < 0.0001, 'Die Grenzprüfung muss bei genau 4,2 kW stabil bleiben');
assert(!rules.evaluate(state).some(check => check.ruleKey === 'STEUVE_THRESHOLD'), 'Genau 4,2 kW darf nicht als über 4,2 kW gemeldet werden');

const wallbox = model.createAsset(state, 'steuve', 'single-main', 'Wallbox');
wallbox.power = '5';
assert(rules.getSteuveEffectivePower(wallbox) === 5, 'Die Wallbox muss ihre eigene Leistung verwenden');

const display = assetDisplay.createAssetDisplayController({
    getPowerNumber: value => rules.parsePowerNumber(value),
    getSteuveEffectivePower: asset => rules.getSteuveEffectivePower(asset),
    getAssetMeta: () => model.assetMeta,
    getAssetTypeOptions: () => model.assetTypeOptions,
    renderSelectOptions: () => '',
    steuveModuleOptions: []
});
const moduleFields = display.renderSteuveModuleFields({ ...heatPump, power: '4,3' });
assert(moduleFields.includes('data-mk-field="steuveModule"'), 'Das §14a-Modulfeld muss bei einer Gesamtleistung über 4,2 kW erscheinen');

console.log('SteuVE-Gesamtleistungs-Test: OK (Wärmepumpe inklusive Heizstab, Grenzwert und Prüfstatus)');
