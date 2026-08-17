'use strict';

/*
 * Messlogik-Test: prueft nicht nur einzelne Funktionen, sondern die
 * fachlichen Invarianten nach mehreren aufeinanderfolgenden Aktionen.
 * Genau diese Kette hat die bisherigen Fehler sichtbar gemacht:
 * anlegen -> Unterzaehler bilden -> weitere Anlage zuordnen -> erste Anlage
 * loeschen -> erneut rendern.
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
const geometry = loadModule('messkonzept-geometry.js', 'WattspurMesskonzeptGeometry');
const topology = loadModule('messkonzept-topology.js', 'WattspurMesskonzeptTopology');
const dragDrop = loadModule('js/messkonzept/drag-drop.js', 'WattspurMesskonzeptDragDrop');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertThrows(callback, message) {
    try {
        callback();
    } catch {
        return;
    }
    throw new Error(message);
}

// Geometrie-Invariante fuer den aktuellen Schoenheits-/Sicherheitsabstand:
// Der Abstand zwischen oberer Anlagenreihe und Unterzaehler muss groesser als
// die sichtbare X-Sicherheitszone sein. Sonst kann das Loeschsymbol des
// Unterzaehlers in die erste Anlagenkarte ragen.
assert(
    geometry.constants.meterRailTopGapPx >= 20
        && geometry.constants.meterRailTopGapPx > geometry.constants.meterRemoveButtonClearancePx,
    'Der Unterzaehler braucht einen ausreichenden Abstand zur oberen Anlagenreihe'
);

function collectRails(rail, result = []) {
    if (rail?.meterId) result.push(rail.meterId);
    (rail?.children || []).forEach(child => collectRails(child, result));
    return result;
}

/*
 * Das ist der eigentliche Messlogik-Spickzettel als ausführbarer Test:
 *
 * 1. IDs sind eindeutig.
 * 2. Jeder Anlagen-Messpunkt zeigt auf einen vorhandenen Zähler im selben
 *    Messbereich.
 * 3. Elternzähler existieren, liegen im selben Bereich und bilden keinen
 *    Zyklus.
 * 4. Die Topologie rendert jede Anlage genau einmal.
 * 5. Jeder erweiterte Zähler erscheint genau einmal als Rail.
 */
function validateMeasurementState(assets, zoneList = null) {
    const ids = assets.map(asset => asset.id);
    assert(new Set(ids).size === ids.length, 'IDs dürfen nicht doppelt vergeben werden');

    const meters = assets.filter(asset => asset.type === 'meter');
    const meterById = new Map(meters.map(meter => [meter.id, meter]));
    assets.filter(asset => asset.type !== 'meter').forEach(asset => {
        if (!asset.meterId) return;
        const meter = meterById.get(asset.meterId);
        assert(meter, `${asset.id}: meterId verweist auf keinen vorhandenen Zähler`);
        assert(meter.zone === asset.zone, `${asset.id}: Anlage und Zähler liegen in unterschiedlichen Messbereichen`);
    });

    meters.forEach(meter => {
        if (meter.targetAssetId) {
            const target = assets.find(asset => asset.id === meter.targetAssetId);
            assert(target && target.type !== 'meter', `${meter.id}: targetAssetId muss auf eine Anlage zeigen`);
            assert(target.zone === meter.zone, `${meter.id}: Zielanlage und Zähler liegen in unterschiedlichen Messbereichen`);
            assert(meter.meterScope === 'asset', `${meter.id}: Anlagenzähler muss meterScope=asset behalten`);
        }

        const seen = new Set([meter.id]);
        let parentId = meter.parentMeterId || '';
        while (parentId) {
            assert(!seen.has(parentId), `${meter.id}: Zählerhierarchie enthält einen Zyklus`);
            seen.add(parentId);
            const parent = meterById.get(parentId);
            assert(parent, `${meter.id}: parentMeterId verweist auf keinen vorhandenen Zähler`);
            assert(parent.zone === meter.zone, `${meter.id}: Elternzähler liegt in einem anderen Messbereich`);
            parentId = parent.parentMeterId || '';
        }
    });

    const zones = zoneList || [...new Set(assets.map(asset => asset.zone).filter(Boolean))];
    zones.forEach(zone => {
        const tree = topology.buildZoneMeterTree(assets, zone);
        const renderedAssets = [];
        const visit = rail => {
            renderedAssets.push(...(rail.assets || []).map(asset => asset.id));
            (rail.children || []).forEach(visit);
        };
        visit(tree);
        const expectedAssets = assets.filter(asset => asset.type !== 'meter' && asset.zone === zone).map(asset => asset.id);
        assert(renderedAssets.length === expectedAssets.length, `${zone}: Anzahl gerenderter Anlagen stimmt nicht`);
        assert(new Set(renderedAssets).size === renderedAssets.length, `${zone}: Eine Anlage würde doppelt gerendert`);
        expectedAssets.forEach(id => assert(renderedAssets.includes(id), `${zone}: Anlage ${id} fehlt im Zählerbaum`));

        const renderedMeters = collectRails(tree);
        meters.filter(meter => meter.zone === zone && topology.isMeterExpanded(assets, meter.id)).forEach(meter => {
            assert(renderedMeters.filter(id => id === meter.id).length === 1, `${meter.id}: erweiterter Zähler erscheint nicht genau einmal als Rail`);
        });
    });
}

