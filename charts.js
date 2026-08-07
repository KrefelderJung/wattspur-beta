// charts.js - ECharts Setup & Visualization for Lastgang Analyse App

const CHART_COLORS = {
    blue: '#005B82',
    lightBlue: '#00B4E6',
    green: '#C6D423',
    gray: '#e2e8f0'
};

function shortenDatasetName(name, maxLength = 26) {
    if (!name) return '';
    let clean = name;
    
    // Extract direction suffix
    let dir = '';
    if (clean.includes('Bezug')) { dir = ' (Bezug)'; clean = clean.replace(/_Bezug/g, '').replace(/Bezug/g, ''); }
    else if (clean.includes('Einspeisung')) { dir = ' (Einsp.)'; clean = clean.replace(/_Einspeisung/g, '').replace(/Einspeisung/g, ''); }
    
    // Strip OBIS codes
    clean = clean.replace(/_1-1:\d+\.\d+\.\d+/g, '').replace(/1-1:\d+\.\d+\.\d+/g, '');

    // Allow space for dir
    const availLen = maxLength - dir.length;
    if (clean.length > availLen) {
        clean = clean.substring(0, Math.max(1, availLen - 3)) + '...';
    }
    return clean + dir;
}

function createPeakMarkPoint() {
    const isDark = typeof isDarkMode !== 'undefined' && isDarkMode;
    return {
        data: [{ type: 'max', name: 'Maximum' }],
        symbol: 'pin',
        symbolSize: 32,
        label: {
            position: 'top',
            distance: 3,
            formatter: function(params) {
                const unitSuffix = typeof displayUnit !== 'undefined' && displayUnit === 'kwh' ? 'kWh' : 'kW';
                return `Peak: ${params.value.toFixed(1)} ${unitSuffix}`;
            },
            color: isDark ? '#f8fafc' : '#0f172a',
            fontSize: 10,
            fontWeight: 'bold',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#38bdf8' : '#005B82',
            borderWidth: 1.5,
            borderRadius: 4,
            padding: [4, 6],
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 4,
            shadowOffsetY: 2
        }
    };
}

function getDatasetColors(isDark) {
    return isDark ? [
        '#38bdf8', // 1. Sky Blue
        '#a3e635', // 2. Lime Green
        '#c084fc', // 3. Lavender Purple
        '#fb923c', // 4. Bright Orange
        '#2dd4bf', // 5. Turquoise Teal
        '#f43f5e', // 6. Coral Rose
        '#facc15', // 7. Gold Yellow
        '#818cf8', // 8. Indigo / Cobalt
        '#e879f9', // 9. Hot Pink
        '#34d399', // 10. Emerald Green
        '#fb7185', // 11. Soft Red
        '#06b6d4', // 12. Cyan
        '#f97316', // 13. Deep Orange
        '#a855f7', // 14. Violet
        '#14b8a6', // 15. Dark Teal
        '#eab308'  // 16. Amber
    ] : [
        '#0284c7', // 1. Sky Blue
        '#65a30d', // 2. Lime Green
        '#9333ea', // 3. Bright Purple
        '#ea580c', // 4. Vivid Orange
        '#0d9488', // 5. Teal
        '#e11d48', // 6. Rose Red
        '#ca8a04', // 7. Gold
        '#4f46e5', // 8. Indigo
        '#c026d3', // 9. Hot Pink
        '#059669', // 10. Emerald
        '#dc2626', // 11. Red
        '#0891b2', // 12. Cyan
        '#c2410c', // 13. Deep Orange
        '#7e22ce', // 14. Violet
        '#0f766e', // 15. Dark Teal
        '#d97706'  // 16. Amber
    ];
}

function initCharts() {
    const timelineEl = document.getElementById('chart-timeline');
    const profileEl = document.getElementById('chart-daily-profile');
    if (!timelineEl || !profileEl) return;

    // Cleanly dispose existing instances to prevent duplicate event listeners and memory leaks
    if (chartTimeline && typeof chartTimeline.dispose === 'function') {
        try { chartTimeline.dispose(); } catch (e) { console.warn("Failed to dispose chartTimeline", e); }
    }
    if (chartDailyProfile && typeof chartDailyProfile.dispose === 'function') {
        try { chartDailyProfile.dispose(); } catch (e) { console.warn("Failed to dispose chartDailyProfile", e); }
    }
    if (chartAgnesDuration && typeof chartAgnesDuration.dispose === 'function') {
        try { chartAgnesDuration.dispose(); } catch (e) { console.warn("Failed to dispose chartAgnesDuration", e); }
        chartAgnesDuration = null;
    }
    if (chartAgnesCost && typeof chartAgnesCost.dispose === 'function') {
        try { chartAgnesCost.dispose(); } catch (e) { console.warn("Failed to dispose chartAgnesCost", e); }
        chartAgnesCost = null;
    }

    chartTimeline = echarts.init(timelineEl, isDarkMode ? 'dark' : null);
    chartDailyProfile = echarts.init(profileEl, isDarkMode ? 'dark' : null);
    
    // --- ECharts Legend Sync Event Listener ---
    chartTimeline.on('legendselectchanged', function (params) {
        const chkShowAvg = document.getElementById('chk-show-avg');
        const chkShowMax = document.getElementById('chk-show-max');
        const chkShowMin = document.getElementById('chk-show-min');
        
        let hasAvgSelected = false;
        let hasMaxSelected = false;
        let hasMinSelected = false;
        
        for (const name in params.selected) {
            if (params.selected[name]) {
                if (name.endsWith('(Ø)') || name.endsWith('(Arbeit)')) hasAvgSelected = true;
                if (name.endsWith('(max)') || name.endsWith('(Peak)')) hasMaxSelected = true;
                if (name.endsWith('(min)')) hasMinSelected = true;
            }
        }
        
        if (chkShowAvg && chkShowAvg.checked !== hasAvgSelected) {
            chkShowAvg.checked = hasAvgSelected;
            chkShowAvg.dispatchEvent(new Event('change'));
        }
        if (chkShowMax && chkShowMax.checked !== hasMaxSelected) {
            chkShowMax.checked = hasMaxSelected;
            chkShowMax.dispatchEvent(new Event('change'));
        }
        if (chkShowMin && chkShowMin.checked !== hasMinSelected) {
            chkShowMin.checked = hasMinSelected;
            chkShowMin.dispatchEvent(new Event('change'));
        }
    });

    chartTimeline.on('datazoom', function () {
        if (isProgrammaticZoom) return;
        
        const option = chartTimeline.getOption();
        if (option.dataZoom && option.dataZoom[0]) {
            const startValue = option.dataZoom[0].startValue;
            const endValue = option.dataZoom[0].endValue;
            
            if (startValue && endValue) {
                const inputDateStart = document.getElementById('date-start');
                const inputDateEnd = document.getElementById('date-end');
                
                if (inputDateStart && inputDateEnd) {
                    inputDateStart.value = getLocalDateString(new Date(startValue));
                    inputDateEnd.value = getLocalDateString(new Date(endValue));
                    
                    globalDateRange.start = new Date(startValue);
                    globalDateRange.end = new Date(endValue);
                    
                    clearTimeout(updateTimeout);
                    updateTimeout = setTimeout(() => {
                        updateDashboard();
                    }, 100);
                }
            }
        }
    });

    // --- Peak Table Row Clicking Event Listener ---
    const table = document.getElementById('peaks-table');
    if (table) {
        table.replaceWith(table.cloneNode(true));
        const newTable = document.getElementById('peaks-table');
        newTable.addEventListener('click', (e) => {
            const tr = e.target.closest('tr');
            if (!tr || !tr.dataset.timestamp) return;
            
            const timestamp = parseInt(tr.dataset.timestamp, 10);
            if (isNaN(timestamp)) return;
            
            const tabBtn = document.querySelector('.tab-btn[data-target="tab-lastgang"]');
            if (tabBtn) tabBtn.click();
            
            const rangeOffset = 1.5 * 24 * 60 * 60 * 1000;
            const start = new Date(timestamp - rangeOffset);
            const end = new Date(timestamp + rangeOffset);
            
            zoomToTimeRange(start, end);
            showToast("Auf Leistungsspitze fokussiert (3-Tages-Ansicht).", "success");
        });
    }

    if (document.fonts) {
        document.fonts.ready.then(handleChartsResize);
    }

    window.removeEventListener('resize', handleChartsResize);
    window.addEventListener('resize', handleChartsResize);
}

