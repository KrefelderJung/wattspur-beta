/*
 * Wattspur Messkonzept-Konfigurator
 *
 * Eigenständiger MVP ohne Backend: Die Oberfläche bildet eigene, schematische
 * Bausteine ab. Sie ist bewusst kein Nachbau lizenzierter VBEW-Auswahlblätter.
 */

const MK_ASSET_META = Object.freeze({
    meter: { label: 'Zähler', short: 'Z', className: 'meter', detail: 'Zusätzlicher Messpunkt' },
    generation: { label: 'Erzeugungsanlage', short: 'EA', className: 'generation', detail: 'PV, KWK, Wind ...' },
    consumer: { label: 'Verbraucher', short: 'V', className: 'consumer', detail: 'Allgemeine Last' },
    steuve: { label: 'SteuVE', short: 'S', className: 'steuve', detail: 'Steuerbare Verbrauchseinrichtung' },
    storage: { label: 'Speicher', short: '↕', className: 'storage', detail: 'Speicheranlage' }
});

const MK_METER_DETAIL_FIELDS = Object.freeze([
    { key: 'maloBezug', label: 'MaLo Bezug', type: 'text' },
    { key: 'maloLieferung', label: 'MaLo Lieferung', type: 'text' },
    { key: 'melo', label: 'MeLo', type: 'text' },
    { key: 'meterNumber', label: 'Zählernummer', type: 'text' },
    { key: 'installationDate', label: 'Einbaudatum', type: 'date' }
]);

const mkConfiguratorState = {
    mode: 'single',
    viewMode: 'simple',
    cascadeLevels: 2,
    nextId: 1,
    assets: [],
    meterDetails: {},
    selectedObject: null
};

let mkElements = {};

function mkEscapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function mkCreateMeterDetails() {
    return MK_METER_DETAIL_FIELDS.reduce((details, field) => {
        details[field.key] = '';
        return details;
    }, {});
}

function mkGetMeterDetails(index) {
    const key = String(index + 1);
    if (!mkConfiguratorState.meterDetails[key]) mkConfiguratorState.meterDetails[key] = mkCreateMeterDetails();
    return mkConfiguratorState.meterDetails[key];
}

function mkNotify(message, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    if (mkElements.canvasStatus) mkElements.canvasStatus.textContent = message;
}

function mkCreateAsset(type, zone) {
    const meta = MK_ASSET_META[type] || MK_ASSET_META.consumer;
    const sameType = mkConfiguratorState.assets.filter(asset => asset.type === type).length + 1;
    const defaultNames = {
        meter: `Zusatzzaehler ${sameType}`,
        generation: `EA ${sameType}`,
        consumer: `Verbraucher ${sameType}`,
        steuve: `SteuVE ${sameType}`,
        storage: `Speicher ${sameType}`
    };

    return {
        id: `mk-${mkConfiguratorState.nextId++}`,
        type,
        zone,
        name: defaultNames[type] || meta.label,
        energyCarrier: type === 'generation' ? 'PV' : '',
        power: '',
        commissioningDate: '',
        meterRole: type === 'meter' ? 'Bezug / Lieferung' : '',
        generationMeter: false
    };
}

function mkDefaultZone() {
    return mkConfiguratorState.mode === 'cascade'
        ? `cascade-${Math.max(0, mkConfiguratorState.cascadeLevels - 1)}`
        : 'single-main';
}

function mkAddAsset(type, zone = mkDefaultZone()) {
    if (!MK_ASSET_META[type]) return;
    const asset = mkCreateAsset(type, zone);
    mkConfiguratorState.assets.push(asset);
    mkConfiguratorState.selectedObject = { kind: 'asset', id: asset.id };
    mkRender();
}

function mkReset() {
    mkConfiguratorState.mode = 'single';
    mkConfiguratorState.viewMode = 'simple';
    mkConfiguratorState.cascadeLevels = 2;
    mkConfiguratorState.nextId = 1;
    mkConfiguratorState.assets = [];
    mkConfiguratorState.meterDetails = {};
    mkConfiguratorState.selectedObject = null;
    mkRender();
}

function mkChangeViewMode(viewMode) {
    if (!['simple', 'detail'].includes(viewMode) || viewMode === mkConfiguratorState.viewMode) return;
    mkConfiguratorState.viewMode = viewMode;
    mkRender();
}

