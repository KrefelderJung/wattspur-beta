'use strict';

/* Regressionstest für kompakte Objektformulare und sinnvolle Infobox-Inhalte. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const renderer = read('js/messkonzept/canvas-renderer.js');
const editor = read('js/messkonzept/editor.js');
const annotations = read('js/messkonzept/annotations.js');
const model = read('js/messkonzept/model.js');
const main = read('messkonzept.js');
const styles = read('styles.css');
const requirements = read('docs/object-editor-fields-anforderungen.md');

assert(!renderer.includes('<label>Bezeichnung<input type="text" data-mk-field="name"'), 'Das editierbare Bezeichnungsfeld ist noch im Objektformular');
assert(renderer.includes('<label>Bemerkung<textarea data-mk-field="remark"'), 'Das Bemerkungsfeld fehlt im Objektformular');
assert(renderer.indexOf('<label>Bemerkung<textarea data-mk-field="remark"') > renderer.indexOf('${storageFields}'), 'Die Bemerkung steht nicht am Ende des Anlagenformulars');
assert(renderer.includes('getAssetAnnotationEntries'), 'Die Annotationsdaten werden nicht zentral aus dem Renderer bezogen');
assert(styles.includes('.mk-hak-form textarea') && styles.includes('.mk-hak-form label'), 'Das HAK-Bemerkungsfeld nutzt nicht die gemeinsame Formularoptik');
assert(editor.includes("field === 'remark' && String(asset.remark || '').trim()") && editor.includes('asset.annotationVisible = true'), 'Eine neue Anlagenbemerkung schaltet die Infobox nicht sichtbar');
assert(editor.includes("field === 'remark' && String(details.remark || '').trim()") && editor.includes('details.annotationVisible = true'), 'Eine neue Zählerbemerkung schaltet die Infobox nicht sichtbar');
assert(editor.includes('objectModalAnnotationToggleInput') && editor.includes('toggle.checked = true'), 'Der Infobox-Schalter spiegelt die automatische Anzeige bei Bemerkungen nicht');
assert(model.includes('hak: { voltageLevel: \'low\', annotationVisible: false') && model.includes('annotationVisible: false'), 'Neue Objekte starten nicht mit ausgeschalteter Infobox');
assert(annotations.includes('getAssetAnnotationEntries') && annotations.includes('return entries;'), 'Infoboxen übernehmen die gefilterten Werte nicht');
assert(renderer.includes('!/noch offen/i') && renderer.includes("'Anlagenart'"), 'Automatische Typen und offene Platzhalter werden nicht aus Infoboxen entfernt');
assert(!annotations.includes("value: 'Hausanschlusskasten'"), 'HAK-Infobox darf keinen automatischen Fallback anzeigen');
assert(!annotations.includes("value: 'Zähler'"), 'Zähler-Infobox darf keinen automatischen Fallback anzeigen');
assert(main.includes('getAssetAnnotationEntries: asset => MK_CANVAS_RENDERER.getAssetAnnotationEntries(asset)'), 'Die Infobox-Datenquelle ist nicht verdrahtet');
['Bezeichnung', 'Bemerkung', 'Infobox', 'Akzeptanzkriterien'].forEach(term => assert(requirements.includes(term), `Anforderungsdokument: ${term} fehlt`));

console.log('Objektformular- und Infobox-Test: OK');