function handleChartsResize() {
    if (chartTimeline) chartTimeline.resize();
    if (chartDailyProfile) chartDailyProfile.resize();
    if (typeof chartAgnesDuration !== 'undefined' && chartAgnesDuration) chartAgnesDuration.resize();
    if (typeof chartAgnesCost !== 'undefined' && chartAgnesCost) chartAgnesCost.resize();
}

function getWeekendMarkAreas(start, end) {
    if (!start || !end) return [];
    
    const markAreas = [];
    const current = new Date(start.getTime());
    current.setHours(0, 0, 0, 0); 
    
    let limit = 0;
    while (current <= end && limit < 150) {
        const day = current.getDay(); 
        if (day === 6) { // Saturday
            const satStart = current.getTime();
            const sunEnd = satStart + 2 * 24 * 60 * 60 * 1000; 
            
            markAreas.push([
                {
                    xAxis: satStart
                },
                {
                    xAxis: Math.min(sunEnd, end.getTime())
                }
            ]);
            
            current.setDate(current.getDate() + 7);
            limit++;
        } else {
            current.setDate(current.getDate() + 1);
        }
    }
    return markAreas;
}

function getHolidayMarkAreas(start, end) {
    if (!start || !end) return [];
    
    const markAreas = [];
    const current = new Date(start.getTime());
    current.setHours(0, 0, 0, 0);
    
    let limit = 0;
    while (current <= end && limit < 150) {
        const holidayName = getHolidayName(current);
        if (holidayName) {
            const dayStart = current.getTime();
            const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1; 
            
            markAreas.push([
                {
                    xAxis: dayStart,
                    name: holidayName,
                    label: { show: false }
                },
                {
                    xAxis: dayEnd
                }
            ]);
            limit++;
        }
        current.setDate(current.getDate() + 1);
    }
    return markAreas;
}

