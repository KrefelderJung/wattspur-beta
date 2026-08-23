// parser.js - CSV Parsing & Loading via Web Worker for Lastgang Analyse App

function processParsedCSVRows(rows) {
    let parsedDatasets = [];
    let currentExtractors = [];
    let inData = false;
    let recentMeta = {};
    
    let dateColIdx = -1;
    let timeColIdx = -1;
    let headerLineIdx = -1;
    let isCombinedDateTime = false;

    // Phase 1: Search for explicit header row with words like Datum/Date/Zeitstempel etc.
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

    // Phase 2: Fallback if no text header found: search for first row with a date pattern (e.g. 01.01.2023 or 2023-01-01)
    if (dateColIdx === -1) {
        for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;

            for (let c = 0; c < row.length; c++) {
                const val = row[c] ? row[c].toString().trim() : '';
                if (/\d{1,4}[-./]\d{1,2}[-./]\d{1,4}/.test(val)) {
                    dateColIdx = c;
                    const nextVal = (c + 1 < row.length && row[c + 1]) ? row[c + 1].toString().trim() : '';
                    if (/^\d{1,2}:\d{2}/.test(nextVal)) {
                        timeColIdx = c + 1;
                        isCombinedDateTime = false;
                    } else if (/\d{1,2}:\d{2}/.test(val)) {
                        timeColIdx = -1;
                        isCombinedDateTime = true;
                    } else {
                        timeColIdx = c + 1;
                        isCombinedDateTime = false;
                    }
                    headerLineIdx = Math.max(-1, i - 1);
                    break;
                }
            }
            if (dateColIdx !== -1) break;
        }
    }

    if (dateColIdx === -1) {
        return { error: "Fehler: Konnte keine Spalte mit Datum / Uhrzeit in den ersten 50 Zeilen der Datei erkennen." };
    }

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;

        const colDate = row[dateColIdx] ? row[dateColIdx].toString().toLowerCase().trim() : '';

        if (!inData && colDate && !colDate.includes('datum') && !colDate.includes('date') && !colDate.includes('zeitstempel')) {
            recentMeta[colDate] = row;
        }

        if (i === headerLineIdx || (headerLineIdx === -1 && i === 0 && !inData)) {
            inData = true;
            currentExtractors = [];
            
            let maxCols = row.length;
            if (i + 1 < rows.length) maxCols = Math.max(maxCols, rows[i+1].length);
            
            for (let c = 0; c < maxCols; c++) {
                if (c === dateColIdx || (timeColIdx !== -1 && c === timeColIdx)) continue;
                let name = '';
                if (recentMeta['zählpunkt'] && recentMeta['zählpunkt'][c]) name = 'ZP ' + recentMeta['zählpunkt'][c].trim();
                if (recentMeta['linie'] && recentMeta['linie'][c]) {
                    if (name) name += ' - ' + recentMeta['linie'][c].trim();
                    else name = recentMeta['linie'][c].trim();
                } else if (row[c] && row[c].trim() !== '') {
                    name = row[c].trim();
                } else {
                    name = 'Spalte ' + (c + 1) + ' (Unbenannt)';
                }

                if (headerLineIdx === -1 && i === 0 && /\d/.test(name)) {
                    name = 'Messkanal (Spalte ' + (c + 1) + ')';
                }

                // Skip Blindleistung (reactive power) columns entirely
                if (name.toLowerCase().includes('blindleistung') || name.toLowerCase().includes('reactive')) {
                    continue;
                }

                // Detect Unit
                let detectedUnit = 'kw';
                let unitSourceStr = '';
                
                if (recentMeta['einheit'] && recentMeta['einheit'][c]) {
                    unitSourceStr = recentMeta['einheit'][c].toLowerCase().trim();
                } else if (recentMeta['einheit/faktor'] && recentMeta['einheit/faktor'][c]) {
                    unitSourceStr = recentMeta['einheit/faktor'][c].toLowerCase().trim();
                } else if (recentMeta['wert'] && recentMeta['wert'][c]) {
                    unitSourceStr = recentMeta['wert'][c].toLowerCase().trim();
                }
                
                if (!unitSourceStr) {
                    unitSourceStr = name.toLowerCase();
                }
                
                let scaleFactor = 1.0;
                if (unitSourceStr.includes('kwh')) {
                    detectedUnit = 'kwh';
                    scaleFactor = 4.0;
                } else if (unitSourceStr.includes('mwh')) {
                    detectedUnit = 'mwh';
                    scaleFactor = 4000.0;
                } else if (unitSourceStr.includes('wh')) {
                    detectedUnit = 'wh';
                    scaleFactor = 0.004;
                } else if (unitSourceStr.includes('mw')) {
                    detectedUnit = 'mw';
                    scaleFactor = 1000.0;
                } else if (unitSourceStr.includes('w') && !unitSourceStr.includes('kw') && !unitSourceStr.includes('mw')) {
                    if (/\b(w|wh)\b/i.test(unitSourceStr) || /\[w\]/i.test(unitSourceStr) || /\(w\)/i.test(unitSourceStr) || unitSourceStr === 'w') {
                        detectedUnit = 'w';
                        scaleFactor = 0.001;
                    }
                }

                currentExtractors.push({
                    kwIdx: c,
                    kvarIdx: -1,
                    scaleFactor: scaleFactor,
                    detectedUnit: detectedUnit,
                    dataset: { 
                        name: name, 
                        data: [], 
                        totalRowsCount: 0, 
                        invalidRowsCount: 0,
                        importedUnit: detectedUnit
                    }
                });
            }
            
            currentExtractors.forEach(ext => {
                parsedDatasets.push(ext.dataset);
            });

            if (headerLineIdx !== -1) continue;
        }

        if (inData && currentExtractors.length > 0) {
            let dateStr = "";
            let timeStr = "";

            if (isCombinedDateTime || timeColIdx === -1) {
                const combined = row[dateColIdx] ? row[dateColIdx].toString().trim() : "";
                const parts = combined.split(/[\sT]+/);
                if (parts.length >= 2) {
                    dateStr = parts[0];
                    timeStr = parts[1];
                } else {
                    dateStr = combined;
                    timeStr = "";
                }
            } else {
                dateStr = row[dateColIdx] ? row[dateColIdx].toString().trim() : "";
                timeStr = row[timeColIdx] ? row[timeColIdx].toString().trim() : "";
            }
            
            timeStr = timeStr.trim();
            if (!timeStr.includes(':')) {
                inData = false;
                recentMeta = {};
                continue;
            }

            let cleanTime = timeStr;
            const startsWithAB = /^[AB]2:\d{2}$/.test(cleanTime) || /^[AB]02:\d{2}$/.test(cleanTime);
            if (startsWithAB) {
                cleanTime = "02:" + (cleanTime.startsWith('A') || cleanTime.startsWith('B') ? cleanTime.substring(1).split(':')[1] : cleanTime.split(':')[1]);
            }

            // Strict clock validation prevents Date from silently normalizing
            // invalid values such as 12:99 into a different timestamp.
            if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?:\:[0-5]\d)?$/.test(cleanTime) && cleanTime !== '24:00') {
                continue;
            }

            let hParts = cleanTime.split(':');
            let dParts = dateStr.split(/[-./]/);
            let y = 2000, m = 1, d = 1;
            if (dParts.length === 3) {
                if (dParts[0].length === 4) {
                    y = parseInt(dParts[0]); m = parseInt(dParts[1]); d = parseInt(dParts[2]);
                } else {
                    d = parseInt(dParts[0]); m = parseInt(dParts[1]); y = parseInt(dParts[2]);
                    if (y < 100) y += 2000;
                }
            }

            // Create Date
            const is2400 = (cleanTime === "24:00");
            const hours = is2400 ? 0 : parseInt(hParts[0] || 0);
            const minutes = parseInt(hParts[1] || 0);

            let ts = new Date(y, m - 1, d, hours, minutes);

            // Date validation
            if (ts.getFullYear() !== y || (ts.getMonth() + 1) !== m || ts.getDate() !== d) {
                continue;
            }

            if (is2400) {
                ts.setDate(ts.getDate() + 1);
            }

            let timestamp = ts.getTime();

            // DST transition disambiguation for A/B prefixes in October
            if (startsWithAB && m === 10 && ts.getDay() === 0 && d >= 25) {
                const baseUtc = Date.UTC(y, m - 1, d, 2, parseInt(hParts[1] || 0));
                if (timeStr.startsWith('A')) {
                    timestamp = baseUtc - 2 * 60 * 60 * 1000;
                } else if (timeStr.startsWith('B')) {
                    timestamp = baseUtc - 1 * 60 * 60 * 1000;
                }
            }

            currentExtractors.forEach(ext => {
                const kwRawStr = row.length > ext.kwIdx ? row[ext.kwIdx] : "";
                const kvarRawStr = row.length > ext.kvarIdx ? row[ext.kvarIdx] : "";
                
                const kwParsed = parseGermanNumber(kwRawStr);
                const kvarParsed = parseGermanNumber(kvarRawStr);

                const trimmedRawStr = kwRawStr !== undefined ? kwRawStr.toString().trim() : "";
                if (trimmedRawStr !== "") {
                    ext.dataset.totalRowsCount = (ext.dataset.totalRowsCount || 0) + 1;
                    if (kwParsed === null || isNaN(kwParsed)) {
                        ext.dataset.invalidRowsCount = (ext.dataset.invalidRowsCount || 0) + 1;
                    }
                }

                const scaledKw = kwParsed !== null ? kwParsed * ext.scaleFactor : null;

                ext.dataset.data.push({
                    timestamp: timestamp,
                    intervalStartUtc: timestamp - 15 * 60 * 1000,
                    intervalEndUtc: timestamp,
                    dateStr: dateStr,
                    timeStr: timeStr,
                    dateObj: new Date(timestamp),
                    rawKw: kwParsed,
                    kw: scaledKw,
                    intervalHours: 0.25,
                    energyKwh: scaledKw !== null ? scaledKw * 0.25 : null,
                    kwh: scaledKw !== null ? scaledKw * 0.25 : null,
                    qualityStatus: (Number.isFinite(scaledKw) && scaledKw >= 0 && scaledKw <= 100000) ? 'VALID' : 'INVALID',
                    kvar: kvarParsed,
                    datasetName: ext.dataset.name,
                    hasData: (kwRawStr !== undefined && trimmedRawStr !== "")
                });
            });
        }
    }

    parsedDatasets = parsedDatasets.filter(ds => {
        if (ds.data.length === 0) return false;
        return ds.data.some(d => d.kw !== null);
    });

    if (parsedDatasets.length === 0) {
        return { error: "Keine gültigen Messwerte in den Spalten der CSV gefunden." };
    }

    parsedDatasets.forEach(ds => {
        ds.data.sort((a, b) => a.timestamp - b.timestamp);
    });

    return { datasets: parsedDatasets };
}

