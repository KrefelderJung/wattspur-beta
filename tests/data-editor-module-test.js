'use strict';

/*
 * Lastgang-Dateneditor: kleiner DOM-freier Vertrags- und Regressionstest.
 *
 * Der Test lädt das ausgelagerte Modul in einer isolierten VM. Dadurch wird
 * geprüft, dass die Kernfunktionen nicht heimlich vom Dashboard oder vom
 * Browser-Layout abhängen. Die Oberfläche selbst wird weiterhin im Browser
 * getestet; hier sichern wir die fachliche Datenänderung ab.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'js/lastgang/data-editor.js');
const source = fs.readFileSync(modulePath, 'utf8');

const context = {
    console,
    document: {},
    navigator: {},
    isSecureContext: false,
    allDatasets: [],
    activeDatasetIds: [],
    currentDatasetId: 0,
    displayUnit: 'kw',
    cachedAggregations: {},
    globalDateRange: {
        start: new Date('2026-01-01T00:00:00'),
        end: new Date('2026-01-01T00:00:00')
    },
    getLocalDateString(date) {
        return date.toISOString().slice(0, 10);
    },
    getMeasurementEnergyKwh(point) {
        return Number.isFinite(point.kw) ? point.kw * (point.intervalHours || 0.25) : null;
    },
    escapeHtml(value) {
        return String(value);
    },
    renderDatasetCheckboxes() {},
    updateDashboard() {},
    showToast() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: modulePath });

const api = context.window.WattspurLastgangDataEditor;
assert(api, 'Dateneditor-Modul muss eine Wattspur-API veröffentlichen');
assert.strictEqual(typeof api.createEmptyDataset, 'function');
assert.strictEqual(typeof api.saveCellChange, 'function');
assert.strictEqual(typeof api.getState, 'function');

const dataset = api.createEmptyDataset('Testkanal', 2026);
assert.strictEqual(dataset.data.length, 96, 'leerer 15-Minuten-Editor muss einen Tagesbereich erzeugen');
assert.strictEqual(dataset.invalidRowsCount, 96, 'leere Werte müssen zunächst als ungültig gelten');

context.allDatasets = [dataset];
const firstTimestamp = dataset.data[0].timestamp;
api.saveCellChange(0, firstTimestamp, 12.5);

assert.strictEqual(dataset.data[0].kw, 12.5);
assert.strictEqual(dataset.data[0].rawKw, 12.5);
assert.strictEqual(dataset.data[0].energyKwh, 3.125);
assert.strictEqual(dataset.data[0].qualityStatus, 'VALID');
assert.strictEqual(dataset.invalidRowsCount, 95);
assert.strictEqual(dataset.version, 1);
assert.strictEqual(api.getState().editorGridPageSize, 1000);

console.log('Lastgang-Dateneditor-Modultest: OK');
