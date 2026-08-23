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
assert(styles.includes('display: flex') && styles.includes('flex-wrap: wrap'), 'Toolbar muss ohne Zoomgruppe flexibel umbrechen können');
assert(styles.includes('.mk-topology-switch {') && styles.includes('width: max-content') && styles.includes('overflow-x: auto'), 'Messkonzept-Auswahl darf keine künstliche Breite für einen fünften Zähler reservieren');
assert(styles.includes('.mk-meter-count-switch .mk-topology-btn') && styles.includes('flex: 0 0 auto'), 'Parallel-Zähler 2 bis 4 dürfen nicht in einen leeren Restbereich auseinandergezogen werden');
assert(index.includes('class="mk-toolbar-controls"') && index.includes('class="mk-topology-switch"'), 'Messkonzept-Bediengruppen fehlen im Editor');
assert(index.includes('class="mk-canvas-zoom-controls"') && index.includes('class="mk-canvas-stage-host"'), 'Zoomsteuerung muss als stabile Overlay-Schicht am Editor liegen');
assert(index.includes('class="btn btn-secondary btn-sm"') && index.includes('data-download-label="PDF"') && index.includes('<span>PDF</span>'), 'PDF-Export muss als kompakte sichtbare Download-Aktion in der Editor-Toolbar erreichbar sein');
assert(styles.includes('.ws-download-button {') && styles.includes('min-height: 2.75rem') && styles.includes('.ws-download-button-label'), 'Die gemeinsame Download-Komponente braucht auf kleinen Bildschirmen eine ausreichend große Touchfläche und darf die Beschriftung kompakt ausblenden');
assert(styles.includes('@media (max-width: 820px)') && styles.includes('.mk-builder-toolbar {\n        grid-template-columns: minmax(0, 1fr);'), 'Editor-Toolbar muss auf Tabletbreiten in getrennte Zeilen umbrechen');

console.log('Responsive-Toolbar-Test: OK');
