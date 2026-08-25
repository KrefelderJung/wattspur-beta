'use strict';

/* Regressionstest für den einheitlichen Mauszeiger im Messkonzept-Editor. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(/\[data-mk-select-hak\],[\s\S]*?\[data-mk-select-meter\],[\s\S]*?\[data-mk-select-asset\][\s\S]*?cursor:\s*pointer;/.test(styles), 'Alle klickbaren Editorziele brauchen einen gemeinsamen Pointer-Standard');
assert(/\[data-mk-select-hak\]:active,[\s\S]*?\[data-mk-select-meter\]:active,[\s\S]*?\[data-mk-select-asset\]:active,[\s\S]*?cursor:\s*grabbing;/.test(styles), 'Beim Drücken muss der Cursor den Greifzustand anzeigen');
assert(/\.mk-start-info-button,[\s\S]*?\.mk-palette-info-button,[\s\S]*?\.mk-validation-item > summary/.test(styles), 'Infoboxen müssen ebenfalls als klickbare Ziele erkennbar sein');
assert(styles.includes('.mk-palette-item {') && styles.includes('cursor: grab;'), 'Palette-Bausteine müssen weiterhin als Ziehquelle erkennbar bleiben');
assert(styles.includes('.mk-meter-annotation-card {') && styles.includes('cursor: grab;'), 'Verschiebbare Zählerangaben müssen weiterhin als ziehbar erkennbar bleiben');

console.log('Klickziel-Cursor-Standard-Test: OK');
