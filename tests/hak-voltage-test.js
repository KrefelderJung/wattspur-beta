'use strict';

/* Browserfreier Regressionstest für HAK-Auswahl und Trafo-Darstellung. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const stylesText = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
['js/messkonzept/model.js', 'js/messkonzept/export.js', 'js/messkonzept/canvas-renderer.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
});

const model = context.window.WattspurMesskonzeptModel;
const canvasRenderer = context.window.WattspurMesskonzeptCanvasRenderer.createCanvasRenderer({
    getState: () => state,
    hakVoltageLevels: model.hakVoltageLevels,
    getHakVoltageLevel: () => model.getHakVoltageLevel(state)
});
const exporter = context.window.WattspurMesskonzeptExport.createExporter({
    getState: () => state,
    escapeHtml: value => String(value ?? '')
});

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const state = model.createState();
assert(model.getHakVoltageLevel(state) === 'low', 'Neue Konzepte müssen mit Niederspannung und HAK starten.');
assert(model.hakVoltageLevels.map(option => option.value).join('|') === 'low|medium', 'Die Spannungsebene muss genau Niederspannung und Mittelspannung anbieten.');

const firstSnapshot = model.captureHistoryState(state);
assert(canvasRenderer.renderHakNode().includes('HAK') && canvasRenderer.renderHakNode().includes('data-mk-select-hak'), 'Niederspannung muss als klickbarer HAK gerendert werden.');
model.setHakVoltageLevel(state, 'medium');
assert(state.hak.voltageLevel === 'medium', 'Mittelspannung muss im Zustand gespeichert werden.');
assert(model.getHakVoltageLevel(state) === 'medium', 'Die normalisierte HAK-Spannungsebene muss Mittelspannung liefern.');
const transformerMarkup = canvasRenderer.renderHakNode();
assert(transformerMarkup.includes('Trafo') && transformerMarkup.includes('mk-transformer-symbol') && !transformerMarkup.includes('<b>Trafo</b>') && (transformerMarkup.match(/<i>/g) || []).length === 2, 'Mittelspannung muss als reines Trafo-Symbol ohne rechteckige Zusatzbeschriftung gerendert werden.');
assert(transformerMarkup.includes('aria-hidden="true"'), 'Das Trafo-Symbol darf keine zusätzliche Beschriftung in der Vorlese-Reihenfolge erzeugen.');
assert(stylesText.includes('.mk-transformer-symbol::before') && stylesText.includes('.mk-transformer-symbol::after'), 'Das Trafo-Symbol muss obere und untere Anschlussstummel besitzen.');
assert(stylesText.includes('width: 1.28rem') && stylesText.includes('height: 1.28rem') && stylesText.includes('.mk-transformer-symbol i:last-child'), 'Die Trafowicklungen müssen als zwei größere, vertikal überlappende Ringe definiert sein.');
const transformerStyle = stylesText.match(/\.mk-hak-node--transformer\s*\{([\s\S]*?)\}/)?.[1] || '';
assert(transformerStyle.includes('align-items: center') && transformerStyle.includes('justify-content: center'), 'Der Trafo-Container muss zentriert bleiben, damit die Abgangsleitung auf derselben Achse wie die Strings liegt.');
assert(exporter.renderExportDetails().includes('Mittelspannung · Transformator-Darstellung'), 'Der Gesamtexport muss die gewählte Mittelspannung als Trafo-Darstellung ausweisen.');

const mediumSnapshot = model.captureHistoryState(state);
assert(mediumSnapshot.hak.voltageLevel === 'medium', 'Die HAK-Spannungsebene muss im Undo-Snapshot enthalten sein.');

model.restoreHistoryState(state, firstSnapshot);
assert(model.getHakVoltageLevel(state) === 'low', 'Undo auf den vorherigen Snapshot muss wieder den HAK herstellen.');
model.restoreHistoryState(state, mediumSnapshot);
assert(model.getHakVoltageLevel(state) === 'medium', 'Redo-Snapshot muss die Trafo-Auswahl wiederherstellen.');

model.setHakVoltageLevel(state, 'invalid');
assert(model.getHakVoltageLevel(state) === 'low', 'Unbekannte Spannungsebenen müssen sicher auf Niederspannung zurückfallen.');
model.reset(state);
assert(model.getHakVoltageLevel(state) === 'low', 'Ein Reset muss den HAK als Standard wiederherstellen.');

console.log('HAK-Spannungsebenen-Test: OK (Niederspannung, Mittelspannung, Undo/Redo und Reset geprüft)');
