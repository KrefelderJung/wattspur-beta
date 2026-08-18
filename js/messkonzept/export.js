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
        const renderAssetSummary = options.renderAssetSummary || (() => '');
        const getMeterNumber = options.getMeterNumber || (() => '—');
        const getMeterLabel = options.getMeterLabel || (meter => {
            const number = getMeterNumber(meter);
            return number ? `Z${number}` : '—';
        });
        const getAssetMeta = options.getAssetMeta || (() => ({}));
        const notify = options.notify || (() => {});
        const getDocument = options.getDocument || (() => global.document);
        const getWindow = options.getWindow || (() => global);

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

        function renderExportDetails() {
            const state = getState();
            const isMediumVoltage = state.hak?.voltageLevel === 'medium';
            const voltageLabel = isMediumVoltage
                ? 'Mittelspannung · Transformator-Darstellung'
                : 'Niederspannung · Hausanschlusskasten';
            const connectionBlock = `<article class="mk-print-detail-block"><h4>Netzanschluss</h4><div class="mk-meter-detail-value"><span>Spannungsebene</span><b>${escapeHtml(voltageLabel)}</b></div></article>`;
            const meterBlocks = [];
            const meterCount = state.mode === 'parallel' ? state.cascadeLevels : 1;
            for (let index = 0; index < meterCount; index += 1) {
                meterBlocks.push(`<article class="mk-print-detail-block"><h4>Z${index + 1} · Zähler</h4>${renderMeterDetailsSummary(index, true)}</article>`);
            }
            const assets = state.assets?.length
                ? state.assets.map(asset => {
                    const heading = asset.type === 'meter'
                        ? `${getMeterLabel(asset)} · Zähler`
                        : `${escapeHtml(asset.name)} · ${escapeHtml(getAssetMeta(asset.type)?.label || asset.type || 'Baustein')}`;
                    return `<article class="mk-print-detail-block"><h4>${heading}</h4>${renderAssetSummary(asset, true)}</article>`;
                }).join('')
                : '<p class="mk-print-muted">Keine zusätzlichen Bausteine angelegt.</p>';
            return `<section class="mk-print-details"><h3>Objektdetails</h3><div class="mk-print-detail-grid">${connectionBlock}${meterBlocks.join('')}${assets}</div></section>`;
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

            clone.classList.add('mk-print-canvas-stage');
            clone.style.setProperty('width', `${Math.ceil(width)}px`);
            clone.style.setProperty('min-width', `${Math.ceil(width)}px`);
            clone.style.setProperty('height', `${Math.ceil(height)}px`);
            clone.style.setProperty('min-height', `${Math.ceil(height)}px`);
            clone.style.setProperty('zoom', '1');
            clone.style.setProperty('transform', 'none');
            clone.style.setProperty('--mk-canvas-zoom', '1');

            if (connectorLayer) {
                connectorLayer.setAttribute('width', String(Math.ceil(width)));
                connectorLayer.setAttribute('height', String(Math.ceil(height)));
                connectorLayer.style.setProperty('width', `${Math.ceil(width)}px`);
                connectorLayer.style.setProperty('height', `${Math.ceil(height)}px`);
            }

            return `<div class="mk-print-canvas-frame">${clone.outerHTML}</div>`;
        }

        function renderPrintSheet(stand = getExportStand(), options = {}) {
            const scope = options.scope === 'sketch' ? 'sketch' : 'full';
            const isSketchExport = scope === 'sketch';
            const topology = getTopologyMarkup();
            const checks = validate().map(check => `<li class="${check.level}">${escapeHtml(check.text)}</li>`).join('');
            return `
        <section class="mk-print-sheet mk-print-sheet--${scope}" data-mk-export-scope="${scope}" aria-label="${isSketchExport ? 'Messskizzen-Export' : 'Messkonzept-Export'}">
            <header class="mk-print-header">
                <div class="mk-print-brand" aria-label="Wattspur Messkonzept-Konfigurator">
                    <img class="mk-print-brand-mark" src="wattspur-mark.svg" alt="Wattspur">
                    <span class="mk-print-brand-copy"><strong>Wattspur</strong><span>Messkonzept-Konfigurator</span></span>
                </div>
                <div class="mk-print-meta"><b>Exportstand</b><span>${escapeHtml(stand.label)}</span></div>
            </header>
            ${renderProjectDetails()}
            <p class="mk-print-notice">Dieser Export dokumentiert den zum Ausgabezeitpunkt erfassten Stand. Spätere Änderungen am Konzept sind in dieser Datei nicht enthalten. Die Skizze ist eine unverbindliche Orientierung und ersetzt keine fachliche Prüfung.</p>
            <section class="mk-print-topology"><h2>Messskizze</h2>${topology}</section>
            ${renderNotes()}
            <section class="mk-print-status"><h3>Prüfstatus</h3><ul>${checks}</ul></section>
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
            renderExportDetails,
            getTopologyMarkup,
            renderPrintSheet,
            downloadPdf
        });
    }

    global.WattspurMesskonzeptExport = Object.freeze({ createExporter });
}(window));
