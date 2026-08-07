/**
 * File Import Orchestrator (js/import/file-import.js)
 * Coordinates FileReader, format detection, parsing, and validation
 */

function processFileImport(fileContent, fileName = 'lastgang.csv') {
    const isMscons = fileContent.includes('UNB') && fileContent.includes('UNH');
    let parseRes;

    if (isMscons) {
        const msconsFn = window.parseMsconsText || parseMsconsText;
        parseRes = msconsFn(fileContent);
        if (!parseRes.success) {
            return {
                success: false,
                datasets: [],
                errors: parseRes.errors
            };
        }
        const valFn = window.validateImportResult || validateImportResult;
        const valRes = valFn(parseRes.measurements, 'MSCONS', fileName);

        return {
            success: valRes.valid,
            datasets: [{
                id: window.generateUUID ? window.generateUUID() : Math.random().toString(),
                name: fileName.replace(/\.[^/.]+$/, ""),
                fileName: fileName,
                format: 'MSCONS',
                data: valRes.acceptedMeasurements,
                audit: valRes.audit
            }],
            warnings: valRes.warnings,
            errors: valRes.errors
        };
    } else {
        const parserFn = window.parseCSVTextWorker || window.parseCSVContentFallback;
        if (typeof parserFn === 'function') {
            const datasets = parserFn(fileContent, fileName);
            return {
                success: datasets && datasets.length > 0,
                datasets: datasets || [],
                warnings: [],
                errors: (!datasets || datasets.length === 0) ? [{ code: 'PARSE_FAILED', message: 'CSV konnte nicht geparst werden' }] : []
            };
        }
        const csvFn = window.parseCsvText || parseCsvText;
        parseRes = csvFn(fileContent);
        return {
            success: parseRes.success,
            datasets: parseRes.success ? [{
                id: window.generateUUID ? window.generateUUID() : Math.random().toString(),
                name: fileName,
                data: parseRes.rows
            }] : [],
            warnings: [],
            errors: parseRes.errors
        };
    }
}

if (typeof window !== 'undefined') {
    window.processFileImport = processFileImport;
}
