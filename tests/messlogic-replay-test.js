'use strict';

/*
 * Bedienfolgen als reproduzierbarer Replay-Test.
 *
 * Dieser Test simuliert nicht nur den Endzustand per model.addAsset(), sondern
 * führt die kritischen Schritte über den echten Drag-and-Drop-Controller aus.
 * Dadurch bleiben Fehler sichtbar, die erst durch eine bestimmte Reihenfolge
 * von Ziehen, Erweitern und Löschen entstehen.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadModule(relativePath, exportName) {
    const context = { window: {}, console };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context, {
        filename: relativePath
    });
    const exported = context.window[exportName];
    if (!exported) throw new Error(`${relativePath}: ${exportName} wurde nicht geladen`);
    return exported;
}

const model = loadModule('js/messkonzept/model.js', 'WattspurMesskonzeptModel');
const topology = loadModule('messkonzept-topology.js', 'WattspurMesskonzeptTopology');
const dragDrop = loadModule('js/messkonzept/drag-drop.js', 'WattspurMesskonzeptDragDrop');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function paletteEvent(type, energyCarrier = '') {
    return {
        preventDefault() {},
        dataTransfer: {
            getData() {
                return JSON.stringify({ source: 'palette', type, energyCarrier });
            }
        }
    };
}

function createReplay(state) {
    let notifications = [];
    const api = {
        addAsset: (type, zone, steuveType, energyCarrier, options = {}) => model.addAsset(
            state,
            type,
            zone,
            steuveType,
            energyCarrier,
            options,
            asset => topology.getMeterForAsset(state.assets, asset)
        ),
        getAssetMeta: () => model.assetMeta,
        getAdditionalMeters: () => topology.getMeters(state.assets),
        getAssetMeters: assetId => topology.getAssetMeters(state.assets, assetId),
        getMeterAssets: meterId => topology.getMeterMembers(state.assets, meterId),
        getMeterForAsset: asset => topology.getMeterForAsset(state.assets, asset),
        getMeterDescendantIds: meterId => topology.getMeterDescendantIds(state.assets, meterId),
        canAddMeterToAsset: asset => {
            if (!asset || asset.type === 'meter') return false;
            const ownMeters = topology.getAssetMeters(state.assets, asset.id);
            const attached = topology.getMeterForAsset(state.assets, asset);
            const shared = attached
                && topology.isMeterExpanded(state.assets, attached.id)
                && topology.getMeterMembers(state.assets, attached.id).length > 1;
            return ownMeters.length === 0 || Boolean(shared);
        },
        canBuildCascadeAfterMeter: meter => Boolean(meter && meter.type === 'meter' && meter.meterScope === 'base'),
        getMeterDropOptions: asset => {
            const attached = topology.getMeterForAsset(state.assets, asset);
            const shared = attached
                && topology.isMeterExpanded(state.assets, attached.id)
                && topology.getMeterMembers(state.assets, attached.id).length > 1;
            return shared
                ? { targetAssetId: asset.id, parentMeterId: attached.id, keepEmptyRail: true }
                : { targetAssetId: asset.id };
        },
        resolveDropZone: (zone, baseZone, targetAsset, targetMeter) => targetMeter?.zone || targetAsset?.zone || baseZone || zone,
        getBaseMeterZone: index => `parallel-${Number(index) || 0}`,
        getBaseChainChild: () => null,
        moveAssetBefore: (assetId, beforeId) => model.moveAssetBefore(state, assetId, beforeId),
        moveAssetAfter: (assetId, afterId) => model.moveAssetAfter(state, assetId, afterId),
        moveMeterSubtreeToZone: (meter, zone) => model.moveMeterSubtreeToZone(state, meter, zone),
        swapAssetPositions: (assetId, targetId) => model.swapAssetPositions(state, assetId, targetId),
        captureHistoryState: () => model.captureHistoryState(state),
        recordHistory: () => {},
        render: () => {},
        notify: message => notifications.push(message),
        openObjectModal: () => {}
    };
    const controller = dragDrop.createDragDropController({
        getState: () => state,
        getAssetMeta: () => model.assetMeta,
        api
    });
    return {
        controller,
        notifications,
        addPalette: (type, zone, targetAssetId = '', meterGroupTargetId = '') => controller.handleDrop(
            paletteEvent(type, type === 'generation' ? 'PV' : ''),
            zone,
            targetAssetId,
            meterGroupTargetId
        )
    };
}

function assertTreeIntegrity(state, zone) {
    const tree = topology.buildZoneMeterTree(state.assets, zone);
    const expected = state.assets.filter(asset => asset.type !== 'meter' && asset.zone === zone).map(asset => asset.id);
    const rendered = [];
    const visit = rail => {
        rendered.push(...(rail.assets || []).map(asset => asset.id));
        (rail.children || []).forEach(visit);
    };
    visit(tree);
    assert(rendered.length === expected.length, `${zone}: Replay darf keine Anlage verlieren`);
    assert(new Set(rendered).size === rendered.length, `${zone}: Replay darf keine Anlage doppelt darstellen`);
    expected.forEach(id => assert(rendered.includes(id), `${zone}: Replay-Anlage ${id} fehlt`));
    return tree;
}

// Szenario 1: Basiszähler, Anlage, eigener Zähler, zweite Anlage, danach
// Löschen der ersten Anlage. Das ist die häufigste Variante der gemeldeten
// „Zähler springt nach links/oben“-Fehler.
const commonState = model.createState();
const commonParent = model.addAsset(commonState, 'meter', 'single-main', '', '', {
    parentBaseMeterIndex: 0,
    keepEmptyRail: true
}, () => null);
const commonAssetA = model.addAsset(commonState, 'generation', 'single-main', '', 'PV', { meterId: commonParent.id });
const commonAssetB = model.addAsset(commonState, 'generation', 'single-main', '', 'PV', { meterId: commonParent.id });
const commonReplay = createReplay(commonState);
commonReplay.addPalette('meter', 'single-main', commonAssetA.id);
const commonChild = topology.getAssetMeters(commonState.assets, commonAssetA.id).at(-1);
assert(commonChild?.parentMeterId === commonParent.id, 'Replay muss den neuen Zähler an den bisherigen Messpunkt hängen');
commonReplay.addPalette('consumer', 'single-main', '', commonChild.id);
const commonSecond = commonState.assets.at(-1);
assert(commonSecond?.meterId === commonChild.id, 'Zweite Anlage muss beim Drop am Zielzähler bleiben');
let commonTree = assertTreeIntegrity(commonState, 'single-main');
const commonParentRail = commonTree.children.find(rail => rail.meterId === commonParent.id);
assert(commonParentRail?.children.some(rail => rail.meterId === commonChild.id), 'Erweiterter Unterzähler darf nicht in die Root-Schiene fallen');

// Derselbe Ablauf nach dem Entfernen des ursprünglichen Ziels. Der Zähler
// bleibt am stabilen Rail-Anker und die verbleibende Anlage bleibt zugeordnet.
const removeButton = { dataset: { mkRemoveAsset: commonAssetA.id } };
commonReplay.controller.handleCanvasClick({
    target: { closest: selector => selector === '[data-mk-remove-asset]' ? removeButton : null }
});
commonTree = assertTreeIntegrity(commonState, 'single-main');
const surviving = commonState.assets.find(asset => asset.id === commonSecond.id);
assert(surviving?.meterId === commonChild.id, 'Nach dem Löschen muss die verbleibende Anlage am Unterzähler bleiben');
assert(commonTree.children.some(rail => rail.meterId === commonParent.id), 'Der Elternzähler darf beim Löschen nicht verschwinden');
assert(commonReplay.notifications.length === 0, 'Gültige Replay-Aktionen dürfen keine Warnung erzeugen');

// Szenario 2: Parallelmessung. Beide Zweige bleiben getrennt, auch wenn ein
// Unterzähler im zweiten Zweig erweitert wird.
const parallelState = model.createState();
parallelState.mode = 'parallel';
const parallelParentA = model.addAsset(parallelState, 'meter', 'parallel-0', '', '', {
    parentBaseMeterIndex: 0,
    keepEmptyRail: true
}, () => null);
const parallelParentB = model.addAsset(parallelState, 'meter', 'parallel-1', '', '', {
    parentBaseMeterIndex: 1,
    keepEmptyRail: true
}, () => null);
model.addAsset(parallelState, 'generation', 'parallel-0', '', 'PV', { meterId: parallelParentA.id });
const parallelAssetB = model.addAsset(parallelState, 'generation', 'parallel-1', '', 'PV', { meterId: parallelParentB.id });
const parallelReplay = createReplay(parallelState);
parallelReplay.addPalette('meter', 'parallel-1', parallelAssetB.id);
const parallelChild = topology.getAssetMeters(parallelState.assets, parallelAssetB.id).at(-1);
parallelReplay.addPalette('generation', 'parallel-1', '', parallelChild.id);
assertTreeIntegrity(parallelState, 'parallel-0');
const parallelTree = assertTreeIntegrity(parallelState, 'parallel-1');
const parallelParentRail = parallelTree.children.find(rail => rail.meterId === parallelParentB.id);
assert(parallelParentRail?.children.some(rail => rail.meterId === parallelChild.id), 'Paralleler Unterzähler muss im eigenen Zweig bleiben');
assert(!parallelReplay.notifications.length, 'Parallele Replay-Aktionen dürfen keine Warnung erzeugen');

console.log('Messlogik-Replay-Test: OK (echte Drops, Erweiterung, Löschung, Parallelzweig)');
