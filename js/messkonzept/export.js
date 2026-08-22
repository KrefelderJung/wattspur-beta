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

        function sanitizeFileNamePart(value) {
            return String(value ?? '')
                .trim()
                .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/[. ]+$/g, '')
                .trim();
        }

        function getSuggestedFileName() {
            const project = getState().project || {};
            const location = [project.street, project.houseNumber]
                .map(sanitizeFileNamePart)
                .filter(Boolean)
                .join(' ');
            return location || 'Wattspur-Messkonzept';
        }

        function renderNotes() {
            const notes = String(getState().notes || '').trim();
            if (!notes) return '';
            return `<section class="mk-print-notes"><h2>Kommentar</h2><p>${escapeHtml(notes).replace(/\r?\n/g, '<br>')}</p></section>`;
        }

        function renderProjectDetails() {
            const project = getState().project || {};
            const renderRow = rows => `<div class="mk-print-project-row">${rows.map(([label, value]) => `
                <div class="mk-print-project-field">
                    <dt>${escapeHtml(label)}</dt>
                    <dd>${escapeHtml(value || '—')}</dd>
                </div>`).join('')}</div>`;
            return `<section class="mk-print-project"><h2>Projektangaben</h2><dl class="mk-print-project-grid">
                ${renderRow([
                    ['Projektname', project.name],
                    ['Referenz / Artikelnummer', project.reference],
                    ['Messkonzept', project.measurementConcept]
                ])}
                ${renderRow([
                    ['Straße', project.street],
                    ['Hausnummer', project.houseNumber],
                    ['PLZ', project.postalCode],
                    ['Ort', project.city],
                ])}
            </dl></section>`;
        }

        function renderExportNotice() {
            return `<p class="mk-print-notice"><strong>Wichtiger Hinweis:</strong> Dieser Export zeigt den zum Exportzeitpunkt erfassten Stand. Die Skizze dient nur der Orientierung. Sie ersetzt keine fachliche Prüfung, technische Abstimmung oder Genehmigung. Vor Änderungen muss das Messkonzept durch einen konzessionierten Elektrofachbetrieb geprüft und mit dem zuständigen Netzbetreiber abgestimmt werden.</p>`;
        }

        function renderCompactTable(title, fieldLabels, rows, options = {}) {
            if (!rows.length) return '';
            const effectiveFields = fieldLabels.length ? fieldLabels : ['Hinweis'];
            const leadingField = options.leadingField && effectiveFields.includes(options.leadingField)
                ? options.leadingField
                : null;
            const leadingIndex = leadingField ? effectiveFields.indexOf(leadingField) : -1;
            const columns = effectiveFields
                .filter(label => label !== leadingField);
            const rowLabelHeader = options.rowLabelHeader || 'Objekt';
            const headerCells = leadingField
                ? `<th scope="col">${escapeHtml(options.leadingHeader || leadingField)}</th><th scope="col">${escapeHtml(rowLabelHeader)}</th>`
                : `<th scope="col">${escapeHtml(rowLabelHeader)}</th>`;
            return `
                <section class="mk-print-table-section">
                    <h4>${escapeHtml(title)}</h4>
                    <div class="mk-print-table-wrap">
                        <table class="mk-print-table">
                            <thead><tr>${headerCells}${columns.map(label => `<th scope="col">${escapeHtml(label)}</th>`).join('')}</tr></thead>
                            <tbody>${rows.map(row => {
                                const leadingCell = leadingField
                                    ? `<td>${escapeHtml(row.values[leadingIndex] || '')}</td><th scope="row">${escapeHtml(row.label)}</th>`
                                    : `<th scope="row">${escapeHtml(row.label)}</th>`;
                                const valueCells = columns.map(label => {
                                    const valueIndex = effectiveFields.indexOf(label);
                                    return `<td>${escapeHtml(row.values[valueIndex] || '')}</td>`;
                                }).join('');
                                return `<tr>${leadingCell}${valueCells}</tr>`;
                            }).join('')}</tbody>
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
                const hideMeterBeforeColumn = ['storage', 'nsh', 'steuve'].includes(asset.type);
                const hideNshClassification = asset.type === 'nsh';
                assetGroups.get(groupKey).push({
                    label: asset.name || getAssetMeta(asset.type)?.label || 'Anlage',
                    entries: getAssetSummaryEntries(asset, false).filter(entry => entry.label !== 'Bezeichnung'
                        && !(hideMeterBeforeColumn && entry.label === 'Zähler davor')
                        && !(hideNshClassification && entry.label === 'Einordnung'))
                });
            });
            assetGroups.forEach((rows, type) => {
                const fields = collectTableFields(rows);
                const tableRows = fields.length
                    ? toTableRows(rows, fields)
                    : rows.map(row => ({ label: row.label, values: ['Keine weiteren Angaben'] }));
                const leadingField = fields.find(field => field === 'Anlagenart' || field === 'Anlage');
                detailSections.push(renderCompactTable(
                    getAssetMeta(type)?.label || 'Anlagen',
                    fields,
                    tableRows,
                    leadingField ? { leadingField, leadingHeader: leadingField, rowLabelHeader: 'Objektbezeichnung' } : {}
                ));
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
            // The one-page export reserves space for the header, notice and
            // project fields. Scale only the isolated PDF copy, never the
            // editor stage, so the editor geometry remains unchanged.
            const maxPrintWidth = 650;
            const maxPrintHeight = 520;
            const scale = Math.min(1, maxPrintWidth / width, maxPrintHeight / height);
            const scaledWidth = Math.ceil(width * scale);
            const scaledHeight = Math.ceil(height * scale);

            clone.classList.add('mk-print-canvas-stage', 'mk-print-geometry-svg-only');
            /*
             * Die langen Leitungswege werden im Editor bereits als geroutete
             * SVG-Pfade in .mk-connector-layer gezeichnet. Ältere HTML/CSS-
             * Anker und Pseudo-Elemente bleiben für die Bedienung wichtig,
             * dürfen aber nicht in die isolierte Druckkopie gelangen. Sonst
             * wird derselbe Weg im PDF doppelt dargestellt.
             */
            if (typeof clone.querySelectorAll === 'function') {
                clone.querySelectorAll([
                    '.mk-connection-line',
                    '.mk-rail-meter-link',
                    '.mk-zone-wrap-strand',
                    '.mk-rail-junction-anchor'
                ].join(',')).forEach(element => element.remove());
            }
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

        function renderPrintSheet(stand = getExportStand()) {
            const topology = getTopologyMarkup();
            return `
        <section class="mk-print-sheet mk-print-sheet--one-page" data-mk-export-scope="one-page" aria-label="Messkonzept-PDF">
            <header class="mk-print-header">
                <div class="mk-print-brand" aria-label="Wattspur Messkonzept-Konfigurator">
                    <img class="mk-print-brand-mark" src="wattspur-mark.svg" alt="Wattspur">
                    <span class="mk-print-brand-copy"><strong>Wattspur</strong><span>Messkonzept-Konfigurator</span></span>
                </div>
            </header>
            ${renderExportNotice()}
            <section class="mk-print-topology"><h2>Messskizze</h2>${topology}</section>
            ${renderProjectDetails()}
            ${renderNotes()}
            <footer class="mk-print-footer">Wattspur Beta · Messkonzept-Skizze · lokal im Browser erstellt</footer>
        </section>
    `;
        }

        function downloadPdf(options = {}) {
            const doc = getDocument();
            const win = getWindow();
            const stand = getExportStand();
            const wrapper = doc.createElement('div');
            wrapper.innerHTML = renderPrintSheet(stand);
            const printSheet = wrapper.firstElementChild;
            doc.body.appendChild(printSheet);
            const previousTitle = doc.title;
            // Browser verwenden den Dokumenttitel beim nativen Druckdialog in
            // der Regel als vorgeschlagenen PDF-Dateinamen.
            doc.title = getSuggestedFileName();
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
            notify('PDF-Export geöffnet. Wähle dort „Als PDF speichern“.', 'info');
        }

        return Object.freeze({
            getExportStand,
            getSuggestedFileName,
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
