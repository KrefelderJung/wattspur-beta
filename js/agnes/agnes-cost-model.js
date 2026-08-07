/**
 * AgNes Cost Model (js/agnes/agnes-cost-model.js)
 */

function calculateAgnesCostForK(measurements, kp, ap1, ap2, K, scaleFactorS = 1.0) {
    if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
        return {
            K: K,
            capCost: 0,
            energyCostAp1: 0,
            energyCostAp2: 0,
            totalCost: 0,
            eWithin: 0,
            eExceed: 0,
            eTotal: 0
        };
    }

    let eExceed = 0;
    let eTotal = 0;

    measurements.forEach(d => {
        const p = d.kw !== undefined ? d.kw : (d.powerKw || 0);
        if (p === null || p === undefined || isNaN(p) || p < 0) return;
        const dt = (typeof d.intervalHours === 'number' && d.intervalHours > 0) ? d.intervalHours : 0.25;
        const kwh = (d.energyKwh !== undefined && d.energyKwh !== null) ? d.energyKwh : (p * dt);
        
        eTotal += kwh;
        if (p > K) {
            eExceed += (p - K) * dt;
        }
    });

    const eWithin = eTotal - eExceed;
    const capCost = kp * K;
    const energyCostAp1 = (eWithin * (ap1 / 100)) * scaleFactorS;
    const energyCostAp2 = (eExceed * (ap2 / 100)) * scaleFactorS;
    const totalCost = capCost + energyCostAp1 + energyCostAp2;

    return {
        K: K,
        capCost: capCost,
        energyCostAp1: energyCostAp1,
        energyCostAp2: energyCostAp2,
        totalCost: totalCost,
        eWithin: eWithin * scaleFactorS,
        eExceed: eExceed * scaleFactorS,
        eTotal: eTotal * scaleFactorS
    };
}

if (typeof window !== 'undefined') {
    window.calculateAgnesCostForK = calculateAgnesCostForK;
}
