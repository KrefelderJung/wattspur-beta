/**
 * AgNes Multi Year Optimizer (js/agnes/agnes-multi-year.js)
 */

function optimizeAgnesMultiYear(datasets, kp, ap1, ap2, minPercent = 0.1, plannedK = null, options = {}) {
    kp = Math.max(0, parseFloat(kp) || 0);
    ap1 = Math.max(0, parseFloat(ap1) || 0);
    ap2 = Math.max(0, parseFloat(ap2) || 0);
    if (ap2 < ap1) ap2 = ap1;
    minPercent = Math.max(0.1, Math.min(1.0, parseFloat(minPercent) || 0.1));

    const strategy = (options && options.strategy) ? options.strategy : 'avg';
    const lambda = (options && options.lambda) ? parseFloat(options.lambda) || 0.0 : 0.0;
    const optSingleFn = (typeof window !== 'undefined' && window.optimizeAgnesSingleYear) ? window.optimizeAgnesSingleYear : optimizeAgnesSingleYear;
    const valFn = (typeof window !== 'undefined' && window.validateAgnesResult) ? window.validateAgnesResult : validateAgnesResult;
    const resFn = (typeof window !== 'undefined' && window.createCanonicalAgnesResult) ? window.createCanonicalAgnesResult : createCanonicalAgnesResult;

    if (!datasets || datasets.length === 0) {
        return resFn({
            analysisType: 'MULTI_YEAR',
            optResult: { totalCost: 0, capCost: 0, energyCostAp1: 0, energyCostAp2: 0, eWithin: 0, eExceed: 0, eTotal: 0 }
        });
    }

    const datasetInfos = datasets.map(ds => {
        const seenTimestamps = new Set();
        const cleanData = [];
        (ds.data || []).forEach(d => {
            const p = d.kw !== undefined ? d.kw : (d.powerKw || 0);
            if (p === null || p === undefined || isNaN(p) || p < 0 || p > 100000) return;
            if (d.timestamp) {
                if (seenTimestamps.has(d.timestamp)) return;
                seenTimestamps.add(d.timestamp);
            }
            cleanData.push(d);
        });

        let pMax = 0;
        cleanData.forEach(d => {
            const p = d.kw !== undefined ? d.kw : (d.powerKw || 0);
            if (p > pMax) pMax = p;
        });

        let scaleFactorS = 1.0;
        let elapsedDays = 365;
        let expectedIntervals = 35040;
        let coveragePercent = 100;
        let isIncomplete = false;

        if (cleanData.length > 0) {
            const minDate = cleanData[0].dateObj || new Date(cleanData[0].timestamp || Date.now());
            const maxDate = cleanData[cleanData.length - 1].dateObj || new Date(cleanData[cleanData.length - 1].timestamp || Date.now());
            if (minDate && maxDate) {
                const durationMs = maxDate.getTime() - minDate.getTime() + 15 * 60 * 1000;
                const year = minDate.getFullYear();
                const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
                const annualHours = isLeap ? 8784 : 8760;
                expectedIntervals = annualHours * 4;
                
                const elapsedHours = durationMs / (1000 * 60 * 60);
                elapsedDays = durationMs / (1000 * 60 * 60 * 24);
                
                const coverageRatio = expectedIntervals > 0 ? (cleanData.length / expectedIntervals) : 1.0;
                coveragePercent = Math.min(100, Math.round(coverageRatio * 100));
                isIncomplete = coveragePercent < 98;

                if (elapsedHours > 0) {
                    scaleFactorS = annualHours / elapsedHours;
                }
            }
        }

        const singleYearResult = optSingleFn(cleanData, kp, ap1, ap2, minPercent, scaleFactorS);

        return {
            name: ds.name,
            cleanData: cleanData,
            pMax: pMax,
            optKSingleYear: singleYearResult ? singleYearResult.optK : pMax,
            optResultSingleYear: singleYearResult ? singleYearResult.optResult : null,
            kMin: pMax * minPercent,
            scaleFactorS: scaleFactorS,
            elapsedDays: elapsedDays,
            expectedIntervals: expectedIntervals,
            validIntervalCount: cleanData.length,
            coveragePercent: coveragePercent,
            isIncomplete: isIncomplete
        };
    });

    let pMaxOverall = 0;
    let searchLowerBound = Infinity;
    datasetInfos.forEach(info => {
        if (info.pMax > pMaxOverall) pMaxOverall = info.pMax;
        if (info.kMin < searchLowerBound) searchLowerBound = info.kMin;
    });
    if (searchLowerBound === Infinity || searchLowerBound < 0) searchLowerBound = 0;

    const kMinOverall = pMaxOverall * minPercent;
    let plannedKVal = kMinOverall;
    if (plannedK !== null && !isNaN(plannedK) && plannedK > 0) {
        plannedKVal = Math.max(searchLowerBound, Math.min(pMaxOverall, plannedK));
    }

    function computeCostMultiForK(K) {
        let totalCapCost = 0;
        let totalEnergyCostAp1 = 0;
        let totalEnergyCostAp2 = 0;
        let totalCost = 0;
        let totalEWithin = 0;
        let totalEExceed = 0;
        let totalETotal = 0;
        const yearlyDetails = [];

        datasetInfos.forEach(info => {
            const actualK = Math.max(K, info.kMin);
            let eExceed = 0;
            let eTotal = 0;

            info.cleanData.forEach(d => {
                const p = d.kw !== undefined ? d.kw : (d.powerKw || 0);
                const dt = (typeof d.intervalHours === 'number' && d.intervalHours > 0) ? d.intervalHours : 0.25;
                const kwh = (d.energyKwh !== undefined && d.energyKwh !== null) ? d.energyKwh : (p * dt);
                eTotal += kwh;
                if (p > actualK) {
                    eExceed += (p - actualK) * dt;
                }
            });

            const eWithin = eTotal - eExceed;
            const capCost = kp * actualK;
            const energyCostAp1 = (eWithin * (ap1 / 100)) * info.scaleFactorS;
            const energyCostAp2 = (eExceed * (ap2 / 100)) * info.scaleFactorS;
            const yearlyTotal = capCost + energyCostAp1 + energyCostAp2;

            const scaledEWithin = eWithin * info.scaleFactorS;
            const scaledEExceed = eExceed * info.scaleFactorS;
            const scaledETotal = eTotal * info.scaleFactorS;

            totalCapCost += capCost;
            totalEnergyCostAp1 += energyCostAp1;
            totalEnergyCostAp2 += energyCostAp2;
            totalCost += yearlyTotal;

            totalEWithin += scaledEWithin;
            totalEExceed += scaledEExceed;
            totalETotal += scaledETotal;

            yearlyDetails.push({
                name: info.name,
                pMax: info.pMax,
                optKSingleYear: info.optKSingleYear,
                actualK: actualK,
                capCost: capCost,
                energyCostAp1: energyCostAp1,
                energyCostAp2: energyCostAp2,
                totalCost: yearlyTotal,
                eTotal: scaledETotal,
                eExceed: scaledEExceed,
                eWithin: scaledEWithin
            });
        });

        return {
            K: K,
            capCost: totalCapCost,
            energyCostAp1: totalEnergyCostAp1,
            energyCostAp2: totalEnergyCostAp2,
            totalCost: totalCost,
            eWithin: totalEWithin,
            eExceed: totalEExceed,
            eTotal: totalETotal,
            yearlyDetails: yearlyDetails
        };
    }

    const sweepSteps = 150;
    let optK = pMaxOverall;
    let minEvalScore = Infinity;
    let optResult = null;

    const exactCandidatesSet = new Set([searchLowerBound, kMinOverall, pMaxOverall, plannedKVal]);
    datasetInfos.forEach(info => {
        exactCandidatesSet.add(info.pMax);
        exactCandidatesSet.add(info.kMin);
        info.cleanData.forEach(d => {
            const p = d.kw !== undefined ? d.kw : (d.powerKw || 0);
            if (p >= searchLowerBound && p <= pMaxOverall) {
                exactCandidatesSet.add(p);
            }
        });
    });

    for (let i = 0; i <= sweepSteps; i++) {
        const K = searchLowerBound + (pMaxOverall - searchLowerBound) * (i / sweepSteps);
        exactCandidatesSet.add(K);
    }

    const exactCandidates = Array.from(exactCandidatesSet);

    exactCandidates.forEach(candK => {
        if (candK >= searchLowerBound && candK <= pMaxOverall) {
            const res = computeCostMultiForK(candK);
            let evalScore = res.totalCost;
            if (strategy === 'worst_case') {
                const maxYearCost = Math.max(...res.yearlyDetails.map(d => d.totalCost));
                evalScore = maxYearCost * datasetInfos.length;
            } else if (strategy === 'risk_adjusted' && lambda > 0) {
                const meanCost = res.totalCost / datasetInfos.length;
                const variance = res.yearlyDetails.reduce((sum, d) => sum + Math.pow(d.totalCost - meanCost, 2), 0) / datasetInfos.length;
                const stdDev = Math.sqrt(variance);
                evalScore = (meanCost + lambda * stdDev) * datasetInfos.length;
            }

            if (evalScore < minEvalScore) {
                minEvalScore = evalScore;
                optK = candK;
                optResult = res;
            }
        }
    });

    const sweepResultsMap = new Map();
    exactCandidates.forEach(candK => {
        if (candK >= searchLowerBound && candK <= pMaxOverall) {
            if (!sweepResultsMap.has(candK)) {
                sweepResultsMap.set(candK, computeCostMultiForK(candK));
            }
        }
    });
    const sweepResults = Array.from(sweepResultsMap.values()).sort((a, b) => a.K - b.K);

    const maxResult = computeCostMultiForK(pMaxOverall);
    const minResult = computeCostMultiForK(kMinOverall);
    const plannedResult = computeCostMultiForK(plannedKVal);

    const bandThresholdCost = optResult.totalCost * 1.005;
    let minBandK = optK;
    let maxBandK = optK;
    sweepResults.forEach(res => {
        if (res.totalCost <= bandThresholdCost) {
            if (res.K < minBandK) minBandK = res.K;
            if (res.K > maxBandK) maxBandK = res.K;
        }
    });

    const indivSumCost = datasetInfos.reduce((sum, info) => {
        return sum + (info.optResultSingleYear ? info.optResultSingleYear.totalCost : 0);
    }, 0);
    const flexibilityPremiumEur = Math.max(0, optResult.totalCost - indivSumCost);

    const qualityPlausibility = valFn({ optResult, pMax: pMaxOverall, kMin: kMinOverall }, 1.0);

    return resFn({
        analysisType: 'MULTI_YEAR',
        pMaxOverall: pMaxOverall,
        kMinOverall: kMinOverall,
        plannedK: plannedKVal,
        optK: optK,
        optResult: optResult,
        maxResult: maxResult,
        minResult: minResult,
        plannedResult: plannedResult,
        sweepResults: sweepResults,
        datasetInfos: datasetInfos,
        equivalentRange: { minK: minBandK, maxK: maxBandK, thresholdCost: bandThresholdCost },
        flexibilityPremiumEur: flexibilityPremiumEur,
        qualityPlausibility: qualityPlausibility
    });
}

if (typeof window !== 'undefined') {
    window.optimizeAgnesMultiYear = optimizeAgnesMultiYear;
}
