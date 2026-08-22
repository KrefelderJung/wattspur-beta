'use strict';

/* Regressionstest für den vorgeschlagenen PDF-Dateinamen. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/messkonzept/export.js'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'js/messkonzept/export.js' });

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const exporter = context.window.WattspurMesskonzeptExport.createExporter({
    getState: () => ({ project: { street: 'Musterstraße', houseNumber: '21' } })
});
assert(exporter.getSuggestedFileName() === 'Musterstraße 21', 'PDF-Dateiname muss Straße und Hausnummer vorschlagen');

const unsafe = context.window.WattspurMesskonzeptExport.createExporter({
    getState: () => ({ project: { street: 'Hauptstraße: Innenhof/West', houseNumber: '4/5' } })
});
assert(unsafe.getSuggestedFileName() === 'Hauptstraße Innenhof West 4 5', 'Dateiname muss problematische Sonderzeichen sicher ersetzen');

const fallback = context.window.WattspurMesskonzeptExport.createExporter({
    getState: () => ({ project: {} })
});
assert(fallback.getSuggestedFileName() === 'Wattspur-Messkonzept', 'Ohne Adresse muss ein verständlicher Fallback verwendet werden');
assert(source.includes('doc.title = getSuggestedFileName()'), 'Druckdialog muss den vorgeschlagenen Dateinamen über den Dokumenttitel erhalten');

console.log('PDF-Dateiname-Test: OK');
