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
assert(exportSource.includes("typeof canvasElement.toBlob === 'function'"),
    'PNG-Export muss toBlob sicher prüfen');
assert(exportSource.includes("canvasElement.toDataURL('image/png')"),
    'PNG-Export muss einen Canvas-Data-URL-Fallback besitzen');
assert(exportSource.includes('else fallback()'),
    'Ein fehlendes toBlob-Ergebnis muss ebenfalls auf den Data-URL-Fallback wechseln');
assert(exportSource.includes('context.setTransform?.(1, 0, 0, 1, 0, 0)'),
    'PNG-Export muss beim zweiten Render-Versuch die Canvas-Transformation zurücksetzen');
assert(/export\.js\?v=17/.test(indexSource),
    'Der PNG-Export muss mit dem aktualisierten Cache-Buster geladen werden');
assert(/APP_VERSION\s*=\s*['"]2026\.08.25-beta\.374['"]/.test(workerSource),
    'Der Service Worker muss den Edge-kompatiblen Exportstand cachen');

console.log('PNG-Edge-Fallback-Test: OK');