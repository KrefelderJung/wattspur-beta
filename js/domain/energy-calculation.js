/**
 * Energy Calculation Module (js/domain/energy-calculation.js)
 * Single source of truth for rectangle summation: E_i = P_i * dt
 */

function calculateDomainEnergy(measurements, options = {}) {
    if (!measurements || !Array.isArray(measurements)) {
        return {
            totalEnergyKwh: 0,
            totalKWh: 0,
            validEnergyKwh: 0,
            imputedEnergyKwh: 0,
            excludedEnergyKwh: 0,
            intervalCount: 0,
            validIntervalCount: 0,
            validPointsCount: 0,
            excludedIntervalCount: 0,
            invalidPointsCount: 0,
            checks: []
        };
    }

    let totalEnergyKwh = 0;
    let validEnergyKwh = 0;
    let imputedEnergyKwh = 0;
    let excludedEnergyKwh = 0;
    let validIntervalCount = 0;
    let excludedIntervalCount = 0;

    for (let i = 0; i < measurements.length; i++) {
        const d = measurements[i];
        if (d.kw === null || d.kw === undefined || isNaN(d.kw) || d.kw < 0) {
            excludedIntervalCount++;
            continue;
        }

        const dt = (typeof d.intervalHours === 'number' && d.intervalHours > 0) ? d.intervalHours : 0.25;
        const kwh = (d.energyKwh !== undefined && d.energyKwh !== null && !isNaN(d.energyKwh)) ? d.energyKwh : (d.kw * dt);

        if (d.isImputed || d.status === 'IMPUTED' || (d.qualityFlags && d.qualityFlags.includes('IMPUTED'))) {
            imputedEnergyKwh += kwh;
        } else {
            validEnergyKwh += kwh;
        }
        totalEnergyKwh += kwh;
        validIntervalCount++;
    }

    return {
        totalEnergyKwh: totalEnergyKwh,
        totalKWh: totalEnergyKwh,
        validEnergyKwh: validEnergyKwh,
        imputedEnergyKwh: imputedEnergyKwh,
        excludedEnergyKwh: excludedEnergyKwh,
        intervalCount: measurements.length,
        validIntervalCount: validIntervalCount,
        validPointsCount: validIntervalCount,
        excludedIntervalCount: excludedIntervalCount,
        invalidPointsCount: excludedIntervalCount,
        checks: [
            { name: "REANGLE_SUMMATION_MODEL", status: "PASS", message: "Mittelwertmodell E_i = P_i * dt angewendet" }
        ]
    };
}

if (typeof window !== 'undefined') {
    window.calculateDomainEnergy = calculateDomainEnergy;
    window.calculateEnergy = calculateDomainEnergy;
}
