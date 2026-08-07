/**
 * CSV Parser Module (js/import/csv-parser.js)
 * Pure DOM-free CSV parser for load profile files
 */

function parseCsvText(csvText, options = {}) {
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
        return {
            success: false,
            rows: [],
            errors: [{ code: 'EMPTY_FILE', message: 'CSV-Datei ist leer' }]
        };
    }

    const parseNumFn = window.parseGermanNumber || function(val) {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    };

    const lines = csvText.split(/\r?\n/);
    const rows = [];
    lines.forEach(line => {
        if (!line.trim()) return;
        const delim = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
        const parts = line.split(delim).map(p => p.trim().replace(/^["']|["']$/g, ''));
        rows.push(parts);
    });

    return {
        success: rows.length > 0,
        rows: rows,
        errors: []
    };
}

if (typeof window !== 'undefined') {
    window.parseCsvText = parseCsvText;
}
