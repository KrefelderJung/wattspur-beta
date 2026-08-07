// import/parser.js - CSV & MSCONS Parsing Module for Lastgang Tool

function parseGermanNumber(str) {
    if (typeof str === 'number') return str;
    if (!str || typeof str !== 'string') return null;
    let s = str.trim();
    if (s === '' || s === '-' || s === 'N/A' || s === 'null') return null;
    
    s = s.replace(/\s/g, '');
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    
    if (hasComma && hasDot) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (hasComma) {
        s = s.replace(',', '.');
    }
    
    const val = parseFloat(s);
    return isNaN(val) ? null : val;
}

function processParsedCSVRows(rows) {
    let parsedDatasets = [];
    let currentExtractors = [];
    let inData = false;
    let recentMeta = {};
    
    let dateColIdx = -1;
    let timeColIdx = -1;
    let headerLineIdx = -1;
    let isCombinedDateTime = false;

    // Search for header row
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        
        let foundDate = -1;
        let foundTime = -1;
        for (let c = 0; c < row.length; c++) {
            const val = row[c] ? row[c].toString().toLowerCase().trim() : '';
            if (val.includes('datum') || val.includes('date') || val.includes('zeitstempel') || val.includes('timestamp') || val.includes('ablesung') || val.includes('messzeit')) {
                foundDate = c;
            }
            if (val.includes('uhrzeit') || val === 'time' || val === 'zeit' || val === 'bis') {
                foundTime = c;
            }
        }
        
        if (foundDate !== -1 && foundTime !== -1 && foundDate !== foundTime) {
            headerLineIdx = i;
            dateColIdx = foundDate;
            timeColIdx = foundTime;
            isCombinedDateTime = false;
            break;
        } else if (foundDate !== -1) {
            headerLineIdx = i;
            dateColIdx = foundDate;
            timeColIdx = -1;
            isCombinedDateTime = true;
            break;
        }
    }

    if (dateColIdx === -1) {
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;
            
            for (let c = 0; c < row.length; c++) {
                const val = row[c] ? row[c].toString().trim() : '';
                if (/^\d{1,4}[.\/-]\d{1,2}[.\/-]\d{1,4}/.test(val)) {
                    dateColIdx = c;
                    headerLineIdx = Math.max(0, i - 1);
                    break;
                }
            }
            if (dateColIdx !== -1) break;
        }
    }

    if (dateColIdx === -1) {
        dateColIdx = 0;
        timeColIdx = 1;
        headerLineIdx = 0;
    }

    let kwColIndices = [];
    if (headerLineIdx >= 0 && headerLineIdx < rows.length) {
        const hRow = rows[headerLineIdx];
        for (let c = 0; c < hRow.length; c++) {
            if (c === dateColIdx || c === timeColIdx) continue;
            const val = hRow[c] ? hRow[c].toString().trim() : '';
            if (val !== '') {
                kwColIndices.push({ colIdx: c, name: val });
            }
        }
    }

    if (kwColIndices.length === 0) {
        const sampleRowIdx = Math.min(headerLineIdx + 1, rows.length - 1);
        if (sampleRowIdx >= 0 && rows[sampleRowIdx]) {
            const sRow = rows[sampleRowIdx];
            for (let c = 0; c < sRow.length; c++) {
                if (c === dateColIdx || c === timeColIdx) continue;
                if (parseGermanNumber(sRow[c]) !== null) {
                    kwColIndices.push({ colIdx: c, name: `Spalte ${c + 1}` });
                }
            }
        }
    }

    let extractedChannelsMap = new Map();
    kwColIndices.forEach((colInfo, idx) => {
        let channelKey = colInfo.name;
        let isKvar = false;
        const lowerName = colInfo.name.toLowerCase();

        if (lowerName.includes('blind') || lowerName.includes('kvar') || lowerName.includes('kvarh')) {
            isKvar = true;
        }

        let cleanBaseName = colInfo.name
            .replace(/[\(（].*?[\)）]/g, '')
            .replace(/\b(wirkarbeit|wirkleistung|blinding|blindarbeit|blindleistung|bezug|einspeisung|kwh|kw|kvar|kvarh)\b/gi, '')
            .trim();

        if (!cleanBaseName) {
            cleanBaseName = colInfo.name;
        }

        if (!extractedChannelsMap.has(cleanBaseName)) {
            extractedChannelsMap.set(cleanBaseName, {
                id: parsedDatasets.length + extractedChannelsMap.size + 1,
                name: cleanBaseName,
                kwColIdx: -1,
                kvarColIdx: -1,
                data: []
            });
        }

        const ch = extractedChannelsMap.get(cleanBaseName);
        if (isKvar) {
            ch.kvarColIdx = colInfo.colIdx;
        } else {
            ch.kwColIdx = colInfo.colIdx;
        }
    });

    currentExtractors = Array.from(extractedChannelsMap.values());
    if (currentExtractors.length === 0) {
        currentExtractors.push({
            id: 1,
            name: "Lastgang 1",
            kwColIdx: dateColIdx === 0 ? 1 : 2,
            kvarColIdx: -1,
            data: []
        });
    }

    parsedDatasets = currentExtractors;

    const startRowIdx = headerLineIdx >= 0 ? headerLineIdx + 1 : 0;
    for (let i = startRowIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 1) continue;

        let dateStr = row[dateColIdx] ? row[dateColIdx].toString().trim() : '';
        let timeStr = (timeColIdx !== -1 && row[timeColIdx]) ? row[timeColIdx].toString().trim() : '';

        if (!dateStr) continue;

        let timestamp = null;
        let fullStr = isCombinedDateTime || !timeStr ? dateStr : `${dateStr} ${timeStr}`;

        let dateObj = null;
        let matchIso = fullStr.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})(?:\s+|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        let matchDe = fullStr.match(/^(\d{1,2})[.](\d{1,2})[.](\d{2,4})(?:\s+|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);

        if (matchIso) {
            dateObj = new Date(parseInt(matchIso[1], 10), parseInt(matchIso[2], 10) - 1, parseInt(matchIso[3], 10), parseInt(matchIso[4], 10), parseInt(matchIso[5], 10), matchIso[6] ? parseInt(matchIso[6], 10) : 0);
        } else if (matchDe) {
            let y = parseInt(matchDe[3], 10);
            if (y < 100) y += 2000;
            dateObj = new Date(y, parseInt(matchDe[2], 10) - 1, parseInt(matchDe[1], 10), parseInt(matchDe[4], 10), parseInt(matchDe[5], 10), matchDe[6] ? parseInt(matchDe[6], 10) : 0);
        } else {
            let parsedMs = Date.parse(fullStr);
            if (!isNaN(parsedMs)) {
                dateObj = new Date(parsedMs);
            }
        }

        if (!dateObj || isNaN(dateObj.getTime())) continue;

        timestamp = dateObj.getTime();

        currentExtractors.forEach(ext => {
            let kwVal = null;
            let kwRawStr = undefined;
            if (ext.kwColIdx !== -1 && row[ext.kwColIdx] !== undefined) {
                kwRawStr = row[ext.kwColIdx].toString();
                kwVal = parseGermanNumber(row[ext.kwColIdx]);
            }

            let kvarVal = null;
            if (ext.kvarColIdx !== -1 && row[ext.kvarColIdx] !== undefined) {
                kvarVal = parseGermanNumber(row[ext.kvarColIdx]);
            }

            const trimmedRawStr = kwRawStr ? kwRawStr.trim() : "";

            ext.data.push({
                timestamp: timestamp,
                dateObj: dateObj,
                kw: kwVal,
                kvar: kvarVal,
                datasetName: ext.name,
                hasData: (kwRawStr !== undefined && trimmedRawStr !== "")
            });
        });
    }

    parsedDatasets = parsedDatasets.filter(ds => {
        if (ds.data.length === 0) return false;
        return ds.data.some(d => d.kw !== null);
    });

    parsedDatasets.forEach(ds => {
        ds.data.sort((a, b) => a.timestamp - b.timestamp);
    });

    return { datasets: parsedDatasets };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseGermanNumber, processParsedCSVRows };
}