function mkChangeMode(mode) {
    if (!['single', 'cascade'].includes(mode) || mode === mkConfiguratorState.mode) return;

    if (mode === 'cascade') {
        mkConfiguratorState.assets.forEach(asset => {
            asset.zone = `cascade-${Math.max(0, mkConfiguratorState.cascadeLevels - 1)}`;
        });
    } else {
        mkConfiguratorState.assets.forEach(asset => {
            asset.zone = 'single-main';
        });
    }
    mkConfiguratorState.mode = mode;
    mkRender();
}

function mkChangeCascadeLevels(levels) {
    const parsed = Math.min(4, Math.max(2, Number(levels) || 2));
    mkConfiguratorState.cascadeLevels = parsed;
    mkConfiguratorState.assets.forEach(asset => {
        const match = String(asset.zone).match(/^cascade-(\d+)$/);
        if (!match) {
            asset.zone = `cascade-${parsed - 1}`;
            return;
        }
        asset.zone = `cascade-${Math.min(parsed - 1, Number(match[1]))}`;
    });
    mkRender();
}

function mkGetZoneAssets(zone) {
    return mkConfiguratorState.assets.filter(asset => asset.zone === zone);
}

function mkGetZoneLabel(index) {
    if (mkConfiguratorState.mode !== 'cascade') return 'Hinter Z1 · Verbraucher- und Anlagenbereich';
    if (index === 0) return 'Zwischen Z1 und Z2 · eingeschränkter Kaskadenbereich';
    if (index === mkConfiguratorState.cascadeLevels - 1) return `Hinter Z${index + 1} · Verbraucher- und Anlagenbereich`;
    return `Zwischen Z${index + 1} und Z${index + 2} · Kaskadenstufe`;
}

function mkRenderAsset(asset) {
    const meta = MK_ASSET_META[asset.type];
    const isSelected = mkConfiguratorState.selectedObject?.kind === 'asset' && mkConfiguratorState.selectedObject.id === asset.id;
    const detailMarkup = mkConfiguratorState.viewMode === 'detail'
        ? `<div class="mk-asset-detail-slide" aria-label="Details zu ${mkEscapeHtml(asset.name)}">${mkRenderAssetSummary(asset, true)}</div>`
        : '';

    return `
        <article class="mk-asset-card ${isSelected ? 'selected' : ''} ${mkConfiguratorState.viewMode === 'detail' ? 'detail-mode' : ''}" draggable="true" data-mk-asset-id="${mkEscapeHtml(asset.id)}" data-mk-drag-asset="${mkEscapeHtml(asset.id)}" data-mk-select-asset="${mkEscapeHtml(asset.id)}" role="button" tabindex="0" aria-label="${mkEscapeHtml(asset.name)} auswählen und verschieben">
            <div class="mk-asset-head">
                <span class="mk-asset-icon ${meta.className}">${meta.short}</span>
                <span class="mk-asset-title"><b>${mkEscapeHtml(asset.name)}</b></span>
                <button type="button" class="mk-remove-asset" data-mk-remove-asset="${mkEscapeHtml(asset.id)}" title="Baustein entfernen" aria-label="${mkEscapeHtml(asset.name)} entfernen">×</button>
            </div>
            ${detailMarkup}
        </article>
    `;
}

function mkRenderDropZone(zone, index) {
    const assets = mkGetZoneAssets(zone);
    const isRestricted = mkConfiguratorState.mode === 'cascade' && index === 0;
    return `
        <div class="mk-drop-zone ${isRestricted ? 'restricted' : ''}" data-mk-zone="${mkEscapeHtml(zone)}" aria-label="${mkEscapeHtml(mkGetZoneLabel(index))}">
            <div class="mk-zone-assets">${assets.length ? assets.map(mkRenderAsset).join('') : '<div class="mk-empty-zone">Noch leer</div>'}</div>
        </div>
    `;
}

function mkRenderMeterDetailsSummary(index, includeEmpty = false) {
    const details = mkGetMeterDetails(index);
    return MK_METER_DETAIL_FIELDS
        .filter(field => includeEmpty || String(details[field.key] || '').trim())
        .map(field => `<div class="mk-meter-detail-value"><span>${mkEscapeHtml(field.label)}</span><b>${mkEscapeHtml(String(details[field.key] || '—'))}</b></div>`)
        .join('');
}

