'use strict';

/* Regressionstest: Der reduzierte PDF-Export enthält keine Objekttabellen. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/messkonzept/export.js'), 'utf8');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'js/messkonzept/export.js' });

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const exporter = context.window.WattspurMesskonzeptExport.createExporter({
    getState: () => ({ mode: 'single', project: { name: 'Tabellentest' }, assets: [{ id: 'pv-1', type: 'generation', name: 'PV1' }] }),
    getElements: () => ({ canvas: { querySelector: () => null } }),
    validate: () => [],
    getMeterSummaryEntries: () => [
        { label: 'Marktlokation Bezug', value: '123456' },
        { label: 'Marktlokation Lieferung', value: '654321' },
        { label: 'Messlokation', value: 'DE00000000000000000000000000001' },
        { label: 'Zählernummer', value: 'M-001' },
        { label: 'Einbaudatum', value: '2026-08-19' },
        { label: 'Messbereich', value: 'Hinter Basiszähler' },
        { label: 'Zähler vor', value: 'Basiszähler der Messstufe' }
    ],
    getAssetSummaryEntries: () => [],
    getAssetMeta: () => ({ label: 'Erzeugungsanlagen' })
});

const sheet = exporter.renderPrintSheet({ iso: '2026-08-19T00:00:00.000Z', label: '19.08.2026' });
assert(!sheet.includes('Objektdetails') && !sheet.includes('PV1'), 'One-Pager darf keine Objektdetails ausgeben');
assert(!sheet.includes('mk-print-table-section'), 'One-Pager darf keine Objekttabellen ausgeben');
assert(sheet.includes('mk-print-project-row'), 'Projektangaben bleiben im kompakten Zeilenlayout erhalten');
assert(styles.includes('max-height: 14cm'), 'Die Skizzenfläche muss für einen One-Pager in der Höhe begrenzt werden');

console.log('PDF-Objekttabellen-Test: OK');