const localPapaScriptUrl = typeof window !== 'undefined'
    ? new URL('lib/papaparse.min.js', window.location.href).href
    : '';
const parserWorkerCode = `
    importScripts(${JSON.stringify(localPapaScriptUrl)});

    ${parseGermanNumber.toString()}

    ${processParsedCSVRows.toString()}

    self.onmessage = function(e) {
        const { csvText } = e.data;
        Papa.parse(csvText, {
            header: false,
            skipEmptyLines: true,
            fastMode: false,
            complete: function(results) {
                const res = processParsedCSVRows(results.data);
                self.postMessage(res);
            }
        });
    };
`;

function parseMSCONS(msconsText, filename) {
    if (!msconsText || (typeof msconsText !== 'string')) {
        return { error: "Ungültiger Dateiinhalt." };
    }

    let elemSep = '+';
    let compSep = ':';
    let releaseChar = '?';
    let segmentTerm = "'";

    if (msconsText.startsWith('UNA')) {
        const una = msconsText.substring(3, 9);
        compSep = una[0] || ':';
        elemSep = una[1] || '+';
        releaseChar = una[3] || '?';
        segmentTerm = una[5] || "'";
    }

    function splitSegments(str, term, escape) {
        const segments = [];
        let cur = '';
        let escaped = false;
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (escaped) {
                cur += ch;
                escaped = false;
            } else if (ch === escape) {
                escaped = true;
            } else if (ch === term) {
                const trimmed = cur.trim();
                if (trimmed.length > 0) {
                    segments.push(trimmed);
                }
                cur = '';
            } else {
                cur += ch;
            }
        }
        if (cur.trim().length > 0) {
            segments.push(cur.trim());
        }
        return segments;
    }

    function splitElements(segStr, sep, escape) {
        const elements = [];
        let cur = '';
        let escaped = false;
        for (let i = 0; i < segStr.length; i++) {
            const ch = segStr[i];
            if (escaped) {
                cur += ch;
                escaped = false;
            } else if (ch === escape) {
                escaped = true;
            } else if (ch === sep) {
                elements.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        elements.push(cur);
        return elements;
    }

    function splitComponents(elemStr, sep, escape) {
        const comps = [];
        let cur = '';
        let escaped = false;
        for (let i = 0; i < elemStr.length; i++) {
            const ch = elemStr[i];
            if (escaped) {
                cur += ch;
                escaped = false;
            } else if (ch === escape) {
                escaped = true;
            } else if (ch === sep) {
                comps.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        comps.push(cur);
        return comps;
    }

    const rawSegments = splitSegments(msconsText, segmentTerm, releaseChar);
    if (rawSegments.length === 0) {
        return { error: "Keine EDIFACT-Segmente in der MSCONS-Datei gefunden." };
    }

    let currentMsgRef = '';
    let currentLocation = '';
    let currentObis = '';
    let currentDirection = '';
    let currentUnit = 'kw';
    let isCurrentChannelReactive = false;

    let datasetsMap = new Map();
    let pendingQty = null;
    let pendingDtmStart = null;
    let pendingDtmEnd = null;

    function parseDtm303(dtmStr) {
        if (!dtmStr) return null;
        if (/^\d{8}$/.test(dtmStr)) {
            const y = parseInt(dtmStr.substring(0, 4), 10);
            const m = parseInt(dtmStr.substring(4, 6), 10);
            const d = parseInt(dtmStr.substring(6, 8), 10);
            const dateObj = new Date(y, m - 1, d, 0, 0);
            return {
                timestamp: dateObj.getTime(),
                dateStr: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`,
                timeStr: '00:00',
                dateObj: dateObj
            };
        }

        const match = dtmStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?:\??([+-]\d{2}))?/);
        if (!match) return null;
        
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);
        const hh = parseInt(match[4], 10);
        const mm = parseInt(match[5], 10);
        const tzOffsetHours = match[6] ? parseInt(match[6], 10) : null;

        if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) return null;

        const is2400 = (hh === 24 && mm === 0);
        const hours = is2400 ? 0 : hh;

        let dateObj;
        if (tzOffsetHours !== null) {
            const utcMs = Date.UTC(y, m - 1, d, hours - tzOffsetHours, mm);
            dateObj = new Date(utcMs);
            if (is2400) dateObj.setDate(dateObj.getDate() + 1);
        } else {
            dateObj = new Date(y, m - 1, d, hours, mm);
            if (is2400) dateObj.setDate(dateObj.getDate() + 1);
        }

        return {
            timestamp: dateObj.getTime(),
            dateStr: `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${dateObj.getFullYear()}`,
            timeStr: `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`,
            dateObj: dateObj
        };
    }

    function commitObservation() {
        if (pendingQty === null || isCurrentChannelReactive) return;
        const timeInfo = pendingDtmEnd || pendingDtmStart;
        if (!timeInfo) return;

        let intervalHours = 0.25;
        if (pendingDtmStart && pendingDtmEnd && pendingDtmEnd.timestamp > pendingDtmStart.timestamp) {
            intervalHours = (pendingDtmEnd.timestamp - pendingDtmStart.timestamp) / 3600000;
        }

        const dsName = (currentLocation ? currentLocation : (filename || 'MSCONS')) + 
                       (currentObis ? `_${currentObis}` : '') + 
                       (currentDirection ? `_${currentDirection}` : '');

        if (!datasetsMap.has(dsName)) {
            datasetsMap.set(dsName, {
                name: dsName,
                data: [],
                totalRowsCount: 0,
                invalidRowsCount: 0,
                importedUnit: currentUnit,
                isMSCONS: true
            });
        }

        const ds = datasetsMap.get(dsName);
        ds.totalRowsCount++;

        const kwVal = (currentUnit === 'kwh') ? (pendingQty / intervalHours) : pendingQty;

        ds.data.push({
            timestamp: timeInfo.timestamp,
            dateStr: timeInfo.dateStr,
            timeStr: timeInfo.timeStr,
            dateObj: timeInfo.dateObj,
            intervalStartUtc: pendingDtmStart ? pendingDtmStart.timestamp : (timeInfo.timestamp - intervalHours * 3600000),
            intervalEndUtc: timeInfo.timestamp,
            intervalHours: intervalHours,
            rawKw: pendingQty,
            kw: kwVal,
            energyKwh: currentUnit === 'kwh' ? pendingQty : (kwVal * intervalHours),
            kwh: currentUnit === 'kwh' ? pendingQty : (kwVal * intervalHours),
            qualityStatus: (Number.isFinite(kwVal) && kwVal >= 0 && kwVal <= 100000 && Number.isFinite(pendingQty) && pendingQty >= 0) ? 'VALID' : 'INVALID',
            kvar: 0,
            datasetName: dsName,
            hasData: true
        });

        pendingQty = null;
        pendingDtmStart = null;
        pendingDtmEnd = null;
    }

    for (let i = 0; i < rawSegments.length; i++) {
        const seg = rawSegments[i];
        const elements = splitElements(seg, elemSep, releaseChar);
        const segHeader = elements[0];

        if (segHeader === 'BGM') {
            commitObservation();
            if (elements.length >= 3) {
                currentMsgRef = elements[2];
            }
        } else if (segHeader === 'LOC') {
            commitObservation();
            const qualifier = elements[1];
            if (qualifier === '172' || qualifier === '171' || elements.length >= 3) {
                const locComp = splitComponents(elements[2] || '', compSep, releaseChar);
                if (locComp[0] && locComp[0].length >= 5) {
                    currentLocation = locComp[0];
                }
            }
        } else if (segHeader === 'LIN') {
            commitObservation();
        } else if (segHeader === 'PIA') {
            commitObservation();
            if (elements.length >= 3) {
                const piaComp = splitComponents(elements[2] || '', compSep, releaseChar);
                let obisCode = '';
                if (piaComp.length >= 2 && piaComp[1]) {
                    obisCode = (piaComp[0] + ':' + piaComp[1]).replace(/\?/g, '');
                } else if (piaComp[0]) {
                    obisCode = piaComp[0].replace(/\?/g, '');
                }
                currentObis = obisCode;

                const isReactive = obisCode.includes(':3.') || obisCode.includes(':4.') || 
                                   obisCode.includes(':5.') || obisCode.includes(':6.') ||
                                   obisCode.includes(':7.') || obisCode.includes(':8.') ||
                                   obisCode.includes('.3.') || obisCode.includes('.4.') ||
                                   obisCode.startsWith('1-1:3.') || obisCode.startsWith('1-1:4.') ||
                                   obisCode.startsWith('1-0:3.') || obisCode.startsWith('1-0:4.') ||
                                   obisCode.toLowerCase().includes('kvar');

                isCurrentChannelReactive = isReactive;

                if (obisCode.includes(':1.') || obisCode.includes('.1.') || obisCode.startsWith('1-1:1.') || obisCode.startsWith('1-0:1.')) {
                    currentDirection = 'Bezug';
                } else if (obisCode.includes(':2.') || obisCode.includes('.2.') || obisCode.startsWith('1-1:2.') || obisCode.startsWith('1-0:2.')) {
                    currentDirection = 'Einspeisung';
                } else {
                    currentDirection = 'Bezug';
                }

                const isWorkUnit = obisCode.includes('.8.') || obisCode.endsWith('.8.0') ||
                                   obisCode.includes('.29.') || obisCode.endsWith('.29.0') ||
                                   obisCode.includes(':1.29') || obisCode.includes(':2.29') ||
                                   obisCode.includes(':1.8') || obisCode.includes(':2.8') ||
                                   obisCode.toLowerCase().includes('kwh');

                if (isWorkUnit) {
                    currentUnit = 'kwh';
                } else {
                    currentUnit = 'kw';
                }
            }
        } else if (segHeader === 'DTM') {
            if (elements.length >= 2) {
                const dtmComp = splitComponents(elements[1] || '', compSep, releaseChar);
                const qual = dtmComp[0];
                const dtVal = dtmComp[1];
                const dtParsed = dtVal ? parseDtm303(dtVal) : null;

                if (qual === '163') {
                    pendingDtmStart = dtParsed;
                } else if (qual === '164') {
                    pendingDtmEnd = dtParsed;
                }
                if (pendingQty !== null && (pendingDtmEnd || pendingDtmStart)) {
                    commitObservation();
                }
            }
        } else if (segHeader === 'QTY') {
            if (isCurrentChannelReactive) continue;
            if (elements.length >= 2) {
                const qtyComp = splitComponents(elements[1] || '', compSep, releaseChar);
                const qual = qtyComp[0];
                if (qual === '220' || qual === '136' || elements.length === 1 || qtyComp.length === 2) {
                    const rawVal = qtyComp[1] !== undefined ? qtyComp[1] : qtyComp[0];
                    let numericVal = parseFloat(rawVal);
                    if (!isNaN(numericVal)) {
                        const unitCode = qtyComp[2] ? qtyComp[2].trim().toUpperCase() : '';
                        if (unitCode === 'WHR' || unitCode === 'W' || unitCode === 'VAR') {
                            numericVal = numericVal / 1000.0;
                        } else if (unitCode === 'MWH' || unitCode === 'MW' || unitCode === 'MWT') {
                            numericVal = numericVal * 1000.0;
                        } else if (unitCode === 'GWH' || unitCode === 'GW') {
                            numericVal = numericVal * 1000000.0;
                        }

                        pendingQty = numericVal;
                        if (pendingDtmEnd || pendingDtmStart) {
                            commitObservation();
                        }
                    }
                }
            }
        }
    }

    let totalQtyCount = 0;
    let orphanQtyCount = 0;
    let invalidIntervalsCount = 0;

    commitObservation();

    let parsedDatasets = Array.from(datasetsMap.values());
    if (parsedDatasets.length === 0) {
        return { error: `Keine gültigen Lastgang-Messwerte in MSCONS-Datei (${filename}) gefunden.` };
    }

    parsedDatasets.forEach(ds => {
        ds.data.sort((a, b) => a.timestamp - b.timestamp);
    });

    const totalPts = parsedDatasets.reduce((acc, d) => acc + d.data.length, 0);

    return { 
        datasets: parsedDatasets,
        auditInfo: {
            filename: filename,
            msgCount: Math.max(1, currentMsgRef ? 1 : 0),
            reactiveFilteredCount: 0,
            totalDatasets: parsedDatasets.length,
            totalPoints: totalPts
        },
        importProtocol: {
            messagesCount: Math.max(1, currentMsgRef ? 1 : 0),
            channelsFound: Array.from(datasetsMap.keys()),
            processedMeasurements: totalPts,
            invalidIntervalsCount: invalidIntervalsCount
        }
    };
}

function isMSCONSContent(text) {
    if (!text) return false;
    const snippet = text.substring(0, 500).toUpperCase();
    return snippet.includes('UNA:') || snippet.includes('UNB+') || snippet.includes('UNH+') || snippet.includes('MSCONS');
}

function handleFiles(files) {
    if (!files) return;
    const fileList = Array.from(files.length !== undefined ? files : [files]);
    if (fileList.length === 0) return;

    const dropZone = document.getElementById('drop-zone');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadStatus = document.getElementById('upload-status');
    const fileNameDisplay = document.getElementById('file-name-display');
    const aggregationSelect = document.getElementById('aggregation-select');

    currentAggregation = '1M';
    isManualAggregation = true;
    if (aggregationSelect) aggregationSelect.value = currentAggregation;

    if (dropZone) dropZone.style.display = 'none';
    if (uploadProgress) uploadProgress.classList.remove('hidden');
    if (uploadStatus) uploadStatus.textContent = fileList.length > 1 ? `Lese ${fileList.length} Dateien...` : "Lese Datei...";
    if (fileNameDisplay) fileNameDisplay.textContent = fileList.length > 1 ? `${fileList.length} Dateien` : fileList[0].name;

    let allExtractedDatasets = [];
    let processedCount = 0;
    let errors = [];

    fileList.forEach(file => {
        let sourceFileHash = null;
        const reader = new FileReader();
        reader.onload = async function(e) {
            const arrayBuffer = e.target.result;
            try {
                sourceFileHash = await calculateArrayBufferHash(arrayBuffer);
            } catch (hashError) {
                console.warn('Datei-Fingerabdruck konnte nicht erstellt werden:', hashError);
            }

            const isXlsx = /\.xlsx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            if (isXlsx) {
                const parseXlsxFn = window.parseXlsxArrayBuffer;
                if (typeof parseXlsxFn !== 'function') {
                    errors.push(`${file.name}: Der XLSX-Importer ist nicht verfügbar.`);
                    onFileFinished();
                    return;
                }
                try {
                    const xlsxResult = await parseXlsxFn(arrayBuffer, file.name);
                    if (!xlsxResult.success) {
                        errors.push(`${file.name}: ${(xlsxResult.errors || []).map(error => error.message).join(', ') || 'Keine gültigen XLSX-Daten gefunden.'}`);
                    } else if (xlsxResult.datasets) {
                        xlsxResult.datasets.forEach(ds => {
                            ds.data.forEach(d => { d.dateObj = new Date(d.timestamp); });
                            ds.fileHash = sourceFileHash;
                            ds.sourceFileName = file.name;
                        });
                        allExtractedDatasets = allExtractedDatasets.concat(xlsxResult.datasets);
                    }
                } catch (xlsxError) {
                    errors.push(`${file.name}: XLSX-Datei konnte nicht verarbeitet werden.`);
                    console.error('XLSX-Import fehlgeschlagen:', xlsxError);
                }
                onFileFinished();
                return;
            }

            let text = '';
            try {
                const decoder = new TextDecoder('utf-8', { fatal: true });
                text = decoder.decode(arrayBuffer);
            } catch (decErr) {
                const decoder = new TextDecoder('windows-1252');
                text = decoder.decode(arrayBuffer);
            }

            if (isMSCONSContent(text)) {
                const res = parseMSCONS(text, file.name);
                if (res.error) {
                    errors.push(`${file.name}: ${res.error}`);
                } else if (res.datasets) {
                    res.datasets.forEach(ds => {
                        ds.fileHash = sourceFileHash;
                        ds.sourceFileName = file.name;
                    });
                    allExtractedDatasets = allExtractedDatasets.concat(res.datasets);
                }
                onFileFinished();
            } else {
                try {
                    const blob = new Blob([parserWorkerCode], { type: 'application/javascript' });
                    const worker = new Worker(URL.createObjectURL(blob));
                    worker.postMessage({ csvText: text });
                    
                    worker.onmessage = function(evt) {
                        if (evt.data.error) {
                            errors.push(`${file.name}: ${evt.data.error}`);
                        } else if (evt.data.datasets) {
                            evt.data.datasets.forEach(ds => {
                                ds.data.forEach(d => { d.dateObj = new Date(d.timestamp); });
                                ds.fileHash = sourceFileHash;
                                ds.sourceFileName = file.name;
                            });
                            allExtractedDatasets = allExtractedDatasets.concat(evt.data.datasets);
                        }
                        worker.terminate();
                        onFileFinished();
                    };

                    worker.onerror = function(err) {
                        worker.terminate();
                        parseCSVFallbackInline(text, file.name);
                    };
                } catch (wErr) {
                    parseCSVFallbackInline(text, file.name);
                }
            }
        };

        function parseCSVFallbackInline(csvText, fName) {
            Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
                fastMode: false,
                complete: function(results) {
                    const res = processParsedCSVRows(results.data);
                    if (res.error) {
                        errors.push(`${fName}: ${res.error}`);
                    } else if (res.datasets) {
                        res.datasets.forEach(ds => {
                            ds.data.forEach(d => { d.dateObj = new Date(d.timestamp); });
                            ds.fileHash = sourceFileHash;
                            ds.sourceFileName = file.name;
                        });
                        allExtractedDatasets = allExtractedDatasets.concat(res.datasets);
                    }
                    onFileFinished();
                }
            });
        }

        function onFileFinished() {
            processedCount++;
            if (uploadStatus) uploadStatus.textContent = `Verarbeitet ${processedCount} von ${fileList.length}...`;
            
            if (processedCount === fileList.length) {
                if (allExtractedDatasets.length === 0) {
                    const errMsg = errors.length > 0 ? errors.join(' | ') : "Keine gültigen Lastgänge gefunden.";
                    showToast(errMsg, "error");
                    resetUpload();
                    return;
                }

                if (errors.length > 0) {
                    showToast(`Warnung bei manchen Dateien: ${errors.join(' | ')}`, "warning");
                }

                tempParsedDatasets = allExtractedDatasets;
                
                const isAllMSCONS = tempParsedDatasets.length > 0 && tempParsedDatasets.every(ds => ds.isMSCONS);
                const unitModal = document.getElementById('unit-modal');
                const unitModalFilename = document.getElementById('unit-modal-filename');
                const modalImportUnit = document.getElementById('modal-import-unit');
                
                if (unitModal && !isAllMSCONS) {
                    if (unitModalFilename) {
                        unitModalFilename.textContent = fileList.length > 1 
                            ? `Import: ${fileList.length} Dateien (${allExtractedDatasets.length} Lastgänge)` 
                            : `Datei: ${fileList[0].name}`;
                    }
                    const detected = tempParsedDatasets[0]?.importedUnit || 'kw';
                    if (modalImportUnit) modalImportUnit.value = detected;
                    unitModal.classList.remove('hidden');
                } else {
                    finalizeImport(tempParsedDatasets, tempParsedDatasets[0]?.importedUnit || 'kw');
                }
            }
        }

        reader.readAsArrayBuffer(file);
    });
}

function handleFile(file) {
    handleFiles([file]);
}

function parseCSVFallback(csvText) {
    Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        fastMode: false,
        complete: function(results) {
            const res = processParsedCSVRows(results.data);
            
            if (res.error) {
                showToast(res.error, "error");
                resetUpload();
                return;
            }

            res.datasets.forEach(ds => {
                ds.data.forEach(d => {
                    d.dateObj = new Date(d.timestamp);
                });
            });

            tempParsedDatasets = res.datasets;
            
            const unitModal = document.getElementById('unit-modal');
            const unitModalFilename = document.getElementById('unit-modal-filename');
            const modalImportUnit = document.getElementById('modal-import-unit');
            
            if (unitModal) {
                if (unitModalFilename) unitModalFilename.textContent = `Datei: ${tempParsedDatasets[0]?.name || 'Importierte Datei'}`;
                const detected = tempParsedDatasets[0]?.importedUnit || 'kw';
                if (modalImportUnit) modalImportUnit.value = detected;
                unitModal.classList.remove('hidden');
            } else {
                finalizeImport(tempParsedDatasets, tempParsedDatasets[0]?.importedUnit || 'kw');
            }
        }
    });
}

function resetUpload() {
    const dropZone = document.getElementById('drop-zone');
    const uploadProgress = document.getElementById('upload-progress');
    const fileInput = document.getElementById('file-input');

    if (dropZone) dropZone.style.display = 'block';
    if (uploadProgress) uploadProgress.classList.add('hidden');
    if (fileInput) fileInput.value = '';
}

function finalizeImport(datasets, selectedUnit) {
    let scaleFactor = 1.0;
    if (selectedUnit === "kwh") scaleFactor = 4.0;
    else if (selectedUnit === "w") scaleFactor = 0.001;
    else if (selectedUnit === "wh") scaleFactor = 0.004;
    else if (selectedUnit === "mw") scaleFactor = 1000.0;
    else if (selectedUnit === "mwh") scaleFactor = 4000.0;
    
    datasets.forEach(ds => {
        if (ds.isMSCONS) {
            ds.importedUnit = 'kw';
            let total = 0;
            let invalid = 0;
            ds.data.forEach(item => {
                total++;
                if (!Number.isFinite(item.kw) || item.kw < 0 || item.kw > 100000 || item.qualityStatus === 'INVALID') invalid++;
            });
            ds.totalRowsCount = total;
            ds.invalidRowsCount = invalid;
            return;
        }

        // CSV datasets: apply selectedUnit
        ds.importedUnit = selectedUnit;
        
        // Recalculate scaled kw using rawKw
        ds.data.forEach(d => {
            if (d.rawKw === undefined) {
                d.rawKw = d.kw;
            }
            d.kw = d.rawKw !== null ? d.rawKw * scaleFactor : null;
            d.intervalHours = (Number.isFinite(d.intervalHours) && d.intervalHours > 0) ? d.intervalHours : 0.25;
            d.intervalEndUtc = d.timestamp;
            d.intervalStartUtc = Number.isFinite(d.intervalStartUtc)
                ? d.intervalStartUtc
                : d.timestamp - d.intervalHours * 3600000;
            d.energyKwh = Number.isFinite(d.kw) ? d.kw * d.intervalHours : null;
            d.kwh = d.energyKwh;
            d.qualityStatus = (Number.isFinite(d.kw) && d.kw >= 0 && d.kw <= 100000) ? 'VALID' : 'INVALID';
        });
        
        // Recount totals/invalids
        let total = 0;
        let invalid = 0;
        ds.data.forEach(item => {
            if (item.hasData) {
                total++;
                if (!Number.isFinite(item.kw) || item.qualityStatus === 'INVALID') invalid++;
            }
        });
        ds.totalRowsCount = total;
        ds.invalidRowsCount = invalid;
    });
    
    allDatasets = datasets;
    if (!allDatasets || allDatasets.length === 0) {
        rawData = [];
        return;
    }
    currentDatasetId = 0;
    rawData = allDatasets[0].data;

    if (!rawData || rawData.length === 0) {
        return;
    }

    let overallMinDate = null;
    let overallMaxDate = null;

    const activeDSList = (typeof activeDatasetIds !== 'undefined' && activeDatasetIds && activeDatasetIds.length > 0)
        ? activeDatasetIds.map(idx => allDatasets[idx]).filter(Boolean)
        : allDatasets;

    activeDSList.forEach(ds => {
        if (ds.data && ds.data.length > 0) {
            const dFirst = ds.data[0].dateObj;
            const dLast = ds.data[ds.data.length - 1].dateObj;
            if (!overallMinDate || (dFirst && dFirst < overallMinDate)) overallMinDate = dFirst;
            if (!overallMaxDate || (dLast && dLast > overallMaxDate)) overallMaxDate = dLast;
        }
    });

    let validMinDate = overallMinDate;
    let validMaxDate = overallMaxDate;
    allDatasets.forEach(ds => {
        if (ds.data && ds.data.length > 0) {
            const dFirst = ds.data[0].dateObj;
            const dLast = ds.data[ds.data.length - 1].dateObj;
            if (!validMinDate || (dFirst && dFirst < validMinDate)) validMinDate = dFirst;
            if (!validMaxDate || (dLast && dLast > validMaxDate)) validMaxDate = dLast;
        }
    });

    if (!overallMinDate && rawData && rawData.length > 0) {
        overallMinDate = rawData[0].dateObj;
        overallMaxDate = rawData[rawData.length - 1].dateObj;
        validMinDate = overallMinDate;
        validMaxDate = overallMaxDate;
    }

    const minDate = new Date(overallMinDate.getFullYear(), overallMinDate.getMonth(), overallMinDate.getDate(), 0, 0, 0);
    const maxDate = new Date(overallMaxDate.getFullYear(), overallMaxDate.getMonth(), overallMaxDate.getDate(), 23, 59, 59);

    const absMinDate = new Date(validMinDate.getFullYear(), validMinDate.getMonth(), validMinDate.getDate(), 0, 0, 0);
    const absMaxDate = new Date(validMaxDate.getFullYear(), validMaxDate.getMonth(), validMaxDate.getDate(), 23, 59, 59);
    
    if (typeof globalDateRange !== 'undefined' && globalDateRange) {
        globalDateRange.validMin = absMinDate;
        globalDateRange.validMax = absMaxDate;
        globalDateRange.start = minDate;
        globalDateRange.end = maxDate;
    }
    
    const inputDateStart = document.getElementById('date-start');
    const inputDateEnd = document.getElementById('date-end');
    
    if (inputDateStart && inputDateEnd) {
        inputDateStart.value = getLocalDateString(minDate);
        inputDateEnd.value = getLocalDateString(maxDate);
        
        inputDateStart.min = getLocalDateString(absMinDate);
        inputDateStart.max = getLocalDateString(absMaxDate);
        inputDateEnd.min = getLocalDateString(absMinDate);
        inputDateEnd.max = getLocalDateString(absMaxDate);
    }

    if (typeof renderDatasetCheckboxes === 'function') {
        renderDatasetCheckboxes();
    }

    // Show Dashboard
    const uploadScreen = document.getElementById('upload-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    if (uploadScreen) uploadScreen.classList.add('hidden');
    if (dashboardScreen) dashboardScreen.classList.remove('hidden');
    resetUpload();
    
    setTimeout(() => {
        if (typeof chartTimeline !== 'undefined' && chartTimeline) chartTimeline.resize();
        if (typeof chartDailyProfile !== 'undefined' && chartDailyProfile) chartDailyProfile.resize();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof showToast === 'function') showToast("Datei erfolgreich geladen!", "success");
    }, 100);
}