function mkRenderMeterNode(index) {
    const isSelected = mkConfiguratorState.selectedObject?.kind === 'meter' && mkConfiguratorState.selectedObject.index === index;
    return `
        <div class="mk-meter-node ${isSelected ? 'selected' : ''}" data-mk-select-meter="${index}" role="button" tabindex="0" aria-label="Z${index + 1} auswählen">
            <span class="mk-meter-symbol">Z${index + 1}</span>
        </div>
    `;
}

function mkRenderMeterLayout(index) {
    const detailMarkup = mkConfiguratorState.viewMode === 'detail'
        ? `<div class="mk-meter-detail-slide" aria-label="Details zu Z${index + 1}">${mkRenderMeterDetailsSummary(index, true)}</div>`
        : '';
    return `
        <div class="mk-meter-layout ${mkConfiguratorState.viewMode === 'detail' ? 'detail-mode' : ''}">
            ${mkRenderMeterNode(index)}
            <div class="mk-connection-line" aria-hidden="true"></div>
            ${detailMarkup}
        </div>
    `;
}

function mkRenderAssetEditorFields(asset) {
    const meterFields = asset.type === 'meter' ? `
        <label>Zählerfunktion<select data-mk-field="meterRole">
            <option value="Bezug / Lieferung" ${asset.meterRole === 'Bezug / Lieferung' ? 'selected' : ''}>Bezug / Lieferung</option>
            <option value="Bezug" ${asset.meterRole === 'Bezug' ? 'selected' : ''}>Bezug</option>
            <option value="Lieferung" ${asset.meterRole === 'Lieferung' ? 'selected' : ''}>Lieferung</option>
        </select></label>
    ` : '';
    const generationFields = asset.type === 'generation' ? `
        <div class="mk-asset-form-grid">
            <label>Energieträger<input type="text" data-mk-field="energyCarrier" value="${mkEscapeHtml(asset.energyCarrier)}" placeholder="z. B. PV"></label>
            <label>Leistung<input type="text" data-mk-field="power" value="${mkEscapeHtml(asset.power)}" placeholder="kW / kWp"></label>
            <label>Inbetriebnahme<input type="date" data-mk-field="commissioningDate" value="${mkEscapeHtml(asset.commissioningDate)}"></label>
        </div>
        <label class="mk-check-row"><input type="checkbox" data-mk-field="generationMeter" ${asset.generationMeter ? 'checked' : ''}> Eigener Erzeugungszähler für diese EA</label>
    ` : '';
    return `
        <div class="mk-object-editor-form" data-mk-asset-id="${mkEscapeHtml(asset.id)}">
            <div class="mk-asset-form">
                <label>Bezeichnung<input type="text" data-mk-field="name" value="${mkEscapeHtml(asset.name)}"></label>
                ${meterFields}
                ${generationFields}
            </div>
        </div>
    `;
}

function mkRenderAssetSummary(asset, includeEmpty = false) {
    const entries = [
        { label: 'Bezeichnung', value: asset.name },
        asset.type === 'meter' ? { label: 'Zählerfunktion', value: asset.meterRole } : null,
        asset.type === 'generation' ? { label: 'Energieträger', value: asset.energyCarrier } : null,
        asset.type === 'generation' ? { label: 'Leistung', value: asset.power } : null,
        asset.type === 'generation' ? { label: 'Inbetriebnahme', value: asset.commissioningDate } : null,
        asset.type === 'generation' ? { label: 'Erzeugungszähler', value: asset.generationMeter ? 'Ja' : (includeEmpty ? 'Nein' : '') } : null
    ].filter(Boolean).filter(entry => includeEmpty || String(entry.value || '').trim());
    return entries.map(entry => `<div class="mk-meter-detail-value"><span>${mkEscapeHtml(entry.label)}</span><b>${mkEscapeHtml(String(entry.value || '—'))}</b></div>`).join('');
}

function mkRenderMeterEditorFields(index) {
    const details = mkGetMeterDetails(index);
    const fields = MK_METER_DETAIL_FIELDS.map(field => `
        <label>${mkEscapeHtml(field.label)}<input type="${field.type}" data-mk-meter-field="${mkEscapeHtml(field.key)}" data-mk-meter-index="${index}" value="${mkEscapeHtml(details[field.key])}"></label>
    `).join('');
    return `
        <div class="mk-object-editor-head">
            <span class="mk-asset-icon meter">Z${index + 1}</span>
            <span><b>Z${index + 1}</b><small>Zählerobjekt</small></span>
        </div>
        <div class="mk-object-editor-form"><div class="mk-meter-form">${fields}</div></div>
    `;
}

