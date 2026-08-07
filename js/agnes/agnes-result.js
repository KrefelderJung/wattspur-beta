/**
 * AgNes Result Model (js/agnes/agnes-result.js)
 */

function createCanonicalAgnesResult(input) {
    const uuidGen = (typeof window !== 'undefined' && window.generateUUID) ? window.generateUUID : function() { return Math.random().toString(); };
    return {
        calculationId: input.calculationId || uuidGen(),
        calculationTimestamp: input.calculationTimestamp || new Date().toISOString(),
        toolVersion: input.toolVersion || (typeof LASTGANG_APP_VERSION !== 'undefined' ? LASTGANG_APP_VERSION : '2026.08.07-beta.2'),
        modelVersion: input.modelVersion || 'capacity-scenario-beta-2026-05-27',
        analysisType: input.analysisType || 'SINGLE_YEAR',
        
        pMax: input.pMax || 0,
        pMaxOverall: input.pMaxOverall || input.pMax || 0,
        kMin: input.kMin || 0,
        kMinOverall: input.kMinOverall || input.kMin || 0,
        plannedK: input.plannedK || null,
        optK: input.optK || 0,
        
        optResult: input.optResult || null,
        maxResult: input.maxResult || null,
        minResult: input.minResult || null,
        plannedResult: input.plannedResult || null,
        
        sweepResults: input.sweepResults || [],
        datasetInfos: input.datasetInfos || [],
        equivalentRange: input.equivalentRange || { minK: 0, maxK: 0, thresholdCost: 0 },
        marginalExceedHours: input.marginalExceedHours || 0,
        flexibilityPremiumEur: input.flexibilityPremiumEur || 0,
        
        qualityPlausibility: input.qualityPlausibility || { status: 'GREEN', allowRecommendation: true, checks: [] },
        warnings: input.warnings || [],
        errors: input.errors || []
    };
}

if (typeof window !== 'undefined') {
    window.createCanonicalAgnesResult = createCanonicalAgnesResult;
}
