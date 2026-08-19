/*
 * Wattspur Messkonzept – Exportdarstellung und PDF-Druck
 *
 * Der Export baut weiterhin ein druckbares HTML-Dokument auf. Das eigentliche
 * PDF wird anschließend durch den Browser-Druckdialog erzeugt ("Als PDF
 * speichern"). Zustand, Validierung und Darstellung werden injiziert, damit
 * dieses Modul keine fachlichen Regeln oder DOM-Renderer besitzt.
 */
(function exposeMesskonzeptExport(global) {
    'use strict';

    function createExporter(options = {}) {
        const getState = options.getState || (() => ({}));
        const getElements = options.getElements || (() => ({}));
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
        const validate = options.validate || (() => []);
        const renderMeterDetailsSummary = options.renderMeterDetailsSummary || (() => '');
        const getMeterSummaryEntries = options.getMeterSummaryEntries || (() => []);
        const renderAssetSummary = options.renderAssetSummary || (() => '');
        const getAssetSummaryEntries = options.getAssetSummaryEntries || (() => []);
        const getMeterNumber = options.getMeterNumber || (() => '—');
        const getMeterLabel = options.getMeterLabel || (meter => {
            const number = getMeterNumber(meter);
            return number ? `Z${number}` : '—';
        });
        const getAssetMeta = options.getAssetMeta || (() => ({}));
        const notify = options.notify || (() => {});
        const getDocument = options.getDocument || (() => global.document);
        const getWindow = options.getWindow || (() => global);
        const meterExportFields = Object.freeze([
            'Marktlokation Bezug',
            'Marktlokation Lieferung',
            'Messlokation',
            'Zählernummer',
            'Einbaudatum'
        ]);

        function getExportStand(now = new Date()) {
            return {
                iso: now.toISOString(),
                label: new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(now)
            };
        }

        function renderNotes() {
            const notes = String(getState().notes || '').trim();
            if (!notes) return '';
            return `<section class="mk-print-notes"><h2>Abstimmungsnotizen</h2><p>${escapeHtml(notes).replace(/\r?\n/g, '<br>')}</p></section>`;
        }

        function renderProjectDetails() {
            const project = getState().project || {};
            const rows = [
                ['Projektname', project.name],
                ['Referenz / Artikelnummer', project.reference],
                ['Straße', project.street],
                ['Hausnummer', project.houseNumber],
                ['PLZ', project.postalCode],
                ['Ort', project.city],
                ['Stand der Skizze', project.planStatus]
            ];
            return `<section class="mk-print-project"><h2>Projektangaben</h2><dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd></div>`).join('')}</dl></section>`;
        }

        function renderExportNotice() {
            return `<p class="mk-print-notice"><strong>Wichtiger Hinweis:</strong> Dieser Export zeigt den zum Exportzeitpunkt erfassten Stand. Die Skizze dient nur der Orientierung. Sie ersetzt keine fachliche Prüfung, technische Abstimmung oder Genehmigung. Vor Änderungen muss das Messkonzept durch einen konzessionierten Elektrofachbetrieb geprüft und mit dem zuständigen Netzbetreiber abgestimmt werden.</p>`;
        }

        function renderCompactTable(title, fieldLabels, rows) {
            if (!rows.length) return '';
            const columns = fieldLabels.length ? fieldLabels : ['Hinweis'];
            return `
                <section class="mk-print-table-section">
                    <h4>${escapeHtml(title)}</h4>
                    <div class="mk-print-table-wrap">
                        <table class="mk-print-table">
                            <thead><tr><th scope="col">Objekt</th>${columns.map(label => `<th scope="col">${escapeHtml(label)}</th>`).join('')}</tr></thead>
                            <tbody>${rows.map(row => `<tr><th scope="row">${escapeHtml(row.label)}</th>${columns.map((label, index) => `<td>${escapeHtml(row.values[index] || '')}</td>`).join('')}</tr>`).join('')}</tbody>
                        </table>
                    </div>
                </section>
            `;
        }

        function collectTableFields(rows) {
            const labels = [];
            rows.forEach(row => {
                (row.entries || []).forEach(entry => {
                    const label = String(entry.label || '').trim();
                    if (label && !labels.includes(label) && rows.some(candidate => (candidate.entries || []).some(item => item.label === label && String(item.value || '').trim()))) {
                        labels.push(label);
                    }
                });
            });
            return labels;
        }

        function toTableRows(rows, fieldLabels) {
            return rows.map(row => ({
                label: row.label,
                values: fieldLabels.map(label => {
                    const entry = (row.entries || []).find(item => item.label === label);
                    return entry ? String(entry.value || '') : '';
                })
            }));
        }

        function renderExportDetails() {
            const state = getState();
            const isMediumVoltage = state.hak?.voltageLevel === 'medium';
            const voltageLabel = isMediumVoltage
                ? 'Mittelspannung · Transformator-Darstellung'
                : 'Niederspannung · Hausanschlusskasten';
            const detailSections = [`
                <section class="mk-print-table-section">
                    <h4>Netzanschluss</h4>
                    <div class="mk-print-table-wrap">
                        <table class="mk-print-table mk-print-table--key-value"><tbody><tr><th scope="row">Spannungsebene</th><td>${escapeHtml(voltageLabel)}</td></tr></tbody></table>
                    </div>
                </section>
            `];
            const meterRows = [];
            const meterCount = Math.max(1, Number(state.mode === 'parallel' ? state.cascadeLevels : 1) || 1);
            for (let index = 0; index < meterCount; index += 1) {
                meterRows.push({ label: `Z${index + 1}`, entries: getMeterSummaryEntries(index, false) });
            }
            const assets = Array.isArray(state.assets) ? state.assets : [];
            assets.filter(asset => asset.type === 'meter').forEach(asset => {
                meterRows.push({
                    label: getMeterLabel(asset) || asset.name || 'Zusatzzaehler',
                    entries: getAssetSummaryEntries(asset, false)
                        .filter(entry => meterExportFields.includes(entry.label))
                });
            });
            // Diese fünf Stammdaten gehören zur Weitergabe und bleiben deshalb
            // auch dann als Spalten sichtbar, wenn noch kein Wert eingetragen
            // wurde. Interne Strukturangaben wie Messbereich, Zählerfunktion
            // und „Zähler vor“ bleiben der Logik und Detailansicht vorbehalten.
            const meterFields = meterExportFields;
            detailSections.push(renderCompactTable('Zähler', meterFields, toTableRows(meterRows, meterFields)));

            const assetGroups = new Map();
            assets.filter(asset => asset.type !== 'meter').forEach(asset => {
                const groupKey = asset.type || 'asset';
                if (!assetGroups.has(groupKey)) assetGroups.set(groupKey, []);
                assetGroups.get(groupKey).push({
                    label: asset.name || getAssetMeta(asset.type)?.label || 'Anlage',
                    entries: getAssetSummaryEntries(asset, false).filter(entry => entry.label !== 'Bezeichnung')
                });
            });
            assetGroups.forEach((rows, type) => {
                const fields = collectTableFields(rows);
                const tableRows = fields.length
                    ? toTableRows(rows, fields)
                    : rows.map(row => ({ label: row.label, values: ['Keine weiteren Angaben'] }));
                detailSections.push(renderCompactTable(getAssetMeta(type)?.label || 'Anlagen', fields, tableRows));
            });

            if (detailSections.length === 1) detailSections.push('<p class="mk-print-muted">Keine zusätzlichen Bausteine angelegt.</p>');
            return `<section class="mk-print-details"><h3>Objektdetails</h3>${detailSections.join('')}</section>`;
        }

        /*
         * Die Editor-Skizze besteht aus zwei Ebenen: dem HTML mit den Karten
         * und einer darüberliegenden SVG-Leitungsebene. Im Drucklayout darf
         * diese Kombination nicht durch Padding, Zoom oder eine neue
         * Mindestbreite auseinandergezogen werden. Deshalb wird die Bühne
         * für den Export in einen eigenen Rahmen gelegt und auf die bereits
         * berechneten SVG-Maße eingefroren. Die Leitungen bleiben damit an
         * exakt denselben Ankern wie im Editor.
         */
        function getTopologyMarkup() {
            const canvas = getElements().canvas;
            const stage = canvas?.querySelector?.('.mk-canvas-stage');
            if (!stage) return '<p class="mk-print-muted">Keine Skizze vorhanden.</p>';

            const clone = stage.cloneNode(true);
            const connectorLayer = clone.querySelector('.mk-connector-layer');
            const viewBox = String(connectorLayer?.getAttribute('viewBox') || '')
                .trim()
                .split(/\s+/)
                .map(Number);
            const parseDimension = (value, fallback) => {
                const number = Number.parseFloat(String(value || ''));
                return Number.isFinite(number) && number > 0 ? number : fallback;
            };
            const width = parseDimension(connectorLayer?.getAttribute('width'), parseDimension(viewBox[2], stage.scrollWidth || stage.offsetWidth || 1));
            const height = parseDimension(connectorLayer?.getAttribute('height'), parseDimension(viewBox[3], stage.scrollHeight || stage.offsetHeight || 1));
            // A4 portrait with standard print margins and the frame padding
            // leaves roughly 650 CSS px for the sketch. Scale only the
            // isolated PDF copy, never the editor stage, so wide topologies
            // remain complete and aligned.
            const maxPrintWidth = 650;
            const scale = Math.min(1, maxPrintWidth / width);
            const scaledWidth = Math.ceil(width * scale);
            const scaledHeight = Math.ceil(height * scale);

            clone.classList.add('mk-print-canvas-stage');
            clone.style.setProperty('width', `${Math.ceil(width)}px`);
            clone.style.setProperty('min-width', `${Math.ceil(width)}px`);
            clone.style.setProperty('height', `${Math.ceil(height)}px`);
            clone.style.setProperty('min-height', `${Math.ceil(height)}px`);
            clone.style.setProperty('zoom', '1');
            clone.style.setProperty('transform', `scale(${scale})`);
            clone.style.setProperty('transform-origin', 'top left');
            clone.style.setProperty('--mk-canvas-zoom', '1');

            if (connectorLayer) {
                connectorLayer.setAttribute('width', String(Math.ceil(width)));
                connectorLayer.setAttribute('height', String(Math.ceil(height)));
                connectorLayer.style.setProperty('width', `${Math.ceil(width)}px`);
                connectorLayer.style.setProperty('height', `${Math.ceil(height)}px`);
            }

            return `<div class="mk-print-canvas-frame"><div class="mk-print-canvas-fit" style="width:${scaledWidth}px;height:${scaledHeight}px">${clone.outerHTML}</div></div>`;
        }

        function renderPrintSheet(stand = getExportStand(), options = {}) {
            const scope = options.scope === 'sketch' ? 'sketch' : 'full';
            const isSketchExport = scope === 'sketch';
            const topology = getTopologyMarkup();
            const statusCounters = new Map();
            const checks = validate().map(check => {
                const statusLabel = check.level === 'error' ? 'Fehler'
                    : check.level === 'warning' ? 'Hinweis'
                        : check.level === 'ok' ? 'OK' : 'Info';
                const statusNumber = (statusCounters.get(statusLabel) || 0) + 1;
                statusCounters.set(statusLabel, statusNumber);
                return `<li class="${check.level}"><strong class="mk-print-status-label">${escapeHtml(`${statusLabel} ${statusNumber}`)}:</strong> ${escapeHtml(check.text)}</li>`;
            }).join('');
            return `
        <section class="mk-print-sheet mk-print-sheet--${scope}" data-mk-export-scope="${scope}" aria-label="${isSketchExport ? 'Messskizzen-Export' : 'Messkonzept-Export'}">
            <header class="mk-print-header">
                <div class="mk-print-brand" aria-label="Wattspur Messkonzept-Konfigurator">
                    <img class="mk-print-brand-mark" src="wattspur-mark.svg" alt="Wattspur">
                    <span class="mk-print-brand-copy"><strong>Wattspur</strong><span>Messkonzept-Konfigurator</span></span>
                </div>
                <div class="mk-print-meta"><b>Exportstand</b><span>${escapeHtml(stand.label)}</span></div>
            </header>
            ${renderExportNotice()}
            ${renderProjectDetails()}
            <section class="mk-print-status" aria-label="Prüfstatus und Hinweise"><h3>Prüfstatus und Hinweise</h3><ul>${checks}</ul></section>
            ${renderNotes()}
            <section class="mk-print-topology"><h2>Messskizze</h2>${topology}</section>
            ${isSketchExport ? '' : renderExportDetails()}
            <footer class="mk-print-footer">Wattspur Beta · ${isSketchExport ? 'Skizzenexport' : 'Gesamtexport'} · lokal im Browser erstellt · Stand ${escapeHtml(stand.label)}</footer>
        </section>
    `;
        }

        function downloadPdf(options = {}) {
            const doc = getDocument();
            const win = getWindow();
            const stand = getExportStand();
            const scope = options.scope === 'sketch' ? 'sketch' : 'full';
            const isSketchExport = scope === 'sketch';
            const wrapper = doc.createElement('div');
            wrapper.innerHTML = renderPrintSheet(stand, { scope });
            const printSheet = wrapper.firstElementChild;
            doc.body.appendChild(printSheet);
            const previousTitle = doc.title;
            doc.title = `Wattspur-${isSketchExport ? 'Messskizze' : 'Messkonzept'}-${stand.iso.slice(0, 10)}`;
            const cleanup = () => {
                printSheet.remove();
                doc.title = previousTitle;
                doc.body.classList.remove('mk-printing');
            };
            win.addEventListener('afterprint', cleanup, { once: true });
            doc.body.classList.add('mk-printing');
            win.setTimeout(() => {
                win.print();
                win.setTimeout(() => {
                    if (doc.body.contains(printSheet)) cleanup();
                }, 250);
            }, 40);
            notify(`${isSketchExport ? 'Skizzenexport' : 'Gesamtexport'} geöffnet. Wähle dort „Als PDF speichern“.`, 'info');
        }

        return Object.freeze({
            getExportStand,
            renderNotes,
            renderProjectDetails,
            renderExportNotice,
            renderExportDetails,
            getTopologyMarkup,
            renderPrintSheet,
            downloadPdf
        });
    }

    global.WattspurMesskonzeptExport = Object.freeze({ createExporter });
}(window));