function mkRenderObjectEditor(selection) {
    if (selection?.kind === 'meter') {
        return `
        ${mkRenderMeterEditorFields(selection.index)}`;
    }

    const asset = mkConfiguratorState.assets.find(item => item.id === selection?.id);
    if (!asset) return '<p class="mk-empty-editor">Objekt nicht mehr vorhanden.</p>';
    return `
        <div class="mk-object-editor-head">
            <span class="mk-asset-icon ${MK_ASSET_META[asset.type].className}">${MK_ASSET_META[asset.type].short}</span>
            <span><b>${mkEscapeHtml(asset.name)}</b><small>${mkEscapeHtml(MK_ASSET_META[asset.type].label)}</small></span>
        </div>
        ${mkRenderAssetEditorFields(asset)}
    `;
}

function mkOpenObjectModal(selection) {
    mkConfiguratorState.selectedObject = selection;
    const modal = mkElements.objectModal;
    const content = mkElements.objectModalContent;
    if (!modal || !content) return;
    if (mkElements.objectModalTitle) {
        const label = selection?.kind === 'meter'
            ? `Z${selection.index + 1} · Zähler`
            : mkConfiguratorState.assets.find(item => item.id === selection?.id)?.name || 'Objekt';
        mkElements.objectModalTitle.textContent = `${label} · Angaben`;
    }
    content.innerHTML = mkRenderObjectEditor(selection);
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mk-modal-open');
    window.requestAnimationFrame(() => content.querySelector('input, select')?.focus());
}

function mkCloseObjectModal() {
    const modal = mkElements.objectModal;
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mk-modal-open');
    mkConfiguratorState.selectedObject = null;
    mkRender();
}

function mkRenderHakMeterRow() {
    return `
        <div class="mk-supply-column ${mkConfiguratorState.viewMode === 'detail' ? 'has-details' : ''}" aria-label="Hausanschlusskasten mit erstem Zähler">
            <div class="mk-hak-node" title="Hausanschlusskasten" data-tooltip="HAK = Hausanschlusskasten" role="img" tabindex="0" aria-label="HAK = Hausanschlusskasten"><b>HAK</b></div>
            <div class="mk-supply-connector" aria-label="Eigentumsgrenze">
                <span class="mk-ownership-marker" title="Eigentumsgrenze"></span>
                <span class="mk-ownership-label">Eigentumsgrenze</span>
                <i class="mk-supply-line"></i>
            </div>
            ${mkRenderMeterLayout(0)}
        </div>
    `;
}

function mkRenderCanvas() {
    if (!mkElements.canvas) return;
    if (mkConfiguratorState.mode === 'single') {
        mkElements.canvas.innerHTML = `
            ${mkRenderHakMeterRow()}
            ${mkRenderDropZone('single-main', 0)}
        `;
        return;
    }

    const levels = [];
    for (let i = 0; i < mkConfiguratorState.cascadeLevels; i += 1) {
        const meterMarkup = i === 0
            ? mkRenderHakMeterRow()
            : `<div class="mk-cascade-meter-node">${mkRenderMeterLayout(i)}</div>`;
        levels.push(`
            <div class="mk-cascade-level">
                ${meterMarkup}
                ${mkRenderDropZone(`cascade-${i}`, i)}
            </div>
        `);
    }
    mkElements.canvas.innerHTML = `<div class="mk-cascade-stack">${levels.join('<div class="mk-cascade-arrow">↓</div>')}</div>`;
}

