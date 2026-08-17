'use strict';

/* Regressionstest: Ein Zähler darf keine zugeordneten Anlagen verwaisen lassen. */
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
if (state.assets.length !== 2) throw new Error('Ein Zähler mit zugeordneter Anlage darf nicht gelöscht werden.');
if (!notification.includes('Bitte entfernen Sie zuerst die zugeordnete Anlage')) throw new Error('Die Fehlermeldung zur Zählersperre fehlt.');
if (renderCount !== 0) throw new Error('Ein abgewiesener Löschversuch darf keine Darstellung neu zeichnen.');

state.assets = [meter];
notification = '';
controller.handleCanvasClick(createRemoveEvent(meter.id));
if (state.assets.length !== 0) throw new Error('Ein leerer Zähler muss löschbar bleiben.');
if (renderCount !== 1) throw new Error('Ein zulässiges Löschen muss die Darstellung aktualisieren.');

const legacyMeter = { id: 'meter-legacy', type: 'meter', meterScope: 'asset', targetAssetId: 'asset-legacy' };
const legacyAsset = { id: 'asset-legacy', type: 'generation', meterId: '' };
state.assets = [legacyMeter, legacyAsset];
notification = '';
controller.handleCanvasClick(createRemoveEvent(legacyMeter.id));
if (state.assets.length !== 2 || !notification.includes('zugeordnete Anlage')) throw new Error('Auch alte Zustände mit targetAssetId müssen vor dem Löschen geschützt werden.');

console.log('Meter-Delete-Guard-Test: OK (zugeordnete Anlagen geschützt, leerer Zähler löschbar)');
