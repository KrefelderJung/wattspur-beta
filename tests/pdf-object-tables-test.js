'use strict';

/* Regressionstest für die kompakten Objekttabellen im Gesamtexport. */

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

const assets = [
    { id: 'pv-1', type: 'generation', name: 'PV1', power: '10 kWp' },
    { id: 'pv-2', type: 'generation', name: 'PV2', power: '' },
    { id: 'storage-1', type: 'storage', name: 'Speicher1', storageCapacity: '10 kWh' },
    { id: 'meter-1', type: 'meter', name: 'Zähler vor Anlage' }
];

const exporter = context.window.WattspurMesskonzeptExport.createExporter({
    getState: () => ({ mode: 'single', project: { name: 'Tabellentest' }, assets }),
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
    getAssetSummaryEntries: asset => asset.type === 'generation'
        ? [{ label: 'Anlagenart', value: 'PV' }, { label: 'Nennleistung', value: asset.power }]
        : asset.type === 'meter'
            ? [
                { label: 'Marktlokation Bezug', value: '987654' },
                { label: 'Messlokation', value: 'DE00000000000000000000000000002' },
                { label: 'Zählernummer', value: 'M-002' },
                { label: 'Messbereich', value: 'Vor einzelner Anlage' },
                { label: 'Zähler vor', value: 'PV1' }
            ]
            : [{ label: 'Speicherkapazität', value: asset.storageCapacity }],
    getAssetMeta: type => ({ label: type === 'generation' ? 'Erzeugungsanlagen' : 'Speicher' }),
    getMeterLabel: asset => asset.name
});

const full = exporter.renderPrintSheet({ iso: '2026-08-19T00:00:00.000Z', label: '19.08.2026' }, { scope: 'full' });
assert(!full.includes('mk-print-detail-block'), 'Gesamtexport darf keine alten Einzelkarten verwenden');
assert((full.match(/class="mk-print-table-section"/g) || []).length === 4, 'Netzanschluss, Zähler, Erzeugungsanlagen und Speicher müssen je eine Tabelle bilden');
assert(full.includes('PV1') && full.includes('PV2') && full.includes('Speicher1'), 'Alle angelegten Objekte müssen in den Tabellen erscheinen');
assert((full.match(/<th scope="col">Nennleistung<\/th>/g) || []).length === 1, 'Gemeinsame Anlagenfelder dürfen nur einmal als Tabellenkopf erscheinen');
assert(full.includes('<td></td>'), 'Leere Angaben müssen als leere Tabellenzellen statt als eigene Detailblöcke erscheinen');
['Marktlokation Bezug', 'Marktlokation Lieferung', 'Messlokation', 'Zählernummer', 'Einbaudatum'].forEach(label => {
    assert((full.match(new RegExp(`<th scope="col">${label}<\\/th>`, 'g')) || []).length === 1, `${label} muss als Zählerspalte erscheinen`);
});
['Zählerfunktion', 'Messbereich', 'Zähler vor'].forEach(label => {
    assert(!full.includes(`<th scope="col">${label}</th>`), `${label} darf nicht als interne Zählerspalte exportiert werden`);
});
assert(full.includes('M-002') && full.includes('987654'), 'Auch Zusatz-Zähler müssen ihre Stammdaten ausgeben');

console.log('PDF-Objekttabellen-Test: OK');
