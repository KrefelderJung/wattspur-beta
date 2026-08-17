'use strict';

/* Fachlicher Regressionstest für die Speicher-Betriebsweise. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { window: {}, console };
vm.createContext(context);
['js/messkonzept/model.js', 'js/messkonzept/rules.js']
    .forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));

const model = context.window.WattspurMesskonzeptModel;
const rules = context.window.WattspurMesskonzeptRules;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const state = model.createState();
const storage = model.createAsset(state, 'storage', 'single-main');
assert(storage.storageGridFeedIn === 'unknown' && storage.storageGridImport === 'unknown', 'Neue Speicher müssen mit ungeklärter Betriebsweise starten.');
assert(model.getStorageOperation(storage).key === 'open', 'Ungeklärte Speicher-Betriebsweise muss als offen erkannt werden.');

storage.storageGridFeedIn = 'no';
storage.storageGridImport = 'no';
assert(model.getStorageOperation(storage).key === 'pv-surplus-only', 'Nein/Nein muss als reiner PV-Überschussbetrieb erkannt werden.');

storage.storageGridFeedIn = 'yes';
storage.storageGridImport = 'yes';
const mixed = model.getStorageOperation(storage);
assert(mixed.key === 'mixed-grid-operation' && mixed.notice.includes('EEG-Förderung'), 'Ja/Ja muss einen Hinweis zum Mischbetrieb und zur EEG-Behandlung liefern.');

const checks = rules.evaluate({ ...state, assets: [storage] }, { storageInfoText: 'Basis-Hinweis' });
assert(checks.length === 1 && checks[0].ruleId === 'MK-ASSET-001', 'Speicher muss weiterhin genau einen Betriebsrollen-Hinweis erzeugen.');
assert(checks[0].text.includes('Mischbetrieb') && checks[0].text.includes('Basis-Hinweis'), 'Der Prüfstatus muss die gewählte Speicher-Betriebsweise enthalten.');

console.log('Speicher-Betriebsweisen-Test: OK (Netzeinspeisung, Netzbezug und PV-Überschussbetrieb geprüft)');
