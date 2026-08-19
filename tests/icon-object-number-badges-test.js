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
    { id: 'nsh-1', type: 'nsh' }
];
const display = displayApi.createAssetDisplayController({
    getAllAssets: () => assets,
    getAssetMeta: () => ({}),
    getGenerationNumberKey: energyCarrier => energyCarrier === 'Balkonkraftwerk' ? 'PV' : energyCarrier
});

assert(display.getIconObjectNumber(assets[0]) === 1, 'Der erste Speicher muss die Kennziffer 1 erhalten');
assert(display.getIconObjectNumber(assets[1]) === 1 && display.getIconObjectNumber(assets[2]) === 2, 'Wallboxen müssen je Wallbox-Typ fortlaufend nummeriert werden');
assert(display.getIconObjectNumber(assets[3]) === 1, 'Wärmepumpen müssen eine eigene Folge beginnen');
assert(display.getIconObjectNumber(assets[4]) === 1 && display.getIconObjectNumber(assets[5]) === 1 && display.getIconObjectNumber(assets[6]) === 2, 'PV und Stecker-PV müssen gemeinsam, BHKW und Wind jeweils getrennt nummeriert werden');
assert(display.getIconObjectNumber(assets[7]) === 1, 'Nachtspeicherheizungen müssen eine eigene Kennziffernfolge erhalten');
assert(display.getIconObjectToneClass(assets[1]) === 'wallbox' && display.getIconObjectToneClass(assets[3]) === 'heatpump' && display.getIconObjectToneClass(assets[4]) === 'generation' && display.getIconObjectToneClass(assets[7]) === 'nsh', 'Kennziffern müssen die semantische Objektfarbe verwenden');

const renderText = read('js/messkonzept/render.js');
vm.runInContext(renderText, context);
const renderApi = context.window.WattspurMesskonzeptRender;
const renderer = renderApi.createRenderer({
    state: { viewMode: 'simple', assets },
    assetMeta: {
        storage: { label: 'Batteriespeicher', className: 'storage', short: '' },
        steuve: { label: 'Steuerbare Anlage', className: 'steuve', short: '⚡' },
        generation: { label: 'Erzeugungsanlage', className: 'generation', short: 'EA' }
    },
    getViewMode: () => 'simple',
    getAssetTypeLabel: asset => asset.steuveType || '',
    getIconObjectNumber: asset => display.getIconObjectNumber(asset),
    getIconObjectToneClass: asset => display.getIconObjectToneClass(asset),
    renderAssetIcon: () => 'ICON',
    escapeHtml: value => String(value ?? '')
});
const wallboxMarkup = renderer.renderAsset(assets[1]);
const generationMarkup = renderer.renderAsset(assets[4]);
const nshMarkup = renderer.renderAsset(assets[7]);
assert(wallboxMarkup.includes('data-mk-icon-sequence="1"') && wallboxMarkup.includes('mk-icon-object-sequence wallbox'), 'Eine Symbolkarte muss ihr separates farbiges Kennziffern-Badge rendern');
assert(generationMarkup.includes('data-mk-icon-sequence="1"') && generationMarkup.includes('mk-icon-object-sequence generation'), 'Erzeugungsanlagen müssen ein separates Kennziffern-Badge rendern');
assert(nshMarkup.includes('data-mk-icon-sequence="1"') && nshMarkup.includes('mk-icon-object-sequence nsh'), 'Nachtspeicherheizungen müssen ein separates Kennziffern-Badge rendern');
assert(renderText.includes('position-target') && renderText.includes('mk-icon-object-sequence'), 'Das Badge muss im DOM-Renderer verankert sein');

console.log('icon-object-number-badges-test: OK');
