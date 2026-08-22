'use strict';

/* Regressionstest für das Ausblenden einzelner Infoboxen. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const failures = [];
const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

const model = read('js/messkonzept/model.js');
const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
const annotations = read('js/messkonzept/annotations.js');
const exportModule = read('js/messkonzept/export.js');
const styles = read('styles.css');
const requirements = read('docs/object-annotation-visibility-anforderungen.md');

assert(model.includes('annotationVisible: true'), 'Standard-Sichtbarkeit fehlt im Modell');
assert(model.includes('meterDetails[key].annotationVisible === undefined'), 'Alte Zählerzustände werden nicht kompatibel ergänzt');
assert(renderer.includes('data-mk-field="annotationVisible"'), 'Anlagen-Schalter für Infobox fehlt');
assert(renderer.includes('data-mk-meter-field="annotationVisible"'), 'Zähler-Schalter für Infobox fehlt');
assert(renderer.includes('data-mk-hak-field="annotationVisible"'), 'HAK-Schalter für Infobox fehlt');
assert(renderer.includes('data-mk-hak-field="remark"'), 'HAK-Bemerkung fehlt');
assert(editor.includes('target.type === \'checkbox\' ? target.checked : target.value'), 'Checkbox-Werte werden nicht als Boolean übernommen');
assert(annotations.includes('data-mk-annotation-dismiss'), 'Infobox besitzt keinen eigenen Ausblendknopf');
assert(annotations.includes('setAnnotationVisibility') && annotations.includes('annotationVisible'), 'Ausblendstatus wird nicht gespeichert');
assert(annotations.includes('record.visible && record.entries.length'), 'Verborgene oder leere Infoboxen werden nicht herausgefiltert');
assert(annotations.includes(".mk-annotation-dismiss"), 'Infobox-Ausblendknopf ist nicht verdrahtet');
assert(styles.includes('.mk-annotation-dismiss') && styles.includes('body.mk-printing .mk-annotation-dismiss'), 'Infobox-Ausblendknopf ist nicht für UI und PDF gestaltet');
assert(exportModule.includes('stage.cloneNode(true)'), 'PDF muss den sichtbaren Infobox-Zustand übernehmen');
assert(requirements.includes('Zähler, Erzeugungsanlagen') && requirements.includes('PDF-Export'), 'Akzeptanzkriterien für die einheitliche Infobox fehlen');

if (failures.length) {
    console.error(`Objekt-Infobox-Sichtbarkeit-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('Objekt-Infobox-Sichtbarkeit-Test: OK');
}
