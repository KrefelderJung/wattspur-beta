/**
 * XLSX-Import für Lastgänge.
 *
 * Der Import unterstützt bewusst nur ein klar definiertes Format im ersten
 * Tabellenblatt: Datum | Uhrzeit | Lastgang [weitere Lastgänge ...].
 * Das XLSX-Archiv wird lokal mit JSZip gelesen. Es gibt keine Upload- oder
 * Netzwerkverbindung.
 */
(function attachXlsxParser(global) {
    'use strict';

    const DEFAULT_UNIT = 'kw';
    const UNIT_FACTORS = {
        kw: 1,
        kwh: 4,
        w: 0.001,
        wh: 0.004,
        mw: 1000,
        mwh: 4000
    };

    function decodeXml(value) {
        return String(value ?? '')
            .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
            .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(parseInt(number, 10)))
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&');
    }

    function getAttribute(attributes, name) {
        const match = String(attributes || '').match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
        return match ? decodeXml(match[1]) : '';
    }

    function getTextNodes(xml) {
        return Array.from(String(xml || '').matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi))
            .map(match => decodeXml(match[1]))
            .join('');
    }

    function columnIndex(reference) {
        const letters = String(reference || '').match(/^[A-Z]+/i)?.[0]?.toUpperCase();
        if (!letters) return -1;
        let result = 0;
        for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
        return result - 1;
    }

    function parseSharedStrings(xml) {
        return Array.from(String(xml || '').matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/gi))
            .map(match => getTextNodes(match[1]));
    }

    function parseSheetRows(xml, sharedStrings) {
        const rows = [];
        const rowMatches = String(xml || '').matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi);
        for (const rowMatch of rowMatches) {
            const cells = [];
            const cellMatches = rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi);
            for (const cellMatch of cellMatches) {
                const attributes = cellMatch[1] || '';
                const cellXml = cellMatch[2] || '';
                const reference = getAttribute(attributes, 'r');
                const type = getAttribute(attributes, 't');
                const valueMatch = cellXml.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/i);
                let value = valueMatch ? decodeXml(valueMatch[1]) : '';

                if (type === 's') {
                    const sharedIndex = Number.parseInt(value, 10);
                    value = Number.isInteger(sharedIndex) ? (sharedStrings[sharedIndex] ?? '') : '';
                } else if (type === 'inlineStr') {
                    value = getTextNodes(cellXml.match(/<is(?:\s[^>]*)?>([\s\S]*?)<\/is>/i)?.[1] || cellXml);
                } else if (type === 'b') {
                    value = value === '1' ? 'TRUE' : 'FALSE';
                }

                const index = columnIndex(reference);
                if (index >= 0) cells[index] = value;
            }
            rows.push(cells);
        }
        return rows;
    }

    function normalizeUnit(header) {
        const text = String(header || '').toLowerCase().replace(/[()[\]{}]/g, ' ');
        if (text.includes('mwh')) return 'mwh';
        if (text.includes('kwh')) return 'kwh';
        if (text.includes('wh')) return 'wh';
        if (text.includes('mw')) return 'mw';
        if (text.includes('kw')) return 'kw';
        if (/\bw\b/.test(text)) return 'w';
        return DEFAULT_UNIT;
    }

    function parseNumber(value) {
        const text = String(value ?? '').trim();
        if (!text) return null;
        const normalized = text.includes(',') && text.includes('.')
            ? (text.lastIndexOf(',') > text.lastIndexOf('.')
                ? text.replace(/\./g, '').replace(',', '.')
                : text.replace(/,/g, ''))
            : text.replace(',', '.');
        const result = Number.parseFloat(normalized);
        return Number.isFinite(result) ? result : null;
    }

    function excelSerialToDate(serial, date1904 = false) {
        const base = date1904 ? new Date(1904, 0, 1) : new Date(1899, 11, 31);
        let days = Number(serial);
        if (!Number.isFinite(days)) return null;
        if (!date1904 && days >= 60) days -= 1; // Excel's historic 1900 leap-year bug.
        base.setDate(base.getDate() + Math.floor(days));
        return base;
    }

    function parseDate(value, date1904) {
        if (typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value).trim())) {
            return excelSerialToDate(Number(value), date1904);
        }
        const text = String(value ?? '').trim();
        const match = text.match(/^(\d{1,4})[-./](\d{1,2})[-./](\d{1,4})/);
        if (!match) return null;
        let year;
        let month;
        let day;
        if (match[1].length === 4) {
            year = Number(match[1]);
            month = Number(match[2]);
            day = Number(match[3]);
        } else {
            day = Number(match[1]);
            month = Number(match[2]);
            year = Number(match[3]);
            if (year < 100) year += 2000;
        }
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }

    function parseTime(value) {
        if (typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value).trim())) {
            const fraction = Number(value);
            if (fraction >= 0 && fraction < 1) {
                const totalMinutes = Math.round(fraction * 24 * 60);
                return { hours: Math.floor(totalMinutes / 60) % 24, minutes: totalMinutes % 60, nextDay: totalMinutes >= 24 * 60 };
            }
        }
        const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})/);
        if (!match) return null;
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        if (hours === 24 && minutes === 0) return { hours: 0, minutes: 0, nextDay: true };
        if (hours > 23 || minutes > 59) return null;
        return { hours, minutes, nextDay: false };
    }

    function parseTimestamp(dateValue, timeValue, date1904) {
        const date = parseDate(dateValue, date1904);
        const time = parseTime(timeValue);
        if (!date || !time) return null;
        date.setHours(time.hours, time.minutes, 0, 0);
        if (time.nextDay) date.setDate(date.getDate() + 1);
        return date.getTime();
    }

    function createPoint(timestamp, value) {
        const dateObj = new Date(timestamp);
        const valid = Number.isFinite(value) && value >= 0 && value <= 100000;
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${dateObj.getFullYear()}`;
        const timeStr = dateObj.getHours() === 0 && dateObj.getMinutes() === 0
            ? '24:00'
            : `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        return {
            timestamp,
            intervalHours: 0.25,
            intervalStartUtc: timestamp - 15 * 60 * 1000,
            intervalEndUtc: timestamp,
            dateStr,
            timeStr,
            dateObj,
            kw: valid ? value : null,
            rawKw: valid ? value : null,
            energyKwh: valid ? value * 0.25 : null,
            kwh: valid ? value * 0.25 : null,
            qualityStatus: valid ? 'VALID' : 'INVALID',
            hasData: true
        };
    }

    function findDate1904(workbookXml) {
        return /date1904\s*=\s*["']1["']/i.test(workbookXml || '');
    }

    async function parseXlsxArrayBuffer(arrayBuffer, fileName = 'lastgang.xlsx') {
        if (!arrayBuffer || typeof arrayBuffer.byteLength !== 'number') {
            return { success: false, datasets: [], errors: [{ code: 'INVALID_XLSX', message: 'Die Excel-Datei konnte nicht gelesen werden.' }] };
        }
        if (!global.JSZip || typeof global.JSZip.loadAsync !== 'function') {
            return { success: false, datasets: [], errors: [{ code: 'XLSX_LIBRARY_MISSING', message: 'Der lokale Excel-Importer ist nicht verfügbar.' }] };
        }

        let zip;
        try {
            zip = await global.JSZip.loadAsync(arrayBuffer);
        } catch (error) {
            return { success: false, datasets: [], errors: [{ code: 'INVALID_XLSX', message: 'Die Datei ist keine lesbare XLSX-Datei.' }] };
        }

        const sheetFiles = zip.file(/^xl\/worksheets\/sheet\d+\.xml$/i);
        const sheetFile = sheetFiles?.[0];
        if (!sheetFile) {
            return { success: false, datasets: [], errors: [{ code: 'XLSX_NO_SHEET', message: 'Im ersten Tabellenblatt wurden keine Daten gefunden.' }] };
        }

        const [sheetXml, sharedXml, workbookXml] = await Promise.all([
            sheetFile.async('string'),
            zip.file('xl/sharedStrings.xml')?.async('string') || Promise.resolve(''),
            zip.file('xl/workbook.xml')?.async('string') || Promise.resolve('')
        ]);
        const rows = parseSheetRows(sheetXml, parseSharedStrings(sharedXml));
        const header = rows.find(row => row.some(cell => String(cell ?? '').trim() !== '')) || [];
        const dateHeader = String(header[0] ?? '').toLowerCase();
        const timeHeader = String(header[1] ?? '').toLowerCase();
        if (!dateHeader.includes('datum') && !dateHeader.includes('date')) {
            return { success: false, datasets: [], errors: [{ code: 'XLSX_DATE_COLUMN', message: 'Die erste Spalte muss „Datum“ heißen.' }] };
        }
        if (!timeHeader.includes('uhrzeit') && !timeHeader.includes('zeit') && !timeHeader.includes('time')) {
            return { success: false, datasets: [], errors: [{ code: 'XLSX_TIME_COLUMN', message: 'Die zweite Spalte muss „Uhrzeit“ heißen.' }] };
        }

        const valueHeaders = header.slice(2);
        if (valueHeaders.length === 0 || valueHeaders.every(value => !String(value ?? '').trim())) {
            return { success: false, datasets: [], errors: [{ code: 'XLSX_VALUE_COLUMN', message: 'Ab der dritten Spalte muss mindestens ein Lastgang stehen.' }] };
        }
        const units = valueHeaders.map(normalizeUnit);
        const uniqueUnits = [...new Set(units)];
        if (uniqueUnits.length > 1) {
            return { success: false, datasets: [], errors: [{ code: 'XLSX_MIXED_UNITS', message: 'Bitte verwenden Sie für alle Lastgang-Spalten dieselbe Einheit.' }] };
        }

        const date1904 = findDate1904(workbookXml);
        const datasets = valueHeaders.map((value, index) => ({
            id: global.generateUUID ? global.generateUUID() : Math.random().toString(36).slice(2),
            name: String(value ?? '').trim() || `Lastgang ${index + 1}`,
            fileName,
            sourceFileName: fileName,
            format: 'XLSX',
            importedUnit: units[index] || DEFAULT_UNIT,
            data: [],
            totalRowsCount: 0,
            invalidRowsCount: 0,
            isMSCONS: false
        }));

        let validTimestampRows = 0;
        for (const row of rows.slice(rows.indexOf(header) + 1)) {
            const timestamp = parseTimestamp(row[0], row[1], date1904);
            if (!Number.isFinite(timestamp)) continue;
            validTimestampRows++;
            datasets.forEach((dataset, index) => {
                const rawValue = parseNumber(row[index + 2]);
                dataset.data.push(createPoint(timestamp, rawValue));
            });
        }

        if (validTimestampRows === 0) {
            return { success: false, datasets: [], errors: [{ code: 'XLSX_NO_ROWS', message: 'Unter der Kopfzeile wurden keine gültigen Datum-/Uhrzeit-Zeilen gefunden.' }] };
        }
        datasets.forEach(dataset => {
            dataset.data.sort((a, b) => a.timestamp - b.timestamp);
            dataset.totalRowsCount = dataset.data.length;
            dataset.invalidRowsCount = dataset.data.filter(point => point.qualityStatus === 'INVALID').length;
        });

        return {
            success: true,
            datasets,
            warnings: [],
            errors: [],
            auditInfo: {
                filename: fileName,
                format: 'XLSX',
                totalDatasets: datasets.length,
                totalPoints: datasets.reduce((sum, dataset) => sum + dataset.data.length, 0)
            }
        };
    }

    global.parseXlsxArrayBuffer = parseXlsxArrayBuffer;
    global.WattspurXlsxParser = {
        parseXlsxArrayBuffer,
        normalizeUnit,
        parseNumber,
        parseTimestamp
    };
})(typeof window !== 'undefined' ? window : globalThis);
