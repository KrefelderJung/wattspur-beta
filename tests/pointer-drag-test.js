'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pointerText = fs.readFileSync(path.join(ROOT, 'js/messkonzept/pointer-drag.js'), 'utf8');
const dragDropText = fs.readFileSync(path.join(ROOT, 'js/messkonzept/drag-drop.js'), 'utf8');
const interactionText = fs.readFileSync(path.join(ROOT, 'js/messkonzept/interaction.js'), 'utf8');
const indexText = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const stylesText = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const serviceWorkerText = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const requirementsText = fs.readFileSync(path.join(ROOT, 'docs/tablet-pointer-dnd-anforderungen.md'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(pointerText.includes('WattspurMesskonzeptPointerDrag') && pointerText.includes('createPointerDragController'), 'Pointer-Modul muss eine öffentliche Controller-Schnittstelle besitzen.');
assert(pointerText.includes("SUPPORTED_POINTER_TYPES = new Set(['touch', 'pen'])"), 'Pointer-Gesten müssen auf Touch und Stift begrenzt sein.');
assert(pointerText.includes('pointerdown') && pointerText.includes('pointermove') && pointerText.includes('pointerup') && pointerText.includes('pointercancel'), 'Pointer-Lebenszyklus ist unvollständig.');
assert(pointerText.includes('holdDelay') && pointerText.includes('moveThreshold'), 'Tablet-Geste braucht Haltezeit und Bewegungsschwelle.');
assert(pointerText.includes('elementFromPoint') && pointerText.includes('handlePointerDragOver') && pointerText.includes('handlePointerDrop'), 'Pointer-Geste muss das sichtbare Drop-Ziel an die bestehende Logik übergeben.');
assert(pointerText.includes('consumeClickSuppression'), 'Erfolgreiches Ziehen muss den nachfolgenden Objekt-Klick unterdrücken können.');
assert(dragDropText.includes('getPointerTransfer') && dragDropText.includes('handlePointerDragCancel') && dragDropText.includes('handlePointerDrop'), 'Drag-Drop-Adapter für Pointer-Gesten fehlen.');
assert(interactionText.includes('initializePointerDrag') && interactionText.includes('consumePointerClickSuppression'), 'Pointer-Modul ist nicht in die DOM-Verkabelung integriert.');
assert(indexText.includes('js/messkonzept/pointer-drag.js'), 'Pointer-Modul ist nicht in index.html geladen.');
assert(stylesText.includes('.mk-pointer-drag-ghost') && stylesText.includes('touch-action: none'), 'Pointer-Vorschau oder Touch-Gestenstil fehlt.');
assert(serviceWorkerText.includes("'js/messkonzept/pointer-drag.js'"), 'Pointer-Modul fehlt im Offline-Cache.');
assert(requirementsText.includes('Die Tap-Alternative wird nicht eingeführt'), 'Anforderung zur reinen Geste ohne Tap-Alternative fehlt.');

console.log('Pointer-DnD-Test: OK');

