'use strict';

/* Regressionstest für die reduzierte Objektangaben-Ansicht. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const index = read('index.html');
const renderer = read('js/messkonzept/canvas-renderer.js');
const model = read('js/messkonzept/model.js');
const interaction = read('js/messkonzept/interaction.js');
const styles = read('styles.css');

const objectModal = index.match(/<div id="mk-object-modal"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
assert(objectModal, 'Objekt-Dialog fehlt');
assert(!objectModal.includes('Objektangaben'), 'Die alte Kickerzeile „Objektangaben“ darf nicht im Objekt-Dialog erscheinen');
assert(!objectModal.includes('Änderungen werden lokal'), 'Der lokale Speicherhinweis darf nicht im Objekt-Dialog erscheinen');
assert(!objectModal.includes('btn-mk-modal-done') && !objectModal.includes('>Schließen<'), 'Der untere Schließen-Button darf nicht im Objekt-Dialog erscheinen');
assert(index.includes('id="btn-mk-modal-close"'), 'Der kompakte Objekt-Dialog braucht weiterhin das X zum Schließen');
assert(index.includes('title="Schließen · Änderungen bleiben erhalten"'), 'Das X muss klarstellen, dass es keine Eingaben verwirft');
assert(index.includes('id="btn-mk-modal-confirm"'), 'Der kompakte Objekt-Dialog braucht eine sichtbare Fertig-Aktion');
assert(index.includes('title="Fertig · Änderungen sind bereits übernommen"'), 'Die Fertig-Aktion muss die sofortige Speicherung verständlich benennen');
assert(/\.mk-modal-close\s*\{[\s\S]*?border-radius:\s*50%/.test(styles), 'Fertig- und Schließen-Aktion müssen dieselbe runde Grundform verwenden');

assert(renderer.includes('elements.objectModalTitle.textContent = label;'), 'Die Modal-Kopfzeile muss den kompakten Kontext direkt setzen');
assert(renderer.includes("? `${selectedMeterLabel} · Zähler`"), 'Zähler müssen als „Zx · Zähler“ bezeichnet werden');
assert(renderer.includes("? (call('getHakVoltageLevel', 'low') === 'medium' ? 'Transformator' : 'Hausanschlusskasten')"), 'HAK und Transformator brauchen eine eindeutige Kopfzeile');
assert(!renderer.includes('<span class="landing-kicker">Objektangaben</span>'), 'Die wiederholte Objekt-Kickerzeile darf nicht gerendert werden');
assert(renderer.includes('${isMediumVoltage ? `<p class="mk-hak-editor-hint">'), 'Der HAK-Hinweis darf nur bei Mittelspannung erscheinen');

assert(model.includes("{ key: 'meterNumber', label: 'Zählernummer', type: 'text', maxLength: 32, inputmode: 'text', autocomplete: 'off'"), 'Zählernummer muss alphanumerisch bis 32 Zeichen erfassbar sein');
assert(styles.includes('input[data-mk-meter-field="meterNumber"]') && styles.includes('max-width: 16rem'), 'Die Zählernummer soll im Dialog kompakt dargestellt werden');
assert(renderer.includes('mk-meter-form-row--market') && renderer.includes('mk-meter-form-row--identity')
    && renderer.includes('mk-meter-form-row--remark'), 'Zählerfelder müssen in fachlich sinnvolle Reihen gruppiert werden');
assert(styles.includes('.mk-meter-form-row--market') && styles.includes('.mk-meter-form-row--identity')
    && styles.includes('grid-template-columns: 1fr'), 'Die gruppierten Zählerfelder brauchen eine responsive Einspaltenregel');
assert(interaction.includes("event.key === 'Escape' && modal && !modal.classList.contains('hidden')"), 'Esc muss den Objekt-Dialog schließen');
assert(interaction.includes('event.target === elements.objectModal'), 'Klick außerhalb des Dialoginhalts muss den Objekt-Dialog schließen');
assert(interaction.includes("bindClick('btn-mk-modal-confirm', () => call('closeModal'))"), 'Die Fertig-Aktion muss den Dialog schließen');
assert(!interaction.includes("bindClick('btn-mk-modal-done'"), 'Die entfernte Schließen-Schaltfläche darf nicht weiter verdrahtet werden');

console.log('Objekt-Dialog-Minimaltest: OK');
