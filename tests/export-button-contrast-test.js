'use strict';

/* UI-Regressionstest für lesbare PDF-Exportbuttons in beiden Themen. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(styles.includes('.mk-export-button {') && styles.includes('border: 1px solid color-mix'), 'PDF-Exportbuttons brauchen eine sichtbare Kontur');
assert(styles.includes('.landing-primary {') && styles.includes('color: #ffffff'), 'Primäre Dialogaktionen brauchen im hellen Modus helle Schrift');
assert(styles.includes('[data-theme="dark"] .landing-primary') && styles.includes('color: #082f49'), 'Primäre Dialogaktionen müssen im Dunkelmodus lesbar bleiben');
assert(styles.includes('.mk-export-button:not(.mk-export-button--sketch)') && styles.includes('color: #ffffff'), 'Gefüllter Exportbutton braucht im hellen Modus helle Schrift');
assert(styles.includes('[data-theme="dark"] .mk-export-button:not(.mk-export-button--sketch)') && styles.includes('color: #082f49'), 'Dunkelmodus des gefüllten Exportbuttons muss lesbar bleiben');
assert(index.includes('id="btn-mk-export-pdf"') && !index.includes('id="btn-mk-export-sketch"'), 'Der Konfigurator soll genau einen PDF-Exportbutton anbieten');
assert(index.includes('>PDF erstellen</button>'), 'Der einzelne PDF-Exportbutton braucht eine klare Beschriftung');

console.log('Exportbutton-Kontrast-Test: OK');
