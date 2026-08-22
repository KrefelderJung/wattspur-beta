'use strict';

/* Regression tests for the MsbG >7 kW iMSys/control hint. */
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
assert(rules.rulesetVersion === '2026-08-22-beta.16', 'Regelwerksstand muss zum iMSys-Hinweis passen');
assert(rules.getRuleCatalog().SMART_METER_CONTROL?.id === 'MK-ASSET-008', 'iMSys-Regel muss MK-ASSET-008 tragen');

const checksFor = asset => rules.evaluate({ mode: 'single', assets: [asset] });
const hasSmartMeterHint = checks => checks.some(check => check.ruleId === 'MK-ASSET-008');

const pvAtLimit = { id: 'pv-7', type: 'generation', energyCarrier: 'PV', power: '7 kWp', name: 'PV1' };
assert(!hasSmartMeterHint(checksFor(pvAtLimit)), 'Genau 7 kWp darf keinen >7-kW-Hinweis auslösen');

const pvAboveLimit = { ...pvAtLimit, id: 'pv-701', power: '7,01 kWp' };
const pvCheck = checksFor(pvAboveLimit).find(check => check.ruleId === 'MK-ASSET-008');
assert(pvCheck && pvCheck.level === 'info', 'PV über 7 kWp muss als zentraler Info-Hinweis erscheinen');
assert(pvCheck.text.includes('intelligentes Messsystem') && pvCheck.text.includes('Steuerungseinrichtung'), 'PV-Hinweis muss iMSys und mögliche Steuerungseinrichtung verständlich nennen');
assert(pvCheck.text.includes('Messstellenbetreiber'), 'PV-Hinweis muss den Messstellenbetreiber als Ansprechpartner nennen');

assert(hasSmartMeterHint(checksFor({ id: 'wind-8', type: 'generation', energyCarrier: 'Wind', power: '8 kW', name: 'WE1' })), 'Windenergie über 7 kW muss geprüft werden');
assert(hasSmartMeterHint(checksFor({ id: 'kwk-8', type: 'generation', energyCarrier: 'KWK', power: '8 kW', name: 'BHKW1' })), 'KWK über 7 kW muss geprüft werden');
assert(!hasSmartMeterHint(checksFor({ id: 'consumer-8', type: 'consumer', power: '8 kW' })), 'Verbraucher dürfen keinen Erzeugungs-Hinweis auslösen');
assert(!hasSmartMeterHint(checksFor({ id: 'storage-8', type: 'storage', power: '8 kW' })), 'Speicher dürfen keinen Erzeugungs-Hinweis auslösen');

const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
assert(!renderer.includes('data-mk-smart-meter-notice') && !editor.includes('renderSmartMeterNotice'), 'iMSys-Hinweise dürfen nicht zusätzlich im Objekteditor erscheinen');

console.log('smart-meter-control-test: OK');
