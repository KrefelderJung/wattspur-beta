'use strict';

/* Regressionstest für getrennte Anlagen-Nummernkreise. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(read('js/messkonzept/model.js'), context, { filename: 'js/messkonzept/model.js' });
vm.runInContext(read('js/messkonzept/identifiers.js'), context, { filename: 'js/messkonzept/identifiers.js' });

const model = context.window.WattspurMesskonzeptModel;
const identifierFactory = context.window.WattspurMesskonzeptIdentifiers;
assert(model && identifierFactory, 'Modell und Kennungsmodul müssen geladen werden');

const state = model.createState();
const pv = model.addAsset(state, 'generation', 'single-main', '', 'PV');
const kwk = model.addAsset(state, 'generation', 'single-main', '', 'KWK');
const wind = model.addAsset(state, 'generation', 'single-main', '', 'Wind');
const steckerPv = model.addAsset(state, 'generation', 'single-main', '', 'Balkonkraftwerk');
assert(pv.name === 'PV1', 'Die erste PV-Anlage muss PV1 erhalten');
assert(kwk.name === 'BHKW1', 'BHKW muss einen eigenen Nummernkreis mit BHKW1 beginnen');
assert(wind.name === 'WE1', 'Windenergieanlagen müssen einen eigenen Nummernkreis mit WE1 beginnen');
assert(steckerPv.name === 'PV2', 'Stecker-PV muss den PV-Nummernkreis fortsetzen');

const identifiers = identifierFactory.createIdentifierController({
    getState: () => state,
    getGenerationDisplay: energyCarrier => model.getGenerationDisplay(energyCarrier),
    getGenerationNumberKey: energyCarrier => model.getGenerationNumberKey(energyCarrier)
});
assert(identifiers.getGenerationAssetNumber(pv) === 1, 'PV-Nummer muss 1 sein');
assert(identifiers.getGenerationAssetNumber(kwk) === 1, 'BHKW-Nummer muss unabhängig bei 1 beginnen');
assert(identifiers.getGenerationAssetNumber(wind) === 1, 'Wind-Nummer muss unabhängig bei 1 beginnen');
assert(identifiers.getGenerationAssetNumber(steckerPv) === 2, 'Stecker-PV muss als PV2 erscheinen');

pv.energyCarrier = 'KWK';
identifiers.syncGenerationName(pv);
assert(pv.name === 'BHKW2', 'Beim Umschalten PV1 auf BHKW muss die nächste freie BHKW-Nummer vergeben werden');

console.log('erzeugungsanlagen-nummerierung-test: OK');
