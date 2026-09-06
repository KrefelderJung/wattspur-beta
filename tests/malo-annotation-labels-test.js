'use strict';

/* Regressionstest für automatisch beschriftete MaLo-Werte in Zähler-Infokarten. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const annotations = read('js/messkonzept/annotations.js');
const requirements = read('docs/meter-annotation-blocks-anforderungen.md');
const failures = [];
const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

assert(annotations.includes("maloBezug: 'MaLo Bezug'")
    && annotations.includes("maloLieferung: 'MaLo Lief'"),
    'Die beiden MaLo-Felder brauchen automatische, verständliche Kurzbezeichnungen');
assert(annotations.includes('getCompactAnnotationLabel')
    && annotations.includes('mk-annotation-field-caption'),
    'Die MaLo-Bezeichnungen müssen getrennt von den gespeicherten IDs gerendert werden');
assert(requirements.includes('MaLo Bezug')
    && requirements.includes('MaLo Lief')
    && requirements.includes('Wird das Feld geleert'),
    'Die Anforderungen müssen die automatische MaLo-Beschriftung und das Leeren beschreiben');

if (failures.length) {
    console.error(`MaLo-Infobox-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('MaLo-Infobox-Test: OK');
}
