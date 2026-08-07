/**
 * CSV Export Module (js/export/csv-export.js)
 * Generates CSV files from pre-calculated result objects without recalculation
 */

if (typeof window !== 'undefined') {
    if (typeof window.CsvExport === 'undefined') {
        window.CsvExport = {
            exportLoadProfileCsv: function(dataset, fileName = 'lastgang_export.csv') {
                if (!dataset || !dataset.data || dataset.data.length === 0) return;

                const dateStrFn = window.getLocalDateString || function(d) { return d.toISOString(); };
                let csv = 'Datum;Uhrzeit;Leistung_kW;Status\n';

                dataset.data.forEach(d => {
                    const date = d.dateObj || new Date(d.timestamp || Date.now());
                    const dateStr = dateStrFn(date);
                    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    const valStr = String(d.kw !== undefined ? d.kw : (d.powerKw || 0)).replace('.', ',');
                    csv += `${dateStr};${timeStr};${valStr};${d.status || 'VALID'}\n`;
                });

                if (window.triggerDownload) {
                    window.triggerDownload(csv, fileName, 'text/csv;charset=utf-8;');
                }
                return csv;
            }
        };
    }
}
