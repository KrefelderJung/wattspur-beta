/**
 * Dates Utility Module (js/shared/dates.js)
 * Safe window attachment without redeclaration conflict
 */

if (typeof window !== 'undefined') {
    if (typeof window.getEasterSunday === 'undefined') {
        window.getEasterSunday = function(year) {
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
            const month = Math.floor((h + l - 7 * m + 114) / 31);
            const day = ((h + l - 7 * m + 114) % 31) + 1;
            return new Date(year, month - 1, day);
        };
    }

    if (typeof window.isNRWHoliday === 'undefined') {
        window.isNRWHoliday = function(dateObj) {
            if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
            const m = dateObj.getMonth();
            const d = dateObj.getDate();
            const y = dateObj.getFullYear();

            if (m === 0 && d === 1) return true;   // Neujahr
            if (m === 4 && d === 1) return true;   // Tag der Arbeit
            if (m === 9 && d === 3) return true;   // Tag der Deutschen Einheit
            if (m === 10 && d === 1) return true;  // Allerheiligen
            if (m === 11 && d === 25) return true; // 1. Weihnachtstag
            if (m === 11 && d === 26) return true; // 2. Weihnachtstag

            const easter = window.getEasterSunday(y);
            const diffDays = Math.round((dateObj.getTime() - easter.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === -2) return true; // Karfreitag
            if (diffDays === 1) return true;  // Ostermontag
            if (diffDays === 39) return true; // Christi Himmelfahrt
            if (diffDays === 50) return true; // Pfingstmontag
            if (diffDays === 60) return true; // Fronleichnam

            return false;
        };
    }

    if (typeof window.getNRWHolidayName === 'undefined') {
        window.getNRWHolidayName = function(dateObj) {
            if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return null;
            const m = dateObj.getMonth();
            const d = dateObj.getDate();
            const y = dateObj.getFullYear();

            if (m === 0 && d === 1) return 'Neujahr';
            if (m === 4 && d === 1) return 'Tag der Arbeit';
            if (m === 9 && d === 3) return 'Tag der Deutschen Einheit';
            if (m === 10 && d === 1) return 'Allerheiligen';
            if (m === 11 && d === 25) return '1. Weihnachtstag';
            if (m === 11 && d === 26) return '2. Weihnachtstag';

            const easter = window.getEasterSunday(y);
            const diffDays = Math.round((dateObj.getTime() - easter.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === -2) return 'Karfreitag';
            if (diffDays === 1) return 'Ostermontag';
            if (diffDays === 39) return 'Christi Himmelfahrt';
            if (diffDays === 50) return 'Pfingstmontag';
            if (diffDays === 60) return 'Fronleichnam';

            return null;
        };
    }

    if (typeof window.getLocalDateString === 'undefined') {
        window.getLocalDateString = function(dateObj) {
            if (!dateObj || isNaN(dateObj.getTime())) return '';
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
    }

    if (typeof window.isLeapYear === 'undefined') {
        window.isLeapYear = function(year) {
            return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        };
    }
}
