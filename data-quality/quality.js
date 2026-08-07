// data-quality/quality.js - Data Quality, Plausibility & Completeness Module

function validateAgnesResult(result, completenessRatio = 1.0, options = {}) {
    const warnings = [];

    if (!result || !result.optResult) {
        return {
            status: 'RED',
            badgeLabel: '🔴 Keine Daten',
            recommendationTitle: 'Keine Empfehlung verfügbar',
            warnings: ['Keine berechenbaren Messwertdaten vorhanden.'],
            allowRecommendation: false
        };
    }

    const opt = result.optResult;
    const pct = (completenessRatio * 100).toFixed(1);

    // 1. Math Invariant Checks
    if (opt.eWithin !== undefined && opt.eExceed !== undefined && opt.eTotal !== undefined) {
        const totalEnergyDiff = Math.abs((opt.eWithin + opt.eExceed) - opt.eTotal);
        if (totalEnergyDiff > 1e-4) {
            warnings.push(`Mathematische Inkonsistenz: Normalmenge (${opt.eWithin.toFixed(0)} kWh) + Überschreitung (${opt.eExceed.toFixed(0)} kWh) unterscheidet sich um ${totalEnergyDiff.toFixed(2)} kWh von der Gesamtarbeit.`);
        }
    }

    if (opt.totalCost !== undefined && opt.capCost !== undefined && opt.energyCostAp1 !== undefined && opt.energyCostAp2 !== undefined) {
        const totalCostDiff = Math.abs((opt.capCost + opt.energyCostAp1 + opt.energyCostAp2) - opt.totalCost);
        if (totalCostDiff > 1e-2) {
            warnings.push(`Mathematische Inkonsistenz: Summe der Teilkosten unterscheidet sich um ${totalCostDiff.toFixed(2)} € von den Gesamtkosten.`);
        }
    }

    if (options.hasIncompleteYears && options.yearWarnings) {
        options.yearWarnings.forEach(w => warnings.push(w));
    }

    // 2. Traffic Light Evaluation (Punkte 97-101)
    if (completenessRatio < 0.95 || warnings.some(w => w.includes('Inkonsistenz'))) {
        return {
            status: 'RED',
            badgeLabel: '🔴 Gesperrt',
            recommendationTitle: 'Gesperrt für verbindliche Empfehlung',
            warnings: warnings.concat(completenessRatio < 0.95 ? [`Die Vollständigkeit der Daten liegt bei nur ${pct} % (< 95.0 %).`] : []),
            allowRecommendation: false
        };
    }

    if (completenessRatio < 0.995 || warnings.length > 0) {
        return {
            status: 'YELLOW',
            badgeLabel: '🟡 Simulation',
            recommendationTitle: 'Indikative Simulation',
            warnings: warnings.concat(completenessRatio < 0.995 ? [`Die Vollständigkeit der Daten liegt bei ${pct} % (< 99.5 %).`] : []),
            allowRecommendation: true
        };
    }

    return {
        status: 'GREEN',
        badgeLabel: '🟢 Freigegeben',
        recommendationTitle: 'Empfohlene Bestellleistung',
        warnings: [],
        allowRecommendation: true
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateAgnesResult };
}
