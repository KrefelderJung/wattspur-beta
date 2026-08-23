'use strict';

/* Regressionstest für den einheitlichen Mauszeiger im Messkonzept-Editor. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(styles.includes('[data-mk-select-hak],\n[data-mk-select-meter],\n[data-mk-select-asset]'), 'Alle klickbaren Editorziele brauchen einen gemeinsamen Pointer-Standard');
assert(styles.includes('[data-mk-select-hak]:active,\n[data-mk-select-meter]:active,\n[data-mk-select-asset]:active'), 'Beim Drücken muss der Cursor den Greifzustand anzeigen');
assert(styles.includes('.mk-start-info-button,\n.mk-palette-info-button,\n.mk-validation-item > summary'), 'Infoboxen müssen ebenfalls als klickbare Ziele erkennbar sein');
assert(styles.includes('.mk-palette-item {') && styles.includes('cursor: grab;'), 'Palette-Bausteine müssen weiterhin als Ziehquelle erkennbar bleiben');
assert(styles.includes('.mk-meter-annotation-card {') && styles.includes('cursor: grab;'), 'Verschiebbare Zählerangaben müssen weiterhin als ziehbar erkennbar bleiben');

console.log('Klickziel-Cursor-Standard-Test: OK');
