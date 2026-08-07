/**
 * Import Validator Module (js/import/import-validator.js)
 * Validates raw import records and generates an audit log
 */

function validateImportResult(rawMeasurements, format = 'CSV', fileName = 'unknown') {
    const warnings = [];
    const errors = [];
    let rowsRead = rawMeasurements ? rawMeasurements.length : 0;
    let rowsAccepted = 0;
    let rowsRejected = 0;

    if (!rawMeasurements || !Array.isArray(rawMeasurements) || rawMeasurements.length === 0) {
        return {
            valid: false,
            audit: {
                fileName: fileName,
                format: format,
                rowsRead: 0,
                rowsAccepted: 0,
                rowsRejected: 0
            },
            warnings: [],
            errors: [{ code: 'EMPTY_FILE', message: 'Keine messbaren Zeilen im Datensatz gefunden.' }]
        };
    }

    const acceptedMeasurements = [];

    rawMeasurements.forEach((item, index) => {
        const kw = item.kw !== undefined ? item.kw : item.powerKw;
        if (kw === null || kw === undefined || isNaN(kw) || kw < 0 || kw > 100000) {
            rowsRejected++;
            warnings.push({
                code: 'INVALID_MEASUREMENT_VALUE',
                message: `Zeile ${index + 1}: Ungültiger Leistungswert (${kw})`,
                rowNumber: index + 1
            });
            return;
        }
        rowsAccepted++;
        acceptedMeasurements.push(item);
    });

    return {
        valid: rowsAccepted > 0,
        acceptedMeasurements: acceptedMeasurements,
        audit: {
            fileName: fileName,
            format: format,
            rowsRead: rowsRead,
            rowsAccepted: rowsAccepted,
            rowsRejected: rowsRejected
        },
        warnings: warnings,
        errors: errors
    };
}

if (typeof window !== 'undefined') {
    window.validateImportResult = validateImportResult;
}
