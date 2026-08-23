'use strict';

/* Regressionstest: Der leere Dateneditor darf nicht als 96 Messpunkte gelten. */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const failures = [];
const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

const start = app.indexOf('function createEmptyDataset()');
const end = app.indexOf('function openDatasetsInDashboard', start);
const emptyDatasetBlock = app.slice(start, end);

assert(start >= 0 && end > start, 'Startdatensatz-Funktion nicht auffindbar');
assert(/data:\s*\[\]/.test(emptyDatasetBlock), 'Leerer Startdatensatz muss ein leeres data-Array haben');
assert(/totalRowsCount:\s*0/.test(emptyDatasetBlock), 'Leerer Startdatensatz muss 0 Zeilen melden');
assert(/invalidRowsCount:\s*0/.test(emptyDatasetBlock), 'Leerer Startdatensatz darf keine ungültigen Zeilen melden');
assert(!/for\s*\(let i = 0; i < 96; i\+\+\)/.test(emptyDatasetBlock), '96 Platzhalterzeilen dürfen nicht als App-Messdaten erzeugt werden');
assert(/const hasValidDates = validTimestamps\.length > 0/.test(app), 'Leerer Datensatz braucht einen sicheren Datums-Fallback');
assert(/Noch keine Messwerte/.test(app), 'Leerer Zustand muss verständlich angezeigt werden');

if (failures.length) {
    console.error('Empty-Data-Editor-Test: FEHLER');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Empty-Data-Editor-Test: OK');
