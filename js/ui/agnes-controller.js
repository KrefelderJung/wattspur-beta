/**
 * AgNes Controller Module (js/ui/agnes-controller.js)
 * Connects AppState, AgNes calculation modules, and AgnesView
 */

if (typeof window !== 'undefined') {
    if (typeof window.AgnesController === 'undefined') {
        window.AgnesController = {
            runAnalysis: function(overrideParams = {}) {
                const snapshot = window.AppState ? window.AppState.getSnapshot() : { datasets: [] };
                const input = window.createAgnesInput ? window.createAgnesInput(snapshot, overrideParams) : null;
                if (!input || !input.valid) return null;

                let result;
                if (input.analysisType === 'MULTI_YEAR') {
                    const multiFn = window.optimizeAgnesMultiYear || optimizeAgnesMultiYear;
                    result = multiFn(
                        input.targetDatasets,
                        input.parameters.kp,
                        input.parameters.ap1,
                        input.parameters.ap2,
                        input.parameters.minPercent,
                        input.parameters.plannedK,
                        { strategy: input.parameters.strategy, lambda: input.parameters.lambda }
                    );
                } else {
                    const singleFn = window.optimizeAgnesSingleYear || optimizeAgnesSingleYear;
                    const cleanData = input.targetDatasets[0] ? (input.targetDatasets[0].data || []) : [];
                    result = singleFn(
                        cleanData,
                        input.parameters.kp,
                        input.parameters.ap1,
                        input.parameters.ap2,
                        input.parameters.minPercent
                    );
                }

                if (window.AppState) {
                    window.AppState.setAnalysisResult('agnes', result);
                }

                if (window.AgnesView) {
                    window.AgnesView.renderAgnesResult(result);
                }

                return result;
            }
        };
    }
}
