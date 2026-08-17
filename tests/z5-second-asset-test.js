'use strict';

/*
 * Regressionstest für den Fehler „zweite Anlage an einem Unterzähler“.
 *
 * Der Fehler war besonders tückisch: Die Daten blieben zunächst korrekt,
 * aber die Layout-Aktualisierung brach beim ersten aufgeklappten Unter-Rail
 * mit einem ReferenceError ab. Danach wurden die Karten zwar noch angezeigt,
 * die Leitungen und Sammelschienen aber nicht mehr aufgebaut.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const topologySource = fs.readFileSync(path.join(ROOT, 'messkonzept-topology.js'), 'utf8');
const layoutSource = fs.readFileSync(path.join(ROOT, 'js/messkonzept/layout.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(topologySource, context, { filename: 'messkonzept-topology.js' });
const topology = context.window.WattspurMesskonzeptTopology;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const assets = [
    { id: 'ea-root', type: 'generation', zone: 'single-main', meterId: '' },
    { id: 'ea-z2-a', type: 'generation', zone: 'single-main', meterId: 'z2' },
    { id: 'ea-z2-b', type: 'generation', zone: 'single-main', meterId: 'z2' },
    { id: 'z2', type: 'meter', zone: 'single-main', meterScope: 'base', targetAssetId: '', parentMeterId: '' },
    // Z5 sitzt fachlich hinter Z2 und misst zunächst nur eine Anlage.
    { id: 'ea-z5-a', type: 'generation', zone: 'single-main', meterId: 'z5' },
    { id: 'z5', type: 'meter', zone: 'single-main', meterScope: 'asset', targetAssetId: 'ea-z5-a', parentMeterId: 'z2', keepEmptyRail: true },
    // Der Repro-Schritt: zweite Anlage an Z5.
    { id: 'ea-z5-b', type: 'generation', zone: 'single-main', meterId: 'z5' }
];

assert(topology.isMeterExpanded(assets, 'z5') === true, 'Z5 muss ab zwei Anlagen als eigener Unter-Rail expandiert werden');
assert(topology.getDisplayParentMeterId(assets, assets.find(asset => asset.id === 'ea-z5-a')) === 'z5', 'Erste Z5-Anlage muss im Z5-Rail bleiben');
assert(topology.getDisplayParentMeterId(assets, assets.find(asset => asset.id === 'ea-z5-b')) === 'z5', 'Zweite Z5-Anlage muss im Z5-Rail bleiben');
const tree = topology.buildZoneMeterTree(assets, 'single-main');
const z2Rail = tree.children.find(rail => rail.meterId === 'z2');
assert(z2Rail, 'Der Eltern-Rail Z2 muss erhalten bleiben');
assert(z2Rail.children.some(rail => rail.meterId === 'z5'), 'Z5 muss als Kind von Z2 gerendert werden, nicht als Root-Rail');
const z5Rail = z2Rail.children.find(rail => rail.meterId === 'z5');
assert(z5Rail.assets.length === 2, 'Der Z5-Rail muss beide Anlagen enthalten');

// Layout-Regression: Der Root-Anker muss im Scope der Rail-Kollisionsroutine
// gebunden sein. Ohne diese lokale Deklaration entsteht beim ersten expandierten
// Unter-Rail „rootAnchor is not defined“.
const applyStart = layoutSource.indexOf('const applyRailSiblingCollisionShifts = zone => {');
const railsStart = layoutSource.indexOf('const rails = [rootRail', applyStart);
const localRootAnchor = layoutSource.indexOf("const rootAnchor = zone.querySelector(':scope > .mk-zone-junction');", applyStart);
assert(applyStart >= 0 && localRootAnchor > applyStart && localRootAnchor < railsStart, 'Layout muss rootAnchor lokal in applyRailSiblingCollisionShifts binden');

console.log('Z5-Zweitanschluss-Regressionstest: OK (Topologie und Layout-Anker)');
