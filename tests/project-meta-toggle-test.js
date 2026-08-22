'use strict';

/* UI-Regressionstest für den sichtbaren Aufklappbereich der Projektangaben. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const indexText = read('index.html');
const stylesText = read('styles.css');
const requirementsText = read('docs/projektangaben-toggle-anforderungen.md');

assert(indexText.includes('class="mk-project-meta"'), 'Projektangaben müssen als natives details-Element erhalten bleiben');
assert(indexText.includes('title="Projektangaben und Kommentar ein- oder ausblenden"'), 'Der Aufklappbereich braucht eine zugängliche Bedienbeschreibung');
assert(indexText.includes('Projekt und Kommentar · erscheinen im PDF-Export'), 'Der kurze Bedienhinweis fehlt');
assert(indexText.includes('class="mk-project-meta-notes"') && !indexText.includes('class="mk-notes-panel"'), 'Kommentar muss innerhalb der Projektangaben ohne eigenen Aufklappbereich liegen');
assert(indexText.indexOf('<div class="mk-layout">') < indexText.indexOf('<details class="mk-project-meta"'), 'Projektangaben müssen unter dem Editor angeordnet sein');
assert(indexText.indexOf('<section class="mk-builder-card"') < indexText.indexOf('<details class="mk-project-meta"') && indexText.indexOf('<details class="mk-project-meta"') < indexText.indexOf('</section>', indexText.indexOf('<details class="mk-project-meta"')), 'Projektangaben müssen direkt im Editorbereich unter der Skizze liegen');
assert(stylesText.includes('.mk-project-meta > summary:hover') && stylesText.includes('transform: translateY(-1px)'), 'Hover-Zustand des Projektangaben-Buttons fehlt');
assert(stylesText.includes('.mk-project-meta {') && stylesText.includes('margin: 1rem;'), 'Projektangaben brauchen einen symmetrischen Innenabstand zum Editor');
assert(stylesText.includes('.mk-project-meta > summary::before') && stylesText.includes("content: '−'"), 'Plus-/Minus-Zustand des Projektangaben-Buttons fehlt');
assert(requirementsText.includes('gesamte Kopfbereich') && requirementsText.includes('Tastatur') && requirementsText.includes('Touch'), 'Anforderungen für den Aufklappbereich fehlen');

console.log('Projektangaben-Aufklapp-Test: OK');
