/**
 * AgNes View Module (js/ui/agnes-view.js)
 * Pure UI rendering component for AgNes optimization results
 */

if (typeof window !== 'undefined') {
    if (typeof window.AgnesView === 'undefined') {
        window.AgnesView = {
            renderAgnesResult: function(result) {
                if (!result || !result.optResult) return;

                const formatCurr = window.formatGermanCurrency || function(n) { return `${n} €`; };
                const formatNum = window.formatGermanNumber || function(n) { return `${n}`; };

                const elOptK = document.getElementById('agnes-opt-k');
                if (elOptK) elOptK.textContent = `${formatNum(result.optK, 1)} kW`;

                const elCost = document.getElementById('agnes-opt-cost');
                if (elCost) elCost.textContent = formatCurr(result.optResult.totalCost);

                const elCapCost = document.getElementById('agnes-cap-cost');
                if (elCapCost) elCapCost.textContent = formatCurr(result.optResult.capCost);

                const elEnergyCost = document.getElementById('agnes-energy-cost');
                if (elEnergyCost) elEnergyCost.textContent = formatCurr(result.optResult.energyCostAp1 + result.optResult.energyCostAp2);

                const elRange = document.getElementById('agnes-equivalent-range');
                if (elRange && result.equivalentRange) {
                    elRange.textContent = `${formatNum(result.equivalentRange.minK, 1)} kW – ${formatNum(result.equivalentRange.maxK, 1)} kW`;
                }

                if (window.ChartView && result.sweepResults) {
                    window.ChartView.renderSweepChart('agnes-sweep-chart', result.sweepResults, result.optK, result.plannedK);
                }
            }
        };
    }
}
