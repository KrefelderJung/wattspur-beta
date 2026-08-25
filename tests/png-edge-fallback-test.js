'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exportSource = fs.readFileSync(path.join(root, 'js', 'messkonzept', 'export.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const workerSource = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

assert(exportSource.includes("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)"),
    'PNG-Export muss neben der Blob-Quelle eine lokale SVG-Data-URL als Edge-Fallback anbieten');
assert(exportSource.includes('inlineOnlySvg') && exportSource.includes('safeCss'),
    'Der PNG-Export muss für file:// einen CSS-freien SVG-Fallback anbieten');
assert(exportSource.includes('function renderNativeCards') && exportSource.includes('const nativeSvg'),
    'Der PNG-Export muss für lokale Edge-Seiten einen reinen SVG-Fallback ohne foreignObject besitzen');
assert(exportSource.includes('function renderNativeChildCard') && exportSource.includes('semanticFill'),
    'Der native SVG-Fallback muss sichtbare HAK-, Zähler- und Objektkarten auch im einfachen Modus zeichnen');
assert(exportSource.includes('function renderNativeHakMeterWire') && exportSource.includes('mk-export-hak-meter-wire'),
    'Der native SVG-Fallback muss die Leitung zwischen HAK und erstem Zähler mitzeichnen');
assert(exportSource.includes("querySelector?.('svg,.mk-battery-symbol,.mk-fan-symbol')"),
    'Native Objekt-Icons müssen ihre tatsächliche Glyphengröße statt der Kartenbreite verwenden');
assert(exportSource.includes('nativeSource') && exportSource.includes('svgSources'),
    'Der native SVG-Fallback muss lokal und online verfügbar sein');
assert(exportSource.includes('nativeSvgBlob') && exportSource.includes('nativeSvgUrl'),
    'Der native SVG-Fallback muss zusätzlich als Blob-URL verfügbar sein');
assert(exportSource.includes('urlApi.revokeObjectURL(nativeSvgUrl)'),
    'Die native SVG-Blob-URL muss nach dem Export freigegeben werden');
assert(exportSource.includes('Eine Canvas bleibt nach einem SecurityError dauerhaft') && exportSource.includes("const imageCanvas = doc.createElement('canvas');"),
    'Jede PNG-Quelle muss eine frische Canvas erhalten, damit ein tainted-canvas-Fehler den Fallback nicht blockiert');
assert(exportSource.includes('Die Bildquelle hat nicht rechtzeitig geladen') && exportSource.includes('win.setTimeout'),
    'PNG-Quellen müssen ein Ladezeitlimit besitzen, damit ein Browser ohne load/error-Ereignis den Export nicht aufhängt');
assert(/const svgSources = \[[\s\S]*?nativeSvgUrl,[\s\S]*?nativeSource,/.test(exportSource),
    'Der fremdobjektfreie native SVG-Fallback muss vor der foreignObject-Quelle versucht werden');
assert(exportSource.includes("typeof canvasElement.toBlob === 'function'"),
    'PNG-Export muss toBlob sicher prüfen');
assert(exportSource.includes("canvasElement.toDataURL('image/png')"),
    'PNG-Export muss einen Canvas-Data-URL-Fallback besitzen');
assert(exportSource.includes('else fallback()'),
    'Ein fehlendes toBlob-Ergebnis muss ebenfalls auf den Data-URL-Fallback wechseln');
assert(exportSource.includes('context.setTransform?.(1, 0, 0, 1, 0, 0)'),
    'PNG-Export muss beim zweiten Render-Versuch die Canvas-Transformation zurücksetzen');
assert(/export\.js\?v=26/.test(indexSource),
    'Der PNG-Export muss mit dem aktualisierten Cache-Buster geladen werden');
assert(workerSource.includes('2026.08.25-beta.383'),
    'Der Service Worker muss den Edge-kompatiblen Exportstand cachen');

console.log('PNG-Edge-Fallback-Test: OK');