function renderTimelineChart(activeAggregatedDatasets) {
    if (!chartTimeline || activeAggregatedDatasets.length === 0) return;

    const aggregationDetails = getTimelineAggregationDetails(currentAggregation);
    const bucketCounts = activeAggregatedDatasets.map(item => item.data.length);
    const minBucketCount = Math.min(...bucketCounts);
    const maxBucketCount = Math.max(...bucketCounts);

    const titleEl = document.getElementById('timeline-chart-title');
    if (titleEl) {
        if (activeAggregatedDatasets.length === 1) {
            titleEl.textContent = `Leistungsverlauf (${activeAggregatedDatasets[0].name})`;
        } else {
            titleEl.textContent = `Leistungsverlauf Vergleich (${activeAggregatedDatasets.length} Lastgänge)`;
        }
    }

    const aggregationBadge = document.getElementById('timeline-aggregation-badge');
    if (aggregationBadge) {
        aggregationBadge.textContent = aggregationDetails.label;
        aggregationBadge.title = `Aktuelle Aggregation: ${aggregationDetails.label}`;
    }

    const rangeInfo = document.getElementById('timeline-range-info');
    if (rangeInfo) {
        const start = globalDateRange.start.toLocaleDateString('de-DE');
        const end = globalDateRange.end.toLocaleDateString('de-DE');
        const count = minBucketCount === maxBucketCount
            ? `${maxBucketCount.toLocaleString('de-DE')} Zeitfenster`
            : `${minBucketCount.toLocaleString('de-DE')}–${maxBucketCount.toLocaleString('de-DE')} Zeitfenster`;
        rangeInfo.textContent = `${start}–${end} · ${count} je Lastgang`;
    }

    const isKwhMode = typeof displayUnit !== 'undefined' && displayUnit === 'kwh';
    const showAvg = document.getElementById('chk-show-avg') ? document.getElementById('chk-show-avg').checked : true;
    const showMax = isKwhMode ? false : (document.getElementById('chk-show-max') ? document.getElementById('chk-show-max').checked : true);
    const showMin = isKwhMode ? false : (document.getElementById('chk-show-min') ? document.getElementById('chk-show-min').checked : false);
    const actualShowAvg = showAvg || (!showMax && !showMin);

    const series = [];
    const colors = getDatasetColors(isDarkMode);

    const startMs = globalDateRange.start.getTime();
    const endMs = globalDateRange.end.getTime();
    const diffDays = (endMs - startMs) / (24 * 60 * 60 * 1000);
    
    let markAreaData = [];
    let holidayMarkAreaData = [];
    if (diffDays <= 366) {
        markAreaData = getWeekendMarkAreas(globalDateRange.start, globalDateRange.end);
        holidayMarkAreaData = getHolidayMarkAreas(globalDateRange.start, globalDateRange.end);
    }

    if (markAreaData.length > 0) {
        series.push({
            type: 'line',
            silent: true,
            data: [],
            markArea: {
                silent: true,
                itemStyle: {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.012)' : 'rgba(0, 0, 0, 0.018)'
                },
                data: markAreaData
            }
        });
    }

    if (holidayMarkAreaData.length > 0) {
        series.push({
            type: 'line',
            silent: true,
            data: [],
            markArea: {
                silent: true,
                itemStyle: {
                    color: isDarkMode ? 'rgba(245, 158, 11, 0.018)' : 'rgba(245, 158, 11, 0.04)'
                },
                data: holidayMarkAreaData
            }
        });
    }

    activeAggregatedDatasets.forEach(item => {
        const baseColor = colors[item.id % colors.length];
        const shortName = shortenDatasetName(item.name);

        if (actualShowAvg) {
            series.push({
                name: isKwhMode ? `${shortName} (Arbeit)` : `${shortName} (Ø)`,
                type: 'line',
                data: item.data.map(d => {
                    let val = d.kw;
                    if (val !== null && isKwhMode) {
                        val = d.kwh !== undefined ? d.kwh : val / 4.0;
                    }
                    return [d.timestamp, val !== null ? Math.round(val * 100) / 100 : null];
                }),
                smooth: false,
                symbol: 'none',
                connectNulls: false,
                color: baseColor,
                lineStyle: { width: 2 },
                areaStyle: activeAggregatedDatasets.length === 1 ? { 
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: baseColor + '33' },
                        { offset: 1, color: baseColor + '00' }
                    ])
                } : undefined,
                markPoint: (!showMax) ? createPeakMarkPoint() : undefined
            });
        }

        if (showMax) {
            series.push({
                name: isKwhMode ? `${shortName} (Peak)` : `${shortName} (max)`,
                type: 'line',
                data: item.data.map(d => {
                    let val = d.maxKw !== undefined ? d.maxKw : d.kw;
                    if (val !== null && isKwhMode) {
                        val = d.kwh !== undefined ? d.kwh : val / 4.0;
                    }
                    return [d.timestamp, val !== null ? Math.round(val * 100) / 100 : null];
                }),
                smooth: false,
                symbol: 'none',
                connectNulls: false,
                color: baseColor,
                lineStyle: { width: 1.5, type: 'dashed' },
                markPoint: createPeakMarkPoint()
            });
        }

        if (showMin) {
            series.push({
                name: `${shortName} (min)`,
                type: 'line',
                data: item.data.map(d => {
                    let val = d.minKw !== undefined ? d.minKw : d.kw;
                    if (val !== null && isKwhMode) {
                        val = d.kwh !== undefined ? d.kwh : val / 4.0;
                    }
                    return [d.timestamp, val !== null ? Math.round(val * 100) / 100 : null];
                }),
                smooth: false,
                symbol: 'none',
                connectNulls: false,
                color: baseColor,
                lineStyle: { width: 1.5, type: 'dotted' },
                markPoint: (!showMax && !actualShowAvg) ? createPeakMarkPoint() : undefined
            });
        }
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                if (params.length === 0) return '';
                const validParams = params.filter(p => p.seriesName !== '');
                if (validParams.length === 0) return '';
                
                let d = new Date(validParams[0].value[0]);
                const holidayName = getHolidayName(d);
                
                let html = `<strong>${formatTimelineBucket(d, currentAggregation)}</strong>`;
                html += `<br/><span style="font-size: 0.75rem; color: ${isDarkMode ? '#94a3b8' : '#64748b'};">${aggregationDetails.tooltipLabel}</span>`;
                if (holidayName) {
                    html += ` <span style="font-size: 0.75rem; color: #f59e0b; font-weight: bold;">(Feiertag: ${holidayName})</span>`;
                }
                html += '<br/>';

                validParams.forEach(p => {
                    const unitSuffix = typeof displayUnit !== 'undefined' && displayUnit === 'kwh' ? 'kWh' : 'kW';
                    if (p.value[1] !== null) {
                        html += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${p.color};"></span> ${escapeHtml(p.seriesName)}: <strong>${p.value[1].toFixed(2)} ${unitSuffix}</strong><br/>`;
                    } else {
                        html += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${p.color};"></span> ${escapeHtml(p.seriesName)}: <strong>Keine Daten</strong><br/>`;
                    }
                });
                return html;
            }
        },
        legend: {
            show: true,
            tooltip: { show: true },
            data: series.filter(s => s.name).map(s => s.name),
            textStyle: {
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontFamily: 'inherit',
                fontSize: 11
            },
            itemGap: 24,
            top: 0,
            right: 40
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true
        },
        dataZoom: [
            {
                type: 'inside',
                startValue: globalDateRange.start.getTime(),
                endValue: globalDateRange.end.getTime()
            },
            {
                type: 'slider',
                startValue: globalDateRange.start.getTime(),
                endValue: globalDateRange.end.getTime(),
                height: 30,
                bottom: 10,
                backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.8)',
                borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                fillerColor: isDarkMode ? 'rgba(0, 180, 230, 0.15)' : 'rgba(0, 91, 130, 0.12)',
                handleStyle: {
                    color: '#00B4E6',
                    borderColor: isDarkMode ? '#7dd3fc' : '#005B82',
                    borderWidth: 1,
                    shadowBlur: 4,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                },
                moveHandleStyle: {
                    color: isDarkMode ? '#475569' : '#cbd5e1'
                },
                textStyle: {
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontSize: 10,
                    fontFamily: 'inherit'
                },
                dataBackground: {
                    lineStyle: {
                        color: isDarkMode ? '#475569' : '#cbd5e1',
                        width: 1
                    },
                    areaStyle: {
                        color: isDarkMode ? 'rgba(71, 85, 105, 0.1)' : 'rgba(203, 213, 225, 0.05)'
                    }
                },
                selectedDataBackground: {
                    lineStyle: {
                        color: '#00B4E6',
                        width: 1.5
                    },
                    areaStyle: {
                        color: 'rgba(0, 180, 230, 0.15)'
                    }
                }
            }
        ],
        xAxis: {
            type: 'time',
            boundaryGap: false,
            axisLine: { lineStyle: { color: isDarkMode ? '#475569' : '#cbd5e1' } },
            axisLabel: { 
                color: isDarkMode ? '#94a3b8' : '#64748b',
                formatter: function (value) {
                    const date = new Date(value);
                    const zoom = currentZoom;
                    
                    if (zoom === 'day') {
                        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
                    }
                    if (zoom === 'week') {
                        const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
                        const dayMonth = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                        return `${weekday} ${dayMonth}`;
                    }
                    if (zoom === 'month') {
                        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                    }
                    if (zoom === 'year') {
                        return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
                    }
                    
                    const start = globalDateRange.start ? globalDateRange.start.getTime() : 0;
                    const end = globalDateRange.end ? globalDateRange.end.getTime() : 0;
                    const diffMs = end - start;
                    
                    if (diffMs <= 2 * 86400000) {
                        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
                    } else if (diffMs <= 14 * 86400000) {
                        const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
                        const dayMonth = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                        return `${weekday} ${dayMonth}`;
                    } else if (diffMs <= 60 * 86400000) {
                        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                    } else if (diffMs <= 3 * 365 * 86400000) {
                        return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
                    } else {
                        return date.getFullYear().toString();
                    }
                }
            },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: getTimelineYAxisLabel(aggregationDetails, actualShowAvg, showMax, showMin),
            nameTextStyle: { color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b' },
            splitLine: { lineStyle: { color: isDarkMode ? '#334155' : '#f1f5f9' } }
        },
        series: series
    };

    isProgrammaticZoom = true;
    chartTimeline.clear();
    chartTimeline.setOption(option, true);
    setTimeout(() => {
        isProgrammaticZoom = false;
    }, 100);
}

function getTimelineAggregationDetails(aggregation) {
    const details = {
        '15m': {
            label: 'Viertelstundenwerte',
            averageLabel: 'Viertelstundenwert',
            maximumLabel: 'Viertelstundenwert',
            minimumLabel: 'Viertelstundenwert',
            period: null,
            tooltipLabel: 'Messzeitpunkt'
        },
        '1h': {
            label: 'Stundenmittel',
            averageLabel: 'Stundenmittel',
            maximumLabel: 'Stundenmaximum',
            minimumLabel: 'Stundenminimum',
            period: 'Stunde',
            tooltipLabel: 'Aggregationsfenster: eine Stunde'
        },
        '1d': {
            label: 'Tagesmittel',
            averageLabel: 'Tagesmittel',
            maximumLabel: 'Tagesmaximum',
            minimumLabel: 'Tagesminimum',
            period: 'Tag',
            tooltipLabel: 'Aggregationsfenster: ein Tag'
        },
        '1w': {
            label: 'Wochenmittel',
            averageLabel: 'Wochenmittel',
            maximumLabel: 'Wochenmaximum',
            minimumLabel: 'Wochenminimum',
            period: 'Woche',
            tooltipLabel: 'Aggregationsfenster: Montag bis Sonntag'
        },
        '1M': {
            label: 'Monatsmittel',
            averageLabel: 'Monatsmittel',
            maximumLabel: 'Monatsmaximum',
            minimumLabel: 'Monatsminimum',
            period: 'Monat',
            tooltipLabel: 'Aggregationsfenster: ein Kalendermonat'
        }
    };

    return details[aggregation] || details['1d'];
}

