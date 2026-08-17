'use strict';

/*
 * Architekturgrenzen-Test
 *
 * Layout-Berechnungen gehören in layout-calculations.js. Das DOM-Modul darf
 * sie nur orchestrieren. Dieser Test verhindert, dass nach einer Reparatur
 * versehentlich eine zweite, leicht abweichende Rechenlogik zurückkehrt.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const layoutPath = path.join(root, 'js/messkonzept/layout.js');
const calculationsPath = path.join(root, 'js/messkonzept/layout-calculations.js');
const layoutText = fs.readFileSync(layoutPath, 'utf8');
const calculationsText = fs.readFileSync(calculationsPath, 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(
    calculationsText.includes('function createLayoutCalculations'),
    'layout-calculations.js muss die zentrale Berechnungsfabrik exportieren'
);
assert(
    layoutText.includes('global.WattspurMesskonzeptLayoutCalculations?.createLayoutCalculations'),
    'layout.js muss die ausgelagerte Berechnungs-API injizieren'
);
assert(
    layoutText.includes('layout-calculations.js muss vor layout.js geladen werden'),
    'layout.js muss bei fehlender Berechnungs-API verständlich und früh abbrechen'
);

[
    'getAssetsPerRow',
    'getSimpleCanvasMinimumWidth',
    'getWidestRailCellCount',
    'getParallelBranchWidth',
    'getZoneMeterDepth',
    'getParallelLayoutMetrics',
    'getReservedMeterSlots',
    'getRailEntries'
].forEach(method => {
    assert(
        layoutText.includes(`return calculations.${method}(`),
        `layout.js muss ${method} ausschließlich an die zentrale Berechnung delegieren`
    );
});

[
    'const cardWidth =',
    'const cardGap =',
    'const rightPadding =',
    'const dropZonePadding =',
    'const countRailCells =',
    'const railIndent =',
    'const branchGap = 16'
].forEach(fragment => {
    assert(!layoutText.includes(fragment), `layout.js enthält noch eine doppelte Layoutformel: ${fragment}`);
});

// Der fail-fast-Vertrag ist ausführbar und nicht nur ein Textvergleich.
const context = { window: {}, console };
vm.createContext(context);
let threwWithoutCalculations = false;
try {
    vm.runInContext(`${layoutText}; window.WattspurMesskonzeptLayout.createLayoutController();`, context, {
        filename: 'js/messkonzept/layout.js'
    });
} catch (error) {
    threwWithoutCalculations = /layout-calculations\.js/.test(error.message);
}
assert(threwWithoutCalculations, 'layout.js muss ohne layout-calculations.js kontrolliert fehlschlagen');

console.log('Architektur-Grenzen-Test: OK (zentrale Layoutberechnung, kein doppelter Fallback)');
