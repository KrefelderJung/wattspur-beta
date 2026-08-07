/**
 * Chart View Module (js/ui/chart-view.js)
 * Pure view component for ECharts rendering (DOM-free calculations)
 */

if (typeof window !== 'undefined') {
    if (typeof window.ChartView === 'undefined') {
        window.ChartView = {
            renderLoadProfileChart: function(containerId, dataPoints, options = {}) {
                const container = document.getElementById(containerId);
                if (!container || typeof echarts === 'undefined') return null;

                let chart = echarts.getInstanceByDom(container);
                if (!chart) {
                    chart = echarts.init(container, 'dark');
                }

                const times = [];
                const values = [];

                (dataPoints || []).forEach(d => {
                    const date = d.dateObj || new Date(d.timestamp || Date.now());
                    const dateStr = window.getLocalDateString ? window.getLocalDateString(date) : date.toISOString();
                    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    times.push(`${dateStr} ${timeStr}`);
                    values.push(d.kw !== undefined ? d.kw : (d.powerKw || 0));
                });

                const option = {
                    backgroundColor: 'transparent',
                    tooltip: { trigger: 'axis', valueFormatter: (v) => `${v ? v.toFixed(2) : 0} kW` },
                    xAxis: { type: 'category', data: times },
                    yAxis: { type: 'value', name: 'Leistung (kW)' },
                    series: [{
                        type: 'line',
                        data: values,
                        smooth: false,
                        lineStyle: { width: 1.5, color: '#3B82F6' },
                        areaStyle: { opacity: 0.1, color: '#3B82F6' }
                    }]
                };

                chart.setOption(option);
                return chart;
            },

            renderSweepChart: function(containerId, sweepResults, optK, plannedK = null) {
                const container = document.getElementById(containerId);
                if (!container || typeof echarts === 'undefined' || !sweepResults) return null;

                let chart = echarts.getInstanceByDom(container);
                if (!chart) {
                    chart = echarts.init(container, 'dark');
                }

                const kValues = sweepResults.map(r => r.K.toFixed(1));
                const totalCosts = sweepResults.map(r => Math.round(r.totalCost));
                const capCosts = sweepResults.map(r => Math.round(r.capCost));
                const energyCosts = sweepResults.map(r => Math.round(r.energyCostAp1 + r.energyCostAp2));

                const markLines = [];
                if (optK !== null) {
                    markLines.push({ xAxis: optK.toFixed(1), name: 'Optimum', lineStyle: { color: '#10B981', type: 'solid', width: 2 } });
                }
                if (plannedK !== null) {
                    markLines.push({ xAxis: plannedK.toFixed(1), name: 'Geplant', lineStyle: { color: '#F59E0B', type: 'dashed', width: 2 } });
                }

                const option = {
                    backgroundColor: 'transparent',
                    tooltip: { trigger: 'axis' },
                    legend: { data: ['Gesamtkosten', 'Kapazitätskosten', 'Arbeitskosten'] },
                    xAxis: { type: 'category', data: kValues, name: 'Bestellleistung (kW)' },
                    yAxis: { type: 'value', name: 'Kosten (€/a)' },
                    series: [
                        { name: 'Gesamtkosten', type: 'line', data: totalCosts, lineStyle: { width: 3, color: '#10B981' }, markLine: { data: markLines } },
                        { name: 'Kapazitätskosten', type: 'line', data: capCosts, lineStyle: { width: 1.5, color: '#3B82F6', type: 'dashed' } },
                        { name: 'Arbeitskosten', type: 'line', data: energyCosts, lineStyle: { width: 1.5, color: '#8B5CF6', type: 'dashed' } }
                    ]
                };

                chart.setOption(option);
                return chart;
            }
        };
    }
}
