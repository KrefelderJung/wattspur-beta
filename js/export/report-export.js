/**
 * Report Export Module (js/export/report-export.js)
 * Generates print reports and triggers window.print()
 */

if (typeof window !== 'undefined') {
    if (typeof window.ReportExport === 'undefined') {
        window.ReportExport = {
            printReport: function(result) {
                if (typeof window.print === 'function') {
                    window.print();
                }
            }
        };
    }
}
