/**
 * Dashboard View Module (js/ui/dashboard-view.js)
 * Pure UI component for rendering Dashboard KPI cards
 */

if (typeof window !== 'undefined') {
    if (typeof window.DashboardView === 'undefined') {
        window.DashboardView = {
            renderKpis: function(kpiData) {
                const formatNumFn = window.formatGermanNumber || function(n) { return n; };
                
                const elEnergy = document.getElementById('kpi-total-energy');
                if (elEnergy) elEnergy.textContent = `${formatNumFn(kpiData.totalEnergyKwh, 0)} kWh`;

                const elPmax = document.getElementById('kpi-pmax');
                if (elPmax) elPmax.textContent = `${formatNumFn(kpiData.pMaxKw, 1)} kW`;

                const elHt = document.getElementById('kpi-ht-energy');
                if (elHt) elHt.textContent = `${formatNumFn(kpiData.htEnergyKwh, 0)} kWh`;

                const elNt = document.getElementById('kpi-nt-energy');
                if (elNt) elNt.textContent = `${formatNumFn(kpiData.ntEnergyKwh, 0)} kWh`;

                if (window.QualityView && kpiData.qualityClass) {
                    window.QualityView.renderTrafficLight(kpiData.qualityClass);
                }
            }
        };
    }
}
