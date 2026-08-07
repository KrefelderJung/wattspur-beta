/**
 * Aggregation Module (js/domain/aggregation.js)
 */

function aggregateByInterval(measurements) {
    if (!measurements || !Array.isArray(measurements)) return [];
    return measurements.filter(d => d.kw !== null && d.kw !== undefined && !isNaN(d.kw));
}

function aggregateByHour(measurements) {
    if (!measurements || !Array.isArray(measurements)) return [];
    const map = new Map();
    const dateStrFn = (typeof window !== 'undefined' && window.getLocalDateString) ? window.getLocalDateString : function(d) { return d.toISOString().split('T')[0]; };

    measurements.forEach(d => {
        if (d.kw === null || d.kw === undefined || isNaN(d.kw)) return;
        const date = d.dateObj || new Date(d.timestamp || Date.now());
        const hourKey = `${dateStrFn(date)}T${String(date.getHours()).padStart(2, '0')}:00`;
        const dt = (typeof d.intervalHours === 'number' && d.intervalHours > 0) ? d.intervalHours : 0.25;
        const kwh = (d.energyKwh !== undefined && d.energyKwh !== null) ? d.energyKwh : (d.kw * dt);

        if (!map.has(hourKey)) {
            map.set(hourKey, { key: hourKey, sumKw: 0, sumKwh: 0, maxKw: -Infinity, count: 0, dateObj: date });
        }
        const item = map.get(hourKey);
        item.sumKw += d.kw;
        item.sumKwh += kwh;
        if (d.kw > item.maxKw) item.maxKw = d.kw;
        item.count++;
    });

    return Array.from(map.values()).map(item => ({
        key: item.key,
        avgKw: Math.round((item.sumKw / item.count) * 100) / 100,
        maxKw: Math.round(item.maxKw * 100) / 100,
        energyKwh: Math.round(item.sumKwh * 100) / 100,
        dateObj: item.dateObj
    }));
}

function aggregateByDay(measurements) {
    if (!measurements || !Array.isArray(measurements)) return [];
    const map = new Map();
    const dateStrFn = (typeof window !== 'undefined' && window.getLocalDateString) ? window.getLocalDateString : function(d) { return d.toISOString().split('T')[0]; };

    measurements.forEach(d => {
        if (d.kw === null || d.kw === undefined || isNaN(d.kw)) return;
        const date = d.dateObj || new Date(d.timestamp || Date.now());
        const dayKey = dateStrFn(date);
        const dt = (typeof d.intervalHours === 'number' && d.intervalHours > 0) ? d.intervalHours : 0.25;
        const kwh = (d.energyKwh !== undefined && d.energyKwh !== null) ? d.energyKwh : (d.kw * dt);

        if (!map.has(dayKey)) {
            map.set(dayKey, { key: dayKey, sumKw: 0, sumKwh: 0, maxKw: -Infinity, count: 0, dateObj: date });
        }
        const item = map.get(dayKey);
        item.sumKw += d.kw;
        item.sumKwh += kwh;
        if (d.kw > item.maxKw) item.maxKw = d.kw;
        item.count++;
    });

    return Array.from(map.values()).map(item => ({
        key: item.key,
        avgKw: Math.round((item.sumKw / item.count) * 100) / 100,
        maxKw: Math.round(item.maxKw * 100) / 100,
        energyKwh: Math.round(item.sumKwh * 100) / 100,
        dateObj: item.dateObj
    }));
}

function aggregateByMonth(measurements) {
    if (!measurements || !Array.isArray(measurements)) return [];
    const map = new Map();

    measurements.forEach(d => {
        if (d.kw === null || d.kw === undefined || isNaN(d.kw)) return;
        const date = d.dateObj || new Date(d.timestamp || Date.now());
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const dt = (typeof d.intervalHours === 'number' && d.intervalHours > 0) ? d.intervalHours : 0.25;
        const kwh = (d.energyKwh !== undefined && d.energyKwh !== null) ? d.energyKwh : (d.kw * dt);

        if (!map.has(monthKey)) {
            map.set(monthKey, { key: monthKey, sumKw: 0, sumKwh: 0, maxKw: -Infinity, count: 0, dateObj: date });
        }
        const item = map.get(monthKey);
        item.sumKw += d.kw;
        item.sumKwh += kwh;
        if (d.kw > item.maxKw) item.maxKw = d.kw;
        item.count++;
    });

    return Array.from(map.values()).map(item => ({
        key: item.key,
        avgKw: Math.round((item.sumKw / item.count) * 100) / 100,
        maxKw: Math.round(item.maxKw * 100) / 100,
        energyKwh: Math.round(item.sumKwh * 100) / 100,
        dateObj: item.dateObj
    }));
}

if (typeof window !== 'undefined') {
    window.aggregateByInterval = aggregateByInterval;
    window.aggregateByHour = aggregateByHour;
    window.aggregateByDay = aggregateByDay;
    window.aggregateByMonth = aggregateByMonth;
}
