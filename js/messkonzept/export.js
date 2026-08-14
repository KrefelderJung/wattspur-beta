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
        const getMeasurementSummaryMarkup = options.getMeasurementSummaryMarkup || (() => '');
        const renderMeterDetailsSummary = options.renderMeterDetailsSummary || (() => '');
        const renderAssetSummary = options.renderAssetSummary || (() => '');
        const getMeterNumber = options.getMeterNumber || (() => '—');
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
            const meterBlocks = [];
            const meterCount = state.mode === 'parallel' ? state.cascadeLevels : 1;
            for (let index = 0; index < meterCount; index += 1) {
                meterBlocks.push(`<article class="mk-print-detail-block"><h4>Z${index + 1} · Zähler</h4>${renderMeterDetailsSummary(index, true)}</article>`);
            }
            const assets = state.assets?.length
                ? state.assets.map(asset => {
                    const heading = asset.type === 'meter'
                        ? `Z${getMeterNumber(asset)} · Zähler`
                        : `${escapeHtml(asset.name)} · ${escapeHtml(getAssetMeta(asset.type)?.label || asset.type || 'Baustein')}`;
                    return `<article class="mk-print-detail-block"><h4>${heading}</h4>${renderAssetSummary(asset, true)}</article>`;
                }).join('')
                : '<p class="mk-print-muted">Keine zusätzlichen Bausteine angelegt.</p>';
            return `<section class="mk-print-details"><h3>Objektdetails</h3><div class="mk-print-detail-grid">${meterBlocks.join('')}${assets}</div></section>`;
        }

        function renderPrintSheet(stand = getExportStand()) {
            const state = getState();
            const elements = getElements();
            const topology = elements.canvas?.innerHTML || '<p class="mk-print-muted">Keine Skizze vorhanden.</p>';
            const checks = validate().map(check => `<li class="${check.level}">${escapeHtml(check.text)}</li>`).join('');
            const logic = getMeasurementSummaryMarkup();
            return `
        <section class="mk-print-sheet" aria-label="Messkonzept-Export">
            <header class="mk-print-header">
                <div><span class="mk-print-kicker">Wattspur · Messkonzept-Konfigurator</span><h1>${escapeHtml(state.project?.name || 'Messkonzept')}</h1></div>
                <div class="mk-print-meta"><b>Exportstand</b><span>${escapeHtml(stand.label)}</span><span>${state.mode === 'parallel' ? `Parallelmessung · ${state.cascadeLevels} Zähler` : 'Gemeinsame Messung · dynamische Unterzähler'}</span></div>
            </header>
            ${renderProjectDetails()}
            <p class="mk-print-notice">Dieser Export dokumentiert den zum Ausgabezeitpunkt erfassten Stand. Spätere Änderungen am Konzept sind in dieser Datei nicht enthalten. Die Skizze ist eine unverbindliche Orientierung und ersetzt keine fachliche Prüfung.</p>
            <section class="mk-print-topology"><h2>Messskizze</h2>${topology}</section>
            ${renderNotes()}
            <section class="mk-print-status"><div><h3>Prüfstatus</h3><ul>${checks}</ul></div><div><h3>Messlogik</h3>${logic}</div></section>
            ${renderExportDetails()}
            <footer class="mk-print-footer">Wattspur Beta · lokal im Browser erstellt · Stand ${escapeHtml(stand.label)}</footer>
        </section>
    `;
        }

        function downloadPdf() {
            const doc = getDocument();
            const win = getWindow();
            const stand = getExportStand();
            const wrapper = doc.createElement('div');
            wrapper.innerHTML = renderPrintSheet(stand);
            const printSheet = wrapper.firstElementChild;
            doc.body.appendChild(printSheet);
            const previousTitle = doc.title;
            doc.title = `Wattspur-Messkonzept-${stand.iso.slice(0, 10)}`;
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
            notify('Druckdialog geöffnet. Wähle dort „Als PDF speichern“.', 'info');
        }

        return Object.freeze({
            getExportStand,
            renderNotes,
            renderProjectDetails,
            renderExportDetails,
            renderPrintSheet,
            downloadPdf
        });
    }

    global.WattspurMesskonzeptExport = Object.freeze({ createExporter });
}(window));
