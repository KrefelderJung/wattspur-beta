/**
 * MSCONS Parser Module (js/import/mscons-parser.js)
 * Pure DOM-free EDIFACT MSCONS 2.4c parser for load profiles
 */

function parseMsconsText(text, options = {}) {
    if (!text || typeof text !== 'string' || !text.includes('UNB')) {
        return {
            success: false,
            measurements: [],
            meta: {},
            errors: [{ code: 'INVALID_MSCONS', message: 'Keine gültige EDIFACT/MSCONS-Nachricht' }]
        };
    }

    const segments = text.split("'").map(s => s.trim()).filter(Boolean);
    let isConsumption = true;
    let rawUnit = 'kWh';
    let isEnergy = true;
    let sender = 'Unbekannt';
    let recipient = 'Unbekannt';
    let obisCode = null;

    const rawPoints = [];
    let currentQtyVal = null;
    let currentDtoTs = null;

    segments.forEach(seg => {
        const fields = seg.split('+');
        const tag = fields[0];

        if (tag === 'UNB' && fields.length >= 4) {
            sender = fields[2] ? fields[2].split(':')[0] : 'Unbekannt';
            recipient = fields[3] ? fields[3].split(':')[0] : 'Unbekannt';
        } else if (tag === 'LOC' && fields.length >= 3) {
            obisCode = fields[2];
        } else if (tag === 'QTY' && fields.length >= 2) {
            const qtyParts = fields[1].split(':');
            const qualifier = qtyParts[0];
            const valStr = qtyParts[1];
            const unit = qtyParts[2];

            if (qualifier === '220' || qualifier === '136') {
                currentQtyVal = parseFloat(valStr.replace(',', '.'));
                if (unit === 'KWH') { rawUnit = 'kWh'; isEnergy = true; }
                else if (unit === 'KWT' || unit === 'KW') { rawUnit = 'kW'; isEnergy = false; }
            }
        } else if (tag === 'DTM' && fields.length >= 2) {
            const dtmParts = fields[1].split(':');
            const qualifier = dtmParts[0];
            const tsStr = dtmParts[1];
            const format = dtmParts[2];

            if (qualifier === '163' || qualifier === '9' || qualifier === '134') {
                if (tsStr && tsStr.length >= 12) {
                    const y = parseInt(tsStr.substr(0, 4), 10);
                    const m = parseInt(tsStr.substr(4, 2), 10) - 1;
                    const d = parseInt(tsStr.substr(6, 2), 10);
                    const H = parseInt(tsStr.substr(8, 2), 10);
                    const M = parseInt(tsStr.substr(10, 2), 10);
                    currentDtoTs = new Date(y, m, d, H, M).getTime();

                    if (currentQtyVal !== null && !isNaN(currentQtyVal)) {
                        const kw = isEnergy ? (currentQtyVal * 4.0) : currentQtyVal;
                        const kwh = isEnergy ? currentQtyVal : (currentQtyVal * 0.25);
                        rawPoints.push({
                            timestamp: currentDtoTs,
                            dateObj: new Date(currentDtoTs),
                            kw: kw,
                            energyKwh: kwh,
                            rawValue: currentQtyVal,
                            rawUnit: rawUnit,
                            obisCode: obisCode
                        });
                        currentQtyVal = null;
                        currentDtoTs = null;
                    }
                }
            }
        }
    });

    return {
        success: rawPoints.length > 0,
        measurements: rawPoints,
        meta: {
            sender: sender,
            recipient: recipient,
            obisCode: obisCode,
            detectedUnit: rawUnit,
            format: 'MSCONS'
        },
        errors: rawPoints.length === 0 ? [{ code: 'NO_MEASUREMENTS', message: 'Keine Messwerte in MSCONS gefunden' }] : []
    };
}

if (typeof window !== 'undefined') {
    window.parseMsconsText = parseMsconsText;
}
