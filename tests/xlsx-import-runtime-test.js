'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/import/xlsx-parser.js'), 'utf8');

const sheetXml = '<worksheet><sheetData>'
    + '<row r="1"><c r="A1" t="inlineStr"><is><t>Datum</t></is></c><c r="B1" t="inlineStr"><is><t>Uhrzeit</t></is></c><c r="C1" t="inlineStr"><is><t>Hausverbrauch (kW)</t></is></c></row>'
    + '<row r="2"><c r="A2" t="inlineStr"><is><t>01.01.2026</t></is></c><c r="B2" t="inlineStr"><is><t>00:15</t></is></c><c r="C2"><v>1.25</v></c></row>'
    + '<row r="3"><c r="A3" t="inlineStr"><is><t>01.01.2026</t></is></c><c r="B3" t="inlineStr"><is><t>00:30</t></is></c><c r="C3"><v>1.50</v></c></row>'
    + '</sheetData></worksheet>';

const fakeZip = {
    file(selector) {
        if (typeof selector !== 'string') return [{ async: async () => sheetXml }];
        const contents = {
            'xl/workbook.xml': '<workbook><workbookPr date1904="0"/></workbook>',
            'xl/sharedStrings.xml': ''
        };
        return contents[selector] ? { async: async () => contents[selector] } : null;
    }
};

const context = { console, Math, Number, Date, Promise, Uint8Array, ArrayBuffer };
context.JSZip = { loadAsync: async () => fakeZip };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'xlsx-parser.js' });

(async () => {
    const result = await context.parseXlsxArrayBuffer(new Uint8Array([1, 2, 3]).buffer, 'test.xlsx');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.datasets.length, 1);
    assert.strictEqual(result.datasets[0].name, 'Hausverbrauch (kW)');
    assert.strictEqual(result.datasets[0].data.length, 2);
    assert.strictEqual(result.datasets[0].data[0].kw, 1.25);
    assert.strictEqual(result.datasets[0].importedUnit, 'kw');
    console.log('XLSX-Import-Laufzeittest: OK');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
