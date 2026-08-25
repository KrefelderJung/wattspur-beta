'use strict';

/* Regressionstest: PDF-Export darf nicht an PNG-spezifischer Clone-Logik scheitern. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'messkonzept', 'export.js'), 'utf8');
const pdfStart = source.indexOf('function downloadPdf');
const exportApiStart = source.indexOf('return Object.freeze', pdfStart);
assert.ok(pdfStart >= 0 && exportApiStart > pdfStart, 'PDF-Exportfunktion fehlt.');
const pdfFunction = source.slice(pdfStart, exportApiStart);
assert.ok(!pdfFunction.includes('clone.'), 'PDF-Export darf keine PNG-Clone-Variable verwenden.');

const printSheet = { remove() {} };
const wrapper = {
    firstElementChild: printSheet,
    set innerHTML(value) {
        this.html = value;
    }
};
let printed = false;
let appended = false;
const documentRef = {
    title: 'Ausgangstitel',
    createElement(tagName) {
        assert.strictEqual(tagName, 'div', 'PDF-Export muss ein Druck-Wrapper-Element anlegen.');
        return wrapper;
    },
    body: {
        appendChild(node) {
            appended = node === printSheet;
        },
        contains() {
            return false;
        },
        classList: {
            add() {},
            remove() {}
        }
    }
};
const windowRef = {
    addEventListener(eventName) {
        assert.strictEqual(eventName, 'afterprint', 'PDF-Export muss den Druckabschluss berücksichtigen.');
    },
    setTimeout(callback) {
        callback();
        return 1;
    },
    print() {
        printed = true;
    }
};
const context = {
    window: {},
    console,
    Intl,
    Date,
    setTimeout
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'js/messkonzept/export.js' });
const exporter = context.window.WattspurMesskonzeptExport.createExporter({
    getDocument: () => documentRef,
    getWindow: () => windowRef,
    renderPrintSheet: () => '<section class="mk-print-sheet">PDF</section>',
    getState: () => ({ project: {} }),
    notify: () => {}
});

assert.doesNotThrow(() => exporter.downloadPdf(), 'PDF-Export darf im Druckpfad keinen JavaScript-Fehler auslösen.');
assert.ok(appended, 'PDF-Druckseite muss in das Dokument eingesetzt werden.');
assert.ok(printed, 'PDF-Export muss den Browser-Druckdialog aufrufen.');

console.log('PDF-Browser-Export-Test: OK');