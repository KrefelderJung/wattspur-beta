'use strict';

/* Regressionstest für die gemeinsame Download-Button-Komponente. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const downloadModule = read('js/shared/download.js');
const index = read('index.html');
const styles = read('styles.css');
const requirements = read('docs/download-button-anforderungen.md');

assert(downloadModule.includes('WattspurDownloadButton')
    && downloadModule.includes('enhanceDownloadButtons')
    && downloadModule.includes('ws-download-icon'), 'Die gemeinsame Download-Komponente fehlt.');
assert(index.includes('js/shared/download.js')
    && index.includes('data-download-button')
    && index.includes('data-download-label="PDF"')
    && index.includes('data-download-label="CSV"'), 'Messkonzept und Lastgang müssen die gemeinsame Download-Komponente verwenden.');
assert(styles.includes('.ws-download-button')
    && styles.includes('.ws-download-icon')
    && styles.includes('.ws-download-button-label')
    && styles.includes('display: none;'), 'Die gemeinsame Download-Komponente braucht Icon-, Label- und mobile Regeln.');
assert(requirements.includes('Messkonzept als PDF herunterladen')
    && requirements.includes('44 CSS-Pixel'), 'Die Akzeptanzkriterien für den Downloadbutton fehlen.');

console.log('Download-Button-Test: OK');
