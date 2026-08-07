// agnes/agnes.js - AgNes 2029 Cost Optimization Engine Module

function calculateAgnesReference(data, kp, ap1, ap2, minPercent = 0.1, scaleFactorS = 1.0) {
    if (!data || data.length === 0) return null;

    let pMax = 0;
    let cleanData = [];
    
    data.forEach(d => {
        if (d.kw === null || d.kw === undefined || d.kw < 0 || d.kw > 100000) return;
        cleanData.push(d);
        if (d.kw > pMax) pMax = d.kw;
    });

    if (cleanData.length === 0 || pMax === 0) return null;

    const kMin = pMax * minPercent;
    
    const candidateKs = new Set();
    candidateKs.add(kMin);
    candidateKs.add(pMax);
    cleanData.forEach(d => {
        if (d.kw >= kMin && d.kw <= pMax) {
            candidateKs.add(d.kw);
        }
    });

    let bestK = pMax;
    let minTotalCost = Infinity;
    let bestRefResult = null;

    Array.from(candidateKs).sort((a, b) => a - b).forEach(candidateK => {
        const actualK = Math.max(candidateK, kMin);
        const capCost = actualK * kp;
        
        let eWithin = 0;
        let eExceed = 0;
        let eTotal = 0;

        cleanData.forEach(d => {
            const p = d.kw;
            const e = p * 0.25;
            eTotal += e;
            if (p <= actualK) {
                eWithin += e;
            } else {
                eWithin += actualK * 0.25;
                eExceed += (p - actualK) * 0.25;
            }
        });

        const scaledEWithin = eWithin * scaleFactorS;
        const scaledEExceed = eExceed * scaleFactorS;
        const scaledETotal = eTotal * scaleFactorS;

        const energyCostAp1 = scaledEWithin * (ap1 / 100);
        const energyCostAp2 = scaledEExceed * (ap2 / 100);
        const totalCost = capCost + energyCostAp1 + energyCostAp2;

        if (totalCost < minTotalCost) {
            minTotalCost = totalCost;
            bestK = candidateK;
            bestRefResult = {
                pMax,
                optK: candidateK,
                capCost,
                energyCostAp1,
                energyCostAp2,
                totalCost,
                eWithin: scaledEWithin,
                eExceed: scaledEExceed,
                eTotal: scaledETotal
            };
        }
    });

    return bestRefResult;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateAgnesReference };
}
