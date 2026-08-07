// export/export.js - Transparent beta calculation protocol

function buildCSVHeaderBlock(auditInfo, fileHash) {
    const qPlaus = auditInfo.qualityPlausibility || {};
    let csv = `# ==============================================================================\r\n`;
    csv += `# KAPAZITAETSBESTELLUNG - BETA-BERECHNUNGSPROTOKOLL\r\n`;
    csv += `# ==============================================================================\r\n`;
    csv += `# Berechnungs-ID (UUID):;${auditInfo.calculationId || 'N/A'}\r\n`;
    csv += `# Tool-Version:;${auditInfo.toolVersion || LASTGANG_APP_VERSION} (Modell: Kapazitaetsszenario Beta)\r\n`;
    csv += `# Erstellungs-Zeitstempel:;${auditInfo.timestampIso || new Date().toISOString()}\r\n`;
    csv += `# Ampel-Datenstatus:;${qPlaus.badgeLabel || '🟢 Datenbasis vollständig'} (${qPlaus.recommendationTitle || 'Szenariowert (Beta)'})\r\n`;
    csv += `# SHA-256 Datei-Hash:;${fileHash || 'N/A'}\r\n`;
    csv += `# ------------------------------------------------------------------------------\r\n`;
    csv += `# BERECHNUNGSMETHODIK & FORMELN (EXPERIMENTELLES SZENARIOMODELL):\r\n`;
    csv += `# 1. Leistung je Intervall (kW): P_i = E_i / dt (dt = 0.25h)\r\n`;
    csv += `# 2. Jahreshöchstlast (kW): P_max = Max(P_i)\r\n`;
    csv += `# 3. Modell-Untergrenze K_min: eigene Eingabe oder P_max * 10% (Beta-Annahme, kein gesetzlicher Mindestwert)\r\n`;
    csv += `# 4. Effektive Kapazität K_eff: Max(K_gebucht, K_min)\r\n`;
    csv += `# 5. Feste Kapazitätskosten: C_Kap = K_eff * Kapazitätspreis (EUR/kW/a)\r\n`;
    csv += `# 6. Energiemengen-Aufteilung je Intervall (15 Min):\r\n`;
    csv += `#    - Wenn P_i <= K_eff: E_AP1 += P_i * 0.25h, E_AP2 += 0\r\n`;
    csv += `#    - Wenn P_i > K_eff:  E_AP1 += K_eff * 0.25h, E_AP2 += (P_i - K_eff) * 0.25h\r\n`;
    csv += `# 7. Arbeitskosten AP1 (Normal): C_AP1 = E_AP1 * AP1 / 100\r\n`;
    csv += `# 8. Arbeitskosten AP2 (Überschreitung): C_AP2 = E_AP2 * AP2 / 100\r\n`;
    csv += `# 9. Gesamte Netzkosten: C_Gesamt = C_Kap + C_AP1 + C_AP2\r\n`;
    csv += `# 10. Skalierungsfaktor S (bei Teiljahren): S = Stunden_Jahr / Stunden_geladen\r\n`;
    csv += `# ------------------------------------------------------------------------------\r\n`;
    csv += `# WARNHINWEISE & KONTROLLMETRIKEN:\r\n`;
    csv += `# BETA-HINWEIS:;Unverbindliche Szenariorechnung. Keine Abrechnungs-, Rechts-, Tarif- oder Investitionsberatung.\r\n`;
    if (qPlaus.warnings && qPlaus.warnings.length > 0) {
        qPlaus.warnings.forEach(w => { csv += `# WARNUNG:;${w.replace(/;/g, ',')}\r\n`; });
    } else {
        csv += `# HINWEIS:;Keine Warnungen. Alle mathematischen Invarianten erfuellt.\r\n`;
    }
    csv += `# ==============================================================================\r\n\r\n`;
    return csv;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildCSVHeaderBlock };
}