function getTimelineYAxisLabel(details, showAverage, showMaximum, showMinimum) {
    return typeof displayUnit !== 'undefined' && displayUnit === 'kwh' ? 'kWh' : 'kW';
}

function formatTimelineBucket(date, aggregation) {
    if (aggregation === '15m') {
        return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (aggregation === '1h') {
        const end = new Date(date.getTime() + 60 * 60 * 1000 - 1);
        return `${date.toLocaleDateString('de-DE')} · ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (aggregation === '1w') {
        const end = new Date(date.getTime());
        end.setDate(end.getDate() + 6);
        return `${date.toLocaleDateString('de-DE')}–${end.toLocaleDateString('de-DE')}`;
    }
    if (aggregation === '1M') {
        return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    }
    return `${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} · 00:00–23:59`;
}

// --- Dynamic NT Category Helper ---
function getClosest15mCategory(timeStr) {
    if (!timeStr) return "00:00";
    const parts = timeStr.split(':');
    const h = parseInt(parts[0] || 0, 10);
    const m = parseInt(parts[1] || 0, 10);
    const roundedM = Math.round(m / 15) * 15;
    let finalH = h;
    let finalM = roundedM;
    if (roundedM === 60) {
        finalH = (h + 1) % 24;
        finalM = 0;
    }
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

// --- Render Classic Daily Profiles (Quarters & Days Split) ---
function renderDailyProfileChart(activeDatasetsFiltered) {
    if (!chartDailyProfile || activeDatasetsFiltered.length === 0) return;

    // Read comparison mode
    const compareMode = document.getElementById('select-profile-compare-mode')?.value || 'datasets';

    // Read Custom NT parameters
    const showNtShading = document.getElementById('chk-show-nt-shading')?.checked;
    const ntStartVal = document.getElementById('input-nt-start')?.value || '22:00';
    const ntEndVal = document.getElementById('input-nt-end')?.value || '06:00';

    const titleEl = document.getElementById('daily-profile-title');
    const colors = getDatasetColors(isDarkMode);
    const series = [];
    const xData = Array.from({length: 96}, (_, i) => {
        const h = Math.floor(i / 4);
        const m = (i % 4) * 15;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    });

    // Helper functions for filtering
    const isHoliday = (d) => window.isHoliday(d.dateObj);
    const isWeekend = (d) => {
        const day = d.dateObj.getDay();
        return day === 0 || day === 6;
    };
    const isWorkday = (d) => {
        const day = d.dateObj.getDay();
        return day >= 1 && day <= 5 && !isHoliday(d);
    };

    if (compareMode === 'datasets') {
        // --- MODE A: Compare multiple load profiles ---
        const daysFilter = document.getElementById('select-profile-days')?.value || 'all';
        const quarterFilter = document.getElementById('select-profile-quarter')?.value || 'all';

        if (titleEl) {
            const daysText = {
                all: 'Gesamtwoche',
                workdays: 'Werktage',
                weekends: 'Wochenenden & Feiertage'
            }[daysFilter];
            const quarterText = {
                all: 'Gesamtzeitraum',
                q1: 'Q1',
                q2: 'Q2',
                q3: 'Q3',
                q4: 'Q4'
            }[quarterFilter];
            titleEl.textContent = `Tagesprofile Lastgang-Vergleich (${daysText} - ${quarterText})`;
        }

        let matchesDay = (d) => true;
        if (daysFilter === 'workdays') matchesDay = isWorkday;
        else if (daysFilter === 'weekends') matchesDay = (d) => isWeekend(d) || isHoliday(d);

        let matchesQuarter = (d) => true;
        if (quarterFilter === 'q1') matchesQuarter = (d) => d.dateObj.getMonth() >= 0 && d.dateObj.getMonth() <= 2;
        else if (quarterFilter === 'q2') matchesQuarter = (d) => d.dateObj.getMonth() >= 3 && d.dateObj.getMonth() <= 5;
        else if (quarterFilter === 'q3') matchesQuarter = (d) => d.dateObj.getMonth() >= 6 && d.dateObj.getMonth() <= 8;
        else if (quarterFilter === 'q4') matchesQuarter = (d) => d.dateObj.getMonth() >= 9 && d.dateObj.getMonth() <= 11;

        const finalFilterFn = (d) => matchesDay(d) && matchesQuarter(d);

        if (activeDatasetsFiltered.length === 1) {
            // Draw min/max band + average line (Original mode preferred by user)
            const ds = activeDatasetsFiltered[0];
            const prof = calculateSingleDatasetProfiles(ds.data, finalFilterFn);
            
            const isKwh = typeof displayUnit !== 'undefined' && displayUnit === 'kwh';
            const avgData = prof.map(p => p.avg === null ? null : Number((isKwh ? p.avg / 4.0 : p.avg).toFixed(2)));
            const minData = prof.map(p => p.min === null ? null : Number((isKwh ? p.min / 4.0 : p.min).toFixed(2)));
            const bandData = prof.map(p => p.max === null || p.min === null ? null : Number((isKwh ? (p.max - p.min) / 4.0 : p.max - p.min).toFixed(2)));
            
            series.push({
                name: 'Min. Leistung',
                type: 'line',
                data: minData,
                lineStyle: { opacity: 0 },
                symbol: 'none',
                stack: 'confidence-band'
            });
            
            series.push({
                name: 'Leistungsband (Min/Max)',
                type: 'line',
                data: bandData,
                lineStyle: { opacity: 0 },
                symbol: 'none',
                stack: 'confidence-band',
                color: isDarkMode ? 'rgba(0, 180, 230, 0.45)' : 'rgba(0, 91, 130, 0.35)',
                areaStyle: {
                    color: isDarkMode ? 'rgba(0, 180, 230, 0.12)' : 'rgba(0, 91, 130, 0.08)'
                }
            });

            series.push({
                name: 'Durchschnitt',
                type: 'line',
                data: avgData,
                smooth: false,
                symbol: 'none',
                color: colors[activeDatasetsFiltered[0].id % colors.length],
                lineStyle: { width: 3 }
            });
        } else {
            // Comparison Mode: draw Average lines for each channel (no band, to avoid visual clutter)
            activeDatasetsFiltered.forEach(ds => {
                const color = colors[ds.id % colors.length];
                const prof = calculateSingleDatasetProfiles(ds.data, finalFilterFn);
                
                const isKwh = typeof displayUnit !== 'undefined' && displayUnit === 'kwh';
                const avgData = prof.map(p => p.avg === null ? null : Number((isKwh ? p.avg / 4.0 : p.avg).toFixed(2)));
                
                series.push({
                    name: shortenDatasetName(ds.name),
                    type: 'line',
                    data: avgData,
                    smooth: false,
                    symbol: 'none',
                    color: color,
                    lineStyle: { width: 3 }
                });
            });
        }
    } else if (compareMode === 'quarters') {
        // --- MODE B: Compare multiple quarters for 1 load profile ---
        const ds = activeDatasetsFiltered[0];
        const daysFilter = document.getElementById('select-profile-days')?.value || 'all';

        if (titleEl) {
            const daysText = {
                all: 'Gesamtwoche',
                workdays: 'Werktage',
                weekends: 'Wochenenden & Feiertage'
            }[daysFilter];
            titleEl.textContent = `Tagesprofile Quartals-Vergleich (${ds.name} - ${daysText})`;
        }

        let matchesDay = (d) => true;
        if (daysFilter === 'workdays') matchesDay = isWorkday;
        else if (daysFilter === 'weekends') matchesDay = (d) => isWeekend(d) || isHoliday(d);

        const quartersToCheck = [
            { id: 'all', name: 'Gesamtzeitraum', color: colors[4] || '#858585', checkId: 'chk-profile-q-all', filter: (d) => true },
            { id: 'q1', name: 'Q1 (Jan-Mär)', color: colors[0], checkId: 'chk-profile-q1', filter: (d) => d.dateObj.getMonth() >= 0 && d.dateObj.getMonth() <= 2 },
            { id: 'q2', name: 'Q2 (Apr-Jun)', color: colors[1], checkId: 'chk-profile-q2', filter: (d) => d.dateObj.getMonth() >= 3 && d.dateObj.getMonth() <= 5 },
            { id: 'q3', name: 'Q3 (Jul-Sep)', color: colors[2], checkId: 'chk-profile-q3', filter: (d) => d.dateObj.getMonth() >= 6 && d.dateObj.getMonth() <= 8 },
            { id: 'q4', name: 'Q4 (Okt-Dez)', color: colors[3], checkId: 'chk-profile-q4', filter: (d) => d.dateObj.getMonth() >= 9 && d.dateObj.getMonth() <= 11 }
        ];

        quartersToCheck.forEach(q => {
            const isChecked = document.getElementById(q.checkId)?.checked;
            if (isChecked) {
                const finalFilterFn = (d) => matchesDay(d) && q.filter(d);
                const prof = calculateSingleDatasetProfiles(ds.data, finalFilterFn);
                
                const isKwh = typeof displayUnit !== 'undefined' && displayUnit === 'kwh';
                const avgData = prof.map(p => p.avg === null ? null : Number((isKwh ? p.avg / 4.0 : p.avg).toFixed(2)));
                
                series.push({
                    name: q.name,
                    type: 'line',
                    data: avgData,
                    smooth: false,
                    symbol: 'none',
                    color: q.color,
                    lineStyle: { width: 3 }
                });
            }
        });
    } else if (compareMode === 'days') {
        // --- MODE C: Compare day categories (Werktag vs. Wochenende) for 1 load profile ---
        const ds = activeDatasetsFiltered[0];
        const quarterFilter = document.getElementById('select-profile-quarter')?.value || 'all';

        if (titleEl) {
            const quarterText = {
                all: 'Gesamtzeitraum',
                q1: 'Q1',
                q2: 'Q2',
                q3: 'Q3',
                q4: 'Q4'
            }[quarterFilter];
            titleEl.textContent = `Tagesprofile Wochentags-Vergleich (${ds.name} - ${quarterText})`;
        }

        let matchesQuarter = (d) => true;
        if (quarterFilter === 'q1') matchesQuarter = (d) => d.dateObj.getMonth() >= 0 && d.dateObj.getMonth() <= 2;
        else if (quarterFilter === 'q2') matchesQuarter = (d) => d.dateObj.getMonth() >= 3 && d.dateObj.getMonth() <= 5;
        else if (quarterFilter === 'q3') matchesQuarter = (d) => d.dateObj.getMonth() >= 6 && d.dateObj.getMonth() <= 8;
        else if (quarterFilter === 'q4') matchesQuarter = (d) => d.dateObj.getMonth() >= 9 && d.dateObj.getMonth() <= 11;

        const dayCategories = [
            { id: 'all', name: 'Gesamtwoche', color: colors[4] || '#858585', checkId: 'chk-profile-days-all', filter: (d) => true },
            { id: 'workdays', name: 'Werktage (Mo-Fr)', color: colors[0], checkId: 'chk-profile-days-workdays', filter: isWorkday },
            { id: 'weekends', name: 'Wochenenden & Feiertage', color: colors[2], checkId: 'chk-profile-days-weekends', filter: (d) => isWeekend(d) || isHoliday(d) }
        ];

        dayCategories.forEach(cat => {
            const isChecked = document.getElementById(cat.checkId)?.checked;
            if (isChecked) {
                const finalFilterFn = (d) => matchesQuarter(d) && cat.filter(d);
                const prof = calculateSingleDatasetProfiles(ds.data, finalFilterFn);
                
                const isKwh = typeof displayUnit !== 'undefined' && displayUnit === 'kwh';
                const avgData = prof.map(p => p.avg === null ? null : Number((isKwh ? p.avg / 4.0 : p.avg).toFixed(2)));
                
                series.push({
                    name: cat.name,
                    type: 'line',
                    data: avgData,
                    smooth: false,
                    symbol: 'none',
                    color: cat.color,
                    lineStyle: { width: 3 }
                });
            }
        });
    }

    // Add peak markPoint on all line series representing actual load curves
    series.forEach(s => {
        if (s.type === 'line' && s.name !== 'Min. Leistung' && s.name !== 'Leistungsband (Min/Max)' && s.data && s.data.length > 0) {
            s.markPoint = createPeakMarkPoint();
        }
    });

    // Setup Custom NT / ST markAreas based on time settings
    let markAreaData = [];
    if (showNtShading) {
        const startCat = getClosest15mCategory(ntStartVal);
        const endCat = getClosest15mCategory(ntEndVal);
        
        const ntStyle = {
            color: isDarkMode ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.02)'
        };

        if (startCat > endCat) { // Overlaps midnight
            markAreaData.push([
                { name: 'Niedertarif (NT)', xAxis: startCat, itemStyle: ntStyle, label: { position: 'insideTopLeft', color: '#94a3b8', fontSize: 10, offset: [10, 10] } },
                { xAxis: '23:45' }
            ]);
            markAreaData.push([
                { name: 'Niedertarif (NT)', xAxis: '00:00', itemStyle: ntStyle, label: { position: 'insideTopLeft', color: '#94a3b8', fontSize: 10, offset: [10, 10] } },
                { xAxis: endCat }
            ]);
        } else if (startCat < endCat) {
            markAreaData.push([
                { name: 'Niedertarif (NT)', xAxis: startCat, itemStyle: ntStyle, label: { position: 'insideTopLeft', color: '#94a3b8', fontSize: 10, offset: [10, 10] } },
                { xAxis: endCat }
            ]);
        }

        const stAktiv = document.getElementById('chk-st-active')?.checked || false;
        if (stAktiv) {
            const stStartVal = document.getElementById('input-st-start')?.value || '11:00';
            const stEndVal = document.getElementById('input-st-end')?.value || '13:00';
            const stStartCat = getClosest15mCategory(stStartVal);
            const stEndCat = getClosest15mCategory(stEndVal);
            
            const stStyle = {
                color: isDarkMode ? 'rgba(249, 115, 22, 0.03)' : 'rgba(249, 115, 22, 0.04)'
            };

            if (stStartCat > stEndCat) { // Overlaps midnight
                markAreaData.push([
                    { name: 'Standardtarif (ST)', xAxis: stStartCat, itemStyle: stStyle, label: { position: 'insideTopLeft', color: '#f97316', fontSize: 10, offset: [10, 10] } },
                    { xAxis: '23:45' }
                ]);
                markAreaData.push([
                    { name: 'Standardtarif (ST)', xAxis: '00:00', itemStyle: stStyle, label: { position: 'insideTopLeft', color: '#f97316', fontSize: 10, offset: [10, 10] } },
                    { xAxis: stEndCat }
                ]);
            } else if (stStartCat < stEndCat) {
                markAreaData.push([
                    { name: 'Standardtarif (ST)', xAxis: stStartCat, itemStyle: stStyle, label: { position: 'insideTopLeft', color: '#f97316', fontSize: 10, offset: [10, 10] } },
                    { xAxis: stEndCat }
                ]);
            }
        }
    }

    // Bind markArea to a dummy series
    if (markAreaData.length > 0) {
        series.push({
            type: 'line',
            silent: true,
            data: [],
            markArea: {
                silent: true,
                data: markAreaData
            }
        });
    }

    // Generate legend data dynamically to use appropriate icons
    const legendData = [];
    series.forEach(s => {
        if (s.name && s.name !== 'Min. Leistung') {
            const item = { name: s.name };
            if (s.name === 'Leistungsband (Min/Max)') {
                item.icon = 'roundRect';
            }
            legendData.push(item);
        }
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                let html = `<strong>${params[0].axisValue} Uhr</strong><br/>`;
                
                // Find min and band series if present
                const minParam = params.find(p => p.seriesName === 'Min. Leistung');
                const bandParam = params.find(p => p.seriesName === 'Leistungsband (Min/Max)');
                
                // Show normal series (excluding min/band series)
                const unitSuffix = typeof displayUnit !== 'undefined' && displayUnit === 'kwh' ? 'kWh' : 'kW';
                params.filter(p => p.seriesName && p.seriesName !== 'Min. Leistung' && p.seriesName !== 'Leistungsband (Min/Max)').forEach(p => {
                    const val = Number(p.value);
                    html += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${p.color};"></span> ${escapeHtml(p.seriesName)}: <strong>${isNaN(val) ? p.value : val.toFixed(2)} ${unitSuffix}</strong><br/>`;
                });
                
                // If confidence band is active, display Min and Max below the average
                if (minParam && bandParam) {
                    const minVal = Number(minParam.value);
                    const diffVal = Number(bandParam.value);
                    const maxVal = minVal + diffVal;
                    
                    const bandTitle = typeof displayUnit !== 'undefined' && displayUnit === 'kwh' ? 'Energieband:' : 'Leistungsband:';
                    html += `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid ${isDarkMode ? '#475569' : '#e2e8f0'}; font-size: 0.75rem; color: ${isDarkMode ? '#94a3b8' : '#64748b'};">`;
                    html += `${bandTitle}<br/>`;
                    html += `• Max: <strong>${maxVal.toFixed(2)} ${unitSuffix}</strong><br/>`;
                    html += `• Min: <strong>${minVal.toFixed(2)} ${unitSuffix}</strong>`;
                    html += `</div>`;
                }
                
                return html;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: xData,
            axisLine: { lineStyle: { color: isDarkMode ? '#475569' : '#cbd5e1' } },
            axisLabel: { 
                color: isDarkMode ? '#94a3b8' : '#64748b',
                interval: 11
            }
        },
        yAxis: {
            type: 'value',
            name: typeof displayUnit !== 'undefined' && displayUnit === 'kwh' ? 'kWh' : 'kW',
            nameTextStyle: { color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: isDarkMode ? '#94a3b8' : '#64748b' },
            splitLine: { lineStyle: { color: isDarkMode ? '#334155' : '#f1f5f9', type: 'dashed' } }
        },
        legend: {
            show: true,
            data: legendData,
            textStyle: { color: isDarkMode ? '#94a3b8' : '#64748b', fontFamily: 'inherit' },
            itemGap: 24,
            top: 0
        },
        series: series
    };

    chartDailyProfile.clear();
    chartDailyProfile.setOption(option, true);
}

