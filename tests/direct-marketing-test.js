'use strict';

/* Regression tests for the >100 kW/kWp generation marketing notice. */
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
assert(rules.rulesetVersion === '2026-08-19-beta.15', 'Regelwerksstand muss zur zentralen Hinweisregel passen');
assert(rules.getRuleCatalog().DIRECT_MARKETING?.id === 'MK-ASSET-006', 'Direktvermarktungsregel muss MK-ASSET-006 tragen');

const checksFor = asset => rules.evaluate({ mode: 'single', assets: [asset] });
const hasDirectMarketing = checks => checks.some(check => check.ruleId === 'MK-ASSET-006');

const pvAtLimit = { id: 'pv-limit', type: 'generation', energyCarrier: 'PV', power: '100 kWp', name: 'PV1' };
assert(rules.getGenerationDirectMarketingAssessment(pvAtLimit).unit === 'kWp', 'PV muss mit kWp bewertet werden');
assert(!hasDirectMarketing(checksFor(pvAtLimit)), 'Genau 100 kWp darf keinen Hinweis auslösen');

const pvAboveLimit = { ...pvAtLimit, id: 'pv-over', power: '100,01 kWp' };
const pvChecks = checksFor(pvAboveLimit);
assert(hasDirectMarketing(pvChecks), 'PV über 100 kWp muss einen Hinweis auslösen');
assert(pvChecks.find(check => check.ruleId === 'MK-ASSET-006').text.includes('Direktvermarkter'), 'PV-Hinweis muss den Vermarktungsweg verständlich benennen');

const windAboveLimit = { id: 'wind-over', type: 'generation', energyCarrier: 'Wind', power: '101 kW', name: 'WE1' };
assert(rules.getGenerationDirectMarketingAssessment(windAboveLimit).unit === 'kW', 'Windenergie muss mit kW bewertet werden');
assert(hasDirectMarketing(checksFor(windAboveLimit)), 'Windenergie über 100 kW muss einen Hinweis auslösen');

const kwkAboveLimit = { id: 'kwk-over', type: 'generation', energyCarrier: 'KWK', power: '100,1 kW', name: 'BHKW1' };
const kwkCheck = checksFor(kwkAboveLimit).find(check => check.ruleId === 'MK-ASSET-006');
assert(kwkCheck && kwkCheck.text.includes('direkt vermarktet oder selbst verbraucht'), 'KWK-Hinweis muss Direktvermarktung oder Eigenverbrauch nennen');

const missingPower = { id: 'pv-missing', type: 'generation', energyCarrier: 'PV', power: '', name: 'PV2' };
assert(!hasDirectMarketing(checksFor(missingPower)), 'Fehlende Leistung darf keinen falschen Grenzwert-Hinweis erzeugen');
assert(!hasDirectMarketing(checksFor({ id: 'storage-1', type: 'storage', power: '250 kW' })), 'Nicht-Erzeugungsanlagen dürfen die Regel nicht auslösen');

const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
const display = read('js/messkonzept/asset-display.js');
assert(!renderer.includes('data-mk-generation-notice') && !renderer.includes('renderGenerationNotice'), 'Direktvermarktungshinweise dürfen nicht doppelt im Objekteditor erscheinen');
assert(!editor.includes('data-mk-generation-notice') && !editor.includes('renderGenerationNotice'), 'Objekteditor darf keine fachlichen Vermarktungshinweise duplizieren');
assert(!display.includes('mk-generation-editor-notice') && rules.getRuleCatalog().DIRECT_MARKETING?.id === 'MK-ASSET-006', 'Direktvermarktung muss ausschließlich über das zentrale Regelwerk laufen');

console.log('direct-marketing-test: OK');
