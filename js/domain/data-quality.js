/**
 * Data Quality Module (js/domain/data-quality.js)
 */

if (typeof window !== 'undefined') {
    if (typeof window.evaluateDataQuality === 'undefined') {
        window.evaluateDataQuality = function(measurements, period = {}, options = {}) {
            if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
                return {
                    expectedIntervals: 0,
                    availableIntervals: 0,
                    validIntervals: 0,
                    missingIntervals: 0,
                    duplicateIntervals: 0,
                    invalidIntervals: 0,
                    completenessRatio: 0,
                    qualityClass: 'RED',
                    eligibleForAnalysis: false,
                    warnings: ['Keine Messdaten vorhanden'],
                    errors: ['MESSDATEN_LEER']
                };
            }

            const minDate = measurements[0].dateObj || new Date(measurements[0].timestamp || Date.now());
            const maxDate = measurements[measurements.length - 1].dateObj || new Date(measurements[measurements.length - 1].timestamp || Date.now());
            const year = minDate.getFullYear();
            const isLeapFn = window.isLeapYear || function(y) { return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); };
            const isLeap = isLeapFn(year);
            const annualHours = isLeap ? 8784 : 8760;
            const expectedAnnualIntervals = annualHours * 4;

            const durationMs = maxDate.getTime() - minDate.getTime() + 15 * 60 * 1000;
            const elapsedHours = durationMs / (1000 * 60 * 60);
            const expectedIntervalsInRange = Math.max(1, Math.round(elapsedHours * 4));

            let validIntervals = 0;
            let invalidIntervals = 0;
            let duplicateIntervals = 0;
            const seenTimestamps = new Set();

            measurements.forEach(d => {
                const ts = d.timestampUtc || d.timestamp || (d.dateObj ? d.dateObj.getTime() : null);
                if (ts) {
                    if (seenTimestamps.has(ts)) {
                        duplicateIntervals++;
                        return;
                    }
                    seenTimestamps.add(ts);
                }

                if (d.kw !== null && d.kw !== undefined && !isNaN(d.kw) && d.kw >= 0 && d.kw <= 100000) {
                    validIntervals++;
                } else {
                    invalidIntervals++;
                }
            });

            const completenessRatio = expectedIntervalsInRange > 0 ? (validIntervals / expectedIntervalsInRange) : 0;
            const missingIntervals = Math.max(0, expectedIntervalsInRange - validIntervals);

            let qualityClass = 'GREEN';
            let eligibleForAnalysis = true;
            const warnings = [];
            const errors = [];

            if (completenessRatio < 0.95) {
                qualityClass = 'RED';
                eligibleForAnalysis = false;
                errors.push(`Vollständigkeit zu gering (${Math.round(completenessRatio * 100)}% < 95%)`);
            } else if (completenessRatio < 0.98 || duplicateIntervals > 0 || invalidIntervals > 0) {
                qualityClass = 'YELLOW';
                warnings.push(`Geringe Datenabweichungen vorhanden (Abdeckung: ${Math.round(completenessRatio * 100)}%)`);
            }

            return {
                expectedIntervals: expectedAnnualIntervals,
                availableIntervals: measurements.length,
                validIntervals: validIntervals,
                missingIntervals: missingIntervals,
                duplicateIntervals: duplicateIntervals,
                invalidIntervals: invalidIntervals,
                completenessRatio: completenessRatio,
                qualityClass: qualityClass,
                eligibleForAnalysis: eligibleForAnalysis,
                warnings: warnings,
                errors: errors
            };
        };
    }
}
