'use strict';

/*
 * PDF-Export-Varianten-Test
 *
 * Der PDF-Export ist bewusst auf eine einzige, kompakte Ausgabe reduziert.
 * Er enthält Hinweis, Messskizze, Projektangaben und optionalen Kommentar.
 */

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
    getState: () => ({
        mode: 'single',
        project: { name: 'Testprojekt', measurementConcept: 'MK D1' },
        notes: 'Rücksprache mit dem Installateur',
        assets: [{ id: 'ea-1', type: 'generation', name: 'PV-Detail' }]
    }),
    getElements: () => ({ canvas: { querySelector: () => null } }),
    validate: () => [{ level: 'warning', text: 'Fachlich prüfen' }],
    renderMeterDetailsSummary: () => '<p>Zählerdetails</p>',
    renderAssetSummary: () => '<p>Objektdetails</p>',
    getAssetMeta: () => ({ label: 'Erzeugungsanlage' })
});

const stand = { iso: '2026-08-17T12:34:00.000Z', label: '17.08.2026, 14:34' };
const sheet = exporter.renderPrintSheet(stand);

['data-mk-export-scope="one-page"', 'Wichtiger Hinweis', 'Projektangaben', 'Messskizze', 'Kommentar', 'Rücksprache mit dem Installateur'].forEach(marker => {
    assert(sheet.includes(marker), `One-Pager muss „${marker}“ enthalten`);
});
['Exportstand', 'Seite 0', 'Abstimmungsnotizen', 'Prüfstatus', 'Objektdetails', 'PV-Detail'].forEach(marker => {
    assert(!sheet.includes(marker), `One-Pager darf „${marker}“ nicht enthalten`);
});
assert(source.includes('mk-print-sheet--one-page') && !source.includes('options.scope ==='), 'PDF darf keine getrennten Exportvarianten mehr rendern');
assert((sheet.match(/class="mk-print-header"/g) || []).length === 1, 'One-Pager muss genau eine Kopfzeile enthalten');

console.log('PDF-Export-Varianten-Test: OK');