// Gemeinsame Messung: verschachtelter Zähler, zweite Anlage, Löschung des
// ersten Ziels und danach erneut eine Erweiterung.
const state = model.createState();
const z2 = model.addAsset(state, 'meter', 'single-main', '', '', {
    parentBaseMeterIndex: 0,
    keepEmptyRail: true
}, () => null);
const rootAsset = model.addAsset(state, 'generation', 'single-main', '', 'PV');
const firstTarget = model.addAsset(state, 'generation', 'single-main', '', 'PV');
const z5 = model.addAsset(state, 'meter', 'single-main', '', '', {
    targetAssetId: firstTarget.id,
    parentMeterId: z2.id,
    keepEmptyRail: true
}, () => null);
model.addAsset(state, 'generation', 'single-main', '', 'PV', { meterId: z5.id });
model.addAsset(state, 'generation', 'single-main', '', 'PV', { meterId: z5.id });
validateMeasurementState(state.assets);

const removeButton = { dataset: { mkRemoveAsset: firstTarget.id } };
const controller = dragDrop.createDragDropController({
    getState: () => state,
    api: {
        getAdditionalMeters: () => state.assets.filter(asset => asset.type === 'meter'),
        getMeterAssets: meterId => state.assets.filter(asset => asset.type !== 'meter' && asset.meterId === meterId),
        captureHistoryState: () => JSON.stringify(state.assets),
        recordHistory: () => {},
        render: () => {}
    }
});
controller.handleCanvasClick({
    target: { closest: selector => selector === '[data-mk-remove-asset]' ? removeButton : null }
});
validateMeasurementState(state.assets);
const remainingZ5 = state.assets.find(asset => asset.id === z5.id);
assert(remainingZ5?.meterScope === 'asset', 'Nach Zielanlagen-Löschung darf der Unterzähler nicht in die Hauptkaskade fallen');
assert(Number.isFinite(Number(remainingZ5?.railAnchorOrder)), 'Nach Zielanlagen-Löschung muss der Rail-Anker erhalten bleiben');
assert(state.assets.some(asset => asset.id === rootAsset.id), 'Unbeteiligte Anlagen dürfen beim Löschen nicht verschwinden');

// Parallelmessung: beide Zweige bleiben getrennt und werden nicht durch die
// Topologie des jeweils anderen Zweigs verknüpft.
const parallel = model.createState();
parallel.mode = 'parallel';
const parallelMeterA = model.addAsset(parallel, 'meter', 'parallel-0', '', '', {
    parentBaseMeterIndex: 0,
    keepEmptyRail: true
}, () => null);
const parallelMeterB = model.addAsset(parallel, 'meter', 'parallel-1', '', '', {
    parentBaseMeterIndex: 1,
    keepEmptyRail: true
}, () => null);
model.addAsset(parallel, 'consumer', 'parallel-0', '', '', { meterId: parallelMeterA.id });
model.addAsset(parallel, 'generation', 'parallel-1', '', 'PV', { meterId: parallelMeterB.id });
validateMeasurementState(parallel.assets, ['parallel-0', 'parallel-1']);
assert(parallelMeterA.zone !== parallelMeterB.zone, 'Parallele Basiszähler müssen in getrennten Messbereichen bleiben');

// Der Test soll auch verhindern, dass spätere Vereinfachungen den Zyklus-
// Schutz aus der Zählerhierarchie entfernen.
const cycle = [
    { id: 'za', type: 'meter', zone: 'single-main', meterScope: 'base', parentMeterId: 'zb' },
    { id: 'zb', type: 'meter', zone: 'single-main', meterScope: 'base', parentMeterId: 'za' }
];
assertThrows(() => validateMeasurementState(cycle), 'Ein Zählerzyklus muss als Fehler erkannt werden');

console.log('Messlogik-Invarianten-Test: OK (Zählerbaum, Löschfolge, Parallelzweige und Zyklenschutz)');
