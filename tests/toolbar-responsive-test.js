'use strict';

/* UI-Regressionstest für die responsive Messkonzept-Bedienleiste. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(styles.includes('container: mk-toolbar / inline-size'), 'Toolbar braucht eine eigene responsive Container-Größe');
assert(styles.includes('@container mk-toolbar (max-width: 44rem)'), 'Schmale Toolbar-Spalten brauchen eine Container-Regel');
assert(styles.includes('grid-template-areas: "mode" "zoom"'), 'Bediengruppen brauchen eine sichere Ausweichanordnung');
assert(styles.includes('.mk-topology-switch {') && styles.includes('overflow-x: auto'), 'Messkonzept-Auswahl darf bei Bedarf horizontal erreichbar bleiben');
assert(index.includes('class="mk-toolbar-controls"') && index.includes('class="mk-topology-switch"'), 'Messkonzept-Bediengruppen fehlen im Editor');

console.log('Responsive-Toolbar-Test: OK');
