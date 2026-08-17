// data-editor.js - Spreadsheet and bulk data editor for Lastgang Analyse
// This module owns editor state and interaction logic. The host application
// supplies the existing dataset/chart functions through the global app state.
(function (global) {
    'use strict';

// --- Data Editor & Spreadsheet Grid Engine ---
let editorTablePage = 0;
let isEditorEditable = false;
let isSavingFromEditor = false;
let datasetsBackup = null;
let editorSelectionStart = null; // { row, col }
let editorSelectionEnd = null;   // { row, col }
let editorIsDragging = false;
const editorGridPageSize = 1000;
let allTimestampsInSelectedRange = [];
let pageTimestamps = [];
let widthColDatum = 90;
let widthColUhrzeit = 70;

function updateTableTotalWidth() {
    const table = document.getElementById('editor-values-table');
    if (!table) return;
    let total = widthColDatum + widthColUhrzeit;
    allDatasets.forEach(ds => {
        total += (ds.width || 120);
    });
    table.style.width = total + 'px';
}

function createEmptyDataset(name = "Manueller Lastgang", year = 2026) {
    const emptyData = [];
    const start = new Date(`${year}-01-01T00:15:00`);
    const end = new Date(`${year}-01-02T00:00:00`);
    let current = start.getTime();
    while (current <= end.getTime()) {
        const dObj = new Date(current);
        let dateStr = '';
        let timeStr = '';
        if (dObj.getHours() === 0 && dObj.getMinutes() === 0) {
            const prevDate = new Date(current - 15 * 60 * 1000);
            dateStr = getLocalDateString(prevDate).split('-').reverse().join('.');
            timeStr = '24:00';
        } else {
            dateStr = getLocalDateString(dObj).split('-').reverse().join('.');
            timeStr = dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
        emptyData.push({
            timestamp: current,
            dateStr: dateStr,
            timeStr: timeStr,
            dateObj: dObj,
            intervalHours: 0.25,
            intervalStartUtc: current - 15 * 60 * 1000,
            intervalEndUtc: current,
            energyKwh: null,
            kwh: null,
            qualityStatus: 'INVALID',
            kw: null,
            rawKw: null,
            hasData: true
        });
        current += 15 * 60 * 1000;
    }
    return {
        name: name,
        data: emptyData,
        totalRowsCount: emptyData.length,
        invalidRowsCount: emptyData.length,
        importedUnit: "kw"
    };
}

function loadTableValuesToEditor() {
    const tableHeader = document.querySelector('#editor-values-table thead');
    const tableBody = document.querySelector('#editor-values-table tbody');
    const info = document.getElementById('editor-table-info');
    
    if (allDatasets.length === 0) {
        allDatasets.push(createEmptyDataset("Manueller Lastgang", 2026));
    }
    
    // Auto-detect timestamp convention from first data point (00:00 or 00:15 start)
    const editorStepMs = 15 * 60 * 1000;
    let editorOffset = 0;
    if (allDatasets.length > 0 && allDatasets[0].data.length > 0) {
        const fp = new Date(allDatasets[0].data[0].timestamp);
        const fpMs = fp.getHours() * 3600000 + fp.getMinutes() * 60000;
        editorOffset = (fpMs === 0) ? 0 : ((fpMs === editorStepMs) ? editorStepMs : 0);
    }
    
    // Construct all 15m timestamps in range (aligned to detected convention)
    const editorRangeStart = new Date(globalDateRange.start);
    editorRangeStart.setHours(0, 0, 0, 0);
    const startMs = editorRangeStart.getTime() + editorOffset;
    const editorRangeEnd = new Date(globalDateRange.end);
    editorRangeEnd.setHours(0, 0, 0, 0);
    editorRangeEnd.setDate(editorRangeEnd.getDate() + 1);
    const endMs = editorRangeEnd.getTime() - editorStepMs + editorOffset;
    
    allTimestampsInSelectedRange = [];
    let ts = startMs;
    // Cap safety limit to avoid freezing the tab (max 100k rows)
    while (ts <= endMs && allTimestampsInSelectedRange.length < 35040 * 2) {
        allTimestampsInSelectedRange.push(ts);
        ts += 15 * 60 * 1000;
    }
    
    const totalFiltered = allTimestampsInSelectedRange.length;
    
    // Clamp pagination page
    const maxPage = Math.max(0, Math.ceil(totalFiltered / editorGridPageSize) - 1);
    if (editorTablePage > maxPage) {
        editorTablePage = maxPage;
    }
    
    const startIdx = editorTablePage * editorGridPageSize;
    const endIdx = Math.min(startIdx + editorGridPageSize, totalFiltered);
    pageTimestamps = allTimestampsInSelectedRange.slice(startIdx, endIdx);
    
    if (info) {
        info.textContent = totalFiltered > 0 
            ? `Seite ${editorTablePage + 1} von ${maxPage + 1} (${startIdx + 1}-${endIdx})` 
            : "0 Zeilen geladen";
    }
    
    // Render dynamic table headers (Columns: Datum, Uhrzeit, Channels...)
    if (tableHeader) {
        tableHeader.innerHTML = `
            <tr>
                <th style="width: ${widthColDatum}px; text-align: center; position: relative;">Datum<div class="resizer"></div></th>
                <th style="width: ${widthColUhrzeit}px; text-align: center; position: relative;">Uhrzeit<div class="resizer"></div></th>
                ${allDatasets.map((ds, idx) => {
                    const displayUnitSuffix = displayUnit === 'kwh' ? 'kWh' : 'kW';
                    const colWidth = ds.width || 120;
                    return `
                        <th style="width: ${colWidth}px; position: relative;">
                            <span class="column-title" data-idx="${idx}" style="cursor: pointer; display: inline-block; width: calc(100% - 24px); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 4px;" title="Doppelklick zum Umbenennen">${escapeHtml(ds.name)} (${displayUnitSuffix})</span>
                            <button class="btn-delete-col" data-idx="${idx}" title="Lastgang löschen" style="position: absolute; right: 6px; top: 6px; background: transparent; border: none; color: var(--warning-color); cursor: pointer; display: flex; align-items: center; padding: 0.15rem;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <div class="resizer"></div>
                        </th>
                    `;
                }).join('')}
            </tr>
        `;
        
        // Add double-click rename listeners to headers
        tableHeader.querySelectorAll('.column-title').forEach(span => {
            span.addEventListener('dblclick', function(e) {
                const idx = parseInt(this.dataset.idx);
                const ds = allDatasets[idx];
                if (!ds) return;
                
                const currentSpan = this;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = ds.name;
                input.className = 'input-field';
                input.style.width = 'calc(100% - 16px)';
                input.style.height = '24px';
                input.style.fontSize = '0.75rem';
                input.style.padding = '2px 4px';
                input.style.boxSizing = 'border-box';
                input.style.borderRadius = 'var(--radius-sm)';
                input.style.border = '1px solid var(--primary-color)';
                
                currentSpan.replaceWith(input);
                input.focus();
                input.select();
                
                let isFinished = false;
                function finishRename() {
                    if (isFinished) return;
                    isFinished = true;
                    const newName = input.value.trim();
                    if (newName !== "") {
                        ds.name = newName;
                        renderDatasetCheckboxes(true);
                        updateDashboard();
                        showToast("Lastgang-Name erfolgreich aktualisiert!", "success");
                    }
                    loadTableValuesToEditor();
                }
                
                input.addEventListener('keydown', (evt) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        finishRename();
                    } else if (evt.key === 'Escape') {
                        evt.preventDefault();
                        isFinished = true;
                        loadTableValuesToEditor();
                    }
                });
                
                input.addEventListener('blur', () => {
                    finishRename();
                });
            });
        });
        
        // Add delete column listeners
        tableHeader.querySelectorAll('.btn-delete-col').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                const ds = allDatasets[idx];
                if (!ds) return;
                
                if (confirm(`Möchtest du den Lastgang "${ds.name}" wirklich komplett löschen?`)) {
                    allDatasets.splice(idx, 1);
                    activeDatasetIds = allDatasets.length > 0 ? [0] : [];
                    currentDatasetId = 0;
                    
                    if (typeof renderDatasetCheckboxes === 'function') {
                        renderDatasetCheckboxes();
                    }
                    
                    cachedAggregations = {};
                    updateDashboard();
                    loadTableValuesToEditor();
                    showToast(`Lastgang "${ds.name}" gelöscht.`, "info");
                }
            });
        });
    }
    
    // Prepare column lookup maps for high performance
    const datasetMaps = allDatasets.map(ds => {
        const map = new Map();
        ds.data.forEach(d => map.set(d.timestamp, d));
        return map;
    });
    
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (totalFiltered === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="${2 + allDatasets.length}" style="text-align:center;color:var(--text-muted);padding: 2rem;">Keine Datenpunkte im gewählten Zeitraum</td>
                </tr>
            `;
            return;
        }
        
        pageTimestamps.forEach((timestamp, r) => {
            const row = document.createElement('tr');
            
            // Generate Date & Time cells
            const firstPointDate = new Date(timestamp);
            let dateStr = '';
            let timeStr = '';
            if (firstPointDate.getHours() === 0 && firstPointDate.getMinutes() === 0) {
                const prevDate = new Date(timestamp - 15 * 60 * 1000);
                dateStr = getLocalDateString(prevDate).split('-').reverse().join('.');
                timeStr = '24:00';
            } else {
                dateStr = getLocalDateString(firstPointDate).split('-').reverse().join('.');
                timeStr = firstPointDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            }
            
            let rowHtml = `
                <td class="cell-readonly cell-center" data-row="${r}" data-col="0">${dateStr}</td>
                <td class="cell-readonly cell-center" data-row="${r}" data-col="1">${timeStr}</td>
            `;
            
            // Generate value cells for each dataset
            allDatasets.forEach((ds, c) => {
                const map = datasetMaps[c];
                const point = map.get(timestamp);
                
                let displayVal = '';
                if (point && Number.isFinite(point.kw)) {
                    const energy = typeof getMeasurementEnergyKwh === 'function' ? getMeasurementEnergyKwh(point) : point.kw * 0.25;
                    displayVal = displayUnit === 'kwh' ? (energy === null ? '' : energy.toFixed(2)) : point.kw.toFixed(2);
                }
                
                rowHtml += `
                    <td 
                        contenteditable="${isEditorEditable ? 'true' : 'false'}"
                        class="editor-cell cell-right ${!isEditorEditable ? 'cell-readonly' : ''}"
                        data-row="${r}"
                        data-col="${2 + c}"
                        data-timestamp="${timestamp}"
                        data-ds-idx="${c}"
                    >${displayVal}</td>
                `;
            });
            
            row.innerHTML = rowHtml;
            tableBody.appendChild(row);
        });
    }
    
    // Restore selection visualization
    updateSelectionHighlight();
    updateTableTotalWidth();
}

function saveCellChange(dsIdx, timestamp, value) {
    const ds = allDatasets[dsIdx];
    if (!ds) return;
    
    let kwVal = value;
    if (displayUnit === 'kwh' && value !== null) {
        kwVal = value * 4.0; // kWh -> kW
    }
    
    // Find point or append if missing
    let point = ds.data.find(d => d.timestamp === timestamp);
    if (!point) {
        const dObj = new Date(timestamp);
        point = {
            timestamp: timestamp,
            dateStr: getLocalDateString(dObj).split('-').reverse().join('.'),
            timeStr: dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            dateObj: dObj,
            intervalHours: 0.25,
            intervalStartUtc: timestamp - 15 * 60 * 1000,
            intervalEndUtc: timestamp,
            energyKwh: null,
            kwh: null,
            qualityStatus: 'INVALID',
            kw: null,
            rawKw: null,
            hasData: true
        };
        ds.data.push(point);
        ds.data.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    // Get scale from channel's importedUnit
    let channelScale = 1.0;
    const channelUnit = ds.importedUnit || 'kw';
    if (channelUnit === "kwh") channelScale = 4.0;
    else if (channelUnit === "w") channelScale = 0.001;
    else if (channelUnit === "wh") channelScale = 0.004;
    else if (channelUnit === "mw") channelScale = 1000.0;
    else if (channelUnit === "mwh") channelScale = 4000.0;
    
    point.kw = kwVal;
    point.rawKw = kwVal !== null ? kwVal / channelScale : null;
    point.intervalHours = (Number.isFinite(point.intervalHours) && point.intervalHours > 0) ? point.intervalHours : 0.25;
    point.intervalEndUtc = point.timestamp;
    point.intervalStartUtc = Number.isFinite(point.intervalStartUtc)
        ? point.intervalStartUtc
        : point.timestamp - point.intervalHours * 3600000;
    point.energyKwh = Number.isFinite(point.kw) && point.kw >= 0 ? point.kw * point.intervalHours : null;
    point.kwh = point.energyKwh;
    point.qualityStatus = Number.isFinite(point.kw) && point.kw >= 0 && point.kw <= 100000 ? 'VALID' : 'INVALID';
    
    ds.version = (ds.version || 0) + 1;
    cachedAggregations = {};
    
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
}

function updateSelectionHighlight() {
    if (!editorSelectionStart || !editorSelectionEnd) return;
    const minRow = Math.min(editorSelectionStart.row, editorSelectionEnd.row);
    const maxRow = Math.max(editorSelectionStart.row, editorSelectionEnd.row);
    const minCol = Math.min(editorSelectionStart.col, editorSelectionEnd.col);
    const maxCol = Math.max(editorSelectionStart.col, editorSelectionEnd.col);
    
    const table = document.getElementById('editor-values-table');
    if (!table) return;
    
    table.querySelectorAll('td').forEach(td => {
        if (td.dataset.row === undefined || td.dataset.col === undefined) return;
        const r = parseInt(td.dataset.row);
        const c = parseInt(td.dataset.col);
        
        const isSelected = (r >= minRow && r <= maxRow && c >= minCol && c <= maxCol);
        td.classList.toggle('cell-selected', isSelected);
        
        const isFocused = (r === editorSelectionStart.row && c === editorSelectionStart.col);
        td.classList.toggle('cell-focused', isFocused);
    });
}

function clearSelectedCells() {
    if (!editorSelectionStart || !editorSelectionEnd) return;
    const minRow = Math.min(editorSelectionStart.row, editorSelectionEnd.row);
    const maxRow = Math.max(editorSelectionStart.row, editorSelectionEnd.row);
    const minCol = Math.min(editorSelectionStart.col, editorSelectionEnd.col);
    const maxCol = Math.max(editorSelectionStart.col, editorSelectionEnd.col);
    
    const table = document.getElementById('editor-values-table');
    if (!table) return;
    
    let changed = false;
    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {

            if (c < 2) continue; // Read-only dates/times
            const cell = table.querySelector(`td[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                const dsIdx = parseInt(cell.dataset.dsIdx);
                const timestamp = parseInt(cell.dataset.timestamp);
                cell.textContent = '';
                saveCellChange(dsIdx, timestamp, null);
                changed = true;
            }
        }
    }
    
    if (changed) {
        updateDashboard();
        showToast("Ausgewählte Zellwerte gelöscht.", "info");
    }
}

