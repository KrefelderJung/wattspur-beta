'use strict';

/* Regressionstest für Bemerkungen und direkten Zugriff aus Zähler-Infokarten. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const failures = [];
const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

const model = read('js/messkonzept/model.js');
const annotations = read('js/messkonzept/annotations.js');
const renderer = read('js/messkonzept/canvas-renderer.js');
const styles = read('styles.css');
const main = read('messkonzept.js');
const requirements = read('docs/meter-annotation-blocks-anforderungen.md');

assert(model.includes("key: 'remark'") && model.includes("type: 'textarea'"), 'Bemerkungsfeld für Zähler fehlt im Modell');
assert(model.includes("remark: ''"), 'Bemerkungsfeld fehlt im Anlagen-Grundzustand');
assert(renderer.includes('data-mk-field="remark"') && renderer.includes('data-mk-meter-field'), 'Bemerkung ist nicht an Objekt- und Zählerdialog gebunden');
assert(renderer.includes('field.type === \'textarea\''), 'Zähler-Renderer unterstützt kein Textfeld');
assert(renderer.includes("label: 'Bemerkung'"), 'Bemerkung fehlt in der Objektübersicht');
assert(annotations.includes('data-mk-meter-annotation-editable') && !annotations.includes('mk-meter-annotation-label'), 'Infokarte wiederholt den Zählernamen weiterhin sichtbar');
assert(annotations.includes('mk-meter-annotation-value') && annotations.includes('beginInlineEdit'), 'Direkte Bearbeitung eines Infoboxwertes fehlt');
assert(annotations.includes('mk-annotation-confirm') && annotations.includes('Änderung bestätigen'), 'Bestätigungshäkchen für Inline-Bearbeitung fehlt');
assert(annotations.includes("if (event.target.closest?.('.mk-meter-annotation-value')) return;"), 'Textwerte sind nicht vom Karten-Drag ausgenommen');
assert(annotations.includes('dblclick') && !annotations.includes('openObjectModal'), 'Freier Infoboxbereich darf kein Objektfenster öffnen');
assert(main.includes('refreshInlineStatus: () => MK_VALIDATION_STATUS.refresh()'), 'Inline-Bearbeitung aktualisiert den Prüfstatus nicht');
assert(styles.includes('.mk-meter-form textarea') && styles.includes('.mk-asset-form textarea'), 'Bemerkungstextfeld ist nicht gestaltet');
assert(styles.includes('.mk-annotation-confirm') && styles.includes('#34d399'), 'Bestätigungshäkchen ist nicht als grünes UI-Element gestaltet');
assert(styles.includes('white-space: pre-wrap;'), 'Mehrzeilige Bemerkungen werden in der Infokarte nicht erhalten');
assert(requirements.includes('Doppelklick') && requirements.includes('240 Zeichen'), 'Akzeptanzkriterien für Bemerkungen fehlen');

if (failures.length) {
    console.error(`Zähler-Bemerkungs-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('Zähler-Bemerkungs-Test: OK');
}
