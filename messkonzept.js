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

const mkConfiguratorState = {
    mode: 'single',
    cascadeLevels: 2,
    nextId: 1,
    assets: []
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
    mkConfiguratorState.assets.push(mkCreateAsset(type, zone));
    mkRender();
}

function mkReset() {
    mkConfiguratorState.mode = 'single';
    mkConfiguratorState.cascadeLevels = 2;
    mkConfiguratorState.nextId = 1;
    mkConfiguratorState.assets = [];
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

function mkRenderMeterLabel(index) {
    if (mkConfiguratorState.mode !== 'cascade') return 'Z1 · Bezug und Lieferung';
    return index === 0 ? 'Z1 · Bezug und Lieferung' : `Z${index + 1} · Lieferung / Differenzmessung`;
}

function mkRenderAsset(asset) {
    const meta = MK_ASSET_META[asset.type];
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
        <article class="mk-asset-card" data-mk-asset-id="${mkEscapeHtml(asset.id)}">
            <div class="mk-asset-head">
                <button type="button" class="mk-drag-handle" draggable="true" data-mk-drag-asset="${mkEscapeHtml(asset.id)}" title="Baustein verschieben" aria-label="${mkEscapeHtml(asset.name)} verschieben">↕</button>
                <span class="mk-asset-icon ${meta.className}">${meta.short}</span>
                <span class="mk-asset-title"><b>${mkEscapeHtml(asset.name)}</b><small>${meta.detail}</small></span>
                <button type="button" class="mk-remove-asset" data-mk-remove-asset="${mkEscapeHtml(asset.id)}" title="Baustein entfernen" aria-label="${mkEscapeHtml(asset.name)} entfernen">×</button>
            </div>
            <details class="mk-asset-details" ${asset.type === 'generation' && asset.generationMeter ? 'open' : ''}>
                <summary>Details bearbeiten</summary>
                <div class="mk-asset-form">
                    <label>Bezeichnung<input type="text" data-mk-field="name" value="${mkEscapeHtml(asset.name)}"></label>
                    ${meterFields}
                    ${generationFields}
                </div>
            </details>
        </article>
    `;
}

function mkRenderDropZone(zone, index) {
    const assets = mkGetZoneAssets(zone);
    const isRestricted = mkConfiguratorState.mode === 'cascade' && index === 0;
    return `
        <div class="mk-drop-zone ${isRestricted ? 'restricted' : ''}" data-mk-zone="${mkEscapeHtml(zone)}">
            <div class="mk-drop-zone-label"><span>${mkEscapeHtml(mkGetZoneLabel(index))}</span><small>${isRestricted ? 'SteuVE nur nach fachlicher Prüfung' : 'Baustein hier ablegen'}</small></div>
            <div class="mk-zone-assets">${assets.length ? assets.map(mkRenderAsset).join('') : '<div class="mk-empty-zone">Noch leer</div>'}</div>
        </div>
    `;
}

function mkRenderMeterNode(index) {
    return `
        <div class="mk-meter-node">
            <span class="mk-meter-symbol">Z${index + 1}</span>
            <b>${mkRenderMeterLabel(index)}</b>
        </div>
    `;
}

function mkRenderHakMeterRow() {
    return `
        <div class="mk-supply-column" aria-label="Hausanschlusskasten mit erstem Zähler">
            <div class="mk-hak-node" title="Hausanschlusskasten"><b>HAK</b></div>
            <div class="mk-supply-connector" aria-hidden="true">
                <span class="mk-ownership-marker" title="Eigentumsgrenze"></span>
                <i class="mk-supply-line"></i>
            </div>
            ${mkRenderMeterNode(0)}
        </div>
        <div class="mk-connection-line" aria-hidden="true"></div>
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
            : `<div class="mk-cascade-meter-node">${mkRenderMeterNode(i)}<div class="mk-connection-line" aria-hidden="true"></div></div>`;
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

function mkDownloadJson() {
    const exportPayload = {
        tool: 'Wattspur Messkonzept-Konfigurator',
        version: 1,
        generatedAt: new Date().toISOString(),
        mode: mkConfiguratorState.mode,
        cascadeLevels: mkConfiguratorState.cascadeLevels,
        assets: mkConfiguratorState.assets
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wattspur-messkonzept-${new Date().toISOString().slice(0, 10)}.json`;
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
        cascadeLevels: document.getElementById('mk-cascade-levels')
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
    document.getElementById('btn-mk-export')?.addEventListener('click', mkDownloadJson);
    mkElements.cascadeLevels?.addEventListener('change', event => mkChangeCascadeLevels(event.target.value));
    document.querySelectorAll('[data-mk-mode]').forEach(button => button.addEventListener('click', () => mkChangeMode(button.dataset.mkMode)));

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
        if (!removeButton) return;
        mkConfiguratorState.assets = mkConfiguratorState.assets.filter(asset => asset.id !== removeButton.dataset.mkRemoveAsset);
        mkRender();
    });
    mkElements.canvas.addEventListener('input', mkUpdateAssetField);
    mkElements.canvas.addEventListener('change', mkUpdateAssetField);
    mkReset();
}

document.addEventListener('DOMContentLoaded', mkInitialize);
