'use strict';

/* Geometrischer Regressionstest für den Edge-Fallback der Parallelmessung. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const exportSource = fs.readFileSync(path.join(root, 'js', 'messkonzept', 'export.js'), 'utf8');

class FakeElement {
    constructor(rect) {
        this.rect = {
            ...rect,
            right: rect.right ?? rect.left + rect.width,
            bottom: rect.bottom ?? rect.top + rect.height
        };
        this.offsetWidth = this.rect.width;
        this.offsetHeight = this.rect.height;
        this.selectors = new Map();
        this.selectorLists = new Map();
    }
    getBoundingClientRect() { return this.rect; }
    querySelector(selector) { return this.selectors.get(selector) || null; }
    querySelectorAll(selector) { return this.selectorLists.get(selector) || []; }
    set(selector, element) { this.selectors.set(selector, element); return this; }
    setAll(selector, elements) { this.selectorLists.set(selector, elements); return this; }
}

const stage = new FakeElement({ left: 0, top: 0, width: 1000, height: 500 });
const stack = new FakeElement({ left: 0, top: 0, width: 1000, height: 400 });
const head = new FakeElement({ left: 490, top: 20, width: 20, height: 60 });
const hak = new FakeElement({ left: 490, top: 20, width: 20, height: 60 });
const feed = new FakeElement({ left: 499, top: 80, width: 2, height: 30 });
const branches = [
    { connector: { left: 200, top: 200, width: 2, height: 30 }, meter: { left: 170, top: 230, width: 62, height: 40 } },
    { connector: { left: 800, top: 200, width: 2, height: 30 }, meter: { left: 770, top: 230, width: 62, height: 40 } }
].map(({ connector, meter }) => {
    const branch = new FakeElement({ left: connector.left - 30, top: 200, width: 100, height: 100 });
    branch.set(':scope > .mk-parallel-branch-connector', new FakeElement(connector));
    branch.set(':scope > .mk-meter-layout > .mk-meter-node, :scope > .mk-meter-layout > .mk-meter-detail-card', new FakeElement(meter));
    return branch;
});

stage.set('.mk-parallel-stack', stack);
stack.set(':scope > .mk-parallel-hak-head', head)
    .set(':scope > .mk-parallel-feed', feed)
    .setAll(':scope > .mk-parallel-branches > .mk-parallel-branch', branches);
head.set(':scope > .mk-hak-node', hak);

const context = { window: {}, console };
vm.createContext(context);
const testableSource = exportSource.replace(
    'return Object.freeze({',
    'return Object.freeze({ __testRenderNativeParallelHakWires: renderNativeParallelHakWires,'
);
vm.runInContext(testableSource, context, { filename: 'js/messkonzept/export.js' });
const api = context.window.WattspurMesskonzeptExport.createExporter();
const markup = api.__testRenderNativeParallelHakWires(stage, 0, 0);

assert(markup.includes('mk-export-parallel-hak-feed'), 'Der native Feed vom HAK muss gezeichnet werden');
assert(markup.includes('mk-export-parallel-bus'), 'Der gemeinsame Parallelbus muss gezeichnet werden');
assert((markup.match(/mk-export-parallel-branch-wire/g) || []).length === 2,
    'Jeder Parallelzweig muss einen eigenen Abgang vom Bus erhalten');
assert(markup.includes('M 500.00 80.00 V 200.00 H 500.00'),
    'Der Feed muss am HAK beginnen und am gemeinsamen Bus enden');

console.log('PNG-Parallel-HAK-Leitungstest: OK');
