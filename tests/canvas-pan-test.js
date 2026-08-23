'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const viewportText = fs.readFileSync(path.join(ROOT, 'js/messkonzept/viewport.js'), 'utf8');
const stylesText = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const requirementsText = fs.readFileSync(path.join(ROOT, 'docs/left-canvas-pan-anforderungen.md'), 'utf8');
const viewportDocsText = fs.readFileSync(path.join(ROOT, 'docs/messkonzept-viewport.md'), 'utf8');

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
assert(viewportText.includes('[data-mk-select-hak]') && viewportText.includes('isInteractiveCanvasTarget'), 'Der HAK muss als interaktives Objekt vom Pan-Handler ausgenommen bleiben.');
assert(!viewportText.includes('HAK_PAN_THRESHOLD') && !viewportText.includes('isHakPanCandidate') && !viewportText.includes('pending'), 'Der entfernte HAK-Pan darf keinen Sonderzustand mehr hinterlassen.');
assert(viewportText.includes('consumePanClickSuppression') && viewportText.includes('return false'), 'Die Interaktions-API muss nach dem entfernten HAK-Pan klicksicher kompatibel bleiben.');
assert(!viewportText.includes('ensurePanWorkspace') && !viewportText.includes('mk-canvas-pan-gutter-x') && !viewportText.includes('resetPanWorkspace'), 'Die Zeichenflächen-Geste darf keinen HAK-Arbeitsraum mehr aktivieren.');
assert(stylesText.includes('touch-action: none') && stylesText.includes('margin: var(--mk-annotation-gutter-top'), 'Die Zeichenfläche muss den separaten Infobox-Arbeitsraum verwenden.');
assert(/\.mk-canvas\s*\{[\s\S]*?max-height:\s*min\(70vh,\s*680px\);/.test(stylesText), 'Die Zeichenfläche muss als eigener, vertikal scrollbarer Arbeitsbereich begrenzt sein.');
assert(!stylesText.includes('mk-canvas-pan-gutter'), 'Veraltete Pan-Gutters dürfen keine Scrollfläche mehr erzeugen.');
assert(/\.mk-canvas\s*\{[\s\S]*?cursor:\s*default;/.test(stylesText), 'Die freie Zeichenfläche muss im Ruhezustand den normalen Pfeil zeigen.');
assert(/\.mk-meter-annotation-card\s*\{[\s\S]*?cursor:\s*grab;/.test(stylesText), 'Eine verschiebbare Infobox muss beim Darüberfahren als Greiffläche erkennbar sein.');
assert(/\.mk-meter-annotation-card\.is-dragging\s*\{[\s\S]*?cursor:\s*grabbing;/.test(stylesText), 'Während des Verschiebens muss die Infobox die geschlossene Hand zeigen.');
assert(/\.mk-annotation-resize-handle[\s\S]*?cursor:\s*nwse-resize;/.test(stylesText), 'Der Größenanfasser muss seinen eigenen Cursor behalten.');
assert(/\.mk-hak-node\s*\{[\s\S]*?cursor:\s*pointer;/.test(stylesText), 'Der HAK muss als anklickbares Objekt und nicht als Greiffläche erscheinen.');
assert(stylesText.includes('.mk-canvas.is-panning') && stylesText.includes('cursor: grab'), 'Die Zeichenfläche muss den Pan-Zustand visuell anzeigen.');
assert(/linker\s+Maustaste/.test(requirementsText) && requirementsText.includes('Auswahl- und Drag-and-Drop-Funktion')
    && requirementsText.includes('HAK') && requirementsText.includes('kann nicht als Pan-Griff'), 'Akzeptanzkriterien für Linksklick-Pan ohne HAK-Sondergriff fehlen.');
assert(viewportDocsText.includes('Der HAK bleibt ein reines Auswahlobjekt')
    && !viewportDocsText.includes('HAK dient zusätzlich als sicherer Pan-Griff'), 'Die Viewport-Dokumentation darf den HAK nicht mehr als Pan-Griff beschreiben.');

console.log('Canvas-Pan-Test: OK');
