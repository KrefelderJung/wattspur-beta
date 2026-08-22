'use strict';

/* UI-Regressionstest für einheitliche, geometrieneutrale Drop-Trefferflächen. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const renderText = read('js/messkonzept/render.js');
const canvasRendererText = read('js/messkonzept/canvas-renderer.js');
const assetDisplayText = read('js/messkonzept/asset-display.js');
const dragDropText = read('js/messkonzept/drag-drop.js');
const stylesText = read('styles.css');
const requirementsText = read('docs/drop-ziel-trefferflaechen-anforderungen.md');

assert(renderText.includes('mk-drop-target-hitbox'), 'Anlagenkarten brauchen eine gemeinsame Drop-Trefferfläche');
assert(canvasRendererText.includes('mk-drop-target-hitbox'), 'Basiszähler brauchen eine gemeinsame Drop-Trefferfläche');
assert(assetDisplayText.includes('mk-meter-drop-hitbox'), 'Anlagenbezogene Zähler brauchen eine gemeinsame Drop-Trefferfläche');
assert(dragDropText.includes('setDragSurfaceActive(true)') && dragDropText.includes('setDragSurfaceActive(false)'), 'Trefferflächen dürfen nur während eines Ziehvorgangs aktiv sein');
assert(stylesText.includes('html.mk-dragging .mk-drop-target-hitbox') && stylesText.includes('pointer-events: auto'), 'Aktive Drop-Trefferflächen fehlen');
assert(stylesText.includes('inset: -0.65rem') && stylesText.includes('pointer-events: none'), 'Trefferflächen müssen geometrieneutral und außerhalb der Karte liegen');
assert(requirementsText.includes('sichtbaren Objekt') && requirementsText.includes('Leitungskoordinaten'), 'Akzeptanzkriterien für Drop-Trefferflächen fehlen');

console.log('Drop-Ziel-Trefferflächen-Test: OK');
