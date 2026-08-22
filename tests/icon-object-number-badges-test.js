'use strict';

/* Regressionstest für laufende Kennziffern auf reinen Symbolkarten. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(read('js/messkonzept/asset-display.js'), context);
const displayApi = context.window.WattspurMesskonzeptAssetDisplay;
assert(displayApi, 'Asset-Display-Modul konnte nicht geladen werden');

const assets = [
    { id: 'storage-1', type: 'storage' },
    { id: 'wallbox-1', type: 'steuve', steuveType: 'Wallbox' },
    { id: 'wallbox-2', type: 'steuve', steuveType: 'Wallbox' },
    { id: 'heatpump-1', type: 'steuve', steuveType: 'Wärmepumpe' },
    { id: 'generation-1', type: 'generation', energyCarrier: 'PV' },
    { id: 'generation-2', type: 'generation', energyCarrier: 'KWK' },
    { id: 'generation-3', type: 'generation', energyCarrier: 'Balkonkraftwerk' },
    { id: 'nsh-1', type: 'nsh' },
    { id: 'consumer-1', type: 'consumer' },
    { id: 'user-1', type: 'consumer', mieterstromObject: 'user' },
    { id: 'meter-1', type: 'meter' }
];
const display = displayApi.createAssetDisplayController({
    getAllAssets: () => assets,
    getAssetMeta: () => ({}),
    getGenerationNumberKey: energyCarrier => energyCarrier === 'Balkonkraftwerk' ? 'PV' : energyCarrier,
    getGenerationDisplay: energyCarrier => ({
        prefix: energyCarrier === 'KWK' ? 'BHKW' : energyCarrier === 'Balkonkraftwerk' ? 'PV' : energyCarrier === 'Wind' ? 'WE' : 'PV'
    }),
    getGenerationAssetNumber: asset => asset.id === 'generation-1' ? 1 : null,
    getConsumerAssetNumber: asset => asset.id === 'consumer-1' || asset.id === 'user-1' ? 1 : null,
    getMeterLabel: meter => meter.id === 'meter-1' ? 'Z1' : ''
});

assert(display.getIconObjectNumber(assets[0]) === 1, 'Der erste Speicher muss die Kennziffer 1 erhalten');
assert(display.getIconObjectNumber(assets[1]) === 1 && display.getIconObjectNumber(assets[2]) === 2, 'Wallboxen müssen je Wallbox-Typ fortlaufend nummeriert werden');
assert(display.getIconObjectNumber(assets[3]) === 1, 'Wärmepumpen müssen eine eigene Folge beginnen');
assert(display.getIconObjectNumber(assets[4]) === null && display.getIconObjectNumber(assets[5]) === null && display.getIconObjectNumber(assets[6]) === null, 'Textkarten der Erzeugungsanlagen dürfen kein zusätzliches Badge rendern');
assert(display.getIconObjectNumber(assets[7]) === null && display.getNshAssetNumber(assets[7]) === 1, 'Nachtspeicherheizungen müssen ihre Kennziffer im Text tragen');
assert(display.getIconObjectToneClass(assets[1]) === 'wallbox' && display.getIconObjectToneClass(assets[3]) === 'heatpump' && display.getIconObjectToneClass(assets[4]) === '' && display.getIconObjectToneClass(assets[7]) === '', 'Nur Symbolkarten dürfen eine Badge-Farbklasse erhalten');
assert(display.getIconObjectNumber(assets[8]) === null && display.getIconObjectNumber(assets[9]) === null && display.getIconObjectNumber(assets[10]) === null, 'Verbraucher, Mieterstromnutzer und Zähler dürfen kein zusätzliches Badge erhalten');

const renderText = read('js/messkonzept/render.js');
vm.runInContext(renderText, context);
const renderApi = context.window.WattspurMesskonzeptRender;
const renderer = renderApi.createRenderer({
    state: { viewMode: 'simple', assets },
    assetMeta: {
        storage: { label: 'Batteriespeicher', className: 'storage', short: '' },
        steuve: { label: 'Steuerbare Anlage', className: 'steuve', short: '⚡' },
        generation: { label: 'Erzeugungsanlage', className: 'generation', short: 'EA' },
        consumer: { label: 'Sonstiger Verbraucher', className: 'consumer', short: 'V' },
        meter: { label: 'Zähler', className: 'meter', short: 'Z' },
        nsh: { label: 'Nachtspeicherheizung', className: 'nsh', short: 'NSH' }
    },
    getViewMode: () => 'simple',
    getAssetTypeLabel: asset => asset.steuveType || '',
    getIconObjectNumber: asset => display.getIconObjectNumber(asset),
    getIconObjectToneClass: asset => display.getIconObjectToneClass(asset),
    renderAssetIcon: asset => display.renderAssetIcon(asset),
    escapeHtml: value => String(value ?? '')
});
const wallboxMarkup = renderer.renderAsset(assets[1]);
const generationMarkup = renderer.renderAsset(assets[4]);
const nshMarkup = renderer.renderAsset(assets[7]);
const consumerMarkup = renderer.renderAsset(assets[8]);
const userMarkup = renderer.renderAsset(assets[9]);
const meterMarkup = renderer.renderAsset(assets[10]);
assert(wallboxMarkup.includes('data-mk-icon-sequence="1"') && wallboxMarkup.includes('mk-icon-object-sequence wallbox'), 'Eine Symbolkarte muss ihr separates farbiges Kennziffern-Badge rendern');
assert(!generationMarkup.includes('mk-icon-object-sequence') && generationMarkup.includes('PV1'), 'Erzeugungsanlagen müssen ihre Kennziffer im sichtbaren Text tragen');
assert(!nshMarkup.includes('mk-icon-object-sequence') && nshMarkup.includes('NSH1'), 'Nachtspeicherheizungen müssen ihre Kennziffer im sichtbaren Text tragen');
assert(!consumerMarkup.includes('mk-icon-object-sequence') && consumerMarkup.includes('V1'), 'Verbraucher müssen ihre Kennziffer im sichtbaren Text tragen');
assert(!userMarkup.includes('mk-icon-object-sequence') && userMarkup.includes('N1'), 'Mieterstromnutzer müssen ihre Kennziffer im sichtbaren Text tragen');
assert(!meterMarkup.includes('mk-icon-object-sequence'), 'Zähler dürfen kein zusätzliches Badge rendern');
assert(renderText.includes('position-target') && renderText.includes('mk-icon-object-sequence'), 'Das Badge muss im DOM-Renderer verankert sein');

console.log('icon-object-number-badges-test: OK');
