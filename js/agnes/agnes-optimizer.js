/**
 * AgNes Single Year Optimizer (js/agnes/agnes-optimizer.js)
 */

function optimizeAgnesSingleYear(cleanData, kp, ap1, ap2, minPercent = 0.1, scaleFactorS = 1.0) {
    kp = Math.max(0, parseFloat(kp) || 0);
    ap1 = Math.max(0, parseFloat(ap1) || 0);
    ap2 = Math.max(0, parseFloat(ap2) || 0);
    if (ap2 < ap1) ap2 = ap1;
    minPercent = Math.max(0.1, Math.min(1.0, parseFloat(minPercent) || 0.1));

    const costFn = (typeof window !== 'undefined' && window.calculateAgnesCostForK) ? window.calculateAgnesCostForK : calculateAgnesCostForK;
    const valFn = (typeof window !== 'undefined' && window.validateAgnesResult) ? window.validateAgnesResult : validateAgnesResult;
    const resFn = (typeof window !== 'undefined' && window.createCanonicalAgnesResult) ? window.createCanonicalAgnesResult : createCanonicalAgnesResult;

    if (!cleanData || cleanData.length === 0) {
        return resFn({
            optResult: { totalCost: 0, capCost: 0, energyCostAp1: 0, energyCostAp2: 0, eWithin: 0, eExceed: 0, eTotal: 0 }
        });
    }

    let pMax = 0;
    cleanData.forEach(d => {
        const p = d.kw !== undefined ? d.kw : (d.powerKw || 0);
        if (p > pMax) pMax = p;
    });

    const kMin = pMax * minPercent;
    const sweepSteps = 150;
    let optK = pMax;
    let minCost = Infinity;
    let optResult = null;

    const candidateSet = new Set();
    candidateSet.add(kMin);
    candidateSet.add(pMax);

    const sortedPeaks = cleanData.map(d => d.kw !== undefined ? d.kw : (d.powerKw || 0)).filter(p => p >= kMin && p <= pMax).sort((a, b) => b - a);
    const stepPeak = Math.max(1, Math.floor(sortedPeaks.length / 200));
    for (let i = 0; i < sortedPeaks.length; i += stepPeak) {
        candidateSet.add(sortedPeaks[i]);
    }

    for (let i = 0; i <= sweepSteps; i++) {
        const K = kMin + (pMax - kMin) * (i / sweepSteps);
        candidateSet.add(K);
    }

    const candidateResults = [];
    candidateSet.forEach(K => {
        const res = costFn(cleanData, kp, ap1, ap2, K, scaleFactorS);
        candidateResults.push(res);

        if (res.totalCost < minCost) {
            minCost = res.totalCost;
            optK = K;
            optResult = res;
        }
    });

    const sweepResultsMap = new Map();
    candidateResults.forEach(res => {
        sweepResultsMap.set(res.K, res);
    });
    const sweepResults = Array.from(sweepResultsMap.values()).sort((a, b) => a.K - b.K);

    const bandThresholdCost = minCost * 1.005;
    let minBandK = optK;
    let maxBandK = optK;

    candidateResults.forEach(res => {
        if (res.totalCost <= bandThresholdCost) {
            if (res.K < minBandK) minBandK = res.K;
            if (res.K > maxBandK) maxBandK = res.K;
        }
    });

    const deltaAp = (ap2 - ap1) / 100;
    const marginalExceedHours = deltaAp > 0 ? (kp / deltaAp) : 0;

    const maxResult = costFn(cleanData, kp, ap1, ap2, pMax, scaleFactorS);
    const minResult = costFn(cleanData, kp, ap1, ap2, kMin, scaleFactorS);

    const qualityPlausibility = valFn({ optResult, pMax, kMin }, scaleFactorS >= 0.98 ? 1.0 : scaleFactorS);

    return resFn({
        pMax: pMax,
        kMin: kMin,
        optK: optK,
        optResult: optResult,
        maxResult: maxResult,
        minResult: minResult,
        sweepResults: sweepResults,
        equivalentRange: { minK: minBandK, maxK: maxBandK, thresholdCost: bandThresholdCost },
        marginalExceedHours: marginalExceedHours,
        qualityPlausibility: qualityPlausibility
    });
}

if (typeof window !== 'undefined') {
    window.optimizeAgnesSingleYear = optimizeAgnesSingleYear;
}
