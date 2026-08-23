'use strict';

/* Regressionstest für die frei anpassbare Größe der Infokarten. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const failures = [];
const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

const annotations = read('js/messkonzept/annotations.js');
const exportModule = read('js/messkonzept/export.js');
const styles = read('styles.css');
const requirements = read('docs/meter-annotation-blocks-anforderungen.md');

assert(annotations.includes('mk-annotation-resize-handle'), 'Größen-Griff fehlt in der Infokarte');
assert(annotations.includes('getSavedSize') && annotations.includes('setSavedSize'), 'Kartengröße wird nicht im Projektzustand gespeichert');
assert(annotations.includes('updateSizeFromPointer') && annotations.includes('endPointerResize'), 'Pointer-Größenänderung ist nicht verdrahtet');
assert(annotations.includes('resizeCardBy') && annotations.includes('ArrowRight'), 'Tastatur-Größenänderung fehlt');
assert(annotations.includes('ensureAnnotationWorkspace') && annotations.includes('mkTopologyContentHeight'), 'Dynamischer Infobox-Arbeitsraum fehlt');
assert(annotations.includes('mkAnnotationContentHeight'), 'Der tatsächliche Infobox-Inhalt muss für den Export markiert werden');
assert(exportModule.includes('mkTopologyContentHeight') && exportModule.includes('mkAnnotationContentHeight'), 'PDF muss den tatsächlichen Inhalt statt des reinen Arbeitsraums verwenden');
assert(styles.includes('.mk-annotation-resize-handle') && styles.includes('nwse-resize'), 'Größen-Griff ist nicht sichtbar und bedienbar gestaltet');
assert(requirements.includes('Größensteuerung') && requirements.includes('Größen-Griff')
    && requirements.includes('Arbeitsraum') && requirements.includes('PDF-Export'), 'Anforderungen für Kartengröße, Arbeitsraum und Export fehlen');

if (failures.length) {
    console.error(`Zähler-Infokarten-Größen-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('Zähler-Infokarten-Größen-Test: OK');
}