function renderPeaks(data) {
    const limitSelect = document.getElementById('select-peaks-limit');
    const distSelect = document.getElementById('select-peaks-distance');
    
    const limitVal = limitSelect ? parseInt(limitSelect.value, 10) : 10;
    const distHours = distSelect ? parseFloat(distSelect.value) : 4.0;
    const MIN_DIST_MS = distHours * 60 * 60 * 1000; 
    
    const sorted = [...data]
        .filter(d => d && Number.isFinite(Number(d.kw)) && Number(d.kw) >= 0 && Number(d.kw) <= 100000)
        .sort((a, b) => {
            const valA = typeof a.kw === 'number' ? a.kw : parseFloat(a.kw);
            const valB = typeof b.kw === 'number' ? b.kw : parseFloat(b.kw);
            return valB - valA;
        });
    
    const peaks = [];
    
    for (const d of sorted) {
        if (peaks.length >= limitVal) break;
        
        let isTooClose = false;
        for (const p of peaks) {
            if (Math.abs(d.timestamp - p.timestamp) < MIN_DIST_MS) {
                isTooClose = true;
                break;
            }
        }
        
        if (!isTooClose) {
            peaks.push(d);
        }
    }

    const peaksTableBody = document.querySelector('#peaks-table tbody');
    if (!peaksTableBody) return;

    // Update header cell label
    const th = document.querySelector('#peaks-table th:nth-child(4)');
    if (th) {
        th.textContent = typeof displayUnit !== 'undefined' && displayUnit === 'kwh' ? 'kWh' : 'kW';
    }

    peaksTableBody.innerHTML = '';
    peaks.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.timestamp = p.timestamp; 
        
        const rank = idx + 1;
        const dateText = document.createTextNode(p.dateStr);
        const timeText = document.createTextNode(p.timeStr);
        
        const numericKw = typeof p.kw === 'number' ? p.kw : parseFloat(p.kw);
        const val = typeof displayUnit !== 'undefined' && displayUnit === 'kwh' ? numericKw / 4.0 : numericKw;
        const kwText = document.createTextNode(val.toFixed(2));
        const kvarText = document.createTextNode(p.datasetName || '-'); // Using renamed Messstelle column (Priority 3)

        tr.innerHTML = `
            <td>${rank}</td>
            <td></td>
            <td></td>
            <td style="font-weight: 600;"></td>
            <td></td>
        `;
        
        tr.cells[1].appendChild(dateText);
        tr.cells[2].appendChild(timeText);
        tr.cells[3].appendChild(kwText);
        tr.cells[4].appendChild(kvarText);
        
        peaksTableBody.appendChild(tr);
    });
}

