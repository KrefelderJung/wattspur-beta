'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const viewportText = fs.readFileSync(path.join(ROOT, 'js/messkonzept/viewport.js'), 'utf8');
const stylesText = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const requirementsText = fs.readFileSync(path.join(ROOT, 'docs/left-canvas-pan-anforderungen.md'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(viewportText.includes('isPrimaryCanvasPan'), 'Die linke Maustaste muss auf dem Zeichenflächen-Hintergrund als Pan-Geste erkannt werden.');
assert(viewportText.includes('isInteractiveCanvasTarget'), 'Interaktive Objekte müssen von der Hintergrund-Geste ausgenommen werden.');
assert(viewportText.includes("'.mk-asset-card, .mk-meter-node, .mk-generation-meter")
    && viewportText.includes('[data-mk-select-meter]')
    && viewportText.includes('[data-mk-select-asset]'), 'Objekt- und Zählerziele dürfen nicht vom Pan-Handler übernommen werden.');
assert(viewportText.includes('requiresSpace'), 'Die bisherige Leertaste-plus-Maus-Geste muss als kompatibler Modus erhalten bleiben.');
assert(viewportText.includes('canvas.scrollLeft') && viewportText.includes('canvas.scrollTop'), 'Die Geste muss beide Scrollachsen bewegen.');
assert(stylesText.includes('.mk-canvas.is-panning') && stylesText.includes('cursor: grab'), 'Die Zeichenfläche muss den Pan-Zustand visuell anzeigen.');
assert(requirementsText.includes('linker Maustaste') && requirementsText.includes('Auswahl- und Drag-and-Drop-Funktion'), 'Akzeptanzkriterien für Linksklick-Pan und Objektinteraktion fehlen.');

console.log('Canvas-Pan-Test: OK');
