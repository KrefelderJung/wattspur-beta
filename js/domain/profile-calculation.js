/**
 * Profile Calculation Module (js/domain/profile-calculation.js)
 */

function calculateDailyProfile(measurements, filterType = 'all') {
    const slots = Array.from({ length: 96 }, () => ({ sum: 0, min: Infinity, max: -Infinity, count: 0 }));

    if (measurements && Array.isArray(measurements)) {
        measurements.forEach(d => {
            if (d.kw === null || d.kw === undefined || isNaN(d.kw) || d.kw < 0) return;
            const date = d.dateObj || new Date(d.timestamp || Date.now());
            const dayOfWeek = date.getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

            if (filterType === 'workday' && isWeekend) return;
            if (filterType === 'weekend' && !isWeekend) return;

            const slotIndex = date.getHours() * 4 + Math.floor(date.getMinutes() / 15);
            if (slotIndex >= 0 && slotIndex < 96) {
                const s = slots[slotIndex];
                s.sum += d.kw;
                if (d.kw < s.min) s.min = d.kw;
                if (d.kw > s.max) s.max = d.kw;
                s.count++;
            }
        });
    }

    return slots.map((s, idx) => {
        const hour = String(Math.floor(idx / 4)).padStart(2, '0');
        const min = String((idx % 4) * 15).padStart(2, '0');
        const timeLabel = `${hour}:${min}`;

        if (s.count === 0) {
            return { time: timeLabel, avg: null, min: null, max: null, count: 0 };
        }
        return {
            time: timeLabel,
            avg: Math.round((s.sum / s.count) * 100) / 100,
            min: Math.round(s.min * 100) / 100,
            max: Math.round(s.max * 100) / 100,
            count: s.count
        };
    });
}

function calculateLoadDurationCurve(measurements) {
    if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
        return [];
    }
    const validKw = measurements
        .map(d => d.kw)
        .filter(kw => kw !== null && kw !== undefined && !isNaN(kw) && kw >= 0)
        .sort((a, b) => b - a);

    return validKw.map((kw, idx) => ({
        hourIndex: Math.round((idx * 0.25) * 100) / 100,
        kw: kw
    }));
}

if (typeof window !== 'undefined') {
    window.calculateDailyProfile = calculateDailyProfile;
    window.calculateLoadDurationCurve = calculateLoadDurationCurve;
}
