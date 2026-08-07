/**
 * Canonical Measurement Model (js/domain/measurement-model.js)
 */

if (typeof window !== 'undefined') {
    if (typeof window.createCanonicalMeasurement === 'undefined') {
        window.createCanonicalMeasurement = function(input) {
            const dt = (typeof input.intervalHours === 'number' && input.intervalHours > 0) ? input.intervalHours : 0.25;
            const powerKw = (typeof input.powerKw === 'number') ? input.powerKw : (typeof input.kw === 'number' ? input.kw : 0);
            const energyKwh = (typeof input.energyKwh === 'number') ? input.energyKwh : (powerKw * dt);
            const timestampUtc = input.timestampUtc || (input.timestamp ? input.timestamp : (input.dateObj ? input.dateObj.getTime() : Date.now()));
            const uuidGen = window.generateUUID || function() { return Math.random().toString(); };
            
            return {
                id: input.id || uuidGen(),
                timestampUtc: timestampUtc,
                dateObj: input.dateObj || new Date(timestampUtc),
                localTimestamp: input.localTimestamp || (input.dateObj ? input.dateObj.toISOString() : new Date(timestampUtc).toISOString()),
                intervalStartUtc: input.intervalStartUtc || (timestampUtc - (dt * 3600 * 1000)),
                intervalEndUtc: input.intervalEndUtc || timestampUtc,
                intervalHours: dt,
                kw: powerKw,
                powerKw: powerKw,
                energyKwh: energyKwh,
                rawValue: input.rawValue !== undefined ? input.rawValue : powerKw,
                rawUnit: input.rawUnit || 'kW',
                direction: input.direction || 'consumption',
                obisCode: input.obisCode || null,
                qualityStatus: input.qualityStatus || 'VALID',
                qualityFlags: input.qualityFlags || [],
                source: input.source || {
                    fileName: input.fileName || 'unknown',
                    format: input.format || 'CSV',
                    rowNumber: input.rowNumber || 0
                }
            };
        };
    }
}
