/**
 * Capacity scenario beta export (internal filename retained for compatibility)
 */

if (typeof window !== 'undefined') {
    if (typeof window.AgnesExport === 'undefined') {
        window.AgnesExport = {
            exportAgnesCsv: function(result, fileName = 'kapazitaet_berechnungsprotokoll_beta.csv') {
                if (!result || !result.optResult) return;

                const numFn = function(v) { return String(Math.round(v * 100) / 100).replace('.', ','); };

                let csv = '=== KAPAZITAETSBESTELLUNG: BETA-BERECHNUNGSPROTOKOLL ===\n';
                csv += 'Hinweis;Unverbindliche Szenariorechnung - keine Abrechnungs-, Rechts-, Tarif- oder Investitionsberatung\n';
                csv += `Berechnungs-ID;${result.calculationId || '-'}\n`;
                csv += `Zeitpunkt;${result.calculationTimestamp || '-'}\n`;
                csv += `Toolversion;${result.toolVersion || '-'}\n`;
                csv += `Modellversion;${result.modelVersion || '-'}\n\n`;

                csv += '=== OPTIMIERUNGSERGEBNIS ===\n';
                csv += `Bestellleistung K (kW);${numFn(result.optK)}\n`;
                csv += `Gesamtkosten (€);${numFn(result.optResult.totalCost)}\n`;
                csv += `Kapazitätskosten (€);${numFn(result.optResult.capCost)}\n`;
                csv += `Arbeitskosten (€);${numFn(result.optResult.energyCostAp1 + result.optResult.energyCostAp2)}\n\n`;

                csv += '=== SWEEP PROTOKOLL ===\n';
                csv += 'K (kW);Kapazitätskosten (€);Arbeitskosten AP1 (€);Arbeitskosten AP2 (€);Gesamtkosten (€)\n';

                (result.sweepResults || []).forEach(r => {
                    csv += `${numFn(r.K)};${numFn(r.capCost)};${numFn(r.energyCostAp1)};${numFn(r.energyCostAp2)};${numFn(r.totalCost)}\n`;
                });

                if (window.triggerDownload) {
                    window.triggerDownload(csv, fileName, 'text/csv;charset=utf-8;');
                }
                return csv;
            }
        };
    }
}
