'use strict';

/*
 * Regressionstest für die verschiebbaren Zählerangaben.
 *
 * Die Anzeige ist bewusst eine eigene Schicht. Dieser Test stellt sicher, dass
 * sie nicht wieder in die Topologie- oder PDF-Logik hineinwächst und dass die
 * wichtigsten Bedien- und Exportverträge erhalten bleiben.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const failures = [];
const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

const annotation = read('js/messkonzept/annotations.js');
const model = read('js/messkonzept/model.js');
const canvasRenderer = read('js/messkonzept/canvas-renderer.js');
const exportModule = read('js/messkonzept/export.js');
const styles = read('styles.css');
const index = read('index.html');
const requirements = read('docs/meter-annotation-blocks-anforderungen.md');

assert(annotation.includes('global.WattspurMesskonzeptAnnotations'), 'öffentliche Annotations-Schnittstelle fehlt');
assert(annotation.includes('createAnnotationController'), 'Annotations-Controller fehlt');
assert(annotation.includes('meterAnnotationPositions'), 'relative Kartenpositionen werden nicht gespeichert');
assert(annotation.includes('pointerdown') && annotation.includes('pointermove') && annotation.includes('pointerup'), 'Pointer-Drag-Vertrag fehlt');
assert(annotation.includes('ArrowLeft') && annotation.includes('ArrowRight') && annotation.includes('ArrowUp') && annotation.includes('ArrowDown'), 'Tastatur-Nudge-Vertrag fehlt');
assert(annotation.includes('record.visible && record.entries.length'), 'leere oder ausgeblendete Infoboxen müssen ausgeblendet werden');
assert(styles.includes('mk-meter-annotation-connector') && styles.includes('stroke-dasharray'), 'gestrichelte Bezugslinie fehlt');
assert(annotation.includes('data-mk-meter-annotation') && annotation.includes('mk-meter-annotation-values'), 'Kartenanker fehlen');
assert(!annotation.includes('CSS.escape'), 'Annotationsmodul darf nicht von CSS.escape als globaler Abhängigkeit abhängen');

assert(model.includes('meterAnnotationPositions: {}'), 'Initialzustand für Kartenpositionen fehlt');
assert(model.includes('meterAnnotationPositions: clone(currentState.meterAnnotationPositions || {})'), 'Kartenpositionen werden nicht historisiert');
assert(model.includes('currentState.meterAnnotationPositions = {}'), 'Reset entfernt alte Kartenpositionen nicht');
assert(canvasRenderer.includes('mk-meter-annotation-layer') && canvasRenderer.includes('mk-meter-annotation-connectors'), 'Annotationslayer fehlt in der Zeichenfläche');
assert(index.includes('js/messkonzept/annotations.js'), 'Annotationsmodul wird nicht geladen');
assert(styles.includes('.mk-meter-annotation-card') && styles.includes('.mk-meter-annotation-connector'), 'Annotationskarten sind nicht gestaltet');
assert(styles.includes('body.mk-printing .mk-meter-annotation-card'), 'PDF-Darstellung der Annotationskarten fehlt');
assert(styles.includes('background: transparent;') && styles.includes('width: fit-content;'), 'Infokarten müssen transparent und in ihrer Breite inhaltsabhängig sein');
assert(styles.includes('overflow-wrap: anywhere;'), 'Lange Zählerwerte müssen innerhalb der Infokarte umbrechen können');
assert(annotation.includes('const above = targetPoint.y - cardHeight - 18;') && annotation.includes('const y = above >= 6 ? above'), 'Infokarten starten nicht bevorzugt oberhalb des Zählers');
assert(exportModule.includes('mk-print-canvas-stage'), 'PDF-Export nutzt die Zeichenflächenkopie');

[
    'Zählerangaben',
    'verschieb',
    'gestrichelt',
    'PDF',
    'Akzeptanzkriterien'
].forEach(term => assert(requirements.toLocaleLowerCase('de-DE').includes(term.toLocaleLowerCase('de-DE')), `Anforderungsdokument: ${term} fehlt`));

if (failures.length) {
    console.error(`Zähler-Infokarten-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('Zähler-Infokarten-Test: OK');
}