function copySelectedCellsToClipboard() {
    if (!editorSelectionStart || !editorSelectionEnd) return;
    const minRow = Math.min(editorSelectionStart.row, editorSelectionEnd.row);
    const maxRow = Math.max(editorSelectionStart.row, editorSelectionEnd.row);
    const minCol = Math.min(editorSelectionStart.col, editorSelectionEnd.col);
    const maxCol = Math.max(editorSelectionStart.col, editorSelectionEnd.col);
    
    const table = document.getElementById('editor-values-table');
    if (!table) return;
    
    let lines = [];
    for (let r = minRow; r <= maxRow; r++) {
        let lineCells = [];
        for (let c = minCol; c <= maxCol; c++) {
            const cell = table.querySelector(`td[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                lineCells.push(cell.textContent.trim());
            } else {
                lineCells.push('');
            }
        }
        lines.push(lineCells.join('\t'));
    }
    
    const tsvText = lines.join('\n');
    
    // Clipboard API check (fails on file:/// in some browsers)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(tsvText).then(() => {
            showToast("Zellbereich in die Zwischenablage kopiert!", "success");
        }).catch(err => {
            fallbackCopyText(tsvText);
        });
    } else {
        fallbackCopyText(tsvText);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast("Zellbereich in die Zwischenablage kopiert!", "success");
        } else {
            showToast("Kopieren fehlgeschlagen.", "error");
        }
    } catch (err) {
        showToast("Kopieren fehlgeschlagen: " + err, "error");
    }
    document.body.removeChild(textArea);
}

function setupSpreadsheetEvents() {
    const wrapper = document.getElementById('editor-grid-wrapper');
    const table = document.getElementById('editor-values-table');
    if (!wrapper || !table) return;
    
    // Mouse drag range selection & column resizing
    table.addEventListener('mousedown', (e) => {
        const resizer = e.target.closest('.resizer');
        if (resizer) {
            e.preventDefault();
            e.stopPropagation();
            
            const th = resizer.parentElement;
            const colIdx = th.cellIndex;
            const startX = e.clientX;
            const startWidth = th.offsetWidth;
            
            resizer.classList.add('resizing');
            
            function onMouseMove(evt) {
                const width = Math.max(20, startWidth + (evt.clientX - startX));
                th.style.width = `${width}px`;
                th.style.minWidth = `${width}px`;
                
                // Store resized widths globally to keep them on re-renders
                if (colIdx === 0) {
                    widthColDatum = width;
                } else if (colIdx === 1) {
                    widthColUhrzeit = width;
                } else {
                    const dsIdx = colIdx - 2;
                    if (allDatasets[dsIdx]) {
                        allDatasets[dsIdx].width = width;
                    }
                }
                
                // Live resize the entire table width as well
                updateTableTotalWidth();
            }
            
            function onMouseUp() {
                resizer.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            return;
        }

        const td = e.target.closest('td');
        if (!td || td.dataset.row === undefined || td.dataset.col === undefined) return;
        editorIsDragging = true;
        editorSelectionStart = { row: parseInt(td.dataset.row), col: parseInt(td.dataset.col) };
        editorSelectionEnd = { ...editorSelectionStart };
        updateSelectionHighlight();
        
        // Excel-like single-click edit focus and selection
        if (isEditorEditable && parseInt(td.dataset.col) >= 2) {
            setTimeout(() => {
                td.focus();
                const range = document.createRange();
                range.selectNodeContents(td);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }, 0);
        }
    });
    
    table.addEventListener('mouseover', (e) => {
        if (!editorIsDragging) return;
        const td = e.target.closest('td');
        if (!td || td.dataset.row === undefined || td.dataset.col === undefined) return;
        
        editorSelectionEnd = { row: parseInt(td.dataset.row), col: parseInt(td.dataset.col) };
        updateSelectionHighlight();
    });
    
    window.addEventListener('mouseup', () => {
        editorIsDragging = false;
    });
    
    // Save cell changes on blur
    table.addEventListener('blur', (e) => {
        const td = e.target.closest('td');
        if (!td || !td.classList.contains('editor-cell') || !isEditorEditable) return;
        
        const dsIdx = parseInt(td.dataset.dsIdx);
        const timestamp = parseInt(td.dataset.timestamp);
        const valStr = td.textContent.trim().replace(',', '.');
        const val = valStr === '' ? null : parseFloat(valStr);
        
        isSavingFromEditor = true;
        saveCellChange(dsIdx, timestamp, isNaN(val) ? null : val);
        updateDashboard();
        isSavingFromEditor = false;
    }, true);
    
    // Keyboard navigation and actions
    wrapper.addEventListener('keydown', (e) => {
        if (!editorSelectionStart) return;
        
        // Intercept copy (Ctrl+C) early if multiple cells are selected
        const isMultiCellSelection = editorSelectionEnd && 
            (editorSelectionStart.row !== editorSelectionEnd.row || editorSelectionStart.col !== editorSelectionEnd.col);
            
        if (e.key === 'c' && (e.ctrlKey || e.metaKey) && isMultiCellSelection) {
            e.preventDefault();
            copySelectedCellsToClipboard();
            return;
        }
        
        const isEditing = document.activeElement && document.activeElement.classList.contains('editor-cell');
        
        // Let standard input keys behave normally if editing inside a cell
        if (isEditing && e.key !== 'Enter' && e.key !== 'Tab' && e.key !== 'Escape') {
            return;
        }
        
        let moved = false;
        let nextRow = editorSelectionStart.row;
        let nextCol = editorSelectionStart.col;
        
        const rows = table.querySelectorAll('tbody tr');
        const maxRows = rows.length;
        const maxCols = 2 + allDatasets.length;
        
        if (e.key === 'ArrowUp') {
            if (nextRow > 0) { nextRow--; moved = true; }
        } else if (e.key === 'ArrowDown') {
            if (nextRow < maxRows - 1) { nextRow++; moved = true; }
        } else if (e.key === 'ArrowLeft') {
            if (nextCol > 0) { nextCol--; moved = true; }
        } else if (e.key === 'ArrowRight') {
            if (nextCol < maxCols - 1) { nextCol++; moved = true; }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isEditing) {
                document.activeElement.blur();
                wrapper.focus();
            }
            if (nextRow < maxRows - 1) { nextRow++; moved = true; }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (isEditing) {
                document.activeElement.blur();
                wrapper.focus();
            }
            if (e.shiftKey) {
                if (nextCol > 0) { nextCol--; moved = true; }
            } else {
                if (nextCol < maxCols - 1) { nextCol++; moved = true; }
            }
        } else if (e.key === 'Escape') {
            if (isEditing) {
                document.activeElement.blur();
                wrapper.focus();
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (!isEditorEditable) {
                showToast("Bearbeitungsmodus ist gesperrt. Bitte oben freischalten!", "warning");
                return;
            }
            e.preventDefault();
            clearSelectedCells();
        } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            copySelectedCellsToClipboard();
        }
        
        if (moved) {
            e.preventDefault();
            editorSelectionStart = { row: nextRow, col: nextCol };
            if (!e.shiftKey) {
                editorSelectionEnd = { ...editorSelectionStart };
            } else {
                editorSelectionEnd = { row: nextRow, col: nextCol };
            }
            updateSelectionHighlight();
            
            // Auto-scroll inside wrapper
            const cell = table.querySelector(`td[data-row="${nextRow}"][data-col="${nextCol}"]`);
            if (cell) {
                cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                if (isEditorEditable && nextCol >= 2) {
                    cell.focus();
                    // Select cell text
                    const range = document.createRange();
                    range.selectNodeContents(cell);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                } else {
                    wrapper.focus();
                }
            }
        }
    });
    
    // Paste handler
    wrapper.addEventListener('paste', (e) => {
        if (!isEditorEditable) {
            showToast("Bearbeitungsmodus ist gesperrt. Bitte oben freischalten!", "warning");
            e.preventDefault();
            return;
        }
        
        // 1. Read clipboard data FIRST before modifying focus
        const clipboardData = e.clipboardData || window.clipboardData;
        const text = clipboardData ? clipboardData.getData('text') : '';
        
        // 2. Defocus active editing cell to commit its changes
        const activeCell = document.activeElement;
        if (activeCell && activeCell.classList.contains('editor-cell')) {
            activeCell.blur();
        }
        
        let startRow = 0;
        let startCol = 2;
        if (activeCell && activeCell.dataset.row !== undefined && activeCell.dataset.col !== undefined) {
            startRow = parseInt(activeCell.dataset.row, 10);
            startCol = parseInt(activeCell.dataset.col, 10);
        } else if (editorSelectionStart) {
            startRow = editorSelectionStart.row;
            startCol = editorSelectionStart.col;
        } else {
            return;
        }
        
        e.preventDefault();
        if (!text) return;
        
        const pastedRows = text.split(/\r?\n/).map(line => line.split('\t'));
        // Remove trailing empty line if Excel trailing newline exists
        if (pastedRows.length > 1 && pastedRows[pastedRows.length - 1].length === 1 && pastedRows[pastedRows.length - 1][0] === "") {
            pastedRows.pop();
        }
        
        const dsCount = allDatasets.length;
        let changed = false;
        
        pastedRows.forEach((rowCells, i) => {
            const r = startRow + i;
            rowCells.forEach((valStr, j) => {
                const c = startCol + j;
                if (c < 2) return; // Date/Time columns are read-only
                
                const dsIdx = c - 2;
                if (dsIdx >= dsCount) return;
                
                let targetTs;
                if (r < pageTimestamps.length) {
                    targetTs = pageTimestamps[r];
                } else {
                    const startPageTs = pageTimestamps[0];
                    if (!startPageTs) return;
                    targetTs = startPageTs + r * 15 * 60 * 1000;
                }
                
                const val = valStr.trim().replace(',', '.');
                const parsedVal = val === '' ? null : parseFloat(val);
                
                saveCellChange(dsIdx, targetTs, isNaN(parsedVal) ? null : parsedVal);
                changed = true;
            });
        });
        
        if (changed) {
            updateDashboard();
            loadTableValuesToEditor();
            showToast("Werte erfolgreich aus Zwischenablage eingefügt!", "success");
        }
    });

    // --- Safety Lock toggler button listener ---
    const btnToggleLock = document.getElementById('btn-editor-toggle-lock');
    const cancelBtn = document.getElementById('btn-editor-cancel-edit');
    if (btnToggleLock) {
        // Clear active listeners before replacing
        btnToggleLock.replaceWith(btnToggleLock.cloneNode(true));
        const newLockBtn = document.getElementById('btn-editor-toggle-lock');
        
        newLockBtn.addEventListener('click', () => {
            isEditorEditable = !isEditorEditable;
            
            const lockIcon = document.getElementById('editor-lock-icon');
            const lockText = document.getElementById('editor-lock-text');
            
            if (isEditorEditable) {
                // Save Backup of current datasets before edit session starts
                datasetsBackup = allDatasets.map(ds => ({
                    name: ds.name,
                    version: ds.version,
                    data: JSON.parse(JSON.stringify(ds.data))
                }));
                
                if (cancelBtn) cancelBtn.style.display = 'inline-flex';
                
                newLockBtn.style.borderColor = 'var(--primary-color)';
                newLockBtn.style.backgroundColor = 'rgba(0, 180, 230, 0.1)';
                if (lockIcon) {
                    lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
                }
                if (lockText) lockText.textContent = "Speichern & Sperren";
                showToast("Bearbeitungsmodus AKTIVIERT. Du kannst nun Werte ändern, einfügen und löschen.", "info");
            } else {
                if (cancelBtn) cancelBtn.style.display = 'none';
                datasetsBackup = null;
                
                newLockBtn.style.borderColor = 'var(--border-color)';
                newLockBtn.style.backgroundColor = '';
                if (lockIcon) {
                    lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
                }
                if (lockText) lockText.textContent = "Bearbeiten freischalten";
                showToast("Bearbeitungsmodus DEAKTIVIERT. Daten sind gespeichert.", "success");
            }
            
            loadTableValuesToEditor();

        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (!datasetsBackup) return;
            
            // Restore datasets from backup
            datasetsBackup.forEach((backupDs, idx) => {
                if (allDatasets[idx]) {
                    allDatasets[idx].name = backupDs.name;
                    allDatasets[idx].version = backupDs.version;
                    allDatasets[idx].data = backupDs.data.map(d => ({
                        ...d,
                        dateObj: Number.isFinite(d.timestamp) ? new Date(d.timestamp) : null
                    }));
                }
            });
            
            isEditorEditable = false;
            if (cancelBtn) cancelBtn.style.display = 'none';
            datasetsBackup = null;
            
            const lockIcon = document.getElementById('editor-lock-icon');
            const lockText = document.getElementById('editor-lock-text');
            const toggleLockBtn = document.getElementById('btn-editor-toggle-lock');
            
            if (toggleLockBtn) {
                toggleLockBtn.style.borderColor = 'var(--border-color)';
                toggleLockBtn.style.backgroundColor = '';
            }
            if (lockIcon) {
                lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
            }
            if (lockText) lockText.textContent = "Bearbeiten freischalten";
            
            cachedAggregations = {};
            updateDashboard();
            loadTableValuesToEditor();
            showToast("Änderungen verworfen.", "info");
        });
    }

    // --- Gehe zu Datum input listener ---
    const jumpDateInput = document.getElementById('editor-jump-date');
    if (jumpDateInput) {
        jumpDateInput.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) return;
            
            const targetDate = new Date(val + "T00:00:00");
            const targetMs = targetDate.getTime();
            
            const index = allTimestampsInSelectedRange.findIndex(ts => ts >= targetMs);
            if (index !== -1) {
                editorTablePage = Math.floor(index / editorGridPageSize);
                loadTableValuesToEditor();
                showToast(`Zu Datum ${targetDate.toLocaleDateString('de-DE')} gesprungen.`, "info");
            } else {
                showToast("Datum liegt außerhalb des geladenen Zeitraums.", "warning");
            }
        });
    }

    // --- Lastgang hinzufügen button listener ---
    const btnAddChannel = document.getElementById('btn-editor-add-channel');
    if (btnAddChannel) {
        btnAddChannel.addEventListener('click', () => {
            let year = 2026;
            if (allDatasets.length > 0 && allDatasets[0].data.length > 0) {
                year = allDatasets[0].data[0].dateObj.getFullYear();
            }
            
            const name = `Lastgang ${allDatasets.length + 1}`;
            const newDs = createEmptyDataset(name, year);
            allDatasets.push(newDs);
            
            if (typeof renderDatasetCheckboxes === 'function') {
                renderDatasetCheckboxes(true);
            }
            
            cachedAggregations = {};
            updateDashboard();
            loadTableValuesToEditor();
            showToast(`Neuer Lastgang "${name}" hinzugefügt.`, "success");
        });
    }

    // --- Mass Copy & Paste Modal Event Listeners ---
    const btnMassCopyPaste = document.getElementById('btn-editor-mass-copy-paste');
    const massModal = document.getElementById('mass-copy-paste-modal');
    const btnMassClose = document.getElementById('btn-mass-modal-close');
    const btnMassCopy = document.getElementById('btn-mass-modal-copy');
    const btnMassConfirm = document.getElementById('btn-mass-modal-confirm');
    const massTextarea = document.getElementById('mass-modal-textarea');
    const massImportOptions = document.getElementById('mass-modal-import-options');
    const massTargetSelect = document.getElementById('mass-modal-target-col');
    const massTitle = document.getElementById('mass-modal-title');
    const massDesc = document.getElementById('mass-modal-desc');
    const btnMassUploadTrigger = document.getElementById('btn-mass-modal-upload-trigger');
    const massFileInput = document.getElementById('mass-modal-file-input');
    const btnMassDownload = document.getElementById('btn-mass-modal-download');
    const btnMassClear = document.getElementById('btn-mass-modal-clear');

    if (btnMassCopyPaste && massModal) {
        btnMassCopyPaste.addEventListener('click', () => {
            massTitle.textContent = "Massen-Import / Export (Excel / CSV)";
            massDesc.textContent = "Kopiere die rohen Daten des gewählten Zeitraums (Export) oder füge neue Tabellendaten ein, um einen neuen Lastgang zu generieren (Import).";
            btnMassConfirm.style.display = 'inline-flex';
            massTextarea.removeAttribute('readonly');

            // Generate Export TSV string
            let exportLines = [];
            exportLines.push(['Datum', 'Uhrzeit'].concat(allDatasets.map(ds => ds.name)).join('\t'));

            const datasetMaps = allDatasets.map(ds => {
                const map = new Map();
                ds.data.forEach(d => map.set(d.timestamp, d));
                return map;
            });

            allTimestampsInSelectedRange.forEach(timestamp => {
                const dateObj = new Date(timestamp);
                let dateStr = '';
                let timeStr = '';
                if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
                    const prevDate = new Date(timestamp - 15 * 60 * 1000);
                    dateStr = getLocalDateString(prevDate).split('-').reverse().join('.');
                    timeStr = '24:00';
                } else {
                    dateStr = getLocalDateString(dateObj).split('-').reverse().join('.');
                    timeStr = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                }

                const rowVals = allDatasets.map((ds, c) => {
                    const p = datasetMaps[c].get(timestamp);
                    if (p && Number.isFinite(p.kw)) {
                        const energy = typeof getMeasurementEnergyKwh === 'function' ? getMeasurementEnergyKwh(p) : p.kw * 0.25;
                        return displayUnit === 'kwh' ? (energy === null ? '' : energy.toFixed(2)) : p.kw.toFixed(2);
                    }
                    return '';
                });

                exportLines.push([dateStr, timeStr].concat(rowVals).join('\t'));
            });

            massTextarea.value = exportLines.join('\n');
            massModal.classList.remove('hidden');
        });

        // Close Modal
        const closeModal = () => massModal.classList.add('hidden');
        btnMassClose.addEventListener('click', closeModal);
        massModal.addEventListener('click', (e) => {
            if (e.target === massModal) closeModal();
        });

        // Copy Text to Clipboard
        btnMassCopy.addEventListener('click', () => {
            massTextarea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    showToast("Rohdaten in die Zwischenablage kopiert!", "success");
                } else {
                    showToast("Kopieren fehlgeschlagen.", "error");
                }
            } catch (err) {
                showToast("Kopieren fehlgeschlagen: " + err, "error");
            }
        });

        // Clear Textarea content
        if (btnMassClear) {
            btnMassClear.addEventListener('click', () => {
                massTextarea.value = '';
                showToast("Textfeld geleert.", "info");
            });
        }

        // Download Text as CSV File
        if (btnMassDownload) {
            btnMassDownload.addEventListener('click', () => {
                const rawText = massTextarea.value;
                if (!rawText.trim()) return;
                
                const blob = new Blob([rawText], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                
                const startStr = getLocalDateString(globalDateRange.start).replace(/-/g, '');
                const endStr = getLocalDateString(globalDateRange.end).replace(/-/g, '');
                link.setAttribute("href", url);
                link.setAttribute("download", `Lastgang_Export_${startStr}_to_${endStr}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast("CSV-Datei erfolgreich exportiert!", "success");
            });
        }

        // Read Local CSV File
        if (btnMassUploadTrigger && massFileInput) {
            btnMassUploadTrigger.addEventListener('click', () => {
                massFileInput.value = '';
                massFileInput.click();
            });

            massFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(evt) {
                    massTextarea.value = evt.target.result;
                    showToast(`Datei "${file.name}" erfolgreich eingelesen! Klicke auf 'Daten importieren' zum Übernehmen.`, "success");
                };
                reader.readAsText(file);
            });
        }

        // Import Text into new columns
        btnMassConfirm.addEventListener('click', () => {
            const rawText = massTextarea.value;
            if (!rawText.trim()) {
                showToast("Bitte füge zuerst Daten in das Textfeld ein.", "warning");
                return;
            }

            const rawLines = rawText.split(/\r?\n/).filter(line => line.trim() !== '');
            if (rawLines.length === 0) {
                showToast("Das Textfeld ist leer.", "warning");
                return;
            }

            // Auto-detect CSV separator based on the first line
            const firstLine = rawLines[0];
            let separator = '\t';
            const tabCount = (firstLine.match(/\t/g) || []).length;
            const semiCount = (firstLine.match(/;/g) || []).length;
            const commaCount = (firstLine.match(/,/g) || []).length;
            
            if (semiCount > tabCount && semiCount > commaCount) separator = ';';
            else if (commaCount > tabCount && commaCount > semiCount) separator = ',';

            const lines = rawLines.map(line => line.split(separator));
            
            // Check if there is a header line and extract column names
            let colNames = [];
            let startLineIdx = 0;
            if (lines.length > 0) {
                const col0 = lines[0][0] ? lines[0][0].toLowerCase().trim() : '';
                if (col0.includes('datum') || col0.includes('date')) {
                    colNames = lines[0].slice(2).map(n => n.trim() || 'Importierte Spalte');
                    startLineIdx = 1;
                }
            }

            // If no headers found, default to column count
            const numValueCols = Math.max(1, lines[startLineIdx] ? lines[startLineIdx].length - 2 : 1);
            if (colNames.length === 0) {
                for (let c = 0; c < numValueCols; c++) {
                    colNames.push(`Importierter Lastgang ${allDatasets.length + c + 1}`);
                }
            }

            // Create new datasets
            const newDatasetsList = colNames.map(name => ({
                name: name,
                data: [],
                totalRowsCount: 0,
                invalidRowsCount: 0,
                importedUnit: 'kw'
            }));

            function parseDateTimeToTimestamp(dateStr, timeStr) {
                const dParts = dateStr.trim().split(/[-./]/);
                const hParts = timeStr.trim().split(':');
                if (dParts.length !== 3 || hParts.length < 2) return null;
                
                let y = 2000, m = 1, d = 1;
                if (dParts[0].length === 4) {
                    y = parseInt(dParts[0], 10);
                    m = parseInt(dParts[1], 10);
                    d = parseInt(dParts[2], 10);
                } else {
                    d = parseInt(dParts[0], 10);
                    m = parseInt(dParts[1], 10);
                    y = parseInt(dParts[2], 10);
                    if (y < 100) y += 2000;
                }
                
                let ts = new Date(y, m - 1, d, parseInt(hParts[0] || 0, 10), parseInt(hParts[1] || 0, 10));
                if (timeStr.trim() === "24:00") {
                    ts = new Date(y, m - 1, d);
                    ts.setDate(ts.getDate() + 1);
                }
                return ts.getTime();
            }

            isSavingFromEditor = true;

            for (let i = startLineIdx; i < lines.length; i++) {
                const cols = lines[i];
                if (cols.length < 3) continue; // Needs Date, Time, and at least one Value column

                const dateStr = cols[0];
                const timeStr = cols[1];
                const timestamp = parseDateTimeToTimestamp(dateStr, timeStr);
                if (!timestamp) continue;

                const dObj = new Date(timestamp);

                newDatasetsList.forEach((newDs, idx) => {
                    // Grab value for this dataset index, or fall back to column 2 if single-column paste
                    let valIdx = 2;
                    if (cols.length > 2 + idx) {
                        valIdx = 2 + idx;
                    }

                    const rawVal = cols[valIdx];
                    if (rawVal === undefined) return;

                    const valClean = rawVal.trim().replace(',', '.');
                    const parsedVal = valClean === '' ? null : parseFloat(valClean);

                    newDs.data.push({
                        timestamp: timestamp,
                        intervalHours: 0.25,
                        intervalStartUtc: timestamp - 15 * 60 * 1000,
                        intervalEndUtc: timestamp,
                        dateStr: getLocalDateString(dObj).split('-').reverse().join('.'),
                        timeStr: dObj.getHours() === 0 && dObj.getMinutes() === 0 ? '24:00' : dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                        dateObj: dObj,
                        kw: isNaN(parsedVal) ? null : parsedVal,
                        energyKwh: isNaN(parsedVal) || parsedVal < 0 ? null : parsedVal * 0.25,
                        kwh: isNaN(parsedVal) || parsedVal < 0 ? null : parsedVal * 0.25,
                        qualityStatus: !isNaN(parsedVal) && parsedVal >= 0 && parsedVal <= 100000 ? 'VALID' : 'INVALID',
                        rawKw: isNaN(parsedVal) ? null : parsedVal,
                        hasData: true
                    });
                });
            }

            // Sort and finalize all newly created datasets
            let importedCount = 0;
            newDatasetsList.forEach(newDs => {
                if (newDs.data.length > 0) {
                    newDs.data.sort((a, b) => a.timestamp - b.timestamp);
                    newDs.totalRowsCount = newDs.data.length;
                    newDs.invalidRowsCount = newDs.data.filter(d => !Number.isFinite(d.kw) || d.qualityStatus === 'INVALID').length;
                    allDatasets.push(newDs);
                    importedCount++;
                }
            });

            isSavingFromEditor = false;

            if (importedCount > 0) {
                // Activate the newly imported channels in the view
                activeDatasetIds = allDatasets.map((_, idx) => idx);
                if (typeof renderDatasetCheckboxes === 'function') {
                    renderDatasetCheckboxes(true);
                }
                updateDashboard();
                loadTableValuesToEditor();
                closeModal();
                showToast(`${importedCount} neue Lastgänge erfolgreich importiert!`, "success");
            } else {
                showToast("Es konnten keine gültigen Datenpunkte importiert werden. Bitte prüfe das Format (Datum;Uhrzeit;Wert).", "error");
            }
        });
    }
}

    const api = {
        updateTableTotalWidth,
        createEmptyDataset,
        loadTableValuesToEditor,
        saveCellChange,
        updateSelectionHighlight,
        clearSelectedCells,
        copySelectedCellsToClipboard,
        fallbackCopyText,
        setupSpreadsheetEvents,
        getState() {
            return {
                editorTablePage,
                isEditorEditable,
                isSavingFromEditor,
                editorSelectionStart: editorSelectionStart ? { ...editorSelectionStart } : null,
                editorSelectionEnd: editorSelectionEnd ? { ...editorSelectionEnd } : null,
                allTimestampsInSelectedRange: [...allTimestampsInSelectedRange],
                pageTimestamps: [...pageTimestamps],
                editorGridPageSize,
                widthColDatum,
                widthColUhrzeit
            };
        },
        setPage(page) {
            editorTablePage = Math.max(0, Number.isFinite(page) ? page : 0);
            loadTableValuesToEditor();
        },
        nextPage() {
            if ((editorTablePage + 1) * editorGridPageSize < allTimestampsInSelectedRange.length) {
                editorTablePage++;
                loadTableValuesToEditor();
            }
        },
        previousPage() {
            if (editorTablePage > 0) {
                editorTablePage--;
                loadTableValuesToEditor();
            }
        },
        isSaving() {
            return isSavingFromEditor;
        }
    };

    global.WattspurLastgangDataEditor = api;
})(window);
