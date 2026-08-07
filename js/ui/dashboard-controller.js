/**
 * Dashboard Controller Module (js/ui/dashboard-controller.js)
 * Connects AppState, Domain calculations, and DashboardView
 */

if (typeof window !== 'undefined') {
    if (typeof window.DashboardController === 'undefined') {
        window.DashboardController = {
            updateDashboard: function() {
                const snapshot = window.AppState ? window.AppState.getSnapshot() : { datasets: [] };
                const datasets = snapshot.datasets || [];
                const activeIds = snapshot.activeDatasetIds || [];
                const activeDatasets = datasets.filter(ds => activeIds.includes(ds.id));
                const targetDatasets = activeDatasets.length > 0 ? activeDatasets : datasets;

                let allMeasurements = [];
                let pMax = 0;

                targetDatasets.forEach(ds => {
                    (ds.data || []).forEach(d => {
                        allMeasurements.push(d);
                        const p = d.kw !== undefined ? d.kw : (d.powerKw || 0);
                        if (p > pMax) pMax = p;
                    });
                });

                const energyRes = window.calculateDomainEnergy ? window.calculateDomainEnergy(allMeasurements) : { totalEnergyKwh: 0 };
                const qualityRes = window.evaluateDataQuality ? window.evaluateDataQuality(allMeasurements) : { qualityClass: 'GREEN' };
                const tariffRes = window.calculateTariffEnergy ? window.calculateTariffEnergy(allMeasurements) : { htEnergyKwh: 0, ntEnergyKwh: 0 };

                const kpiData = {
                    totalEnergyKwh: energyRes.totalEnergyKwh,
                    pMaxKw: pMax,
                    htEnergyKwh: tariffRes.htEnergyKwh,
                    ntEnergyKwh: tariffRes.ntEnergyKwh,
                    qualityClass: qualityRes.qualityClass
                };

                if (window.DashboardView) {
                    window.DashboardView.renderKpis(kpiData);
                }

                if (window.ChartView && allMeasurements.length > 0) {
                    window.ChartView.renderLoadProfileChart('main-chart-container', allMeasurements);
                }
            }
        };
    }
}
