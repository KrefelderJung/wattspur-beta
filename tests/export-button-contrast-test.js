'use strict';

/* UI-Regressionstest für den sichtbaren PDF-Export in der Editor-Toolbar. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(styles.includes('.ws-download-button {') && styles.includes('.ws-download-icon'), 'Die gemeinsame Download-Komponente braucht eine sichtbare, verständliche Icon-Grundform');
assert(styles.includes('touch-action: manipulation') && styles.includes('.ws-download-button-label'), 'Die gemeinsame Download-Komponente muss touch-tauglich und für kompakte Beschriftungen vorbereitet sein');
assert(index.includes('id="btn-mk-export-pdf"') && !index.includes('id="btn-mk-export-sketch"'), 'Der Konfigurator soll genau einen PDF-Exportbutton anbieten');
assert(index.includes('class="mk-history-actions"') && index.indexOf('id="btn-mk-export-pdf"') < index.indexOf('id="mk-canvas"'), 'Der PDF-Exportbutton gehört in die Editor-Aktionsgruppe');
assert(index.includes('data-download-button') && index.includes('data-download-label="PDF"')
    && index.includes('data-download-tooltip="Messkonzept als PDF herunterladen"') && index.includes('<span>PDF</span>'), 'Der PDF-Button braucht das gemeinsame Download-Verhalten, einen verständlichen Tooltip und eine kurze sichtbare Beschriftung');

console.log('Exportbutton-Kontrast-Test: OK');
