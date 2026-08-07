const LASTGANG_APP_VERSION = '2026.08.08-beta.3';

function getIntervalTariffFractions(startMs, endMs, ntStartMin, ntEndMin, stStartMin, stEndMin, stAktiv, options = {}) {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return { ntFraction: 0.0, stFraction: 0.0, htFraction: 1.0 };
    }
    
    if (endMs <= startMs) {
        const startObj = new Date(startMs);
        const t = startObj.getHours() * 60 + startObj.getMinutes();
        
        let isSt = false;
        if (stAktiv) {
            isSt = stStartMin > stEndMin ? (t >= stStartMin || t < stEndMin) : (t >= stStartMin && t < stEndMin);
        }
        
        if (isSt) {
            return { ntFraction: 0.0, stFraction: 1.0, htFraction: 0.0 };
        }
        
        const isNt = ntStartMin > ntEndMin ? (t >= ntStartMin || t < ntEndMin) : (t >= ntStartMin && t < ntEndMin);
        if (isNt) {
            return { ntFraction: 1.0, stFraction: 0.0, htFraction: 0.0 };
        }
        
        return { ntFraction: 0.0, stFraction: 0.0, htFraction: 1.0 };
    }
    
    const startObj = new Date(startMs);
    const mStart = startObj.getHours() * 60 + startObj.getMinutes();
    
    const totalMinutes = Math.round((endMs - startMs) / 60000);
    if (totalMinutes <= 0) {
        return { ntFraction: 0.0, stFraction: 0.0, htFraction: 1.0 };
    }
    
    let ntMinutes = 0;
    let stMinutes = 0;
    let htMinutes = 0;
    
    const weekendsNt = options.weekendsNt === true;
    const holidaysNt = options.holidaysNt === true;
    const holidayFn = typeof isHoliday === 'function' ? isHoliday : () => false;

    for (let i = 0; i < totalMinutes; i++) {
        const minuteDate = new Date(startMs + i * 60000);
        const t = minuteDate.getHours() * 60 + minuteDate.getMinutes();
        
        let isSt = false;
        if (stAktiv) {
            isSt = stStartMin > stEndMin ? (t >= stStartMin || t < stEndMin) : (t >= stStartMin && t < stEndMin);
        }
        
        const isCalendarNt = (weekendsNt && (minuteDate.getDay() === 0 || minuteDate.getDay() === 6)) ||
            (holidaysNt && holidayFn(minuteDate));

        if (isSt) {
            stMinutes++;
        } else if (isCalendarNt) {
            ntMinutes++;
        } else {
            const isNt = ntStartMin > ntEndMin ? (t >= ntStartMin || t < ntEndMin) : (t >= ntStartMin && t < ntEndMin);
            if (isNt) {
                ntMinutes++;
            } else {
                htMinutes++;
            }
        }
    }
    
    return {
        ntFraction: ntMinutes / totalMinutes,
        stFraction: stMinutes / totalMinutes,
        htFraction: htMinutes / totalMinutes
    };
}

function getIntervalNightFraction(startMs, endMs, ntStartMin, ntEndMin) {
    const fr = getIntervalTariffFractions(startMs, endMs, ntStartMin, ntEndMin, 0, 0, false);
    return fr.ntFraction;
}

function getLocalDateString(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
}

function updateNavTooltips() {
    const prevDouble = document.getElementById('btn-nav-prev-double');
    const prevSingle = document.getElementById('btn-nav-prev-single');
    const nextSingle = document.getElementById('btn-nav-next-single');
    const nextDouble = document.getElementById('btn-nav-next-double');

    if (!prevDouble || !prevSingle || !nextSingle || !nextDouble) return;

    switch (currentZoom) {
        case 'day':
            prevDouble.title = '7 Tage zurück';
            prevSingle.title = '1 Tag zurück';
            nextSingle.title = '1 Tag vorwärts';
            nextDouble.title = '7 Tage vorwärts';
            break;
        case 'week':
            prevDouble.title = '4 Wochen zurück';
            prevSingle.title = '1 Woche zurück';
            nextSingle.title = '1 Woche vorwärts';
            nextDouble.title = '4 Wochen vorwärts';
            break;
        case 'month':
            prevDouble.title = '6 Monate zurück';
            prevSingle.title = '1 Monat zurück';
            nextSingle.title = '1 Monat vorwärts';
            nextDouble.title = '6 Monate vorwärts';
            break;
        case 'year':
            prevDouble.title = 'Zum ersten Jahr';
            prevSingle.title = '1 Jahr zurück';
            nextSingle.title = '1 Jahr vorwärts';
            nextDouble.title = 'Zum letzten Jahr';
            break;
        case 'max':
        default:
            prevDouble.title = '6 Monate zurück';
            prevSingle.title = '1 Monat zurück';
            nextSingle.title = '1 Monat vorwärts';
            nextDouble.title = '6 Monate vorwärts';
            break;
    }
}

function updateThemeIcon() {
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (!btnThemeToggle) return;
    
    if (isDarkMode) {
        btnThemeToggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/>
                <path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/>
                <path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/>
                <path d="M20 12h2"/>
                <path d="m6.34 17.66-1.41 1.41"/>
                <path d="m19.07 4.93-1.41 1.41"/>
            </svg>
        `;
        btnThemeToggle.title = "Tagmodus aktivieren";
    } else {
        btnThemeToggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
        `;
        btnThemeToggle.title = "Nachtmodus aktivieren";
    }
}