function mkValidation() {
    const assets = mkConfiguratorState.assets;
    const generations = assets.filter(asset => asset.type === 'generation');
    const consumers = assets.filter(asset => asset.type === 'consumer');
    const steuves = assets.filter(asset => asset.type === 'steuve');
    const extraMeters = assets.filter(asset => asset.type === 'meter');
    const checks = [];

    if (!assets.length) {
        checks.push({ level: 'neutral', text: 'Noch keine Bausteine angelegt.' });
    } else {
        checks.push({ level: 'ok', text: `${assets.length} Baustein${assets.length === 1 ? '' : 'e'} im Schema.` });
    }

    if (extraMeters.length) {
        checks.push({ level: 'warning', text: 'Zusätzliche Zähler sind angelegt. Prüfe, ob dafür die Kaskaden-Topologie verwendet werden sollte.' });
    }

    if (mkConfiguratorState.mode === 'single') {
        if (steuves.length && consumers.length) {
            checks.push({ level: 'warning', text: 'SteuVE und weitere Verbraucher liegen im selben Messbereich. Tarif- und Messabgrenzung fachlich prüfen.' });
        }
        if (generations.some(asset => asset.generationMeter)) {
            checks.push({ level: 'ok', text: 'Mindestens eine EA ist mit eigener Erzeugungsmessung markiert.' });
        }
        if (generations.length > 1 && generations.every(asset => !asset.generationMeter)) {
            checks.push({ level: 'warning', text: 'Mehrere EA teilen sich Z1 ohne Erzeugungszähler. Energieträger, Vergütung und Zusammenfassung prüfen.' });
        }
    }

    if (mkConfiguratorState.mode === 'cascade') {
        const upper = mkGetZoneAssets('cascade-0');
        if (upper.some(asset => ['consumer', 'storage'].includes(asset.type))) {
            checks.push({ level: 'error', text: 'Im oberen Kaskadenbereich liegt ein Verbraucher oder Speicher. Dieser Bereich ist in vielen Konzepten eingeschränkt.' });
        }
        if (upper.some(asset => asset.type === 'generation')) {
            checks.push({ level: 'warning', text: 'Eine EA liegt zwischen den ersten Zählern. Erzeugungsmessung und Differenzbildung müssen konkret abgestimmt werden.' });
        }
        if (mkConfiguratorState.cascadeLevels > 2) {
            checks.push({ level: 'warning', text: 'Mehrstufige Kaskade: Zählerreihenfolge, Abrechnung und Messstellenbetrieb separat prüfen.' });
        }
        checks.push({ level: 'ok', text: `Differenzlogik für ${mkConfiguratorState.cascadeLevels} Zähler vorbereitet.` });
    }

    return checks;
}

function mkRenderValidation() {
    if (!mkElements.validation || !mkElements.statusBadge) return;
    const checks = mkValidation();
    mkElements.validation.innerHTML = checks.map(check => `<div class="mk-validation-item ${check.level}"><span>${check.level === 'ok' ? '✓' : check.level === 'error' ? '!' : check.level === 'warning' ? '△' : '·'}</span><p>${mkEscapeHtml(check.text)}</p></div>`).join('');
    const hasError = checks.some(check => check.level === 'error');
    const hasWarning = checks.some(check => check.level === 'warning');
    const state = hasError ? 'error' : hasWarning ? 'warning' : checks.some(check => check.level === 'ok') ? 'ok' : 'neutral';
    const labels = { error: 'Prüfen', warning: 'Hinweis', ok: 'Plausibel', neutral: 'Start' };
    mkElements.statusBadge.className = `mk-status-badge ${state}`;
    mkElements.statusBadge.textContent = labels[state];
}

function mkRenderMeasurementSummary() {
    if (!mkElements.measurementSummary) return;
    const generationMeters = mkConfiguratorState.assets.filter(asset => asset.type === 'generation' && asset.generationMeter);
    const lines = [];

    if (mkConfiguratorState.mode === 'single') {
        lines.push('<b>Z1</b> misst Bezug und Lieferung der Gesamtanlage.');
        if (generationMeters.length) lines.push(`<b>Erzeugungsmessung</b> für ${generationMeters.map(asset => mkEscapeHtml(asset.name)).join(', ')} markiert.`);
        if (!generationMeters.length) lines.push('EA werden zunächst gemeinsam hinter Z1 erfasst.');
    } else {
        for (let index = 0; index < mkConfiguratorState.cascadeLevels; index += 1) {
            const zoneAssets = mkGetZoneAssets(`cascade-${index}`);
            const names = zoneAssets.filter(asset => asset.type !== 'meter').map(asset => mkEscapeHtml(asset.name));
            const formula = index === 0 ? 'Z1 - Z2' : `Z${index + 1} - Z${Math.min(index + 2, mkConfiguratorState.cascadeLevels)}`;
            lines.push(`<b>Z${index + 1}</b> ${index === 0 ? 'Netzbezug / Lieferung' : `Differenz ${formula}`}${names.length ? ` · ${names.join(', ')}` : ''}.`);
        }
        if (generationMeters.length) lines.push(`<b>Eigene Erzeugungszähler:</b> ${generationMeters.map(asset => mkEscapeHtml(asset.name)).join(', ')}.`);
    }

    mkElements.measurementSummary.innerHTML = lines.map(line => `<p>${line}</p>`).join('');
}

