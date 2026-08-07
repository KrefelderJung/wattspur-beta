/**
 * Numbers Utility Module (js/shared/numbers.js)
 * Safe window attachment without redeclaration conflict
 */

if (typeof window !== 'undefined') {
    if (typeof window.NumberParser === 'undefined') {
        window.NumberParser = class NumberParser {
            static parseLocalizedNumber(val) {
                if (typeof val === 'number') return isNaN(val) ? null : val;
                if (typeof val !== 'string') return null;
                let str = val.trim();
                if (!str) return null;

                str = str.replace(/[€$\s]/g, '');

                if (str.includes(',') && str.includes('.')) {
                    if (str.indexOf('.') < str.indexOf(',')) {
                        str = str.replace(/\./g, '').replace(',', '.');
                    } else {
                        str = str.replace(/,/g, '');
                    }
                } else if (str.includes(',')) {
                    str = str.replace(',', '.');
                }

                const num = parseFloat(str);
                return isNaN(num) ? null : num;
            }
        };
    }

    if (typeof window.parseGermanNumber === 'undefined') {
        window.parseGermanNumber = function(str) {
            return window.NumberParser.parseLocalizedNumber(str);
        };
    }

    if (typeof window.formatGermanNumber === 'undefined') {
        window.formatGermanNumber = function(num, decimals = 2) {
            if (num === null || num === undefined || isNaN(num)) return '-';
            return new Intl.NumberFormat('de-DE', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(num);
        };
    }

    if (typeof window.formatGermanCurrency === 'undefined') {
        window.formatGermanCurrency = function(num) {
            if (num === null || num === undefined || isNaN(num)) return '- €';
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR'
            }).format(num);
        };
    }
}
