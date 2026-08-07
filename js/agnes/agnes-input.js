/**
 * AgNes Input Model (js/agnes/agnes-input.js)
 * Validates and prepares input structures for AgNes optimization
 */

function createAgnesInput(snapshot, overrides = {}) {
    const datasets = snapshot.datasets || [];
    const activeIds = snapshot.activeDatasetIds || [];
    const activeDatasets = datasets.filter(ds => activeIds.includes(ds.id));
    const targetDatasets = activeDatasets.length > 0 ? activeDatasets : datasets;

    const kp = overrides.kp !== undefined ? parseFloat(overrides.kp) : 50.0;
    const ap1 = overrides.ap1 !== undefined ? parseFloat(overrides.ap1) : 1.5;
    const ap2 = overrides.ap2 !== undefined ? parseFloat(overrides.ap2) : 4.5;
    const minPercent = overrides.minPercent !== undefined ? parseFloat(overrides.minPercent) : 0.1;
    const plannedK = overrides.plannedK !== undefined ? parseFloat(overrides.plannedK) : null;
    const strategy = overrides.strategy || 'avg';
    const lambda = overrides.lambda !== undefined ? parseFloat(overrides.lambda) : 0.0;

    const analysisType = targetDatasets.length > 1 ? 'MULTI_YEAR' : 'SINGLE_YEAR';

    return {
        analysisType: analysisType,
        targetDatasets: targetDatasets,
        parameters: {
            kp: Math.max(0, isNaN(kp) ? 50.0 : kp),
            ap1: Math.max(0, isNaN(ap1) ? 1.5 : ap1),
            ap2: Math.max(0, isNaN(ap2) ? 4.5 : ap2),
            minPercent: Math.max(0.1, Math.min(1.0, isNaN(minPercent) ? 0.1 : minPercent)),
            plannedK: (plannedK !== null && !isNaN(plannedK) && plannedK > 0) ? plannedK : null,
            strategy: strategy,
            lambda: lambda
        },
        valid: targetDatasets.length > 0 && targetDatasets.some(ds => ds.data && ds.data.length > 0)
    };
}

if (typeof window !== 'undefined') {
    window.createAgnesInput = createAgnesInput;
}
