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
assert(indexText.includes('title="Projektangaben ein- oder ausblenden"'), 'Der Aufklappbereich braucht eine zugängliche Bedienbeschreibung');
assert(indexText.includes('Öffnen und bearbeiten · erscheint im PDF-Export'), 'Der kurze Bedienhinweis fehlt');
assert(stylesText.includes('.mk-project-meta > summary:hover') && stylesText.includes('transform: translateY(-1px)'), 'Hover-Zustand des Projektangaben-Buttons fehlt');
assert(stylesText.includes('.mk-project-meta > summary::before') && stylesText.includes("content: '−'"), 'Plus-/Minus-Zustand des Projektangaben-Buttons fehlt');
assert(requirementsText.includes('gesamte Kopfbereich') && requirementsText.includes('Tastatur') && requirementsText.includes('Touch'), 'Anforderungen für den Aufklappbereich fehlen');

console.log('Projektangaben-Aufklapp-Test: OK');
