'use strict';

/* UI-Regressionstest für Raster, Labels und Platzhalter der Projektangaben. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const indexText = read('index.html');
const stylesText = read('styles.css');
const requirementsText = read('docs/projektfelder-standard-anforderungen.md');

['name', 'reference', 'measurementConcept', 'streetAddress', 'postalCode', 'city'].forEach(field => {
    assert(indexText.includes(`data-mk-project-field="${field}"`), `Projektfeld fehlt: ${field}`);
});
['z. B. PV-Erweiterung Wohnhaus', 'z. B. Vorgang 2026-001', 'z. B. MK D1', 'z. B. Musterstraße 21', 'z. B. 47804', 'z. B. Krefeld'].forEach(placeholder => {
    assert(indexText.includes(`placeholder="${placeholder}"`), `Standard-Platzhalter fehlt: ${placeholder}`);
});
assert((stylesText.match(/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/g) || []).length >= 2, 'Projektfelder müssen in großen und mittleren Ansichten drei gleichmäßige Spalten verwenden');
assert(stylesText.includes('grid-template-columns: minmax(0, 1.6fr) minmax(7rem, 0.8fr) minmax(0, 1fr);'), 'Standortfelder müssen Straße/Hausnummer, PLZ und Ort ausgewogen anordnen');
assert(stylesText.includes('min-height: 2.25rem') && stylesText.includes('input::placeholder'), 'Eingabehöhe und Platzhalter-Stil müssen standardisiert sein');
const normalizedRequirements = requirementsText.toLowerCase();
assert(normalizedRequirements.includes('sichtbare feldbezeichnungen') && normalizedRequirements.includes('mobile bedienung'), 'Anforderungen für die Projektfelder fehlen');
assert(indexText.includes('<label>Messkonzept<input') && !indexText.includes('Stand der Skizze') && !indexText.includes('data-mk-plan-status'), 'Das ungenutzte Feld „Stand der Skizze“ muss durch das Feld „Messkonzept“ ersetzt sein');
assert(indexText.includes('placeholder="z. B. MK D1"'), 'Messkonzept-Feld muss den vereinbarten Platzhalter verwenden');
assert(indexText.indexOf('<div class="mk-layout">') < indexText.indexOf('<details class="mk-project-meta"'), 'Der Skizzeneditor muss im DOM vor den Projektangaben stehen');
assert(indexText.indexOf('<section class="mk-builder-card"') < indexText.indexOf('<details class="mk-project-meta"') && indexText.indexOf('<details class="mk-project-meta"') < indexText.indexOf('</section>', indexText.indexOf('<details class="mk-project-meta"')), 'Projektangaben müssen unter der Skizze im Editorbereich liegen');
assert(indexText.includes('class="mk-project-meta-notes"') && indexText.includes('data-mk-notes-field') && !indexText.includes('class="mk-notes-panel"'), 'Der Kommentar muss als fester Abschnitt in den Projektangaben geführt werden');

console.log('Projektfelder-Standard-Test: OK');
