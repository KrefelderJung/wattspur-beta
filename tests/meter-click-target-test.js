'use strict';

/* Regressionstest: Basis-, Sammelschienen- und Inline-Zähler müssen auch in
 * komplexen Zeichnungen über den rein visuellen Ebenen anklickbar bleiben. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'js/messkonzept/render.js'), 'utf8');
const assetDisplay = fs.readFileSync(path.join(ROOT, 'js/messkonzept/asset-display.js'), 'utf8');
const canvasRenderer = fs.readFileSync(path.join(ROOT, 'js/messkonzept/canvas-renderer.js'), 'utf8');
const interaction = fs.readFileSync(path.join(ROOT, 'js/messkonzept/interaction.js'), 'utf8');
const dragDrop = fs.readFileSync(path.join(ROOT, 'js/messkonzept/drag-drop.js'), 'utf8');
const viewport = fs.readFileSync(path.join(ROOT, 'js/messkonzept/viewport.js'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(/\.mk-meter-node\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*4;/.test(styles), 'Basiszähler müssen über den visuellen Leitungs- und Kartenebenen liegen');
assert(/\.mk-meter-layout\[data-mk-base-meter-target\]\s*\{[\s\S]*?z-index:\s*4;/.test(styles), 'Der gesamte Basiszähler-Anker braucht eine klickbare Vordergrundebene');
assert(/\.mk-rail-meter-node\s*\{[\s\S]*?z-index:\s*4;/.test(styles), 'Sammelschienen-Zähler müssen über benachbarten Anlagenkarten liegen');
assert(/\.mk-inline-meter-wrap\s*\{[\s\S]*?z-index:\s*4;/.test(styles), 'Inline-Zähler müssen auch bei Anlagenästen anklickbar bleiben');
assert(/\.mk-meter-rail\.meter-group-rail\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*4;[\s\S]*?isolation:\s*isolate;/.test(styles), 'Verschachtelte Sammelschienen müssen als klickbare Vordergrundebene isoliert werden');
assert(/\.mk-zone-assets::before\s*\{[\s\S]*?pointer-events:\s*none;/.test(styles), 'Dekorative Buslinien dürfen keine Zählerklicks abfangen');
assert(/\.mk-zone-assets::after\s*\{[\s\S]*?pointer-events:\s*none;/.test(styles), 'Dekorative Stränge dürfen keine Zählerklicks abfangen');
assert(/event\.stopPropagation\(\);[\s\S]*?dataset\.mkMeterId/.test(interaction), 'Zählerauswahl muss vor überlagernden Canvas-Ereignissen priorisiert werden');
assert(renderer.includes('data-mk-select-meter="${getMeterDetailIndex(railMeter)}"') && renderer.includes('role="button" tabindex="0"'), 'Sammelschienen-Zähler müssen als Tastatur- und Klickziel gerendert werden');
assert(renderer.includes('data-mk-meter-id="${escapeHtml(railMeter.id)}"'), 'Sammelschienen-Zähler müssen ihre stabile Modell-ID im DOM tragen');
assert(assetDisplay.includes('data-mk-meter-id="${escapeHtml(meter.id)}"'), 'Inline-Zähler müssen ihre stabile Modell-ID im DOM tragen');
assert(canvasRenderer.includes('data-mk-select-meter="${index}"') && canvasRenderer.includes('role="button" tabindex="0"'), 'Basiszähler müssen als Tastatur- und Klickziel gerendert werden');
assert(canvasRenderer.includes('const normalizedSelection') && canvasRenderer.includes('selection.id') && canvasRenderer.includes('renderObjectEditor(normalizedSelection)'), 'Der Objekteditor muss Zusatz-Zähler primär über die stabile ID auflösen');
assert(interaction.includes('id: target.dataset.mkMeterId || \'\'') && dragDrop.includes('id: meter.dataset.mkMeterId || \'\''), 'Maus- und Tastaturpfad müssen die stabile Zähler-ID weiterreichen');
assert(viewport.includes('[data-mk-select-meter]') && viewport.includes('.mk-generation-meter'), 'Die Zeichenflächenbewegung darf Klicks auf Hauptstrang- und Sammelschienenzähler nicht abfangen');

// Laufzeittest: Ein sichtbarer Zusatz-Zähler wird über seine Modell-ID
// geöffnet, auch wenn der alte Positionsindex auf einen anderen Zähler zeigt.
const state = { assets: [], selectedObject: null };
const modal = {
    classList: { remove() {} },
    setAttribute() {}
};
const content = {
    innerHTML: '',
    querySelector() { return null; }
};
const title = { textContent: '' };
const context = {
    window: {
        requestAnimationFrame(callback) { callback(() => {}); }
    }
};
vm.runInNewContext(canvasRenderer, context);
const rendererApi = context.window.WattspurMesskonzeptCanvasRenderer.createCanvasRenderer({
    state,
    getState: () => state,
    getElements: () => ({ objectModal: modal, objectModalContent: content, objectModalTitle: title }),
    getAdditionalMeters: () => [{ id: 'meter-c3' }],
    getMeterDetailIndex: meter => meter?.id === 'meter-c3' ? 2 : 0,
    getMeterLabel: meter => meter?.id === 'meter-c3' ? 'Z3' : '',
    getMeterDetails: () => ({}),
    meterDetailFields: [{ key: 'meterNumber', label: 'Zählernummer', type: 'text' }],
    escapeHtml: value => String(value ?? '')
});
rendererApi.openObjectModal({ kind: 'meter', id: 'meter-c3', index: 0 });
assert(state.selectedObject?.index === 2, 'Stabile Zähler-ID muss den korrekten Detailindex setzen');
assert(content.innerHTML.includes('data-mk-meter-index="2"'), 'Der Editor muss die Details des identifizierten Zählers öffnen');
assert(title.textContent === 'Z3 · Zähler', 'Der Editor muss den identifizierten Zähler korrekt beschriften');

console.log('Zähler-Klickziel-Test: OK');
