/*
 * PDF-Leitungsgeometrie-Regressionstest
 *
 * Der Druckexport darf die Editor-Bühne nicht durch eigenes Padding, Zoom
 * oder eine neue Mindestbreite verschieben. Dieser kleine Test schützt genau
 * diese Schnittstelle, ohne einen echten Druckdialog zu öffnen.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const exportSource = fs.readFileSync(path.join(ROOT, 'js/messkonzept/export.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const indexSource = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const workerSource = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

class FakeStyle {
    constructor() { this.values = {}; }
    setProperty(name, value) { this.values[name] = value; }
}

class FakeLayer {
    constructor() {
        this.style = new FakeStyle();
        this.attributes = { viewBox: '0 0 702 300', width: '702', height: '300' };
    }
    getAttribute(name) { return this.attributes[name] || null; }
    setAttribute(name, value) { this.attributes[name] = value; }
}

class FakeStage {
    constructor() {
        this.scrollWidth = 702;
        this.offsetWidth = 702;
        this.scrollHeight = 300;
        this.offsetHeight = 300;
        this.style = new FakeStyle();
        this.classList = { values: [], add: value => this.classList.values.push(value) };
        this.layer = new FakeLayer();
        this.outerHTML = '<div class="mk-canvas-stage"></div>';
    }
    querySelector(selector) {
        return selector === '.mk-connector-layer' ? this.layer : null;
    }
    cloneNode() {
        const clone = new FakeStage();
        clone.outerHTML = '<div class="mk-canvas-stage" data-frozen="true"></div>';
        return clone;
    }
}

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(exportSource, context, { filename: 'js/messkonzept/export.js' });
const exportApi = context.window.WattspurMesskonzeptExport;
assert(exportApi?.createExporter, 'Exportmodul muss eine Export-API bereitstellen');

const stage = new FakeStage();
const exporter = exportApi.createExporter({
    getState: () => ({ assets: [], project: {} }),
    getElements: () => ({ canvas: { querySelector: selector => selector === '.mk-canvas-stage' ? stage : null } }),
    validate: () => []
});
const topology = exporter.getTopologyMarkup();
assert(topology.includes('mk-print-canvas-frame'), 'Die PDF-Skizze braucht einen äußeren Rahmen außerhalb der Bühnengeometrie');
assert(stage.style.values.width === undefined, 'Die Editor-Bühne darf beim Export nicht mutiert werden');

const sourceAssertions = [
    ['cloneNode(true)', 'Export muss eine isolierte Bühnenkopie verwenden'],
    ["clone.style.setProperty('zoom', '1')", 'Export muss den Editor-Zoom auf 1 einfrieren'],
    ["clone.style.setProperty('min-width'", 'Export muss die Bühnenbreite einfrieren'],
    ['getTopologyMarkup()', 'Druckansicht muss die geprüfte Skizzen-Snapshot-Funktion verwenden']
];
sourceAssertions.forEach(([needle, message]) => assert(exportSource.includes(needle), message));
assert(stylesSource.includes('.mk-print-canvas-frame'), 'Druck-CSS muss den äußeren Skizzenrahmen stylen');
assert(stylesSource.includes('.mk-print-canvas-stage'), 'Druck-CSS muss die eingefrorene Bühne stylen');
assert(/\.mk-print-topology \.mk-drop-zone\s*\{[\s\S]*?padding:\s*0;/.test(stylesSource), 'Druck-CSS darf die gemessenen Drop-Zonen nicht mit eigenem Innenabstand verschieben');
assert(!/\.mk-print-topology\s*>\s*div\s*\{/.test(stylesSource), 'Druck-Padding darf nicht direkt auf die SVG-Bühne gelegt werden');
assert(/export\.js\?v=4/.test(indexSource), 'Exportmodul muss mit neuem Cache-Buster geladen werden');
assert(/APP_VERSION\s*=\s*['"]2026\.08.18-beta\.320['"]/.test(workerSource), 'Service Worker muss den neuen Exportstand cachen');

console.log('PDF-Leitungsgeometrie-Test: OK');
