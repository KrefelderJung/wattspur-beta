'use strict';

/* Regression tests for optional technical asset data. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(read('js/messkonzept/model.js'), context);
const model = context.window.WattspurMesskonzeptModel;
assert(model, 'Messkonzept-Modell konnte nicht geladen werden');

const state = model.createInitialState ? model.createInitialState() : {
    assets: [], nextId: 1, mode: 'single', cascadeLevels: 2, meterDetails: {},
    hak: { voltageLevel: 'low' }, selectedObject: null
};
const pv = model.createAsset(state, 'generation', 'single-main', '', 'PV');
const wind = model.createAsset(state, 'generation', 'single-main', '', 'Wind');
const storage = model.createAsset(state, 'storage', 'single-main');

const steuveOptions = model.assetTypeOptions.steuve || [];
assert(!steuveOptions.some(option => option.value === 'Sonstige' || option.label === 'Sonstige steuerbare Anlage'), 'Die veraltete Auswahl „Sonstige steuerbare Anlage“ darf nicht mehr angeboten werden');
assert(steuveOptions.some(option => option.value === 'Klimaanlage' && option.label === 'Raumkühlung / Klimaanlage'), 'Die Klimaanlage muss als „Raumkühlung / Klimaanlage“ bezeichnet werden');
assert(steuveOptions.some(option => option.value === 'offen' && option.label === 'Fachliche Einordnung offen'), 'Für Sonderfälle muss eine neutrale fachliche Einordnung offen bleiben können');
const legacySteuve = model.createAsset(state, 'steuve', 'single-main', 'Sonstige');
assert(legacySteuve.steuveType === 'offen' && legacySteuve.name.startsWith('Fachliche Einordnung offen '), 'Alte „Sonstige“-Werte müssen neutral migriert werden und dürfen keine automatische §14a-Aussage erzeugen');
const climate = model.createAsset(state, 'steuve', 'single-main', 'Klimaanlage');
assert(climate.name.startsWith('Raumkühlung / Klimaanlage '), 'Neue Klimaanlagen müssen die verständliche Bezeichnung im Objekt verwenden');
assert(model.assetMeta.storage?.label === 'Batteriespeicher', 'Der Speicher muss als eigenes Objekt erhalten bleiben');

for (const asset of [pv, wind]) {
    assert(Object.prototype.hasOwnProperty.call(asset, 'inverterPower'), `${asset.energyCarrier}: Wechselrichterleistung fehlt im Modell`);
    assert(asset.inverterPower === '', `${asset.energyCarrier}: Wechselrichterleistung muss leer starten`);
}
for (const key of ['storageCapacity', 'storageChargePower', 'storageDischargePower', 'storageInverterPower']) {
    assert(Object.prototype.hasOwnProperty.call(storage, key), `Speicherfeld fehlt: ${key}`);
    assert(storage[key] === '', `Speicherfeld ${key} muss leer starten`);
}

const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
assert(renderer.includes('data-mk-field="inverterPower"'), 'Editor rendert Wechselrichterleistung nicht');
assert(renderer.includes('data-mk-field="storageCapacity"') && renderer.includes('data-mk-field="storageChargePower"') && renderer.includes('data-mk-field="storageDischargePower"') && renderer.includes('data-mk-field="storageInverterPower"'), 'Editor rendert Speicher-Leistungsfelder nicht vollständig');
assert(renderer.includes('Mehrere Wechselrichter bitte als Gesamtleistung eintragen'), 'Editor erklärt die Erfassung mehrerer Wechselrichter nicht');
assert(renderer.includes("const inverterUnit = isSteckerPv ? 'VA' : 'kVA'") && renderer.includes('z. B. 800 VA') && renderer.includes('höchstens 800 VA'), 'Stecker-PV muss die Wechselrichterleistung in VA mit 800-VA-Hinweis erfassen');
assert(renderer.includes('Wechselrichterleistung') && renderer.includes('Speicherkapazität'), 'Export-/Detaildarstellung enthält technische Felder nicht');
assert(editor.includes("field === 'energyCarrier'") && editor.includes('refreshObjectModal'), 'Editor baut technische Felder nach Anlagenartwechsel neu auf');

console.log('technical-fields-test: OK');
