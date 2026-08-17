'use strict';

/*
 * Regressionstest fuer den Fall: Erste Anlage eines Unterzaehlers wird
 * geloescht. Der Unterzaehler muss an seiner Rail-Position bleiben und darf
 * nicht als normale Kaskadenstufe in die Hauptkette zurueckfallen.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dragDropSource = fs.readFileSync(path.join(root, 'js/messkonzept/drag-drop.js'), 'utf8');
const topologySource = fs.readFileSync(path.join(root, 'messkonzept-topology.js'), 'utf8');
const layoutCalculationsSource = fs.readFileSync(path.join(root, 'js/messkonzept/layout-calculations.js'), 'utf8');

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(dragDropSource, context, { filename: 'drag-drop.js' });
vm.runInContext(topologySource, context, { filename: 'messkonzept-topology.js' });
vm.runInContext(layoutCalculationsSource, context, { filename: 'layout-calculations.js' });

const dragDrop = context.window.WattspurMesskonzeptDragDrop;
const topology = context.window.WattspurMesskonzeptTopology;
const calculationsFactory = context.window.WattspurMesskonzeptLayoutCalculations;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const state = {
    assets: [
        { id: 'z2', type: 'meter', zone: 'single-main', meterScope: 'base', targetAssetId: '', parentMeterId: '' },
        { id: 'direct', type: 'generation', zone: 'single-main', meterId: '' },
        { id: 'ea1', type: 'generation', zone: 'single-main', meterId: 'z5' },
        { id: 'z5', type: 'meter', zone: 'single-main', meterScope: 'asset', targetAssetId: 'ea1', parentMeterId: 'z2', keepEmptyRail: true },
        { id: 'ea2', type: 'generation', zone: 'single-main', meterId: 'z5' },
        { id: 'ea3', type: 'generation', zone: 'single-main', meterId: 'z5' }
    ],
    selectedObject: null
};

let renderCount = 0;
const removeButton = { dataset: { mkRemoveAsset: 'ea1' } };
const controller = dragDrop.createDragDropController({
    getState: () => state,
    api: {
        getAdditionalMeters: () => state.assets.filter(asset => asset.type === 'meter'),
        getMeterAssets: meterId => state.assets.filter(asset => asset.type !== 'meter' && asset.meterId === meterId),
        captureHistoryState: () => JSON.stringify(state.assets),
        recordHistory: () => {},
        render: () => { renderCount += 1; }
    }
});

controller.handleCanvasClick({
    target: {
        closest: selector => selector === '[data-mk-remove-asset]' ? removeButton : null
    }
});

const z5 = state.assets.find(asset => asset.id === 'z5');
assert(z5?.meterScope === 'asset', 'Ein Unterzaehler darf nach dem Loeschen seines ersten Ziels nicht zum normalen Kaskadenzaehler werden');
assert(z5?.targetAssetId === 'ea2', 'Der Unterzaehler muss auf die erste verbleibende Anlage umhaengen');
assert(z5?.railAnchorOrder === 2, 'Der bisherige Rail-Anker muss die Position des geloeschten Ziels bewahren');
assert(renderCount === 1, 'Ein zulässiges Löschen muss genau einmal neu rendern');

const tree = topology.buildZoneMeterTree(state.assets, 'single-main');
const z2Rail = tree.children.find(rail => rail.meterId === 'z2');
assert(z2Rail?.children.some(rail => rail.meterId === 'z5'), 'Z5 muss unter Z2 bleiben und darf nicht in die Root-Kette teleportieren');

const calculations = calculationsFactory.createLayoutCalculations({
    getState: () => state,
    getAdditionalMeters: () => state.assets.filter(asset => asset.type === 'meter')
});
const z5ParentRail = {
    assets: [],
    children: [{ meterId: 'z5', meterScope: 'asset' }]
};
const reservedSlot = calculations.getReservedMeterSlots(z5ParentRail)[0];
assert(reservedSlot?.order === 2, 'Die Layoutberechnung muss den gespeicherten Anschlussplatz statt der neuen Zielreihenfolge verwenden');

// Sonderfall: Das letzte Zielobjekt eines Anlagenzaehlers wird geloescht.
// Der Zaehler bleibt als leerer Unter-Rail an seiner alten Position bestehen.
const emptyRailState = {
    assets: [
        { id: 'z2-empty', type: 'meter', zone: 'single-main', meterScope: 'base', targetAssetId: '', parentMeterId: '' },
        { id: 'ea-empty', type: 'generation', zone: 'single-main', meterId: 'z5-empty' },
        { id: 'z5-empty', type: 'meter', zone: 'single-main', meterScope: 'asset', targetAssetId: 'ea-empty', parentMeterId: 'z2-empty', keepEmptyRail: false }
    ],
    selectedObject: null
};
let emptyRenderCount = 0;
const emptyController = dragDrop.createDragDropController({
    getState: () => emptyRailState,
    api: {
        getAdditionalMeters: () => emptyRailState.assets.filter(asset => asset.type === 'meter'),
        getMeterAssets: meterId => emptyRailState.assets.filter(asset => asset.type !== 'meter' && asset.meterId === meterId),
        captureHistoryState: () => JSON.stringify(emptyRailState.assets),
        recordHistory: () => {},
        render: () => { emptyRenderCount += 1; }
    }
});
emptyController.handleCanvasClick({
    target: {
        closest: selector => selector === '[data-mk-remove-asset]'
            ? { dataset: { mkRemoveAsset: 'ea-empty' } }
            : null
    }
});
const emptyMeter = emptyRailState.assets.find(asset => asset.id === 'z5-empty');
assert(emptyMeter?.meterScope === 'asset', 'Ein leerer Anlagenzaehler muss anlagenbezogen bleiben');
assert(emptyMeter?.targetAssetId === '', 'Ein leerer Anlagenzaehler darf kein geloeschtes Ziel weiterreferenzieren');
assert(emptyMeter?.keepEmptyRail === true, 'Die leere Unter-Rail muss bewusst sichtbar bleiben');
assert(emptyMeter?.railAnchorOrder === 1, 'Die leere Unter-Rail muss den alten Anschlussplatz behalten');
assert(emptyRenderCount === 1, 'Das Leeren einer Unter-Rail muss genau einmal rendern');
const emptyTree = topology.buildZoneMeterTree(emptyRailState.assets, 'single-main');
const emptyParentRail = emptyTree.children.find(rail => rail.meterId === 'z2-empty');
assert(emptyParentRail?.children.some(rail => rail.meterId === 'z5-empty'), 'Eine leere Unter-Rail darf nicht in die Hauptkette teleportieren');
const emptyCalculations = calculationsFactory.createLayoutCalculations({
    getState: () => emptyRailState,
    getAdditionalMeters: () => emptyRailState.assets.filter(asset => asset.type === 'meter')
});
const emptyReservedSlot = emptyCalculations.getReservedMeterSlots({
    assets: [],
    children: [{ meterId: 'z5-empty', meterScope: 'asset' }]
})[0];
assert(emptyReservedSlot?.order === 1, 'Auch eine leere Unter-Rail muss ihren reservierten Anschlussplatz behalten');

console.log('Rail-Anker-Loeschtest: OK (Unterzaehler bleibt fachlich und optisch ausgerueckt)');