// --- AgNes 2029 ECharts Render-Funktionen ---
function renderAgnesDurationCurve(data, optimalK, pMax, datasetInfos) {
    const durationEl = document.getElementById('chart-agnes-duration');
    if (!durationEl) return;

    if (!chartAgnesDuration) {
        chartAgnesDuration = echarts.init(durationEl, isDarkMode ? 'dark' : null);
    }

    const isMulti = datasetInfos && datasetInfos.length > 0;
    
    // We will build series dynamically
    const series = [];
    const legendData = [];
    
    // Default palette for multi-year curves
    const paletteColors = [
        '#a855f7', // Vivid Purple
        '#eab308', // Amber Gold
        '#f97316', // Bright Orange
        '#06b6d4', // Cyan
        '#ec4899'  // Pink
    ];

    let intersectHoursForMarkPoint = 0;
    let mainSortedKw = [];

    if (isMulti) {
        // 1. Downsample each dataset's sorted kW values to exactly 1000 points
        const downsampledYears = datasetInfos.map(info => {
            const sortedKw = info.cleanData
                .map(d => d.kw)
                .filter(v => v !== null && typeof v === 'number')
                .sort((a, b) => b - a);
            
            if (sortedKw.length === 0) return [];
            
            const points = [];
            const n = 1000;
            for (let i = 0; i < n; i++) {
                const srcIdx = Math.min(sortedKw.length - 1, Math.floor((i / (n - 1)) * (sortedKw.length - 1)));
                points.push(sortedKw[srcIdx]);
            }
            return points;
        }).filter(arr => arr.length > 0);

        if (downsampledYears.length > 0) {
            const n = 1000;
            const avgData = [];
            const maxData = [];
            
            for (let i = 0; i < n; i++) {
                const hours = (i / (n - 1)) * 8760; // Standard hours in a year
                let sum = 0;
                let maxVal = -Infinity;
                
                downsampledYears.forEach(yearPoints => {
                    const val = yearPoints[i];
                    sum += val;
                    if (val > maxVal) maxVal = val;
                });
                
                const avgVal = sum / downsampledYears.length;
                avgData.push([parseFloat(hours.toFixed(1)), parseFloat(avgVal.toFixed(2))]);
                maxData.push([parseFloat(hours.toFixed(1)), parseFloat(maxVal.toFixed(2))]);
            }

            // Save the average curve as mainSortedKw for markPoint calculations
            mainSortedKw = avgData.map(pt => pt[1]);

            // Add the two aggregated series with direct color configuration
            series.push({
                name: 'Worst-Case',
                type: 'line',
                symbol: 'none',
                color: 'rgba(239, 68, 68, 0.85)',
                data: maxData,
                lineStyle: {
                    width: 1.5,
                    type: 'dashed'
                }
            });

            series.push({
                name: 'Mittelwert',
                type: 'line',
                symbol: 'none',
                color: 'rgba(24, 144, 255, 0.85)',
                data: avgData,
                lineStyle: {
                    width: 3.5
                },
                areaStyle: {
                    opacity: 0.05,
                    color: 'rgba(24, 144, 255, 0.85)'
                }
            });

            legendData.push('Mittelwert', 'Worst-Case');

            // Render individual single-year duration curves if toggle is checked
            const chkIndividual = document.getElementById('chk-agnes-show-individual-years');
            if (chkIndividual && chkIndividual.checked && datasetInfos && datasetInfos.length > 0) {
                datasetInfos.forEach((info, idx) => {
                    if (!info.cleanData || info.cleanData.length === 0) return;
                    const yrKw = info.cleanData.map(d => d.kw).filter(v => v !== null && typeof v === 'number').sort((a, b) => b - a);
                    if (yrKw.length === 0) return;
                    const totalP = yrKw.length;
                    const stp = Math.max(1, Math.floor(totalP / 400));
                    const yrPlotData = [];
                    for (let i = 0; i < totalP; i += stp) {
                        const h = (i / totalP) * 8760;
                        yrPlotData.push([parseFloat(h.toFixed(1)), parseFloat(yrKw[i].toFixed(2))]);
                    }
                    const yrColor = paletteColors[idx % paletteColors.length];
                    const yearMatch = info.name.match(/\((\d{4})\)/);
                    const yrLabel = yearMatch ? `Jahr ${yearMatch[1]}` : info.name;
                    
                    series.push({
                        name: yrLabel,
                        type: 'line',
                        data: yrPlotData,
                        smooth: false,
                        symbol: 'none',
                        connectNulls: false,
                        color: yrColor,
                        lineStyle: { width: 2.2, opacity: 0.95, type: 'dashed' }
                    });
                    legendData.push(yrLabel);
                });
            }
        }

        // For markPoint positioning in multi-year, find where average load drops below K
        let intersectIndex = mainSortedKw.findIndex(v => v <= optimalK);
        if (intersectIndex === -1) intersectIndex = mainSortedKw.length - 1;
        intersectHoursForMarkPoint = (intersectIndex / mainSortedKw.length) * 8760;

    } else {
        // Single year path
        const sortedKw = data
            .map(d => d.kw)
            .filter(v => v !== null && typeof v === 'number')
            .sort((a, b) => b - a);

        if (sortedKw.length === 0) return;
        mainSortedKw = sortedKw;

        const totalPoints = sortedKw.length;
        const step = Math.max(1, Math.floor(totalPoints / 1000));
        const plotData = [];
        
        for (let i = 0; i < totalPoints; i += step) {
            const hours = (i / totalPoints) * (totalPoints * 0.25);
            plotData.push([parseFloat(hours.toFixed(1)), parseFloat(sortedKw[i].toFixed(2))]);
        }
        const lastHours = ((totalPoints - 1) / totalPoints) * (totalPoints * 0.25);
        plotData.push([parseFloat(lastHours.toFixed(1)), parseFloat(sortedKw[totalPoints - 1].toFixed(2))]);

        let intersectIndex = sortedKw.findIndex(v => v <= optimalK);
        if (intersectIndex === -1) intersectIndex = sortedKw.length - 1;
        intersectHoursForMarkPoint = (intersectIndex / totalPoints) * (totalPoints * 0.25);

        // In single-year, we use visualMap to color code AP 1 vs AP 2, and add a single series
        series.push({
            name: 'Lastgang',
            type: 'line',
            symbol: 'none',
            data: plotData,
            areaStyle: {
                opacity: 0.25
            },
            lineStyle: {
                width: 2
            }
        });
        legendData.push('AP 1: Normaltarif', 'AP 2: Überschreitung');
    }

    // Create the Bestellgrenze series and attach markLine, markPoint, and markArea to it
    const bestellgrenzeSeries = {
        name: 'Bestellgrenze',
        type: 'line',
        color: '#f97316',
        data: [],
        lineStyle: { type: 'dashed', width: 2.5 }
    };

    bestellgrenzeSeries.markLine = {
        symbol: ['none', 'none'],
        label: {
            position: 'insideEndTop',
            formatter: 'Bestellgrenze: {c} kW',
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            fontSize: 10,
            fontWeight: 'bold',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderColor: '#f97316',
            borderWidth: 1.5,
            borderRadius: 4,
            padding: [4, 6],
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 4,
            shadowOffsetY: 2
        },
        lineStyle: {
            color: '#f97316',
            type: 'dashed',
            width: 2.5
        },
        data: [{ yAxis: parseFloat(optimalK.toFixed(1)) }]
    };

    bestellgrenzeSeries.markPoint = {
        symbol: 'pin',
        symbolSize: 32,
        itemStyle: {
            color: '#f97316'
        },
        label: {
            position: 'top',
            distance: 3,
            formatter: 'Kopt: ' + optimalK.toFixed(1) + ' kW',
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            fontSize: 10,
            fontWeight: 'bold',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderColor: '#f97316',
            borderWidth: 1.5,
            borderRadius: 4,
            padding: [4, 6],
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 4,
            shadowOffsetY: 2
        },
        data: [{
            coord: [parseFloat(intersectHoursForMarkPoint.toFixed(1)), parseFloat(optimalK.toFixed(1))]
        }]
    };

    bestellgrenzeSeries.markArea = {
        silent: true,
        data: [
            [
                {
                    name: 'AP 2 (Überschreitung)',
                    yAxis: optimalK,
                    itemStyle: {
                        color: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)'
                    },
                    label: {
                        color: isDarkMode ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.65)',
                        position: 'insideTopLeft',
                        fontSize: 9,
                        fontWeight: 'bold'
                    }
                },
                {
                    yAxis: pMax * 1.2
                }
            ],
            [
                {
                    name: 'AP 1 (Normaltarif)',
                    yAxis: 0,
                    itemStyle: {
                        color: isDarkMode ? 'rgba(24, 144, 255, 0.04)' : 'rgba(24, 144, 255, 0.02)'
                    },
                    label: {
                        color: isDarkMode ? 'rgba(24, 144, 255, 0.45)' : 'rgba(24, 144, 255, 0.65)',
                        position: 'insideBottomLeft',
                        fontSize: 9,
                        fontWeight: 'bold'
                    }
                },
                {
                    yAxis: optimalK
                }
            ]
        ]
    };

    series.push(bestellgrenzeSeries);
    legendData.push('Bestellgrenze');

    // For single-year, we also add the dummy series to render correct legend colors
    if (!isMulti) {
        series.push({
            name: 'AP 1: Normaltarif',
            type: 'line',
            color: 'rgba(24, 144, 255, 0.85)',
            data: [],
            lineStyle: { width: 3 }
        });
        series.push({
            name: 'AP 2: Überschreitung',
            type: 'line',
            color: 'rgba(239, 68, 68, 0.85)',
            data: [],
            lineStyle: { width: 3 }
        });
    }

    const option = {
        backgroundColor: 'transparent',
        legend: {
            show: true,
            top: '0%',
            right: 'center',
            textStyle: {
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontSize: 11
            },
            data: legendData
        },
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                if (isMulti) {
                    let html = `Dauer: <strong>${params[0].value[0].toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.</strong><br/>`;
                    params.forEach(p => {
                        // Skip the Bestellgrenze series in tooltips if it's empty
                        if (p.seriesName === 'Bestellgrenze' && (!p.value || p.value.length < 2 || p.value[1] === undefined)) return;
                        const kwVal = p.value[1].toLocaleString('de-DE', { maximumFractionDigits: 1 });
                        const status = p.value[1] > optimalK ? '<span style="color: var(--warning-color);">Überschr.</span>' : '<span style="color: var(--success-color);">Innerhalb</span>';
                        html += `${p.marker} ${p.seriesName}: <strong>${kwVal} kW</strong> (${status})<br/>`;
                    });
                    return html;
                } else {
                    const p = params[0];
                    if (!p || !p.value) return '';
                    const hoursVal = p.value[0].toLocaleString('de-DE', { maximumFractionDigits: 1 });
                    const kwVal = p.value[1].toLocaleString('de-DE', { maximumFractionDigits: 1 });
                    const status = p.value[1] > optimalK ? '<span style="color: var(--warning-color); font-weight: bold;">Überschreitung (AP 2)</span>' : '<span style="color: var(--primary-color); font-weight: bold;">Innerhalb (AP 1)</span>';
                    return `Dauer: <strong>${hoursVal} Std.</strong><br/>Leistung: <strong>${kwVal} kW</strong><br/>Status: ${status}`;
                }
            }
        },
        grid: {
            left: 60,
            right: 30,
            top: 55,
            bottom: 45,
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: isMulti ? 'Normierte Jahresstunden (h)' : 'Stunden (h)',
            nameLocation: 'middle',
            nameGap: 28,
            splitLine: {
                lineStyle: {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
            }
        },
        yAxis: {
            type: 'value',
            name: 'Leistung (kW)',
            splitLine: {
                lineStyle: {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
            }
        },
        visualMap: isMulti ? null : {
            show: false,
            dimension: 1, // Y-axis
            seriesIndex: 0, // Apply only to 'Lastgang' series
            pieces: [{
                gt: 0,
                lte: optimalK,
                color: 'rgba(24, 144, 255, 0.85)' // Blue for AP 1
            }, {
                gt: optimalK,
                color: 'rgba(239, 68, 68, 0.85)' // Red for AP 2
            }]
        },
        series: series
    };

    chartAgnesDuration.setOption(option, true);
    setTimeout(() => { if (chartAgnesDuration) chartAgnesDuration.resize(); }, 10);
}

