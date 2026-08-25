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
const connectionsSource = fs.readFileSync(path.join(ROOT, 'js/messkonzept/connections.js'), 'utf8');
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

class FakeShape {
    constructor(box) { this.box = box; }
    getBBox() { return this.box; }
}

class FakeLayer {
    constructor(attributes = { viewBox: '0 0 1400 600', width: '1400', height: '600' }, shapes = []) {
        this.style = new FakeStyle();
        this.attributes = attributes;
        this.shapes = shapes;
    }
    getAttribute(name) { return this.attributes[name] || null; }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelectorAll() { return this.shapes; }
}

class FakeStage {
    constructor(withAnnotation = false, withVisualBounds = false) {
        this.scrollWidth = 1400;
        this.offsetWidth = 1400;
        this.scrollHeight = 600;
        this.offsetHeight = 600;
        this.withVisualBounds = withVisualBounds;
        this.style = new FakeStyle();
        this.classList = { values: [], add: value => this.classList.values.push(value) };
        this.layer = new FakeLayer(undefined, withVisualBounds ? [new FakeShape({ x: 100, y: 100, width: 300, height: 200 })] : []);
        this.annotation = withAnnotation
            ? new FakeLayer({ viewBox: '-120 -80 900 700', width: '900', height: '700' }, withVisualBounds ? [new FakeShape({ x: -40, y: -30, width: 100, height: 80 })] : [])
            : null;
        this.annotationLayer = withAnnotation ? { style: new FakeStyle() } : null;
        this.topology = { style: new FakeStyle(), querySelectorAll: () => [] };
        if (this.annotationLayer) {
            this.annotationLayer.querySelector = selector => selector === '.mk-meter-annotation-connectors' ? this.annotation : null;
            this.annotationLayer.querySelectorAll = () => [];
        }
        this.outerHTML = '<div class="mk-canvas-stage"></div>';
    }
    getBoundingClientRect() { return { left: 0, top: 0, width: this.offsetWidth, height: this.offsetHeight }; }
    querySelector(selector) {
        if (selector === '.mk-connector-layer') return this.layer;
        if (selector === '.mk-meter-annotation-connectors') return this.annotation;
        if (selector === '.mk-topology-content') return this.topology;
        if (selector === '.mk-meter-annotation-layer') return this.annotationLayer;
        return null;
    }
    cloneNode() {
        const clone = new FakeStage(Boolean(this.annotation), this.withVisualBounds);
        clone.outerHTML = '<div class="mk-canvas-stage" data-frozen="true"></div>';
        this.lastClone = clone;
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
assert(topology.includes('mk-print-canvas-frame') && topology.includes('mk-print-canvas-fit'), 'Die PDF-Skizze braucht einen äußeren Rahmen und eine anpassbare Passform');
assert(topology.includes('style="width:650px;height:279px"'), 'Eine zu breite Skizze muss im PDF auf die verfügbare Druckbreite verkleinert werden');
assert(stage.style.values.width === undefined, 'Die Editor-Bühne darf beim Export nicht mutiert werden');

const annotationStage = new FakeStage(true);
const annotationExporter = exportApi.createExporter({
    getState: () => ({ assets: [], project: {} }),
    getElements: () => ({ canvas: { querySelector: selector => selector === '.mk-canvas-stage' ? annotationStage : null } }),
    validate: () => []
});
const annotationTopology = annotationExporter.getTopologyMarkup();
assert(annotationTopology.includes('style="width:650px;height:300px"'), 'Infoboxen links oder oben müssen die PDF-Inhaltsgrenze erweitern und mit zentriert werden');
const annotationClone = annotationStage.lastClone;
assert(annotationClone?.layer?.style?.values?.width === '1400px', 'Die Leitungs-SVG darf bei zusätzlichem Infobox-Raum nicht auf die gemeinsame Exportbreite gestreckt werden');
assert(annotationClone?.layer?.style?.values?.height === '600px', 'Die Leitungs-SVG darf bei zusätzlichem Infobox-Raum nicht auf die gemeinsame Exporthöhe gestreckt werden');
assert(annotationClone?.layer?.style?.values?.transform === 'translate(120px, 80px)', 'Leitungen, Objekte und Infoboxen müssen denselben Export-Offset verwenden');
assert(annotationClone?.topology?.style?.values?.transform === 'translate(120px, 80px)', 'Objekte müssen im PDF denselben Offset wie die Leitungen erhalten');
assert(annotationClone?.annotationLayer?.style?.values?.transform === 'translate(120px, 80px)', 'Infoboxen müssen im PDF denselben Offset wie Leitungen und Objekte erhalten');

const visualStage = new FakeStage(true, true);
const visualExporter = exportApi.createExporter({
    getState: () => ({ assets: [], project: {} }),
    getElements: () => ({ canvas: { querySelector: selector => selector === '.mk-canvas-stage' ? visualStage : null } }),
    validate: () => []
});
const visualTopology = visualExporter.getTopologyMarkup();
assert(visualTopology.includes('style="width:488px;height:378px"'), 'Der PDF-Rahmen muss ungenutzten Editor-Arbeitsraum aus dem sichtbaren Inhaltsbereich entfernen');
assert(visualStage.lastClone?.layer?.style?.values?.width === '1400px', 'Der intelligente Zuschnitt darf die ursprüngliche Leitungsbreite nicht verändern');
assert(visualStage.lastClone?.layer?.style?.values?.transform === 'translate(64px, 54px)', 'Der intelligente Zuschnitt muss die Leitungs- und Objektkoordinaten gemeinsam verschieben');

const sourceAssertions = [
    ['cloneNode(true)', 'Export muss eine isolierte Bühnenkopie verwenden'],
    ["clone.style.setProperty('zoom', '1')", 'Export muss den Editor-Zoom auf 1 einfrieren'],
    ["clone.style.setProperty('transform', `scale(${scale})`)", 'Export muss eine zu breite Skizze proportional verkleinern'],
    ['maxPrintWidth = 650', 'Export muss eine definierte Druckbreite für die Anpassung verwenden'],
    ["clone.style.setProperty('min-width'", 'Export muss die Bühnenbreite einfrieren'],
    ['mk-print-geometry-svg-only', 'PDF-Kopie muss die SVG-Leitungsebene als einzige lange Leitungsquelle markieren'],
    ['.mk-connection-line', 'PDF-Kopie muss alte HTML-Leitungsreste aus dem Druckklon entfernen'],
    ['getTopologyMarkup()', 'Druckansicht muss die geprüfte Skizzen-Snapshot-Funktion verwenden'],
    ['preserveAspectRatio="none" die Leitungen', 'Die Leitungs-SVG darf bei erweitertem Infobox-Raum nicht skaliert werden'],
    ['collectVisualBounds(stage, topologyWidth, topologyHeight)', 'PDF muss den tatsächlichen sichtbaren Inhaltsrahmen statt der Arbeitsfläche verwenden'],
    ['cropPadding = visualBounds.measured ? 24 : 0', 'PDF muss einen kleinen Sicherheitsrand um den sichtbaren Inhalt erhalten']
];
sourceAssertions.forEach(([needle, message]) => assert(exportSource.includes(needle), message));
assert(connectionsSource.includes('function dedupeWireMarkup'), 'Leitungsebene muss doppelte SVG-Pfade deduplizieren');
assert(connectionsSource.includes('new Set()'), 'Leitungs-Deduplizierung muss bereits gerenderte Pfade merken');
assert(connectionsSource.includes('dedupeWireMarkup(wires)'), 'Deduplizierung muss vor dem Einsetzen in die SVG-Ebene erfolgen');
assert(stylesSource.includes('.mk-print-canvas-frame'), 'Druck-CSS muss den äußeren Skizzenrahmen stylen');
assert(stylesSource.includes('.mk-print-canvas-stage'), 'Druck-CSS muss die eingefrorene Bühne stylen');
assert(stylesSource.includes('.mk-print-geometry-svg-only'), 'Druck-CSS muss die SVG-only-Kopie erkennen');
assert(/\.mk-print-geometry-svg-only[\s\S]*?display:\s*none\s*!important/.test(stylesSource), 'Druck-CSS muss alte HTML-Leitungsreste nur im PDF ausblenden');
assert(/\.mk-print-topology \.mk-drop-zone\s*\{[\s\S]*?padding:\s*0;/.test(stylesSource), 'Druck-CSS darf die gemessenen Drop-Zonen nicht mit eigenem Innenabstand verschieben');
assert(!/\.mk-print-topology\s*>\s*div\s*\{/.test(stylesSource), 'Druck-Padding darf nicht direkt auf die SVG-Bühne gelegt werden');
assert(/export\.js\?v=22/.test(indexSource), 'Exportmodul muss mit neuem Cache-Buster geladen werden');
assert(/APP_VERSION\s*=\s*['"]2026\.08.25-beta\.379['"]/.test(workerSource), 'Service Worker muss den neuen Exportstand cachen');

console.log('PDF-Leitungsgeometrie-Test: OK');
