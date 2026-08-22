'use strict';

/*
 * Regressionstest für die stabile, schlanke PDF-Kopfzeile.
 *
 * Der Browser erzeugt die Seiten beim Drucken. Deshalb prüfen wir hier die
 * Exportstruktur und die dafür nötigen Druck-CSS-Regeln, ohne einen echten
 * Druckdialog zu öffnen.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const exportSource = fs.readFileSync(path.join(ROOT, 'js/messkonzept/export.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const requirementsSource = fs.readFileSync(path.join(ROOT, 'docs/pdf-header-page-number-anforderungen.md'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(exportSource, context, { filename: 'js/messkonzept/export.js' });

const exporter = context.window.WattspurMesskonzeptExport.createExporter({
    getState: () => ({
        mode: 'single',
        project: { name: 'Testprojekt', measurementConcept: 'MK D1' },
        notes: '',
        assets: []
    }),
    getElements: () => ({ canvas: { querySelector: () => null } }),
    validate: () => []
});

const stand = { iso: '2026-08-22T12:34:00.000Z', label: '22.08.2026, 14:34' };
const sheet = exporter.renderPrintSheet(stand);
assert((sheet.match(/class="mk-print-header"/g) || []).length === 1, 'One-Pager muss genau eine gemeinsame Kopfstruktur enthalten');
assert(!sheet.includes('Exportstand') && !sheet.includes('mk-print-page-counter'), 'Kopfzeile darf keinen Exportstand oder Seitenzähler enthalten');

assert(stylesSource.includes('@page {'), 'PDF-Drucklayout muss einen reservierten Seitenrand definieren');
assert(stylesSource.includes('position: static;') && stylesSource.includes('body.mk-printing .mk-print-header'), 'PDF-Kopf muss im Dokumentfluss vor dem Inhalt stehen');
assert(!stylesSource.includes('content: counter(page);'), 'PDF-CSS darf keinen fehleranfälligen Seitenzähler erzwingen');
assert(requirementsSource.includes('Kopfzeile') && requirementsSource.includes('Abnahmekriterien'), 'Anforderungen für die Kopfzeile müssen dokumentiert sein');

console.log('PDF-Header-Seitenzahl-Test: OK');
