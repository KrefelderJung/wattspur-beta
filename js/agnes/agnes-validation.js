/**
 * AgNes Validation Module (js/agnes/agnes-validation.js)
 */

function validateAgnesResult(res, coverageRatio = 1.0) {
    const checks = [];
    let valid = true;

    if (!res || !res.optResult) {
        return {
            valid: false,
            status: 'RED',
            allowRecommendation: false,
            checks: [{ name: 'RESULT_NULL', status: 'FAIL', message: 'Ergebnisobjekt fehlt' }]
        };
    }

    const { optResult, pMax, kMin } = res;

    const sumEnergy = optResult.eWithin + optResult.eExceed;
    const energyDiff = Math.abs(sumEnergy - optResult.eTotal);
    if (energyDiff < 0.1) {
        checks.push({ name: 'ENERGY_SUM_INVARIANT', status: 'PASS', message: 'E_AP1 + E_AP2 = E_Gesamt erfüllt' });
    } else {
        valid = false;
        checks.push({ name: 'ENERGY_SUM_INVARIANT', status: 'FAIL', message: `Energieinvariante verletzt: Differenz ${energyDiff} kWh` });
    }

    const sumCost = optResult.capCost + optResult.energyCostAp1 + optResult.energyCostAp2;
    const costDiff = Math.abs(sumCost - optResult.totalCost);
    if (costDiff < 0.01) {
        checks.push({ name: 'COST_SUM_INVARIANT', status: 'PASS', message: 'Kostenbestandteile ergeben Gesamtsumme' });
    } else {
        valid = false;
        checks.push({ name: 'COST_SUM_INVARIANT', status: 'FAIL', message: `Kosteninvariante verletzt: Differenz ${costDiff} €` });
    }

    if (optResult.K >= (kMin - 0.001)) {
        checks.push({ name: 'BNETZA_MIN_CAPACITY', status: 'PASS', message: `Bestellleistung K (${optResult.K.toFixed(1)} kW) erfüllt 10%-Sperre` });
    } else {
        valid = false;
        checks.push({ name: 'BNETZA_MIN_CAPACITY', status: 'FAIL', message: 'Bestellleistung liegt unter der gesetzlichen 10%-Schwelle' });
    }

    let status = 'GREEN';
    let allowRecommendation = true;

    if (!valid || coverageRatio < 0.95) {
        status = 'RED';
        allowRecommendation = false;
    } else if (coverageRatio < 0.98) {
        status = 'YELLOW';
        allowRecommendation = true;
    }

    return {
        valid: valid,
        status: status,
        allowRecommendation: allowRecommendation,
        checks: checks
    };
}

if (typeof window !== 'undefined') {
    window.validateAgnesResult = validateAgnesResult;
}
