'use strict';

/*
 * PDF-Export-Varianten-Test
 *
 * Die kompakte Skizzenfassung muss dieselben projektbezogenen Informationen
 * enthalten wie der Gesamtexport. Sie lässt nur die ausführlichen
 * Objektdetails weg. So bleibt die kurze Weitergabe lesbar, ohne den
 * dokumentierten Projektstand zu verlieren.
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
        project: { name: 'Testprojekt', planStatus: 'Aktuell' },
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
const full = exporter.renderPrintSheet(stand, { scope: 'full' });
const sketch = exporter.renderPrintSheet(stand, { scope: 'sketch' });

['data-mk-export-scope="full"', 'Projektangaben', 'Messskizze', 'Abstimmungsnotizen', 'Prüfstatus', 'Objektdetails', 'Exportstand', 'PV-Detail'].forEach(marker => {
    assert(full.includes(marker), `Gesamtexport muss „${marker}“ enthalten`);
});
['data-mk-export-scope="sketch"', 'Projektangaben', 'Messskizze', 'Abstimmungsnotizen', 'Prüfstatus', 'Exportstand'].forEach(marker => {
    assert(sketch.includes(marker), `Skizzenexport muss „${marker}“ enthalten`);
});
assert(!sketch.includes('Objektdetails') && !sketch.includes('PV-Detail'), 'Skizzenexport darf keine ausführlichen Objektdetails enthalten');
assert(source.includes("options.scope === 'sketch'") && source.includes('mk-print-sheet--${scope}'), 'Exportvarianten müssen im Exportmodul über einen klaren Scope unterschieden werden');

console.log('PDF-Export-Varianten-Test: OK');