function parseGermanNumber(str) {
    if (str === null || str === undefined) return null;
    let clean = str.toString().trim().replace(/\s/g, '');
    if (clean === '') return null;
    
    // Prepend leading zero for decimals starting with dot/comma (e.g. ,45 -> 0,45)
    if (clean.startsWith(',') || clean.startsWith('.')) {
        clean = '0' + clean;
    }
    if (clean.startsWith('-,') || clean.startsWith('-.')) {
        clean = '-0' + clean.substring(1);
    }
    
    // Regex for:
    // 1. English format: 1,234.56 or 1234.56 (or negative)
    const engRegex = /^-?(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)$/;
    // 2. German format: 1.234,56 or 1234,56 (or negative)
    const deRegex = /^-?(\d{1,3}(\.\d{3})*(,\d+)?|\d+(,\d+)?)$/;
    
    if (deRegex.test(clean)) {
        // German format: remove dots, replace comma with dot
        const normalized = clean.replace(/\./g, '').replace(/,/g, '.');
        const val = parseFloat(normalized);
        return isNaN(val) ? null : val;
    } else if (engRegex.test(clean)) {
        // English format: remove commas
        const normalized = clean.replace(/,/g, '');
        const val = parseFloat(normalized);
        return isNaN(val) ? null : val;
    }
    
    // If it doesn't match either, try standard parseFloat but only if it's a valid basic number
    const basicRegex = /^-?\d+(\.\d+)?$/;
    if (basicRegex.test(clean)) {
        const val = parseFloat(clean);
        return isNaN(val) ? null : val;
    }
    
    return null;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    switch(type) {
        case 'success':
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
            break;
        case 'error':
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
            break;
        case 'warning':
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
            break;
        default:
            icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
    
    toast.innerHTML = icon;
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// --- NRW Holiday Database & Computations (Priority 3 - Holiday Extension) ---
// --- State & Custom Holiday Database & Computations (Priority 3 - Holiday Extension) ---
let holidayConfig = {
    state: "NW",
    customHolidays: []
};

// Global cache for computed holidays
let holidaysCache = {};

function loadHolidayConfig() {
    try {
        const saved = localStorage.getItem("lastgang_holiday_config");
        if (saved) {
            holidayConfig = JSON.parse(saved);
        }
    } catch (e) {
        console.error("Error loading holiday config:", e);
    }
    clearHolidaysCache();
}

function saveHolidayConfig() {
    try {
        localStorage.setItem("lastgang_holiday_config", JSON.stringify(holidayConfig));
    } catch (e) {
        console.error("Error saving holiday config:", e);
    }
    clearHolidaysCache();
}

function clearHolidaysCache() {
    holidaysCache = {};
}

// Initialize holiday configuration
loadHolidayConfig();

function getEasterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; 
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
}

function getOfficialHolidaysForState(state, year) {
    const holidays = {};
    const easter = getEasterSunday(year);
    
    const addFixed = (dateStr, name) => {
        holidays[`${year}-${dateStr}`] = name;
    };
    const addEasterRelative = (offsetDays, name) => {
        const d = new Date(easter.getTime());
        d.setDate(d.getDate() + offsetDays);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        holidays[`${y}-${m}-${dayStr}`] = name;
    };

    // Shared holidays (All states)
    addFixed("01-01", "Neujahrstag");
    addEasterRelative(-2, "Karfreitag");
    addEasterRelative(1, "Ostermontag");
    addFixed("05-01", "Tag der Arbeit");
    addEasterRelative(39, "Christi Himmelfahrt");
    addEasterRelative(50, "Pfingstmontag");
    addFixed("10-03", "Tag der Deutschen Einheit");
    addFixed("12-25", "1. Weihnachtstag");
    addFixed("12-26", "2. Weihnachtstag");

    // State-specific holidays
    if (state === "BW" || state === "BY" || state === "ST") {
        addFixed("01-06", "Heilige Drei Könige");
    }
    if (state === "BE" || state === "MV") {
        addFixed("03-08", "Internationaler Frauentag");
    }
    if (state === "BW" || state === "BY" || state === "HE" || state === "NW" || state === "RP" || state === "SL") {
        addEasterRelative(60, "Fronleichnam");
    }
    if (state === "BY" || state === "SL") {
        addFixed("08-15", "Mariä Himmelfahrt");
    }
    if (state === "TH") {
        addFixed("09-20", "Weltkindertag");
    }
    if (state === "BB" || state === "HB" || state === "HH" || state === "MV" || state === "NI" || state === "SN" || state === "ST" || state === "SH" || state === "TH") {
        addFixed("10-31", "Reformationstag");
    }
    if (state === "BW" || state === "BY" || state === "NW" || state === "RP" || state === "SL") {
        addFixed("11-01", "Allerheiligen");
    }
    if (state === "SN") {
        // Buß- und Bettag: Mittwoch vor dem 23. November
        const nov23 = new Date(year, 10, 23);
        const dayOfWeek = nov23.getDay(); // 0 = Sun, 1 = Mon, ..., 3 = Wed
        let diff = dayOfWeek - 3;
        if (diff <= 0) diff += 7; // Wednesday must be strictly before 23.11.
        const bussDay = new Date(nov23.getTime() - diff * 24 * 3600 * 1000);
        const m = String(bussDay.getMonth() + 1).padStart(2, '0');
        const dayStr = String(bussDay.getDate()).padStart(2, '0');
        holidays[`${year}-${m}-${dayStr}`] = "Buß- und Bettag";
    }

    return holidays;
}

function getHolidaysForYear(year) {
    if (holidaysCache[year]) return holidaysCache[year];
    
    // Start with official holidays
    const holidays = getOfficialHolidaysForState(holidayConfig.state || "NW", year);
    
    // Add custom holidays
    if (holidayConfig.customHolidays) {
        holidayConfig.customHolidays.forEach(h => {
            if (h.type === "fixed") {
                const mStr = String(h.fixedMonth).padStart(2, '0');
                const dStr = String(h.fixedDay).padStart(2, '0');
                holidays[`${year}-${mStr}-${dStr}`] = h.name;
            } else if (h.type === "easter") {
                const easter = getEasterSunday(year);
                const d = new Date(easter.getTime());
                d.setDate(d.getDate() + parseInt(h.easterOffset, 10));
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dayStr = String(d.getDate()).padStart(2, '0');
                holidays[`${y}-${m}-${dayStr}`] = h.name;
            } else if (h.type === "specific") {
                if (h.specificDate && h.specificDate.startsWith(`${year}-`)) {
                    holidays[h.specificDate] = h.name;
                }
            }
        });
    }
    
    holidaysCache[year] = holidays;
    return holidays;
}

function getHolidayName(dateObj) {
    if (!dateObj) return null;
    const year = dateObj.getFullYear();
    const holidays = getHolidaysForYear(year);
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return holidays[`${year}-${m}-${d}`] || null;
}

function isHoliday(dateObj) {
    return getHolidayName(dateObj) !== null;
}

// Aliases for backwards compatibility
const getNRWHolidayName = getHolidayName;
const isNRWHoliday = isHoliday;

function calculateSingleDatasetProfiles(data, filterFn) {
    const slots = Array.from({ length: 96 }, () => []);
    const matches = typeof filterFn === 'function' ? filterFn : () => true;
    data.forEach(d => {
        if (!Number.isFinite(d.kw) || d.kw < 0 || d.kw > 100000) return;
        if (!matches(d)) return;
        const endTs = Number.isFinite(d.timestamp)
            ? d.timestamp
            : (d.dateObj instanceof Date ? d.dateObj.getTime() : NaN);
        if (!Number.isFinite(endTs)) return;
        const durationMs = getMeasurementIntervalHours(d) * 3600000;
        const startTs = Number.isFinite(d.intervalStartUtc) ? d.intervalStartUtc : endTs - durationMs;
        const firstSlotEnd = startTs + 15 * 60 * 1000;
        // An interval average contributes to every quarter-hour slot it
        // covers (important for 30/60-minute MSCONS intervals).
        for (let slotEnd = firstSlotEnd; slotEnd <= endTs + 1000; slotEnd += 15 * 60 * 1000) {
            const dateObj = new Date(slotEnd);
            if (!Number.isFinite(dateObj.getTime())) continue;
            const h = dateObj.getHours();
            const m = dateObj.getMinutes();
            const idx = h * 4 + Math.floor(m / 15);
            if (idx >= 0 && idx < 96) {
                slots[idx].push(d.kw);
            }
        }
    });
    return slots.map(vals => {
        if (vals.length === 0) return { avg: null, min: null, max: null };
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const sum = vals.reduce((a, b) => a + b, 0);
        return { avg: sum / vals.length, min, max };
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Strikte Messwertkonvention
const MEASUREMENT_CONVENTION = {
    type: "interval_average",
    timestampPosition: "interval_end",
    defaultIntervalHours: 0.25,
    energyRule: "energyKwh = powerKw * intervalHours"
};

function getMeasurementIntervalHours(measurement, fallback = 0.25) {
    const value = Number(measurement?.intervalHours);
    return Number.isFinite(value) && value > 0 && value <= 24 ? value : fallback;
}

function getMeasurementEnergyKwh(measurement, fallback = 0.25) {
    if (!measurement) return null;
    if (measurement.energyKwh !== undefined && measurement.energyKwh !== null) {
        const explicit = Number(measurement.energyKwh);
        return Number.isFinite(explicit) && explicit >= 0 ? explicit : null;
    }
    const power = Number(measurement.kw ?? measurement.powerKw);
    return Number.isFinite(power) && power >= 0 ? power * getMeasurementIntervalHours(measurement, fallback) : null;
}

function getMeasurementPowerKw(measurement, fallback = 0.25) {
    if (!measurement) return null;
    const power = Number(measurement.kw ?? measurement.powerKw);
    if (Number.isFinite(power) && power >= 0) return power;
    const energy = getMeasurementEnergyKwh(measurement, fallback);
    const hours = getMeasurementIntervalHours(measurement, fallback);
    return energy !== null ? energy / hours : null;
}

/**
 * Normalisiert rohe Messwerte aus CSV oder MSCONS in ein einheitliches MeasurementPoint Objekt
 */
function normalizeMeasurement(raw) {
    if (!raw) return null;

    const endTs = raw.timestampUtc || raw.timestamp || raw.endTimestamp || Date.now();
    const startTs = raw.intervalStartUtc || raw.startTimestamp || (endTs - 15 * 60 * 1000);
    const durationMs = Math.max(1, endTs - startTs);
    const intervalHours = Math.max(0.0001, durationMs / (1000 * 60 * 60));

    let rawUnit = (raw.rawUnit || raw.unit || 'kW').trim();
    let powerKw = 0;
    let energyKwh = 0;
    const parsedRawVal = parseFloat(raw.rawValue !== undefined ? raw.rawValue : raw.value);
    const rawVal = Number.isFinite(parsedRawVal) ? parsedRawVal : NaN;

    if (rawUnit.toLowerCase() === 'kw' || rawUnit.toLowerCase() === 'w') {
        powerKw = rawUnit.toLowerCase() === 'w' ? rawVal / 1000 : rawVal;
        energyKwh = powerKw * intervalHours;
        rawUnit = 'kW';
    } else {
        energyKwh = rawUnit.toLowerCase() === 'wh' ? rawVal / 1000 : rawVal;
        powerKw = energyKwh / intervalHours;
        rawUnit = 'kWh';
    }

    return {
        timestampUtc: endTs,
        localTimestamp: raw.localTimestamp || (new Date(endTs)).toISOString(),
        intervalStartUtc: startTs,
        intervalEndUtc: endTs,
        intervalHours: intervalHours,
        rawValue: rawVal,
        rawUnit: rawUnit,
        powerKw: powerKw,
        energyKwh: energyKwh,
        direction: raw.direction || 'consumption',
        obisCode: raw.obisCode || '1-1:1.29.0',
        qualityStatus: raw.qualityStatus || ((Number.isFinite(powerKw) && powerKw >= 0 && Number.isFinite(energyKwh) && energyKwh >= 0) ? 'VALID' : 'INVALID'),
        source: raw.source || { format: 'UNKNOWN' }
    };
}

/**
 * Zentale Energieintegrationsfunktion
 */
function calculateEnergy(measurements, options = {}) {
    const excludeInvalid = options.excludeInvalid !== false;
    let totalEnergyKwh = 0;
    let validEnergyKwh = 0;
    let imputedEnergyKwh = 0;
    let usedIntervals = 0;
    let excludedIntervals = 0;

    if (!Array.isArray(measurements)) {
        return { totalEnergyKwh: 0, validEnergyKwh: 0, imputedEnergyKwh: 0, usedIntervals: 0, excludedIntervals: 0, coverageRatio: 0 };
    }

    measurements.forEach(m => {
        const kwh = getMeasurementEnergyKwh(m);

        if (m.qualityStatus === 'INVALID' || kwh === null) {
            excludedIntervals++;
            return;
        }

        totalEnergyKwh += kwh;
        if (m.qualityStatus === 'IMPUTED') {
            imputedEnergyKwh += kwh;
        } else {
            validEnergyKwh += kwh;
        }
        usedIntervals++;
    });

    return {
        totalEnergyKwh,
        validEnergyKwh,
        imputedEnergyKwh,
        usedIntervals,
        excludedIntervals,
        coverageRatio: measurements.length > 0 ? (usedIntervals / measurements.length) : 0
    };
}

/**
 * Unabhängige Referenzfunktion zur mathematischen Verifizierung der Produktionsfunktion
 */
function calculateAgnesReference(data, kp, ap1, ap2, minPercent) {
    kp = Math.max(0, parseFloat(kp) || 0);
    ap1 = Math.max(0, parseFloat(ap1) || 0);
    ap2 = Math.max(0, parseFloat(ap2) || 0);
    if (ap2 < ap1) ap2 = ap1;
    minPercent = Math.max(0.1, Math.min(1.0, parseFloat(minPercent) || 0.1));

    if (!Array.isArray(data) || data.length === 0) {
        return { pMax: 0, optK: 0, totalCost: 0, eTotal: 0, eWithin: 0, eExceed: 0 };
    }

    let pMax = 0;
    data.forEach(d => {
        const val = getMeasurementPowerKw(d) || 0;
        if (val > pMax) pMax = val;
    });

    const kMin = pMax * minPercent;
    let bestK = pMax;
    let minTotalCost = Infinity;
    let bestRefResult = null;

    // Brute Force über 1000 diskrete Schritte
    const steps = 1000;
    for (let i = 0; i <= steps; i++) {
        const candidateK = kMin + (pMax - kMin) * (i / steps);
        let eExceed = 0;
        let eTotal = 0;

        data.forEach(d => {
            const p = getMeasurementPowerKw(d) || 0;
            const dt = getMeasurementIntervalHours(d);
            const kwh = getMeasurementEnergyKwh(d);
            if (kwh === null) return;
            eTotal += kwh;
            eExceed += p > candidateK ? Math.max(0, kwh - candidateK * dt) : 0;
        });

        const eWithin = eTotal - eExceed;
        const capCost = kp * candidateK;
        const energyCostAp1 = eWithin * (ap1 / 100);
        const energyCostAp2 = eExceed * (ap2 / 100);
        const totalCost = capCost + energyCostAp1 + energyCostAp2;

        if (totalCost < minTotalCost) {
            minTotalCost = totalCost;
            bestK = candidateK;
            bestRefResult = {
                pMax,
                optK: candidateK,
                capCost,
                energyCostAp1,
                energyCostAp2,
                totalCost,
                eWithin,
                eExceed,
                eTotal
            };
        }
    }

    return bestRefResult;
}

/** Generiert eine eindeutige ID für ein Berechnungsprotokoll. */
function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'CAPACITY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 9).toUpperCase();
}

/** Erzeugt einen SHA-256 Hash aus einem String. */
async function calculateStringHash(str) {
    if (!str) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            // fallback
        }
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return 'SHA256-' + Math.abs(hash).toString(16).padStart(8, '0');
}

/** Erzeugt den SHA-256 Fingerabdruck über den vollständigen Dateiinhalt. */
async function calculateArrayBufferHash(buffer) {
    if (!(buffer instanceof ArrayBuffer)) {
        throw new TypeError('Für den Datei-Hash wird ein ArrayBuffer benötigt.');
    }
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    // A clearly labelled fallback is preferable to pretending a weak hash is SHA-256.
    let hash = 2166136261;
    new Uint8Array(buffer).forEach(byte => {
        hash ^= byte;
        hash = Math.imul(hash, 16777619);
    });
    return `FALLBACK-FNV1A-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Plausibilisierungs-Engine für die Kapazitäts-Szenariorechnung.
 * 🟢 GREEN:  Completeness >= 99.5%, all invariants valid -> vollständige Datenbasis
 * 🟡 YELLOW: Completeness 95.0% - 99.5% -> Simulation / Indikatives Ergebnis
 * 🔴 RED:    Completeness < 95.0% or math invariant fail -> Gesperrt
 */
function validateAgnesResult(result, completenessRatio = 1.0, options = {}) {
    const warnings = [];

    if (!result || !result.optResult) {
        return {
            status: 'RED',
            badgeLabel: '🔴 Keine Daten',
            recommendationTitle: 'Kein Szenariowert verfügbar',
            warnings: ['Keine berechenbaren Messwertdaten vorhanden.'],
            allowRecommendation: false
        };
    }

    const opt = result.optResult;
    const pct = (completenessRatio * 100).toFixed(1);

    // 1. Math Invariant Checks
    if (opt.eWithin !== undefined && opt.eExceed !== undefined && opt.eTotal !== undefined) {
        const totalEnergyDiff = Math.abs((opt.eWithin + opt.eExceed) - opt.eTotal);
        if (totalEnergyDiff > 1e-4) {
            warnings.push(`Mathematische Inkonsistenz: Normalmenge (${opt.eWithin.toFixed(0)} kWh) + Überschreitung (${opt.eExceed.toFixed(0)} kWh) unterscheidet sich um ${totalEnergyDiff.toFixed(2)} kWh von der Gesamtarbeit.`);
        }
    }

    if (opt.capCost !== undefined && opt.energyCostAp1 !== undefined && opt.energyCostAp2 !== undefined && opt.totalCost !== undefined) {
        const totalCostDiff = Math.abs((opt.capCost + opt.energyCostAp1 + opt.energyCostAp2) - opt.totalCost);
        if (totalCostDiff > 1e-4) {
            warnings.push(`Mathematische Inkonsistenz: Kapazitätskosten + Arbeitskosten ergeben nicht die Gesamtkosten (Abweichung: ${totalCostDiff.toFixed(2)} €).`);
        }
    }

    if (options.yearWarnings && Array.isArray(options.yearWarnings)) {
        options.yearWarnings.forEach(w => warnings.push(w));
    }

    // 2. Data Completeness & Quality Status
    if (completenessRatio < 0.95) {
        if (completenessRatio < 0.95) {
            warnings.push(`Unvollständige Datenbasis: Die Abdeckung beträgt nur ${pct} % (Erforderlich: mind. 95,0 % für Simulation, 99,5 % für den Status „vollständig“).`);
        }
        return {
            status: 'RED',
            badgeLabel: '🔴 Gesperrt',
            recommendationTitle: 'Szenariowert nicht belastbar (Daten unvollständig)',
            warnings: warnings,
            allowRecommendation: false
        };
    } else if (completenessRatio < 0.995 || options.hasImputedValues || options.hasIncompleteYears || warnings.length > 0) {
        if (completenessRatio < 0.995) {
            warnings.push(`Eingeschränkte Datenbasis (${pct} % Abdeckung): Ergebnis als Simulation eingestuft.`);
        }
        if (options.hasImputedValues) {
            warnings.push('Enthält geschätzte Ersatzwerte (Imputation).');
        }
        return {
            status: 'YELLOW',
            badgeLabel: '🟡 Simulation',
            recommendationTitle: 'Indikative Bestellleistung (Simulation)',
            warnings: warnings,
            allowRecommendation: false
        };
    }

    return {
        status: 'GREEN',
        badgeLabel: '🟢 Datenbasis vollständig',
        recommendationTitle: 'Szenariowert (Beta)',
        warnings: [],
        allowRecommendation: true
    };
}

function calculateAgnesCosts(data, kp, ap1, ap2, minPercent, scaleFactorS) {
    // Parameter validation & normalization (P1)
    kp = Math.max(0, parseFloat(kp) || 0);
    ap1 = Math.max(0, parseFloat(ap1) || 0);
    ap2 = Math.max(0, parseFloat(ap2) || 0);
    if (ap2 < ap1) ap2 = ap1; // Ensure AP2 is not lower than AP1
    minPercent = Math.max(0.1, Math.min(1.0, parseFloat(minPercent) || 0.1));
    scaleFactorS = Math.max(0.1, parseFloat(scaleFactorS) || 1.0);

    // Clean data: deduplicate and remove negatives/implausible values
    const seenTimestamps = new Set();
    const cleanData = [];
    
    (Array.isArray(data) ? data : []).forEach(d => {
        const p = getMeasurementPowerKw(d);
        if (!Number.isFinite(p)) return;
        if (d.energyKwh !== undefined && getMeasurementEnergyKwh(d) === null) return;
        // Skip negatives or extreme spikes
        if (p < 0 || p > 100000) return;
        // Skip duplicates
        if (Number.isFinite(d.timestamp)) {
            if (seenTimestamps.has(d.timestamp)) return;
            seenTimestamps.add(d.timestamp);
        }
        cleanData.push({ ...d, kw: p });
    });

    let pMax = 0;
    cleanData.forEach(d => {
        if (d.kw > pMax) {
            pMax = d.kw;
        }
    });

    if (pMax === 0) {
        return {
            pMax: 0,
            kMin: 0,
            optK: 0,
            optResult: { K: 0, capCost: 0, energyCostAp1: 0, energyCostAp2: 0, totalCost: 0 },
            maxResult: { K: 0, capCost: 0, energyCostAp1: 0, energyCostAp2: 0, totalCost: 0 },
            minResult: { K: 0, capCost: 0, energyCostAp1: 0, energyCostAp2: 0, totalCost: 0 },
            sweepResults: []
        };
    }

    const kMin = pMax * minPercent;
    const sweepSteps = 150;
    let optK = pMax;
    let minCost = Infinity;
    let optResult = null;

    function computeCostForK(K) {
        let eExceed = 0;
        let eTotal = 0;

        cleanData.forEach(d => {
            const p = d.kw;
            const dt = getMeasurementIntervalHours(d);
            const kwh = getMeasurementEnergyKwh(d);
            if (kwh === null) return;
            eTotal += kwh;
            // Split the measured interval energy itself. This keeps
            // eWithin + eExceed = eTotal even when source fields disagree.
            eExceed += p > K ? Math.max(0, kwh - K * dt) : 0;
        });

        const eWithin = eTotal - eExceed;
        const capCost = kp * K;
        const energyCostAp1 = (eWithin * (ap1 / 100)) * scaleFactorS;
        const energyCostAp2 = (eExceed * (ap2 / 100)) * scaleFactorS;
        const totalCost = capCost + energyCostAp1 + energyCostAp2;

        return {
            K: K,
            capCost: capCost,
            energyCostAp1: energyCostAp1,
            energyCostAp2: energyCostAp2,
            totalCost: totalCost,
            eWithin: eWithin * scaleFactorS,
            eExceed: eExceed * scaleFactorS,
            eTotal: eTotal * scaleFactorS
        };
    }

    // 1. Collect exact candidates for optimization: kMin, pMax, top peak values P_i, and sweep steps
    const candidateSet = new Set();
    candidateSet.add(kMin);
    candidateSet.add(pMax);

    // Pick top peak values to keep optimization exact without cluttering chart data
    const sortedPeaks = cleanData.map(d => d.kw).filter(p => p >= kMin && p <= pMax).sort((a, b) => b - a);
    const stepPeak = Math.max(1, Math.floor(sortedPeaks.length / 200));
    for (let i = 0; i < sortedPeaks.length; i += stepPeak) {
        candidateSet.add(sortedPeaks[i]);
    }

    for (let i = 0; i <= sweepSteps; i++) {
        const K = kMin + (pMax - kMin) * (i / sweepSteps);
        candidateSet.add(K);
    }

    // 2. Evaluate all exact candidates to find optK
    const candidateResults = [];
    candidateSet.forEach(K => {
        const res = computeCostForK(K);
        candidateResults.push(res);

        if (res.totalCost < minCost) {
            minCost = res.totalCost;
            optK = K;
            optResult = res;
        }
    });

    // 3. Generate sweepResults containing all exact candidates and grid points sorted by K
    const sweepResultsMap = new Map();
    candidateResults.forEach(res => {
        sweepResultsMap.set(res.K, res);
    });
    const sweepResults = Array.from(sweepResultsMap.values()).sort((a, b) => a.K - b.K);

    // 4. Cost-neutral optimum band (< 0.5% cost variation)
    const bandThresholdCost = minCost * 1.005;
    let minBandK = optK;
    let maxBandK = optK;

    candidateResults.forEach(res => {
        if (res.totalCost <= bandThresholdCost) {
            if (res.K < minBandK) minBandK = res.K;
            if (res.K > maxBandK) maxBandK = res.K;
        }
    });

    // 4. Marginal exceed duration H(K) in hours/year
    const deltaAp = (ap2 - ap1) / 100;
    const marginalExceedHours = deltaAp > 0 ? (kp / deltaAp) : 0;

    // 5. Compute maxResult & minResult for boundary reference
    const maxResult = computeCostForK(pMax);
    const minResult = computeCostForK(kMin);

    // 6. Plausibility validation & traffic light status (Punkte 97-101)
    const coveredHours = cleanData.reduce((sum, d) => sum + getMeasurementIntervalHours(d), 0);
    // For the single-year calculation, completeness is based on covered
    // interval duration. The scale factor remains an annualization factor,
    // but must not turn a short/gappy sample into a green recommendation.
    const coverageRatio = Math.min(1, coveredHours / 8760);
    const qualityPlausibility = validateAgnesResult({ optResult, pMax, kMin }, coverageRatio);
    const calculationId = generateUUID();
    const toolVersion = LASTGANG_APP_VERSION;
    const timestampIso = new Date().toISOString();

    if (qualityPlausibility) {
        qualityPlausibility.calculationId = calculationId;
        qualityPlausibility.toolVersion = toolVersion;
    }

    return {
        calculationId: calculationId,
        toolVersion: toolVersion,
        timestampIso: timestampIso,
        pMax: pMax,
        kMin: kMin,
        optK: optK,
        optResult: optResult,
        maxResult: maxResult,
        minResult: minResult,
        sweepResults: sweepResults,
        equivalentRange: { minK: minBandK, maxK: maxBandK, thresholdCost: bandThresholdCost },
        marginalExceedHours: marginalExceedHours,
        qualityPlausibility: qualityPlausibility
    };
}

function calculateAgnesCostsMulti(datasets, kp, ap1, ap2, minPercent = 0.1, plannedK = null, options = {}) {
    // Parameter validation & normalization (P1)
    kp = Math.max(0, parseFloat(kp) || 0);
    ap1 = Math.max(0, parseFloat(ap1) || 0);
    ap2 = Math.max(0, parseFloat(ap2) || 0);
    if (ap2 < ap1) ap2 = ap1;
    minPercent = Math.max(0.1, Math.min(1.0, parseFloat(minPercent) || 0.1));

    const strategy = (options && options.strategy) ? options.strategy : 'avg';
    const lambda = (options && options.lambda) ? parseFloat(options.lambda) || 0.0 : 0.0;

    if (!datasets || datasets.length === 0) {
        return {
            pMaxOverall: 0,
            kMinOverall: 0,
            plannedK: 0,
            optK: 0,
            optResult: null,
            plannedResult: null,
            maxResult: null,
            minResult: null,
            sweepResults: []
        };
    }

    // 1. Prepare and clean data for each dataset, calculating individual pMax & interval completeness
    const datasetInfos = datasets.map(ds => {
        const seenTimestamps = new Set();
        const cleanData = [];
        
        (Array.isArray(ds.data) ? ds.data : []).forEach(d => {
            const p = getMeasurementPowerKw(d);
            if (!Number.isFinite(p) || p < 0 || p > 100000) return;
            if (d.energyKwh !== undefined && getMeasurementEnergyKwh(d) === null) return;
            if (Number.isFinite(d.timestamp)) {
                if (seenTimestamps.has(d.timestamp)) return;
                seenTimestamps.add(d.timestamp);
            }
            cleanData.push({ ...d, kw: p });
        });

        let pMax = 0;
        cleanData.forEach(d => {
            if (d.kw > pMax) pMax = d.kw;
        });

        // Determine year, expected 15-minute intervals, and scale factor
        let scaleFactorS = 1.0;
        let elapsedDays = 365;
        let expectedIntervals = 35040;
        let coveragePercent = 100;
        let isIncomplete = false;

        if (cleanData.length > 0) {
            const minDate = cleanData[0].dateObj instanceof Date
                ? cleanData[0].dateObj
                : new Date(cleanData[0].timestamp);
            const maxDate = cleanData[cleanData.length - 1].dateObj instanceof Date
                ? cleanData[cleanData.length - 1].dateObj
                : new Date(cleanData[cleanData.length - 1].timestamp);
            if (minDate && maxDate) {
                const durationMs = maxDate.getTime() - minDate.getTime() + 15 * 60 * 1000;
                const year = minDate.getFullYear();
                const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
                const annualHours = isLeap ? 8784 : 8760;
                expectedIntervals = annualHours * 4;
                
                const elapsedHours = durationMs / (1000 * 60 * 60);
                elapsedDays = durationMs / (1000 * 60 * 60 * 24);
                
                // Interval completeness check (P1)
                // Coverage is measured in quarter-hour equivalents, not raw
                // row count. A valid 1-hour MSCONS interval therefore covers
                // four expected 15-minute slots.
                const coveredQuarterHours = cleanData.reduce((sum, d) => sum + (getMeasurementIntervalHours(d) / 0.25), 0);
                const coverageRatio = expectedIntervals > 0 ? (coveredQuarterHours / expectedIntervals) : 1.0;
                coveragePercent = Math.min(100, Math.round(coverageRatio * 100));
                isIncomplete = coveragePercent < 98;

                if (elapsedHours > 0) {
                    scaleFactorS = annualHours / elapsedHours;
                }
            }
        }

        const singleYearResult = calculateAgnesCosts(cleanData, kp, ap1, ap2, minPercent, scaleFactorS);
        const optKSingleYear = singleYearResult ? singleYearResult.optK : pMax;
        const optResultSingleYear = singleYearResult ? singleYearResult.optResult : null;

        return {
            name: ds.name,
            cleanData: cleanData,
            pMax: pMax,
            optKSingleYear: optKSingleYear,
            optResultSingleYear: optResultSingleYear,
            kMin: pMax * 0.1, // 10% min limit for this year
            scaleFactorS: scaleFactorS,
            elapsedDays: elapsedDays,
            expectedIntervals: expectedIntervals,
            validIntervalCount: cleanData.reduce((sum, d) => sum + (getMeasurementIntervalHours(d) / 0.25), 0),
            coveragePercent: coveragePercent,
            isIncomplete: isIncomplete
        };
    });

    // Determine overall max power to set global upper bound
    let pMaxOverall = 0;
    let searchLowerBound = Infinity;
    datasetInfos.forEach(info => {
        if (info.pMax > pMaxOverall) pMaxOverall = info.pMax;
        if (info.kMin < searchLowerBound) searchLowerBound = info.kMin;
    });
    if (searchLowerBound === Infinity || searchLowerBound < 0) searchLowerBound = 0;

    const kMinOverall = pMaxOverall * 0.1;
    let plannedKVal = kMinOverall;
    if (plannedK !== null && !isNaN(plannedK) && plannedK > 0) {
        plannedKVal = Math.max(searchLowerBound, Math.min(pMaxOverall, plannedK));
    } else if (minPercent && minPercent > 0) {
        plannedKVal = Math.max(searchLowerBound, Math.min(pMaxOverall, pMaxOverall * minPercent));
    }

    // Inner helper to calculate the total multi-year cost for a candidate booking K
    function computeCostMultiForK(K) {
        let totalCapCost = 0;
        let totalEnergyCostAp1 = 0;
        let totalEnergyCostAp2 = 0;
        let totalCost = 0;
        let totalEWithin = 0;
        let totalEExceed = 0;
        let totalETotal = 0;
        const yearlyDetails = [];

        datasetInfos.forEach(info => {
            // Apply candidate global booking K, clamped to this year's 10% minimum (Punkt 2)
            const actualK = Math.max(K, info.kMin);
            let eExceed = 0;
            let eTotal = 0;

            info.cleanData.forEach(d => {
                const p = d.kw;
                const dt = getMeasurementIntervalHours(d);
                const kwh = getMeasurementEnergyKwh(d);
                if (kwh === null) return;
                eTotal += kwh;
                eExceed += p > actualK ? Math.max(0, kwh - actualK * dt) : 0;
            });

            const eWithin = eTotal - eExceed;
            const capCost = kp * actualK;
            const energyCostAp1 = (eWithin * (ap1 / 100)) * info.scaleFactorS;
            const energyCostAp2 = (eExceed * (ap2 / 100)) * info.scaleFactorS;
            const yearlyTotal = capCost + energyCostAp1 + energyCostAp2;

            const scaledEWithin = eWithin * info.scaleFactorS;
            const scaledEExceed = eExceed * info.scaleFactorS;
            const scaledETotal = eTotal * info.scaleFactorS;

            totalCapCost += capCost;
            totalEnergyCostAp1 += energyCostAp1;
            totalEnergyCostAp2 += energyCostAp2;
            totalCost += yearlyTotal;

            totalEWithin += scaledEWithin;
            totalEExceed += scaledEExceed;
            totalETotal += scaledETotal;

            yearlyDetails.push({
                name: info.name,
                pMax: info.pMax,
                optKSingleYear: info.optKSingleYear,
                actualK: actualK,
                capCost: capCost,
                energyCostAp1: energyCostAp1,
                energyCostAp2: energyCostAp2,
                totalCost: yearlyTotal,
                eTotal: scaledETotal,
                eExceed: scaledEExceed,
                eWithin: scaledEWithin
            });
        });

        return {
            K: K,
            capCost: totalCapCost,
            energyCostAp1: totalEnergyCostAp1,
            energyCostAp2: totalEnergyCostAp2,
            totalCost: totalCost,
            eWithin: totalEWithin,
            eExceed: totalEExceed,
            eTotal: totalETotal,
            yearlyDetails: yearlyDetails
        };
    }

    // Coarse + fine double-sweep optimization
    const sweepSteps = 150;
    let optK = pMaxOverall;
    let minEvalScore = Infinity;
    let optResult = null;

    // 1. Evaluate candidate knickpoints for optimization (Punkt 3: Include all unique observed powers)
    const exactCandidatesSet = new Set([searchLowerBound, kMinOverall, pMaxOverall, plannedKVal]);
    datasetInfos.forEach(info => {
        exactCandidatesSet.add(info.pMax);
        exactCandidatesSet.add(info.kMin);
        info.cleanData.forEach(d => {
            if (d.kw >= searchLowerBound && d.kw <= pMaxOverall) {
                exactCandidatesSet.add(d.kw);
            }
        });
    });

    for (let i = 0; i <= sweepSteps; i++) {
        const K = searchLowerBound + (pMaxOverall - searchLowerBound) * (i / sweepSteps);
        exactCandidatesSet.add(K);
    }

    const exactCandidates = Array.from(exactCandidatesSet);

    exactCandidates.forEach(candK => {
        if (candK >= searchLowerBound && candK <= pMaxOverall) {
            const res = computeCostMultiForK(candK);
            
            // Compute evaluation score based on strategy
            let evalScore = res.totalCost;
            if (strategy === 'worst_case') {
                const maxYearCost = Math.max(...res.yearlyDetails.map(d => d.totalCost));
                evalScore = maxYearCost * datasetInfos.length;
            } else if (strategy === 'risk_adjusted' && lambda > 0) {
                const meanCost = res.totalCost / datasetInfos.length;
                const variance = res.yearlyDetails.reduce((sum, d) => sum + Math.pow(d.totalCost - meanCost, 2), 0) / datasetInfos.length;
                const stdDev = Math.sqrt(variance);
                evalScore = (meanCost + lambda * stdDev) * datasetInfos.length;
            }

            if (evalScore < minEvalScore) {
                minEvalScore = evalScore;
                optK = candK;
                optResult = res;
            }
        }
    });

    // 2. Populate sweepResults with all evaluated exact candidates & grid steps sorted by K
    const sweepResultsMap = new Map();
    exactCandidates.forEach(candK => {
        if (candK >= searchLowerBound && candK <= pMaxOverall) {
            if (!sweepResultsMap.has(candK)) {
                sweepResultsMap.set(candK, computeCostMultiForK(candK));
            }
        }
    });
    const sweepResults = Array.from(sweepResultsMap.values()).sort((a, b) => a.K - b.K);

    const maxResult = computeCostMultiForK(pMaxOverall);
    const minResult = computeCostMultiForK(kMinOverall);
    const plannedResult = computeCostMultiForK(plannedKVal);

    // 3. Compute 0.5% tolerance uncertainty band
    const bandThresholdCost = optResult.totalCost * 1.005;
    let minBandK = optK;
    let maxBandK = optK;
    sweepResults.forEach(res => {
        if (res.totalCost <= bandThresholdCost) {
            if (res.K < minBandK) minBandK = res.K;
            if (res.K > maxBandK) maxBandK = res.K;
        }
    });

    // 4. Compute flexibility premium (Individual Year vs Multi-Year contract)
    let indivSumCost = 0;
    datasetInfos.forEach(info => {
        if (info.optResultSingleYear) {
            indivSumCost += info.optResultSingleYear.totalCost;
        }
    });
    const multiCost = optResult.totalCost;
    const premiumEuro = Math.max(0, multiCost - indivSumCost);
    const premiumPercent = indivSumCost > 0 ? ((premiumEuro / indivSumCost) * 100) : 0;

    // 5. Multi-year quality & plausibility validation
    const yearWarnings = [];
    let sumCoverage = 0;
    datasetInfos.forEach(info => {
        const ratio = info.expectedIntervals > 0 ? (info.validIntervalCount / info.expectedIntervals) : 1.0;
        sumCoverage += ratio;
        if (info.isIncomplete) {
            yearWarnings.push(`Jahresdaten für '${info.name}' unvollständig (${info.coveragePercent} % Abdeckung)`);
        }
    });
    const avgCoverageRatio = datasetInfos.length > 0 ? (sumCoverage / datasetInfos.length) : 1.0;
    const qualityPlausibility = validateAgnesResult(
        { optResult, pMax: pMaxOverall, kMin: kMinOverall },
        avgCoverageRatio,
        { hasIncompleteYears: datasetInfos.some(d => d.isIncomplete), yearWarnings }
    );

    const calculationId = generateUUID();
    const toolVersion = LASTGANG_APP_VERSION;
    const timestampIso = new Date().toISOString();

    return {
        calculationId: calculationId,
        toolVersion: toolVersion,
        timestampIso: timestampIso,
        strategy: strategy,
        lambda: lambda,
        pMaxOverall: pMaxOverall,
        kMinOverall: kMinOverall,
        plannedK: plannedKVal,
        optK: optK,
        optResult: optResult,
        plannedResult: plannedResult,
        maxResult: maxResult,
        minResult: minResult,
        sweepResults: sweepResults,
        datasetInfos: datasetInfos,
        equivalentRange: { minK: minBandK, maxK: maxBandK, thresholdCost: bandThresholdCost },
        flexibilityPremium: { indivSumCost, multiCost, premiumEuro, premiumPercent },
        qualityPlausibility: qualityPlausibility
    };
}

/**
 * Sensitivitätsanalyse / Stresstest für Netzgebühren (Punkt 29)
 */
function calculateAgnesSensitivity(datasetsMulti, kp, ap1, ap2, minPercent = 0.1, plannedK = null) {
    const variations = [
        { label: '-20% Kapazitätspreis', kp: kp * 0.8, ap1, ap2 },
        { label: '-10% Kapazitätspreis', kp: kp * 0.9, ap1, ap2 },
        { label: 'Basis-Tarif (100%)', kp, ap1, ap2 },
        { label: '+10% Kapazitätspreis', kp: kp * 1.1, ap1, ap2 },
        { label: '+20% Kapazitätspreis', kp: kp * 1.2, ap1, ap2 },
        { label: '+20% AP2 (Überschreitung)', kp, ap1, ap2: ap2 * 1.2 },
        { label: '+50% AP2 (Überschreitung)', kp, ap1, ap2: ap2 * 1.5 }
    ];

    return variations.map(v => {
        const res = calculateAgnesCostsMulti(datasetsMulti, v.kp, v.ap1, v.ap2, minPercent, plannedK);
        return {
            label: v.label,
            kp: v.kp,
            ap1: v.ap1,
            ap2: v.ap2,
            optK: res.optK,
            totalCost: res.optResult ? res.optResult.totalCost : 0
        };
    });
}

/**
 * Revisionsnaher Export des Berechnungsstands als JSON-Projektdatei (Punkt 32)
 */
function exportLastgangProject(allDatasets, globalSettings = {}) {
    const projectData = {
        version: LASTGANG_APP_VERSION,
        projectFormat: "lastgang_analyse_v1",
        createdIso: new Date().toISOString(),
        globalSettings: globalSettings,
        datasets: allDatasets.map(ds => ({
            id: ds.id,
            name: ds.name,
            fileHash: ds.fileHash || null,
            data: (ds.data || []).map(d => ({
                timestamp: d.timestamp,
                kw: d.kw,
                kvar: d.kvar || null,
                status: d.status || 'VALID'
            }))
        }))
    };

    return JSON.stringify(projectData, null, 2);
}

/**
 * Revisionsnaher Import einer JSON-Projektdatei (Punkt 32)
 */
function importLastgangProject(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!parsed || parsed.projectFormat !== 'lastgang_analyse_v1' || !Array.isArray(parsed.datasets)) {
        throw new Error("Ungültiges .lastgang Projektdateiformat.");
    }
    
    const datasets = parsed.datasets.map(ds => ({
        id: ds.id,
        name: ds.name,
        fileHash: ds.fileHash,
        data: (ds.data || []).map(d => ({
            timestamp: d.timestamp,
            dateObj: new Date(d.timestamp),
            kw: d.kw,
            kvar: d.kvar,
            status: d.status || 'VALID'
        }))
    }));

    return {
        datasets: datasets,
        globalSettings: parsed.globalSettings || {}
    };
}


// Expose holiday API globally
window.holidayConfig = holidayConfig;
window.getOfficialHolidaysForState = getOfficialHolidaysForState;
window.getEasterSunday = getEasterSunday;
window.saveHolidayConfig = saveHolidayConfig;
window.getHolidaysForYear = getHolidaysForYear;
window.isHoliday = isHoliday;
window.getHolidayName = getHolidayName;
window.isNRWHoliday = isNRWHoliday;
window.getNRWHolidayName = getNRWHolidayName;
window.clearHolidaysCache = clearHolidaysCache;
window.getIntervalTariffFractions = getIntervalTariffFractions;
window.calculateAgnesCosts = calculateAgnesCosts;
window.calculateAgnesCostsMulti = calculateAgnesCostsMulti;
window.calculateAgnesSensitivity = calculateAgnesSensitivity;
window.exportLastgangProject = exportLastgangProject;
window.importLastgangProject = importLastgangProject;
