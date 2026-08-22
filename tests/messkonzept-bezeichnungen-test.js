'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/messkonzept/presets.js'), 'utf8'), context, {
    filename: 'js/messkonzept/presets.js'
});

const presets = context.window.WattspurMesskonzeptPresets;
if (!presets) throw new Error('Messkonzept-Katalog konnte nicht geladen werden.');

const expected = {
    'single-household-pv': ['MK A2', 'Überschusseinspeisung'],
    'single-household-pv-storage': ['MK C1', 'Überschusseinspeisung mit gemeinsamer Messung'],
    'single-household-pv-storage-wallbox': ['MK C1', 'Überschusseinspeisung mit gemeinsamer Messung'],
    'single-household-pv-storage-heatpump': ['MK C1', 'Überschusseinspeisung mit gemeinsamer Messung'],
    'cascade-heatpump': ['MK C3', 'Überschusseinspeisung mit Kaskadenmessung'],
    'cascade-wallbox': ['MK C3', 'Überschusseinspeisung mit Kaskadenmessung'],
    'parallel-heatpump': ['MK Z1b', 'Steuerbare Verbrauchseinrichtung ohne weitere Verbraucher'],
    'parallel-wallbox': ['MK Z1b', 'Steuerbare Verbrauchseinrichtung ohne weitere Verbraucher'],
    'mieterstrom-d1': ['MK D1', 'Selbstversorgergemeinschaft']
};

const catalog = Object.fromEntries(presets.getCatalog().map(entry => [entry.id, entry]));
Object.entries(expected).forEach(([id, [code, name]]) => {
    const entry = catalog[id];
    if (!entry || entry.modelCode !== code || entry.modelName !== name) {
        throw new Error(`${id}: Messkonzeptbezeichnung fehlt oder ist falsch.`);
    }
});
if (catalog['parallel-heatpump'].summary.includes('Z1') || catalog['parallel-wallbox'].summary.includes('Z2')) {
    throw new Error('Parallelvorlagen: Die Kurzbeschreibung darf keine internen Zählernummern für Anfänger enthalten.');
}
if (catalog['mieterstrom-d1'].showSummary !== true || catalog['single-household-pv'].showSummary === true) {
    throw new Error('Startvorlagen: Nur MK D1 darf die ausführliche Kurzbeschreibung anzeigen.');
}

const startFlow = fs.readFileSync(path.join(ROOT, 'js/messkonzept/start-flow.js'), 'utf8');
if (!startFlow.includes('mk-start-card-model') || !startFlow.includes('entry.modelCode')) {
    throw new Error('start-flow.js: Messkonzeptbezeichnung wird nicht auf der Vorlage angezeigt.');
}
if (startFlow.includes('mk-start-card-title') || startFlow.includes('entry.title}</span>') || !startFlow.includes('mk-start-card-summary') || !startFlow.includes('entry.summary')) {
    throw new Error('start-flow.js: Jede Vorlage braucht eine standardisierte Messkonzeptzeile und Kurzbeschreibung, aber keine doppelte Objektüberschrift.');
}

console.log('Messkonzept-Bezeichnungen-Test: OK');
