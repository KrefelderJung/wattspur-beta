'use strict';

/*
 * Regressionen für verschachtelte Zusatz-Zähler.
 *
 * Der kritische Fehler war: Ein Zähler mit zunächst nur einer Anlage wurde
 * beim nächsten Drop als Root-Schiene gerendert. Die Tests sichern deshalb
 * sowohl den Singleton-Zustand als auch die Erweiterung zur Unter-Schiene
 * und die Parallelmessung ab.
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

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function countId(rail, id) {
    const own = (rail.assets || []).filter(asset => asset.id === id).length;
    return own + (rail.children || []).reduce((sum, child) => sum + countId(child, id), 0);
}

// Ein anlagenbezogener Zähler mit genau einer Anlage bleibt inline. Wichtig
// ist, dass die Anlage trotzdem dem Elternzähler zugeordnet bleibt und nicht
// in die Root-Schiene teleportiert.
const singletonState = model.createState();
const parentMeter = model.addAsset(singletonState, 'meter', 'single-main', '', '', {
    parentBaseMeterIndex: 0,
    keepEmptyRail: true
}, () => null);
const parentAsset = model.addAsset(singletonState, 'generation', 'single-main', '', 'PV', {
    meterId: parentMeter.id
});
const childMeter = model.addAsset(singletonState, 'meter', 'single-main', '', '', {
    targetAssetId: parentAsset.id,
    parentMeterId: parentMeter.id,
    keepEmptyRail: true
}, () => parentMeter);

assert(childMeter.parentMeterId === parentMeter.id, 'Singleton-Unterzähler muss seinen Elternzähler behalten');
assert(parentAsset.meterId === childMeter.id, 'Zielanlage muss auf den unmittelbar vorgeschalteten Zähler zeigen');
assert(
    topology.getDisplayParentMeterId(singletonState.assets, parentAsset) === parentMeter.id,
    'Eine noch nicht aufgeklappte Unterstufe darf nicht in die Root-Schiene teleportieren'
);
const singletonTree = topology.buildZoneMeterTree(singletonState.assets, 'single-main');
const singletonParentRail = singletonTree.children.find(rail => rail.meterId === parentMeter.id);
assert(singletonParentRail, 'Elternzähler fehlt im Singleton-Baum');
assert(singletonParentRail.assets.some(asset => asset.id === parentAsset.id), 'Singleton-Zielanlage muss im Eltern-Rail bleiben');
assert(!singletonParentRail.children.some(child => child.meterId === childMeter.id), 'Einzelanlage darf noch keine Unter-Sammelschiene erzwingen');

// Eine zweite Anlage erweitert denselben Zähler. Erst jetzt wird eine echte
// Unter-Rail aufgebaut. Die beiden Anlagen dürfen weder doppelt noch im Root
// erscheinen.
const secondAsset = model.addAsset(singletonState, 'consumer', 'single-main', '', '', {
    meterId: childMeter.id
});
const expandedTree = topology.buildZoneMeterTree(singletonState.assets, 'single-main');
const expandedParent = expandedTree.children.find(rail => rail.meterId === parentMeter.id);
const expandedChild = expandedParent?.children.find(rail => rail.meterId === childMeter.id);
assert(expandedChild, 'Zähler mit zwei Anlagen muss als Unter-Sammelschiene erscheinen');
assert(expandedChild.assets.map(asset => asset.id).sort().join(',') === [parentAsset.id, secondAsset.id].sort().join(','), 'Unter-Sammelschiene muss beide Anlagen enthalten');
assert(!expandedParent.assets.some(asset => asset.id === parentAsset.id), 'Zielanlage darf nach Expansion nicht doppelt im Eltern-Rail erscheinen');
assert(countId(expandedTree, parentAsset.id) === 1, 'Zielanlage darf im Baum nur einmal vorkommen');

// Leere Unter-Rails bleiben als fachlicher Knoten erhalten, wenn sie bewusst
// mit keepEmptyRail markiert wurden.
const emptyState = model.createState();
const emptyParent = model.addAsset(emptyState, 'meter', 'single-main', '', '', {
    parentBaseMeterIndex: 0,
    keepEmptyRail: true
}, () => null);
const emptyTarget = model.addAsset(emptyState, 'generation', 'single-main', '', 'PV', {
    meterId: emptyParent.id
});
const emptyChild = model.addAsset(emptyState, 'meter', 'single-main', '', '', {
    targetAssetId: emptyTarget.id,
    parentMeterId: emptyParent.id,
    keepEmptyRail: true
}, () => emptyParent);
emptyState.assets = emptyState.assets.filter(asset => asset.id !== emptyTarget.id);
const emptyTree = topology.buildZoneMeterTree(emptyState.assets, 'single-main');
const emptyParentRail = emptyTree.children.find(rail => rail.meterId === emptyParent.id);
assert(emptyParentRail?.children.some(rail => rail.meterId === emptyChild.id), 'Leere Unter-Rail muss als Knoten erhalten bleiben');

// Parallelzweige müssen dieselbe Hierarchieregel benutzen. Ein tieferer
// Zähler in parallel-1 darf nie in parallel-0 oder in die Root-Schiene fallen.
const parallelState = model.createState();
parallelState.mode = 'parallel';
const parallelParent = model.addAsset(parallelState, 'meter', 'parallel-1', '', '', {
    parentBaseMeterIndex: 1,
    keepEmptyRail: true
}, () => null);
const parallelTarget = model.addAsset(parallelState, 'generation', 'parallel-1', '', 'PV', {
    meterId: parallelParent.id
});
const parallelChild = model.addAsset(parallelState, 'meter', 'parallel-1', '', '', {
    targetAssetId: parallelTarget.id,
    parentMeterId: parallelParent.id,
    keepEmptyRail: true
}, () => parallelParent);
const parallelSecond = model.addAsset(parallelState, 'generation', 'parallel-1', '', 'PV', {
    meterId: parallelChild.id
});
const parallelTree = topology.buildZoneMeterTree(parallelState.assets, 'parallel-1');
const parallelParentRail = parallelTree.children.find(rail => rail.meterId === parallelParent.id);
const parallelChildRail = parallelParentRail?.children.find(rail => rail.meterId === parallelChild.id);
assert(parallelChildRail, 'Parallelzweig muss verschachtelte Unter-Rails wie die gemeinsame Messung aufbauen');
assert(parallelChildRail.assets.length === 2, 'Parallel-Unter-Rail muss beide zugeordneten Anlagen enthalten');
assert(parallelSecond.zone === 'parallel-1' && parallelTarget.zone === 'parallel-1', 'Parallelzweig muss seine Anlagen im eigenen Messbereich halten');

console.log('Zähler-Hierarchie-Regressionstest: OK (Singleton, Expansion, leere Rail, Parallelzweig)');
