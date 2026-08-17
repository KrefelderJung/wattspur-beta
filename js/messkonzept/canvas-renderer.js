/*
 * Wattspur Messkonzept – Canvas- und Modal-Komposition
 *
 * Dieses Modul baut die DOM-Struktur der Messskizze zusammen. Es berechnet
 * keine Leitungsgeometrie und verändert keine Messlogik. Fachliche Abfragen,
 * Renderer für einzelne Karten und DOM-Anker werden über die Factory injiziert.
 */
(function exposeMesskonzeptCanvasRenderer(global) {
    'use strict';

    function createCanvasRenderer(options = {}) {
        const state = options.state || {};
        const getState = () => options.getState?.() || state;
        const getElements = () => options.getElements?.() || {};
        const call = (name, fallback, ...args) => typeof options[name] === 'function' ? options[name](...args) : fallback;
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
        const assetMeta = options.assetMeta || {};
        const assetTypeOptions = options.assetTypeOptions || {};
        const storageGridOptions = options.storageGridOptions || [];
        const meterDetailFields = options.meterDetailFields || [];
        const layoutGeometry = options.layoutGeometry || {};

        function renderMeterDetailsSummary(index, includeEmpty = false) {
            const details = call('getMeterDetails', {}, index) || {};
            return meterDetailFields
                .filter(field => includeEmpty || String(details[field.key] || '').trim())
                .map(field => `<div class="mk-meter-detail-value"><span>${escapeHtml(field.label)}</span><b>${escapeHtml(String(details[field.key] || '—'))}</b></div>`)
                .join('');
        }

        function renderMeterNode(index) {
            return `
        <div class="mk-meter-node" data-mk-select-meter="${index}" role="button" tabindex="0" aria-label="Z${index + 1} auswählen">
            <span class="mk-meter-symbol">Z${index + 1}</span>
        </div>
    `;
        }

        function renderMeterLayout(index) {
            const currentState = getState();
            const baseMeterZone = call('getBaseMeterZone', 'single-main', index);
            const meterGeometryStyle = `style="--mk-meter-to-junction-link-px: ${layoutGeometry.meterToJunctionLinkPx || 0}px;"`;
            const baseMeterAttributes = `data-mk-base-meter-target="${index}" data-mk-zone="${escapeHtml(baseMeterZone)}" title="Anlagen oder Zusatzzähler hinter Z${index + 1} anschließen"`;
            if (currentState.viewMode === 'detail') {
                const meterSummary = renderMeterDetailsSummary(index);
                const meterSummaryMarkup = meterSummary
                    ? `<div class="mk-asset-detail-slide" aria-label="Details zu Z${index + 1}">${meterSummary}</div>`
                    : '';
                return `
            <div class="mk-meter-layout detail-mode" data-mk-meter-layout="${index}" ${baseMeterAttributes} ${meterGeometryStyle}>
                <article class="mk-asset-card detail-mode mk-meter-detail-card" data-mk-select-meter="${index}" role="button" tabindex="0" aria-label="Z${index + 1} auswählen">
                    <div class="mk-asset-head">
                        <span class="mk-asset-icon meter">Z${index + 1}</span>
                    </div>
                    ${meterSummaryMarkup}
                </article>
                <div class="mk-meter-detail-connection" aria-hidden="true"></div>
            </div>
        `;
            }

            return `
        <div class="mk-meter-layout" data-mk-meter-layout="${index}" ${baseMeterAttributes} ${meterGeometryStyle}>
            ${renderMeterNode(index)}
            <div class="mk-connection-line" aria-hidden="true"></div>
        </div>
    `;
        }

        function renderAssetEditorFields(asset) {
            const renderOptions = (items, selected, placeholder) => call('renderSelectOptions', '', items, selected, placeholder);
            const meterFields = asset.type === 'meter' ? `
        <label>Zählerfunktion<select data-mk-field="meterRole">
            <option value="Bezug / Lieferung" ${asset.meterRole === 'Bezug / Lieferung' ? 'selected' : ''}>Bezug / Lieferung</option>
            <option value="Bezug" ${asset.meterRole === 'Bezug' ? 'selected' : ''}>Bezug</option>
            <option value="Lieferung" ${asset.meterRole === 'Lieferung' ? 'selected' : ''}>Lieferung</option>
        </select></label>
    ` : '';
            const generationFields = asset.type === 'generation' ? `
        <div class="mk-asset-form-grid">
            <label>Art der Erzeugungsanlage<select data-mk-field="energyCarrier">${renderOptions(assetTypeOptions.generation || [], asset.energyCarrier)}</select></label>
            <label>Leistung<input type="text" data-mk-field="power" value="${escapeHtml(asset.power)}" placeholder="kW / kWp"></label>
            <label>Inbetriebnahme<input type="date" data-mk-field="commissioningDate" value="${escapeHtml(asset.commissioningDate)}"></label>
        </div>
    ` : '';
            const steuveFields = asset.type === 'steuve' ? `
        <div class="mk-asset-form-grid">
            <label>Anlage<select data-mk-field="steuveType">${renderOptions(assetTypeOptions.steuve || [], asset.steuveType)}</select></label>
            <label>Leistung<input type="text" data-mk-field="power" value="${escapeHtml(asset.power)}" placeholder="z. B. 11 kW"></label>
        </div>
        <div data-mk-steuve-notice="${escapeHtml(asset.id)}">${call('renderSteuveNotice', '', asset)}</div>
        <div class="mk-asset-form-grid" data-mk-steuve-module-fields="${escapeHtml(asset.id)}">${call('renderSteuveModuleFields', '', asset)}</div>
    ` : '';
            const nshFields = asset.type === 'nsh' ? `
        <label>Bestand / Inbetriebnahme<input type="date" data-mk-field="commissioningDate" value="${escapeHtml(asset.commissioningDate)}"></label>
        <p class="mk-nsh-editor-hint">Vor 2024 können historische Tarif- und Messbedingungen gelten. Bei gemeinsamer Messung mit einer aktuellen SteuVE bitte abstimmen.</p>
    ` : '';
            const storageFields = asset.type === 'storage' ? `
        <div class="mk-asset-form-grid mk-storage-form-grid">
            <label>Ins öffentliche Netz einspeisen<select data-mk-field="storageGridFeedIn">${renderOptions(storageGridOptions, asset.storageGridFeedIn, 'Noch nicht festgelegt')}</select></label>
            <label>Zum Laden Strom aus dem Netz beziehen<select data-mk-field="storageGridImport">${renderOptions(storageGridOptions, asset.storageGridImport, 'Noch nicht festgelegt')}</select></label>
        </div>
        <p class="mk-storage-editor-hint" data-mk-storage-notice="${escapeHtml(asset.id)}">${escapeHtml(call('getStorageOperation', { notice: '' }, asset)?.notice || '')}</p>
        <p class="mk-storage-source-links">Fachliche Orientierung: <a href="https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/181" target="_blank" rel="noopener noreferrer">Clearingstelle EEG|KWKG</a> · <a href="https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/Solaranlagen/Nutzung_table.html" target="_blank" rel="noopener noreferrer">Bundesnetzagentur</a></p>
    ` : '';
            return `
        <div class="mk-object-editor-form" data-mk-asset-id="${escapeHtml(asset.id)}">
            <div class="mk-asset-form">
                <label>Bezeichnung<input type="text" data-mk-field="name" value="${escapeHtml(asset.name)}"></label>
                ${meterFields}
                ${generationFields}
                ${steuveFields}
                ${nshFields}
                ${storageFields}
            </div>
        </div>
    `;
        }

        function renderAssetSummary(asset, includeEmpty = false) {
            const currentState = getState();
            const getAssetMeterNumber = item => call('getAssetMeterNumber', null, item);
            const getGenerationMeterNumber = item => call('getGenerationMeterNumber', null, item);
            const entries = [
                { label: 'Bezeichnung', value: asset.name },
                asset.type === 'meter' ? { label: 'Zählerfunktion', value: asset.meterRole } : null,
                asset.type === 'meter' ? { label: 'Messbereich', value: asset.meterScope === 'base' ? 'Hinter Basiszähler' : asset.meterScope === 'asset' ? 'Vor einzelner Anlage' : 'Vor Anlagengruppe' } : null,
                asset.type === 'meter' ? { label: 'Zähler vor', value: asset.meterScope === 'base' ? 'Basiszähler der Messstufe' : asset.meterScope === 'asset' ? (currentState.assets.find(item => item.id === asset.targetAssetId)?.name || 'Einzelanlage') : 'Anlagengruppe' } : null,
                asset.type === 'generation' ? { label: 'Anlagenart', value: call('getAssetTypeLabel', asset.energyCarrier, asset) } : null,
                asset.type === 'generation' ? { label: 'Leistung', value: asset.power } : null,
                asset.type === 'generation' ? { label: 'Inbetriebnahme', value: asset.commissioningDate } : null,
                asset.type === 'generation' ? { label: 'Erzeugungszähler', value: asset.generationMeter ? `Ja · Z${getGenerationMeterNumber(asset)}` : (includeEmpty ? 'Nein' : '') } : null,
                ['generation', 'consumer', 'steuve', 'storage', 'nsh'].includes(asset.type) ? { label: 'Zähler davor', value: getAssetMeterNumber(asset) ? `Ja · Z${getAssetMeterNumber(asset)}` : (includeEmpty ? 'Nein' : '') } : null,
                asset.type === 'steuve' ? { label: 'Anlage', value: asset.steuveType || 'Steuerbare Anlage' } : null,
                asset.type === 'steuve' ? { label: 'Leistung', value: asset.power } : null,
                asset.type === 'steuve' ? { label: 'Einordnung', value: call('getSteuveRegime', '', asset) } : null,
                asset.type === 'steuve' ? { label: '§14a-Modul', value: asset.steuveModule } : null,
                asset.type === 'nsh' ? { label: 'Bestand / Inbetriebnahme', value: asset.commissioningDate } : null,
                asset.type === 'nsh' ? { label: 'Einordnung', value: call('getNshRegime', '', asset) } : null,
                asset.type === 'storage' ? { label: 'Betriebsweise', value: call('getStorageOperation', { label: 'Betriebsweise noch offen' }, asset)?.label } : null,
                asset.type === 'storage' ? { label: 'Netzeinspeisung', value: asset.storageGridFeedIn === 'yes' ? 'Ja' : asset.storageGridFeedIn === 'no' ? 'Nein' : 'Noch offen' } : null,
                asset.type === 'storage' ? { label: 'Netzbezug zum Laden', value: asset.storageGridImport === 'yes' ? 'Ja' : asset.storageGridImport === 'no' ? 'Nein' : 'Noch offen' } : null
            ].filter(Boolean).filter(entry => includeEmpty || String(entry.value || '').trim());
            return entries.map(entry => `<div class="mk-meter-detail-value"><span>${escapeHtml(entry.label)}</span><b>${escapeHtml(String(entry.value || '—'))}</b></div>`).join('');
        }

        function renderMeterEditorFields(index) {
            const details = call('getMeterDetails', {}, index) || {};
            const fields = meterDetailFields.map(field => `
        <label>${escapeHtml(field.label)}<input type="${field.type}"${field.maxLength ? ` maxlength="${field.maxLength}"` : ''} data-mk-meter-field="${escapeHtml(field.key)}" data-mk-meter-index="${index}" value="${escapeHtml(details[field.key])}"></label>
    `).join('');
            return `
        <div class="mk-object-editor-head">
            <span class="mk-asset-icon meter">Z${index + 1}</span>
        </div>
        <div class="mk-object-editor-form"><div class="mk-meter-form">${fields}</div></div>
    `;
        }

        function renderObjectEditor(selection) {
            const currentState = getState();
            if (selection?.kind === 'meter') return renderMeterEditorFields(selection.index);
            const asset = currentState.assets.find(item => item.id === selection?.id);
            if (!asset) return '<p class="mk-empty-editor">Objekt nicht mehr vorhanden.</p>';
            const meta = assetMeta[asset.type] || { className: '', label: 'Baustein' };
            return `
        <div class="mk-object-editor-head">
            <span class="mk-asset-icon ${meta.className} ${call('getSteuveIconClass', '', asset)}" aria-label="${asset.type === 'storage' ? 'Batteriespeicher' : escapeHtml(call('getAssetTypeLabel', meta.label, asset) || meta.label)}">${call('renderAssetIcon', '', asset)}</span>
            <span><b>${escapeHtml(asset.name)}</b><small>${escapeHtml(meta.label)}</small></span>
        </div>
        ${renderAssetEditorFields(asset)}
    `;
        }

        function openObjectModal(selection) {
            const currentState = getState();
            const elements = getElements();
            currentState.selectedObject = selection;
            const modal = elements.objectModal;
            const content = elements.objectModalContent;
            if (!modal || !content) return;
            if (elements.objectModalTitle) {
                const label = selection?.kind === 'meter'
                    ? `Z${selection.index + 1} · Zähler`
                    : currentState.assets.find(item => item.id === selection?.id)?.name || 'Objekt';
                elements.objectModalTitle.textContent = `${label} · Angaben`;
            }
            content.innerHTML = renderObjectEditor(selection);
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            elements.body?.classList.add('mk-modal-open');
            (global.requestAnimationFrame || (callback => callback(() => {})))(() => content.querySelector('input, select')?.focus());
        }

        function closeObjectModal() {
            const elements = getElements();
            const modal = elements.objectModal;
            if (!modal) return;
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            elements.body?.classList.remove('mk-modal-open');
            getState().selectedObject = null;
            options.render?.();
        }

        function renderHakNode() {
            return '<div class="mk-hak-node" title="Hausanschlusskasten" data-tooltip="HAK = Hausanschlusskasten" role="img" tabindex="0" aria-label="HAK = Hausanschlusskasten"><b>HAK</b></div>';
        }

        function renderOwnershipConnector() {
            return `
        <div class="mk-supply-connector" aria-label="Eigentumsgrenze">
            <span class="mk-ownership-marker" title="Eigentumsgrenze"></span>
            <span class="mk-ownership-label">Eigentumsgrenze</span>
            <i class="mk-supply-line"></i>
        </div>
    `;
        }

        function renderHakMeterRow() {
            const currentState = getState();
            return `
        <div class="mk-supply-column ${currentState.viewMode === 'detail' ? 'has-details' : ''}" aria-label="Hausanschlusskasten mit erstem Zähler">
            ${renderHakNode()}
            ${renderOwnershipConnector()}
            ${renderMeterLayout(0)}
        </div>
    `;
        }

        function renderParallelCanvas() {
            const currentState = getState();
            const layoutMetrics = call('getParallelLayoutMetrics', { branchWidths: [], minimumBranchWidth: 0, minimumCanvasWidth: 0, branchCount: currentState.cascadeLevels, gridTemplateColumns: '1fr' }, currentState.cascadeLevels);
            const branches = [];
            for (let index = 0; index < currentState.cascadeLevels; index += 1) {
                const branchWidth = layoutMetrics.branchWidths[index] || layoutMetrics.minimumBranchWidth;
                branches.push(`
            <div class="mk-parallel-branch" style="--mk-parallel-branch-width: ${branchWidth}px;">
                <span class="mk-parallel-branch-connector" aria-hidden="true"></span>
                ${renderMeterLayout(index)}
                ${call('renderDropZone', '', `parallel-${index}`, index)}
            </div>
        `);
            }
            return `
        <div class="mk-parallel-stack" style="--mk-parallel-min-width: ${layoutMetrics.minimumCanvasWidth}px; --mk-parallel-count: ${layoutMetrics.branchCount}; --mk-parallel-branch-width: ${layoutMetrics.minimumBranchWidth}px; --mk-parallel-grid-template-columns: ${layoutMetrics.gridTemplateColumns};">
            <div class="mk-parallel-hak-head" aria-label="Hausanschlusskasten mit Eigentumsgrenze">
                ${renderHakNode()}
                ${renderOwnershipConnector()}
            </div>
            <div class="mk-parallel-feed" aria-hidden="true"></div>
            <div class="mk-parallel-branches">
                ${branches.join('')}
            </div>
        </div>
    `;
        }

        function renderCanvasStage(topologyMarkup) {
            const currentState = getState();
            return `
        <div class="mk-canvas-stage ${currentState.viewMode === 'detail' ? 'detail-mode' : 'simple-mode'}" style="--mk-canvas-zoom: ${currentState.canvasZoom};">
            <svg class="mk-connector-layer" aria-hidden="true" focusable="false" preserveAspectRatio="none"></svg>
            <div class="mk-topology-content">${topologyMarkup}</div>
        </div>
    `;
        }

        function renderCanvas() {
            const currentState = getState();
            const elements = getElements();
            if (!elements.canvas) return;
            if (currentState.mode === 'parallel') {
                elements.canvas.innerHTML = renderCanvasStage(renderParallelCanvas());
                return;
            }
            if (currentState.mode === 'single') {
                const minimumCanvasWidth = call('getSimpleCanvasMinimumWidth', 0, call('getZoneAssets', [], 'single-main').length);
                elements.canvas.innerHTML = renderCanvasStage(`
            <div class="mk-single-stack" style="--mk-single-min-width: ${minimumCanvasWidth}px;">
                ${renderHakMeterRow()}
                ${call('renderDropZone', '', 'single-main', 0)}
            </div>
        `);
            }
        }

        return Object.freeze({
            renderMeterDetailsSummary,
            renderMeterNode,
            renderMeterLayout,
            renderAssetEditorFields,
            renderAssetSummary,
            renderMeterEditorFields,
            renderObjectEditor,
            openObjectModal,
            closeObjectModal,
            renderHakMeterRow,
            renderHakNode,
            renderOwnershipConnector,
            renderParallelCanvas,
            renderCanvasStage,
            renderCanvas
        });
    }

    global.WattspurMesskonzeptCanvasRenderer = Object.freeze({ createCanvasRenderer });
}(window));
