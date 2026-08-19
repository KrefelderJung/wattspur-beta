'use strict';

/* Browserfreier Regressionstest für die Startvorlagen. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { window: {}, console };
vm.createContext(context);
['js/messkonzept/model.js', 'js/messkonzept/presets.js', 'js/messkonzept/preset-loader.js']
    .forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));

const model = context.window.WattspurMesskonzeptModel;
const presets = context.window.WattspurMesskonzeptPresets;
const loader = context.window.WattspurMesskonzeptPresetLoader.createPresetLoader({ model, presets });

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const generationLabels = Object.fromEntries(model.assetTypeOptions.generation.map(option => [option.value, option.label]));
assert(generationLabels.PV === 'PV' && generationLabels.KWK === 'BHKW' && generationLabels.Wind === 'Windenergieanlage' && generationLabels.Balkonkraftwerk === 'PV', 'Die sichtbaren Anlagenarten müssen PV, BHKW, Windenergieanlage und PV lauten.');
const generationSelectionLabels = model.assetTypeOptions.generation.map(option => option.selectionLabel || option.label);
assert(generationSelectionLabels.join('|') === 'PV|BHKW|Windenergieanlage|Stecker-PV', 'Die Auswahl der vier Erzeugungsarten muss eindeutig beschriftet sein.');
const labelState = model.createState();
const labelAssets = ['PV', 'KWK', 'Wind', 'Balkonkraftwerk'].map(energyCarrier => {
    const asset = model.createAsset(labelState, 'generation', 'single-main', '', energyCarrier);
    labelState.assets.push(asset);
    return asset;
});
assert(labelAssets.map(asset => asset.name).join('|') === 'PV1|BHKW1|WE1|PV2', 'PV und Stecker-PV müssen gemeinsam, BHKW und Wind jeweils in eigenen Nummernkreisen nummeriert werden.');

const catalog = presets.getCatalog();
assert(catalog.length === 9, 'Der Katalog muss neun Startvorlagen enthalten.');
assert(catalog.filter(entry => entry.group === 'single').length === 4, 'Vier gemeinsame Messungen erwartet.');
assert(catalog.filter(entry => entry.group === 'parallel').length === 2, 'Zwei Parallelvorlagen erwartet.');
assert(catalog.filter(entry => entry.group === 'cascade').length === 2, 'Zwei Kaskadenvorlagen erwartet.');
assert(catalog.filter(entry => entry.group === 'mieterstrom').length === 1, 'Eine Mieterstromvorlage erwartet.');

const infoTexts = ['single', 'parallel', 'cascade', 'mieterstrom']
    .map(group => presets.getGroupInfo(group))
    .flatMap(info => [info.intro, ...info.advantages, ...info.cautions]);
assert(infoTexts.every(text => !/[–—]/.test(text)), 'Die sichtbaren Infobox-Texte dürfen keine Gedankenstriche enthalten.');
const mieterstromInfo = presets.getGroupInfo('mieterstrom');
assert(mieterstromInfo.intro.includes('Mieterstrom beschreibt die Versorgung von Bewohnern') && mieterstromInfo.advantages.some(text => text.includes('Netzentgelte, netzseitige Umlagen')) && mieterstromInfo.advantages.some(text => text.includes('Mieterstromzuschlag')), 'Die Mieterstrominfo muss allgemein formuliert sein und den lokalen Vorteil sowie den möglichen Zuschlag erklären.');
assert(mieterstromInfo.cautions.some(text => text.includes('Markt- und Messlokationsführung')) && mieterstromInfo.links.some(link => link.label === 'BNetzA: Mieterstrom'), 'Die Mieterstrominfo muss Marktkommunikation vorsichtig einordnen und eine offizielle Quelle verlinken.');
assert(!infoTexts.some(text => text.includes('technische Modellannahme') || text.includes('alle Anschlussnutzer von der Erzeugungsanlage')), 'Die allgemeine Mieterstrominfo darf nicht auf MK D1 verengt werden.');
assert(presets.getGroupInfo('parallel').cautions.some(text => text.includes('Wärmepumpenprivilegierung nach § 22 EnFG')), 'Die Parallelmessung muss auf die Wärmepumpenprivilegierung nach § 22 EnFG hinweisen.');
assert(presets.getGroupInfo('cascade').advantages.some(text => text === 'Steuerbare Verbrauchseinrichtungen nach § 14a EnWG können in der Kaskade über einen eigenen Zählpunkt von der Netzentgeltreduzierung nach Modul 2 profitieren.'), 'Die Kaskadeninfo muss den möglichen Vorteil von Modul 2 bei einem eigenen Zählpunkt klar benennen.');

const householdPv = loader.buildPresetState('single-household-pv-storage-wallbox');
assert(householdPv.mode === 'single', 'Gemeinsame Messung muss den Single-Modus laden.');
assert(householdPv.assets.some(asset => asset.type === 'consumer' && asset.name === 'Haushalt'), 'Haushalt bleibt intern ein Verbraucher.');
assert(householdPv.assets.some(asset => asset.type === 'generation' && asset.name === 'PV'), 'PV muss in der Vorlage enthalten sein.');

const parallel = loader.buildPresetState('parallel-heatpump');
assert(parallel.mode === 'parallel' && parallel.cascadeLevels === 2, 'Parallelvorlage muss mit zwei Bereichen starten.');
assert(parallel.assets.some(asset => asset.zone === 'parallel-0' && asset.name === 'Haushalt'), 'Haushalt muss in Parallelbereich Z1 liegen.');
assert(parallel.assets.some(asset => asset.zone === 'parallel-1' && asset.steuveType === 'Wärmepumpe'), 'Wärmepumpe muss in Parallelbereich Z2 liegen.');

const cascade = loader.buildPresetState('cascade-heatpump');
const cascadeMeter = cascade.assets.find(asset => asset.type === 'meter');
assert(cascade.mode === 'single' && cascadeMeter && cascadeMeter.meterScope === 'base' && cascadeMeter.parentBaseMeterIndex === 0, 'Kaskade muss im gemeinsamen Messmodus einen senkrechten Basiszähler hinter Z1 enthalten.');
['consumer', 'generation', 'storage'].forEach(type => {
    const asset = cascade.assets.find(item => item.type === type);
    assert(asset && asset.meterId === cascadeMeter.id, `${type} muss hinter Z2 gemessen werden.`);
});
assert(cascade.assets.some(asset => asset.type === 'steuve' && !asset.meterId), 'Die Steueranlage muss auf der oberen Schiene bleiben.');
assert(cascade.assets.filter(asset => asset.type !== 'meter' && asset.type !== 'steuve').every(asset => asset.meterId === cascadeMeter.id), 'Haushalt, PV und Speicher müssen gemeinsam hinter Z2 gemessen werden.');

const mieterstrom = loader.buildPresetState('mieterstrom-d1');
const mieterstromUsers = mieterstrom.assets.filter(asset => asset.mieterstromObject === 'user');
const mieterstromMeters = mieterstrom.assets.filter(asset => asset.mieterstromObject === 'external-meter');
assert(mieterstrom.mode === 'single', 'Mieterstrom D1 darf keinen eigenen Messmodus einführen.');
assert(mieterstromUsers.length === 4 && mieterstromMeters.length === 4, 'Mieterstrom D1 muss vier Nutzer und vier zugeordnete Mieterstromzähler enthalten.');
assert(mieterstrom.assets.some(asset => asset.type === 'generation' && asset.energyCarrier === 'PV' && asset.generationMeter), 'Mieterstrom D1 muss eine PV-Anlage mit sichtbarem Erzeugungszähler enthalten.');
assert(mieterstromUsers.every(user => user.meterId && mieterstromMeters.some(meter => meter.id === user.meterId && meter.targetAssetId === user.id)), 'Jeder Mieterstromnutzer muss genau seinem Mieterstromzähler zugeordnet sein.');
assert(mieterstromMeters.every(meter => meter.marketLocationStatus === 'inactive' && meter.mieterstromParticipation === 'excluded'), 'Die in D1 sichtbaren Mieterstromzähler müssen als technische Modellannahme markiert sein.');

const target = model.createState();
presets.getById('single-household-pv');
loader.applyPreset(target, 'single-household-pv');
assert(target.assets.length === 2 && target.assets.some(asset => asset.name === 'Haushalt'), 'applyPreset muss den vorhandenen Zustand ersetzen.');

console.log('Preset-Loader-Test: OK (9 Vorlagen, Single/Parallel/Kaskade/Mieterstrom geprüft)');
