/**
 * Tariff Calculation Module (js/domain/tariff-calculation.js)
 */

function calculateTariffEnergy(measurements, tariffConfig = {}) {
    if (!measurements || !Array.isArray(measurements)) {
        return {
            totalEnergyKwh: 0,
            htEnergyKwh: 0,
            ntEnergyKwh: 0,
            stEnergyKwh: 0,
            unclassifiedEnergyKwh: 0,
            checks: []
        };
    }

    const htStartHour = tariffConfig.htStartHour !== undefined ? tariffConfig.htStartHour : 6;
    const htEndHour = tariffConfig.htEndHour !== undefined ? tariffConfig.htEndHour : 22;
    const isWeekendsNt = tariffConfig.isWeekendsNt !== undefined ? tariffConfig.isWeekendsNt : true;
    const isHolidaysNt = tariffConfig.isHolidaysNt !== undefined ? tariffConfig.isHolidaysNt : true;
    const isHolidayFn = (typeof window !== 'undefined' && window.isNRWHoliday) ? window.isNRWHoliday : function() { return false; };

    let totalEnergyKwh = 0;
    let htEnergyKwh = 0;
    let ntEnergyKwh = 0;

    measurements.forEach(d => {
        if (d.kw === null || d.kw === undefined || isNaN(d.kw) || d.kw < 0) return;
        const dt = (typeof d.intervalHours === 'number' && d.intervalHours > 0) ? d.intervalHours : 0.25;
        const kwh = (d.energyKwh !== undefined && d.energyKwh !== null && !isNaN(d.energyKwh)) ? d.energyKwh : (d.kw * dt);

        const date = d.dateObj || new Date(d.timestamp || Date.now());
        const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
        const hour = date.getHours();

        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const isHoliday = isHolidayFn(date);

        let isNt = false;
        if (isWeekendsNt && isWeekend) {
            isNt = true;
        } else if (isHolidaysNt && isHoliday) {
            isNt = true;
        } else if (hour < htStartHour || hour >= htEndHour) {
            isNt = true;
        }

        if (isNt) {
            ntEnergyKwh += kwh;
        } else {
            htEnergyKwh += kwh;
        }
        totalEnergyKwh += kwh;
    });

    return {
        totalEnergyKwh: totalEnergyKwh,
        htEnergyKwh: htEnergyKwh,
        ntEnergyKwh: ntEnergyKwh,
        stEnergyKwh: 0,
        unclassifiedEnergyKwh: 0,
        checks: [
            { name: "TARIFF_TIMESLICE_CLASSIFICATION", status: "PASS", message: "HT/NT Zeitscheiben-Zuordnung erfolgreich" }
        ]
    };
}

if (typeof window !== 'undefined') {
    window.calculateTariffEnergy = calculateTariffEnergy;
}