function renderAgnesCostCurve(sweepResults, optimalK) {
    const costEl = document.getElementById('chart-agnes-cost');
    if (!costEl) return;

    if (!chartAgnesCost) {
        chartAgnesCost = echarts.init(costEl, isDarkMode ? 'dark' : null);
    }

    const totalCostData = sweepResults.map(r => [r.K, r.totalCost]);
    const capCostData = sweepResults.map(r => [r.K, r.capCost]);
    const energyAp1Data = sweepResults.map(r => [r.K, r.energyCostAp1]);
    const energyAp2Data = sweepResults.map(r => [r.K, r.energyCostAp2]);

    // Find the minimum cost to place the markPoint precisely
    let minCost = Infinity;
    sweepResults.forEach(r => {
        if (r.totalCost < minCost) {
            minCost = r.totalCost;
        }
    });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                let html = `Gebuchte Kapazität: <strong>${parseFloat(params[0].value[0]).toFixed(1)} kW</strong><br/>`;
                params.forEach(p => {
                    const costVal = p.value[1].toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
                    html += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${p.color};"></span> ${p.seriesName}: <strong>${costVal}</strong><br/>`;
                });
                return html;
            }
        },
        legend: {
            show: true,
            textStyle: {
                color: isDarkMode ? '#94a3b8' : '#64748b',
                fontSize: 11
            },
            top: 0
        },
        grid: {
            left: 70,
            right: 30,
            top: 55,
            bottom: 45,
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: 'Gebuchte Kapazität (kW)',
            nameLocation: 'middle',
            nameGap: 25,
            splitLine: {
                lineStyle: {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
            }
        },
        yAxis: {
            type: 'value',
            name: 'Jahreskosten (€/a)',
            splitLine: {
                lineStyle: {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                }
            }
        },
        series: [
            {
                name: 'Gesamtkosten',
                type: 'line',
                symbol: 'none',
                data: totalCostData,
                color: '#10b981',
                lineStyle: {
                    width: 3.5
                },
                markPoint: {
                    symbol: 'pin',
                    symbolSize: 32,
                    itemStyle: {
                        color: '#ef4444'
                    },
                    label: {
                        position: 'top',
                        distance: 3,
                        formatter: 'Kopt: ' + optimalK.toFixed(1) + ' kW',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        fontSize: 10,
                        fontWeight: 'bold',
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        borderColor: '#ef4444',
                        borderWidth: 1.5,
                        borderRadius: 4,
                        padding: [4, 6],
                        shadowColor: 'rgba(0, 0, 0, 0.3)',
                        shadowBlur: 4,
                        shadowOffsetY: 2
                    },
                    data: [{
                        coord: [parseFloat(optimalK.toFixed(1)), parseFloat(minCost.toFixed(0))]
                    }]
                }
            },
            {
                name: 'Feste Kapazitätskosten',
                type: 'line',
                symbol: 'none',
                data: capCostData,
                color: '#f59e0b',
                lineStyle: {
                    width: 2,
                    type: 'dashed'
                }
            },
            {
                name: 'Arbeitskosten AP 1 (Normal)',
                type: 'line',
                symbol: 'none',
                data: energyAp1Data,
                color: '#3b82f6',
                lineStyle: {
                    width: 2,
                    type: 'dashed'
                }
            },
            {
                name: 'Arbeitskosten AP 2 (Überschreitung)',
                type: 'line',
                symbol: 'none',
                data: energyAp2Data,
                color: '#ec4899', // Pink/Magenta for excess to distinguish from green/red/orange
                lineStyle: {
                    width: 2,
                    type: 'dashed'
                }
            }
        ]
    };

    chartAgnesCost.setOption(option);
}
