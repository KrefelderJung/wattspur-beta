'use strict';

/* Regressionstest: Ein Zähler darf direkt gelöscht werden. Zugeordnete
 * Anlagen fallen dabei in den übergeordneten Messbereich zurück. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/messkonzept/drag-drop.js'), 'utf8'), context, {
    filename: 'drag-drop.js'
});

const factory = context.window.WattspurMesskonzeptDragDrop;
if (!factory) throw new Error('Drag-and-drop-Modul wurde nicht geladen.');

function createRemoveEvent(id) {
    const button = { dataset: { mkRemoveMeter: id } };
    return { target: { closest: selector => selector === '[data-mk-remove-meter]' ? button : null } };
}

const meter = { id: 'meter-1', type: 'meter', meterScope: 'asset' };
const asset = { id: 'asset-1', type: 'generation', meterId: meter.id };
const state = { assets: [meter, asset], selectedObject: null };
let notification = '';
let renderCount = 0;
const controller = factory.createDragDropController({
    getState: () => state,
    api: {
        getAdditionalMeters: () => state.assets.filter(item => item.type === 'meter'),
        captureHistoryState: () => JSON.stringify(state.assets),
        notify: message => { notification = message; },
        render: () => { renderCount += 1; },
        recordHistory: () => {}
    }
});

controller.handleCanvasClick(createRemoveEvent(meter.id));
if (state.assets.some(asset => asset.id === meter.id)) throw new Error('Ein Zähler muss auch mit zugeordneter Anlage löschbar sein.');
if (asset.meterId) throw new Error('Die zugeordnete Anlage muss nach dem Löschen in den übergeordneten Messbereich zurückfallen.');
if (notification) throw new Error('Beim direkten Löschen eines Zählers darf keine Löschsperre erscheinen.');
if (renderCount !== 1) throw new Error('Ein direktes Löschen muss die Darstellung aktualisieren.');

state.assets = [meter];
notification = '';
controller.handleCanvasClick(createRemoveEvent(meter.id));
if (state.assets.length !== 0) throw new Error('Ein leerer Zähler muss löschbar bleiben.');
if (renderCount !== 2) throw new Error('Ein zulässiges Löschen muss die Darstellung aktualisieren.');

const legacyMeter = { id: 'meter-legacy', type: 'meter', meterScope: 'asset', targetAssetId: 'asset-legacy' };
const legacyAsset = { id: 'asset-legacy', type: 'generation', meterId: '' };
state.assets = [legacyMeter, legacyAsset];
notification = '';
controller.handleCanvasClick(createRemoveEvent(legacyMeter.id));
if (state.assets.some(asset => asset.id === legacyMeter.id) || legacyAsset.targetAssetId) throw new Error('Auch alte Zustände mit targetAssetId müssen direkt bereinigt werden.');

const parentMeter = { id: 'meter-parent', type: 'meter', meterScope: 'asset', parentMeterId: '' };
const childMeter = { id: 'meter-child', type: 'meter', meterScope: 'asset', parentMeterId: parentMeter.id, targetAssetId: 'asset-child' };
const childAsset = { id: 'asset-child', type: 'generation', meterId: childMeter.id };
state.assets = [parentMeter, childMeter, childAsset];
notification = '';
controller.handleCanvasClick(createRemoveEvent(parentMeter.id));
if (state.assets.some(asset => asset.id === parentMeter.id) || childMeter.parentMeterId !== '') throw new Error('Beim Löschen eines Elternzählers muss die nachgeordnete Kaskade am übergeordneten Messbereich bleiben.');
if (childAsset.meterId !== childMeter.id) throw new Error('Das Löschen eines Elternzählers darf die nachgeordnete Anlagenmessung nicht lösen.');

const fallbackMeter = { id: 'meter-fallback', type: 'meter', meterScope: 'asset', parentMeterId: '' };
const removedNestedMeter = { id: 'meter-nested', type: 'meter', meterScope: 'asset', parentMeterId: fallbackMeter.id };
const nestedAsset = { id: 'asset-nested', type: 'consumer', meterId: removedNestedMeter.id };
state.assets = [fallbackMeter, removedNestedMeter, nestedAsset];
notification = '';
controller.handleCanvasClick(createRemoveEvent(removedNestedMeter.id));
if (state.assets.some(asset => asset.id === removedNestedMeter.id) || nestedAsset.meterId !== fallbackMeter.id) throw new Error('Beim Löschen eines verschachtelten Zählers muss die Anlage an der Eltern-Sammelschiene bleiben.');

console.log('Meter-Delete-Test: OK (belegte und leere Zähler direkt löschbar)');
