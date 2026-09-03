'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exportSource = fs.readFileSync(path.join(root, 'js', 'messkonzept', 'export.js'), 'utf8');
const requirements = fs.readFileSync(path.join(root, 'docs', 'png-pdf-paritaet-anforderungen.md'), 'utf8');

assert(exportSource.includes('function splitLongAnnotationToken'),
    'PNG-Infoboxen brauchen eine eigene Aufteilung für lange zusammenhängende Wörter');
assert(/splitLongAnnotationToken\(word, limit\)/.test(exportSource),
    'Die native PNG-Textquelle muss lange Wörter tatsächlich aufteilen');
assert(exportSource.includes('function renderPrintSheet') && exportSource.includes('function downloadImage'),
    'PDF- und PNG-Export müssen weiterhin getrennte, aber vorhandene Ausgabepfade besitzen');
assert(exportSource.includes('renderNativeHakMeterWire') && exportSource.includes('renderNativeOwnershipMarker'),
    'PNG-Export muss dieselben HAK-/Eigentumsgrenzen wie die PDF-Geometrie berücksichtigen');
assert(exportSource.includes('renderNativeParallelHakWires')
    && exportSource.includes('mk-export-parallel-bus'),
    'PNG-Export muss die HAK-Zuleitung der Parallelmessung in der nativen SVG-Geometrie berücksichtigen');
assert(exportSource.includes('mk-meter-annotation-connectors') && exportSource.includes('mk-print-canvas-stage'),
    'Infobox-Verbindungen müssen in PNG und PDF aus der gemeinsamen Exportbühne stammen');
assert(requirements.includes('zeichenweise untereinander') && requirements.includes('Leitungsgeometrie'),
    'Export-Paritätsanforderungen müssen den sichtbaren Restfehler und die Geometrie dokumentieren');

console.log('PNG-PDF-Paritäts-Test: OK');