function mkRefreshInlineStatus() {
    mkRenderValidation();
    mkRenderMeasurementSummary();
    if (mkElements.canvasStatus) {
        mkElements.canvasStatus.textContent = mkConfiguratorState.assets.length
            ? `${mkConfiguratorState.assets.length} Baustein${mkConfiguratorState.assets.length === 1 ? '' : 'e'} · Änderungen werden lokal gehalten.`
            : 'Bereit für Bausteine.';
    }
}

function mkRender() {
    if (!mkElements.canvas) return;
    document.querySelectorAll('[data-mk-mode]').forEach(button => button.classList.toggle('active', button.dataset.mkMode === mkConfiguratorState.mode));
    document.querySelectorAll('[data-mk-view]').forEach(button => {
        const active = button.dataset.mkView === mkConfiguratorState.viewMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    if (mkElements.cascadeControls) mkElements.cascadeControls.classList.toggle('hidden', mkConfiguratorState.mode !== 'cascade');
    if (mkElements.cascadeLevels) mkElements.cascadeLevels.value = String(mkConfiguratorState.cascadeLevels);
    mkRenderCanvas();
    mkRefreshInlineStatus();
}

function mkParseTransfer(event) {
    try {
        return JSON.parse(event.dataTransfer.getData('application/json'));
    } catch (error) {
        return null;
    }
}

function mkHandleDrop(event, zone) {
    event.preventDefault();
    const transfer = mkParseTransfer(event);
    if (!transfer) return;

    if (transfer.source === 'palette' && MK_ASSET_META[transfer.type]) {
        mkAddAsset(transfer.type, zone);
    }
    if (transfer.source === 'asset') {
        const asset = mkConfiguratorState.assets.find(item => item.id === transfer.id);
        if (asset) {
            asset.zone = zone;
            mkRender();
        }
    }
}

function mkUpdateAssetField(event) {
    const card = event.target.closest('[data-mk-asset-id]');
    if (!card || !event.target.dataset.mkField) return;
    const asset = mkConfiguratorState.assets.find(item => item.id === card.dataset.mkAssetId);
    if (!asset) return;
    const field = event.target.dataset.mkField;
    asset[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    mkRefreshInlineStatus();
}

function mkUpdateMeterDetailField(event) {
    const field = event.target.dataset.mkMeterField;
    if (!field) return;
    const index = Number(event.target.dataset.mkMeterIndex) || 0;
    const details = mkGetMeterDetails(index);
    details[field] = event.target.value;
}

function mkGetExportStand() {
    const date = new Date();
    return {
        iso: date.toISOString(),
        label: new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    };
}

function mkRenderExportDetails() {
    const meterBlocks = [];
    const meterCount = mkConfiguratorState.mode === 'cascade' ? mkConfiguratorState.cascadeLevels : 1;
    for (let index = 0; index < meterCount; index += 1) {
        meterBlocks.push(`<article class="mk-print-detail-block"><h4>Z${index + 1} · Zähler</h4>${mkRenderMeterDetailsSummary(index, true)}</article>`);
    }
    const assets = mkConfiguratorState.assets.length
        ? mkConfiguratorState.assets.map(asset => `<article class="mk-print-detail-block"><h4>${mkEscapeHtml(asset.name)} · ${mkEscapeHtml(MK_ASSET_META[asset.type].label)}</h4>${mkRenderAssetSummary(asset, true)}</article>`).join('')
        : '<p class="mk-print-muted">Keine zusätzlichen Bausteine angelegt.</p>';
    return `<section class="mk-print-details"><h3>Objektdetails</h3><div class="mk-print-detail-grid">${meterBlocks.join('')}${assets}</div></section>`;
}

function mkRenderPrintSheet(stand) {
    const topology = mkElements.canvas?.innerHTML || '<p class="mk-print-muted">Keine Skizze vorhanden.</p>';
    const checks = mkValidation().map(check => `<li class="${check.level}">${mkEscapeHtml(check.text)}</li>`).join('');
    const logic = mkElements.measurementSummary?.innerHTML || '';
    return `
        <section class="mk-print-sheet" aria-label="Messkonzept-Export">
            <header class="mk-print-header">
                <div><span class="mk-print-kicker">Wattspur · Messkonzept-Konfigurator</span><h1>Messkonzept</h1></div>
                <div class="mk-print-meta"><b>Exportstand</b><span>${mkEscapeHtml(stand.label)}</span><span>${mkConfiguratorState.mode === 'cascade' ? `Kaskade · ${mkConfiguratorState.cascadeLevels} Zähler` : '1 Zähler'}</span></div>
            </header>
            <p class="mk-print-notice">Dieser Export dokumentiert den zum Ausgabezeitpunkt erfassten Stand. Spätere Änderungen am Konzept sind in dieser Datei nicht enthalten. Die Skizze ist eine unverbindliche Orientierung und ersetzt keine fachliche Prüfung.</p>
            <section class="mk-print-topology"><h2>Messskizze</h2>${topology}</section>
            <section class="mk-print-status"><div><h3>Prüfstatus</h3><ul>${checks}</ul></div><div><h3>Messlogik</h3>${logic}</div></section>
            ${mkRenderExportDetails()}
            <footer class="mk-print-footer">Wattspur Beta · lokal im Browser erstellt · Stand ${mkEscapeHtml(stand.label)}</footer>
        </section>
    `;
}

function mkDownloadPdf() {
    const stand = mkGetExportStand();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = mkRenderPrintSheet(stand);
    const printSheet = wrapper.firstElementChild;
    document.body.appendChild(printSheet);
    const previousTitle = document.title;
    document.title = `Wattspur-Messkonzept-${stand.iso.slice(0, 10)}`;
    const cleanup = () => {
        printSheet.remove();
        document.title = previousTitle;
        document.body.classList.remove('mk-printing');
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    document.body.classList.add('mk-printing');
    window.setTimeout(() => {
        window.print();
        window.setTimeout(() => {
            if (document.body.contains(printSheet)) cleanup();
        }, 250);
    }, 40);
    mkNotify('Druckdialog geöffnet. Wähle dort „Als PDF speichern“.', 'info');
}

function mkDownloadJson() {
    const exportPayload = {
        tool: 'Wattspur Messkonzept-Konfigurator',
        version: 1,
        generatedAt: new Date().toISOString(),
        exportType: 'technical-backup',
        mode: mkConfiguratorState.mode,
        viewMode: mkConfiguratorState.viewMode,
        cascadeLevels: mkConfiguratorState.cascadeLevels,
        meterDetails: mkConfiguratorState.meterDetails,
        assets: mkConfiguratorState.assets
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wattspur-messkonzept-technisch-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function mkShowScreen() {
    const upload = document.getElementById('upload-screen');
    const dashboard = document.getElementById('dashboard-screen');
    const screen = document.getElementById('messkonzept-screen');
    if (upload) upload.classList.add('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    if (screen) screen.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mkHideScreen() {
    const screen = document.getElementById('messkonzept-screen');
    const upload = document.getElementById('upload-screen');
    if (screen) screen.classList.add('hidden');
    if (upload) upload.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mkInitialize() {
    mkElements = {
        canvas: document.getElementById('mk-canvas'),
        canvasStatus: document.getElementById('mk-canvas-status'),
        validation: document.getElementById('mk-validation-list'),
        statusBadge: document.getElementById('mk-status-badge'),
        measurementSummary: document.getElementById('mk-measurement-summary'),
        cascadeControls: document.getElementById('mk-cascade-controls'),
        cascadeLevels: document.getElementById('mk-cascade-levels'),
        objectModal: document.getElementById('mk-object-modal'),
        objectModalContent: document.getElementById('mk-object-modal-content'),
        objectModalTitle: document.getElementById('mk-object-modal-title')
    };
    if (!mkElements.canvas) return;

    ['btn-open-messkonzept', 'btn-open-messkonzept-card', 'btn-open-messkonzept-teaser'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.addEventListener('click', mkShowScreen);
    });
    document.getElementById('btn-mk-back')?.addEventListener('click', mkHideScreen);
    document.getElementById('btn-mk-reset')?.addEventListener('click', () => {
        mkReset();
        mkNotify('Messkonzept-Skizze zurückgesetzt.', 'info');
    });
    document.getElementById('btn-mk-export-pdf')?.addEventListener('click', mkDownloadPdf);
    document.getElementById('btn-mk-export-json')?.addEventListener('click', mkDownloadJson);
    mkElements.cascadeLevels?.addEventListener('change', event => mkChangeCascadeLevels(event.target.value));
    document.querySelectorAll('[data-mk-mode]').forEach(button => button.addEventListener('click', () => mkChangeMode(button.dataset.mkMode)));
    document.querySelectorAll('[data-mk-view]').forEach(button => button.addEventListener('click', () => mkChangeViewMode(button.dataset.mkView)));
    document.getElementById('btn-mk-modal-close')?.addEventListener('click', mkCloseObjectModal);
    document.getElementById('btn-mk-modal-done')?.addEventListener('click', mkCloseObjectModal);
    mkElements.objectModal?.addEventListener('click', event => {
        if (event.target === mkElements.objectModal) mkCloseObjectModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && mkElements.objectModal && !mkElements.objectModal.classList.contains('hidden')) mkCloseObjectModal();
    });

    document.querySelectorAll('.mk-palette-item').forEach(button => {
        button.addEventListener('click', () => mkAddAsset(button.dataset.mkType));
        button.addEventListener('dragstart', event => {
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('application/json', JSON.stringify({ source: 'palette', type: button.dataset.mkType }));
        });
    });

    mkElements.canvas.addEventListener('dragover', event => {
        const zone = event.target.closest('[data-mk-zone]');
        if (!zone) return;
        event.preventDefault();
        zone.classList.add('dragover');
    });
    mkElements.canvas.addEventListener('dragleave', event => {
        const zone = event.target.closest('[data-mk-zone]');
        if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('dragover');
    });
    mkElements.canvas.addEventListener('drop', event => {
        const zone = event.target.closest('[data-mk-zone]');
        if (!zone) return;
        zone.classList.remove('dragover');
        mkHandleDrop(event, zone.dataset.mkZone);
    });
    mkElements.canvas.addEventListener('dragstart', event => {
        const handle = event.target.closest('[data-mk-drag-asset]');
        if (!handle) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/json', JSON.stringify({ source: 'asset', id: handle.dataset.mkDragAsset }));
    });
    mkElements.canvas.addEventListener('click', event => {
        const removeButton = event.target.closest('[data-mk-remove-asset]');
        if (removeButton) {
            const removedId = removeButton.dataset.mkRemoveAsset;
            mkConfiguratorState.assets = mkConfiguratorState.assets.filter(asset => asset.id !== removedId);
            if (mkConfiguratorState.selectedObject?.kind === 'asset' && mkConfiguratorState.selectedObject.id === removedId) mkConfiguratorState.selectedObject = null;
            mkRender();
            return;
        }
        const meter = event.target.closest('[data-mk-select-meter]');
        if (meter) {
            mkOpenObjectModal({ kind: 'meter', index: Number(meter.dataset.mkSelectMeter) || 0 });
            return;
        }
        const asset = event.target.closest('[data-mk-select-asset]');
        if (asset) mkOpenObjectModal({ kind: 'asset', id: asset.dataset.mkSelectAsset });
    });
    mkElements.objectModal?.addEventListener('input', mkUpdateAssetField);
    mkElements.objectModal?.addEventListener('change', mkUpdateAssetField);
    mkElements.objectModal?.addEventListener('input', mkUpdateMeterDetailField);
    mkElements.objectModal?.addEventListener('change', mkUpdateMeterDetailField);
    mkElements.canvas.addEventListener('keydown', event => {
        if (!['Enter', ' '].includes(event.key)) return;
        const target = event.target.closest('[data-mk-select-meter], [data-mk-select-asset]');
        if (!target) return;
        event.preventDefault();
        if (target.dataset.mkSelectMeter !== undefined) mkOpenObjectModal({ kind: 'meter', index: Number(target.dataset.mkSelectMeter) || 0 });
        if (target.dataset.mkSelectAsset) mkOpenObjectModal({ kind: 'asset', id: target.dataset.mkSelectAsset });
    });
    mkReset();
}

document.addEventListener('DOMContentLoaded', mkInitialize);
