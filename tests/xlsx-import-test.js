'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const parserSource = fs.readFileSync(path.join(root, 'js/import/xlsx-parser.js'), 'utf8');
const parserHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const applicationParser = fs.readFileSync(path.join(root, 'parser.js'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs/xlsx-import-anforderungen.md'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const notices = fs.readFileSync(path.join(root, 'THIRD-PARTY-NOTICES.md'), 'utf8');

assert(parserSource.includes('parseXlsxArrayBuffer'), 'XLSX-Parser muss eine asynchrone ArrayBuffer-Schnittstelle anbieten');
assert(parserSource.includes('Datum') || parserSource.includes('XLSX_DATE_COLUMN'), 'XLSX-Parser muss die Datumsspalte prüfen');
assert(parserSource.includes('XLSX_TIME_COLUMN') && parserSource.includes('XLSX_VALUE_COLUMN'), 'XLSX-Parser muss Uhrzeit und Messwertspalten prüfen');
assert(parserSource.includes('sharedStrings.xml') && parserSource.includes('worksheets') && parserSource.includes('sheet'), 'XLSX-Parser muss typische XLSX-Strukturen lesen');
assert(parserSource.includes('date1904') && parserSource.includes('excelSerialToDate'), 'XLSX-Parser muss Excel-Datumswerte berücksichtigen');
assert(parserHtml.includes('accept=".csv,.txt,.mscons,.xlsx'), 'Dateiauswahl muss XLSX akzeptieren');
assert(parserHtml.includes('jszip.min.js') && parserHtml.includes('js/import/xlsx-parser.js'), 'XLSX-Abhängigkeiten müssen lokal eingebunden sein');
assert(applicationParser.includes('isXlsx') && applicationParser.includes('parseXlsxArrayBuffer'), 'Datei-Orchestrierung muss XLSX an den Parser weiterreichen');
assert(docs.includes('Datum') && docs.includes('Uhrzeit') && docs.includes('Copy-and-Paste'), 'XLSX-Format muss dokumentiert sein');
assert(serviceWorker.includes("'lib/jszip.min.js'") && serviceWorker.includes("'js/import/xlsx-parser.js'"), 'Offline-Cache muss XLSX-Assets enthalten');
assert(notices.includes('JSZip') && notices.includes('MIT License'), 'JSZip-Lizenz muss dokumentiert sein');

console.log('XLSX-Import-Test: OK');
