'use strict';

/* Browserfreier Regressionstest für den optionalen Wirtschaftlichkeits-Check. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { window: {}, Intl, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/messkonzept/decision-calculator.js'), 'utf8'), context, {
    filename: 'decision-calculator.js'
});

const calculator = context.window.WattspurMesskonzeptDecisionCalculator;
if (!calculator) throw new Error('Wirtschaftlichkeits-Check-Modul wurde nicht geladen.');

const result = calculator.calculate({
    oneTimeCost: 5250,
    meterFee: 120,
    consumption: 3500,
    commonElectricityPrice: 40,
    specialTariffPrice: 22,
    module1Reduction: 150,
    module2WorkPrice: 8,
    netEntgeltModule: 'both',
    heatPumpPrivilege: true
});

if (!result.valid) throw new Error('Vollständige Eingaben müssen berechnet werden.');
if (result.investment !== 5250) throw new Error('Einmalige Gesamtkosten werden nicht korrekt übernommen.');
if (Math.abs(result.privilegeSaving - 48.545) > 0.001) throw new Error('Die Wärmepumpenprivilegierung wird nicht mit den hinterlegten Umlagewerten berechnet.');
if (result.module1Saving !== 150 || result.module2Saving !== 168) throw new Error('Modul 1 und Modul 2 werden nicht getrennt berechnet.');
if (Math.abs(result.commonAnnualCost - 1250) > 0.001 || Math.abs(result.separateAnnualCostByModule.module1 - 691.455) > 0.001 || Math.abs(result.separateAnnualCostByModule.module2 - 673.455) > 0.001) {
    throw new Error('Gemeinsame und separate Jahreskosten werden nicht korrekt verrechnet.');
}
if (Math.abs(result.tariffSaving - 630) > 0.001 || Math.abs(result.annualNetSavingByModule.module1 - 558.545) > 0.001 || Math.abs(result.annualNetSavingByModule.module2 - 576.545) > 0.001) {
    throw new Error('Tarifvorteil, Modulvorteile, Wärmepumpenprivileg und Messentgelt werden nicht korrekt verrechnet.');
}
if (result.selectedModule !== 'both' || result.enfgUmlageCtPerKwh !== 1.387) throw new Error('Modulvergleich und aktuelle Umlagebasis fehlen.');
const chart = calculator.buildChart(result);
if (!chart.includes('Gemeinsame Messung') || !chart.includes('Separate Messung') || !chart.includes('Kumulierte Kosten')) {
    throw new Error('Der Kostenvergleich muss beide kumulierten Kostenverläufe als Graph ausgeben.');
}
if (!(result.amortization.byModule.module1.optimistic < result.amortization.byModule.module1.expected && result.amortization.byModule.module1.expected < result.amortization.byModule.module1.conservative)) {
    throw new Error('Die Sensitivität muss eine nachvollziehbare Amortisationsspanne liefern.');
}

const incomplete = calculator.calculate({ ...calculator.EXAMPLE_VALUES, meterFee: '' });
if (incomplete.valid || !incomplete.missing.includes('meterFee')) throw new Error('Unvollständige Eingaben müssen verständlich erkannt werden.');

console.log('Decision-Calculator-Test: OK (Spanne, Sensitivität und Pflichtfelder geprüft)');
