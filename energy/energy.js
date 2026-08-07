// energy/energy.js - Central Energy Summation & Conversion Module (Punkte 61-69)

/**
 * Zentrale Berechnungsfunktion calculateEnergy() (Punkt 61)
 * Berechnet Energiemenge in kWh über exakte Rechtecksummation E_i = P_i * dt
 */
function calculateEnergy(points, options = {}) {
    if (!points || !Array.isArray(points) || points.length === 0) {
        return {
            totalEnergyKwh: 0.0,
            totalKWh: 0.0,
            validIntervalCount: 0,
            validPointsCount: 0,
            imputedPointsCount: 0,
            invalidPointsCount: 0,
            intervalHours: 0.25
        };
    }

    let totalKWh = 0.0;
    let validCount = 0;
    let imputedCount = 0;
    let invalidCount = 0;

    points.forEach(p => {
        if (p.kw === null || p.kw === undefined || isNaN(p.kw)) {
            invalidCount++;
            return;
        }

        const intervalHours = (p.intervalHours && p.intervalHours > 0) ? p.intervalHours : 0.25;
        const kWh = p.kw * intervalHours;
        totalKWh += kWh;

        if (p.status === 'IMPUTED') {
            imputedCount++;
        } else {
            validCount++;
        }
    });

    return {
        totalEnergyKwh: totalKWh,
        totalKWh: totalKWh,
        validIntervalCount: validCount,
        validPointsCount: validCount,
        imputedPointsCount: imputedCount,
        invalidPointsCount: invalidCount,
        intervalHours: 0.25
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateEnergy };
}

if (typeof window !== 'undefined') {
    window.calculateEnergy = calculateEnergy;
}
