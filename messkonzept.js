/*
 * Wattspur Messkonzept-Konfigurator
 *
 * Eigenständiger MVP ohne Backend: Die Oberfläche bildet eigene, schematische
 * Bausteine ab. Sie ist bewusst kein Nachbau lizenzierter VBEW-Auswahlblätter.
 */

const MK_ASSET_META = Object.freeze({
    meter: { label: 'Zähler', short: 'Z', className: 'meter', detail: 'Zusätzlicher Messpunkt' },
    generation: { label: 'Erzeugungsanlage', short: 'EA', className: 'generation', detail: 'PV, KWK, Wind, Balkonkraftwerk' },
    consumer: { label: 'Sonstige Verbraucher', short: 'V', className: 'consumer', detail: 'Allgemeine Last' },
    steuve: { label: 'Steuerbare Anlage', short: '⚡', className: 'steuve', detail: 'Leistungsabhängig nach § 14a EnWG prüfen' },
    storage: { label: 'Batteriespeicher', short: '▤', className: 'storage', detail: 'Speicheranlage' },
    nsh: { label: 'Nachtspeicherheizung', short: 'NSH', className: 'nsh', detail: 'Historische Tarif- und Messbehandlung prüfen' }
});

const MK_ASSET_TYPE_OPTIONS = Object.freeze({
    generation: [
        { value: 'PV', label: 'PV-Anlage' },
        { value: 'KWK', label: 'KWK / BHKW' },
        { value: 'Wind', label: 'Windrad / Windenergieanlage' },
        { value: 'Balkonkraftwerk', label: 'Balkonkraftwerk (Steckersolargerät)' }
    ],
    steuve: [
        { value: 'Wärmepumpe', label: 'Wärmepumpe' },
        { value: 'Wallbox', label: 'Wallbox' },
        { value: 'Klimaanlage', label: 'Klimaanlage' },
        { value: 'Sonstige', label: 'Sonstige steuerbare Anlage' }
    ]
});

const MK_STEUVE_MODULE_OPTIONS = Object.freeze([
    { value: 'Modul 1', label: 'Modul 1' },
    { value: 'Modul 2', label: 'Modul 2' },
    { value: 'Modul 3', label: 'Modul 3' }
]);

const MK_STORAGE_INFO_TEXT = 'Achtung: Die Registrierung des Stromspeichers im Marktstammdatenregister ist zu prüfen. Beim netzbezogenen Laden ist zusätzlich zu prüfen, ob § 14a EnWG greift; Einspeisung und Bezug sind getrennt zu betrachten. Messkonzept mit dem Verteilnetzbetreiber abstimmen.';
const MK_BALCONY_INFO_TEXT = 'Balkonkraftwerk / Steckersolargerät: Registrierung im Marktstammdatenregister prüfen. Die vereinfachte Behandlung hängt unter anderem von Leistungsgrenzen und der gewählten EEG-Veräußerungsform ab.';
const MK_ASSETS_PER_ROW = 3;

const MK_METER_DETAIL_FIELDS = Object.freeze([
    { key: 'maloBezug', label: 'MaLo Bezug', type: 'text' },
    { key: 'maloLieferung', label: 'MaLo Lieferung', type: 'text' },
    { key: 'melo', label: 'MeLo', type: 'text', maxLength: 33 },
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

function mkRenderSelectOptions(options, selectedValue, placeholder = 'Bitte auswählen') {
    const placeholderMarkup = selectedValue ? '' : `<option value="" disabled selected>${mkEscapeHtml(placeholder)}</option>`;
    return `${placeholderMarkup}${options.map(option => `<option value="${mkEscapeHtml(option.value)}" ${option.value === selectedValue ? 'selected' : ''}>${mkEscapeHtml(option.label)}</option>`).join('')}`;
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

function mkCreateAsset(type, zone, steuveType = '', energyCarrier = '') {
    const meta = MK_ASSET_META[type] || MK_ASSET_META.consumer;
    const selectedEnergyCarrier = type === 'generation' ? energyCarrier || 'PV' : '';
    const sameType = mkConfiguratorState.assets.filter(asset => asset.type === type
        && (type !== 'steuve' || asset.steuveType === steuveType)
        && (type !== 'generation' || asset.energyCarrier === selectedEnergyCarrier)).length + 1;
    const defaultNames = {
        meter: `Zusatzzaehler ${sameType}`,
        generation: selectedEnergyCarrier === 'Balkonkraftwerk' ? `Balkonkraftwerk ${sameType}` : `EA ${sameType}`,
        consumer: `Sonstiger Verbraucher ${sameType}`,
        steuve: `${steuveType || 'Steuerbare Anlage'} ${sameType}`,
        storage: `Speicher ${sameType}`,
        nsh: `Nachtspeicherheizung ${sameType}`
    };

    return {
        id: `mk-${mkConfiguratorState.nextId++}`,
        type,
        zone,
        name: defaultNames[type] || meta.label,
        energyCarrier: selectedEnergyCarrier,
        steuveType: type === 'steuve' ? steuveType : '',
        steuveModule: '',
        power: '',
        commissioningDate: '',
        meterRole: type === 'meter' ? 'Bezug / Lieferung' : '',
        generationMeter: false
    };
}

function mkDefaultZone() {
    if (mkConfiguratorState.mode === 'cascade') return `cascade-${Math.max(0, mkConfiguratorState.cascadeLevels - 1)}`;
    if (mkConfiguratorState.mode === 'parallel') return 'parallel-0';
    return 'single-main';
}

function mkAddAsset(type, zone = mkDefaultZone(), steuveType = '', energyCarrier = '') {
    if (!MK_ASSET_META[type]) return;
    const asset = mkCreateAsset(type, zone, steuveType, energyCarrier);
    mkConfiguratorState.assets.push(asset);
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

function mkMapAssetZoneForMode(zone, previousMode, nextMode, levels) {
    if (nextMode === 'single') return 'single-main';

    const maxIndex = Math.max(0, levels - 1);
    const previousZone = String(zone || '');
    if (nextMode === 'parallel') {
        const cascadeMatch = previousMode === 'cascade' ? previousZone.match(/^cascade-(\d+)$/) : null;
        const index = cascadeMatch ? Number(cascadeMatch[1]) : 0;
        return `parallel-${Math.min(maxIndex, Math.max(0, index))}`;
    }

    const parallelMatch = previousMode === 'parallel' ? previousZone.match(/^parallel-(\d+)$/) : null;
    const index = parallelMatch ? Number(parallelMatch[1]) : maxIndex;
    return `cascade-${Math.min(maxIndex, Math.max(0, index))}`;
}

function mkChangeMode(mode) {
    if (!['single', 'cascade', 'parallel'].includes(mode) || mode === mkConfiguratorState.mode) return;

    const previousMode = mkConfiguratorState.mode;
    const previousLevels = mkConfiguratorState.cascadeLevels;
    if (mode === 'cascade' || mode === 'parallel') {
        const keepMeterCount = ['cascade', 'parallel'].includes(previousMode);
        mkConfiguratorState.cascadeLevels = keepMeterCount
            ? Math.min(4, Math.max(2, previousLevels))
            : 2;
    }

    mkConfiguratorState.assets.forEach(asset => {
        asset.zone = mkMapAssetZoneForMode(asset.zone, previousMode, mode, mkConfiguratorState.cascadeLevels);
    });
    mkConfiguratorState.mode = mode;
    mkRender();
}

function mkChangeCascadeLevels(levels) {
    if (!['cascade', 'parallel'].includes(mkConfiguratorState.mode)) return;
    const parsed = Math.min(4, Math.max(2, Number(levels) || 2));
    mkConfiguratorState.cascadeLevels = parsed;
    mkConfiguratorState.assets.forEach(asset => {
        const prefix = mkConfiguratorState.mode === 'parallel' ? 'parallel' : 'cascade';
        const match = String(asset.zone).match(new RegExp(`^${prefix}-(\\d+)$`));
        if (!match) {
            asset.zone = `${prefix}-${parsed - 1}`;
            return;
        }
        asset.zone = `${prefix}-${Math.min(parsed - 1, Number(match[1]))}`;
    });
    mkRender();
}

function mkGetZoneAssets(zone) {
    return mkConfiguratorState.assets.filter(asset => asset.zone === zone);
}

function mkGetZoneLabel(index) {
    if (mkConfiguratorState.mode === 'parallel') return `Hinter Z${index + 1} · eigener Parallel-Messbereich`;
    if (mkConfiguratorState.mode !== 'cascade') return 'Hinter Z1 · Verbraucher- und Anlagenbereich';
    if (index === mkConfiguratorState.cascadeLevels - 1) return `Hinter Z${index + 1} · Verbraucher- und Anlagenbereich`;
    return `Zwischen Z${index + 1} und Z${index + 2} · Kaskadenstufe`;
}

function mkGetAssetTypeLabel(asset) {
    if (asset.type === 'generation') {
        return MK_ASSET_TYPE_OPTIONS.generation.find(option => option.value === asset.energyCarrier)?.label || '';
    }
    if (asset.type === 'steuve') {
        return MK_ASSET_TYPE_OPTIONS.steuve.find(option => option.value === asset.steuveType)?.label || '';
    }
    if (asset.type === 'nsh') return MK_ASSET_META.nsh.label;
    return '';
}

function mkGetSteuveIconClass(asset) {
    if (asset?.type !== 'steuve') return '';
    const classes = {
        Wallbox: 'mk-device-wallbox',
        Wärmepumpe: 'mk-device-heatpump',
        Klimaanlage: 'mk-device-climate'
    };
    return classes[asset.steuveType] || 'mk-device-generic';
}

function mkGetPowerNumber(value) {
    const match = String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
}

function mkGetSteuveRegime(asset) {
    const power = mkGetPowerNumber(asset?.power);
    if (power === null) return 'Leistung noch offen';
    return power > 4.2 ? 'Über 4,2 kW · § 14a EnWG prüfen' : 'Bis 4,2 kW · § 14a-EnWG-Prüfung nicht automatisch';
}

function mkRenderSteuveNotice(asset) {
    const power = mkGetPowerNumber(asset.power);
    if (power === null) {
        return '<p class="mk-steuve-editor-hint" role="note">Leistung eintragen. Ab mehr als 4,2 kW die Einordnung nach § 14a EnWG und die Anmeldung beim Netzbetreiber prüfen.</p>';
    }
    if (power > 4.2) {
        return '<p class="mk-steuve-editor-notice" role="note"><b>Hinweis zu § 14a EnWG:</b> Bei mehr als 4,2 kW ist die Einordnung als steuerbare Verbrauchseinrichtung typischerweise zu prüfen. Bitte beim Netzbetreiber anmelden und das passende Modul für dieses Messkonzept abstimmen.</p>';
    }
    return '<p class="mk-steuve-editor-hint" role="note">Bis 4,2 kW liegt nicht automatisch eine § 14a-relevante Einordnung vor. Die fachliche Prüfung bleibt erforderlich.</p>';
}

function mkRenderSteuveModuleFields(asset) {
    if (mkGetPowerNumber(asset.power) <= 4.2) return '';
    return `
        <label>§14a-Modul<select data-mk-field="steuveModule">${mkRenderSelectOptions(MK_STEUVE_MODULE_OPTIONS, asset.steuveModule, 'Noch offen')}</select></label>
        <p class="mk-steuve-module-hint">Die Auswahl ist eine Vorprüfung und ersetzt keine Abstimmung mit dem Netzbetreiber.</p>
    `;
}

function mkGetNshRegime(asset) {
    const year = Number(String(asset?.commissioningDate || '').slice(0, 4));
    if (!Number.isFinite(year) || year < 1900) return 'Einordnung offen · Abstimmung erforderlich';
    if (year < 2024) return 'Bestand vor 2024 · historische SteuVE-/Tarifbehandlung möglich';
    return 'Ab 2024 · nicht automatisch als SteuVE einordnen';
}

/**
 * Anzahl der bereits vorhandenen Zähler in der aktuellen Topologie.
 * Grundzähler der Topologie und eventuelle zusätzliche Zählerobjekte werden
 * gemeinsam gezählt, damit eigene Erzeugungszähler fortlaufend nummeriert
 * werden können.
 */
function mkGetConfiguredMeterCount() {
    const topologyMeters = ['cascade', 'parallel'].includes(mkConfiguratorState.mode)
        ? mkConfiguratorState.cascadeLevels
        : 1;
    const additionalMeterAssets = mkConfiguratorState.assets.filter(asset => asset.type === 'meter').length;
    return topologyMeters + additionalMeterAssets;
}

/** Liefert die fortlaufende Nummer eines eigenen Erzeugungszählers. */
function mkGetGenerationMeterNumber(asset) {
    if (!asset || asset.type !== 'generation' || !asset.generationMeter) return null;
    const generationMeters = mkConfiguratorState.assets.filter(item => item.type === 'generation' && item.generationMeter);
    const generationIndex = generationMeters.findIndex(item => item.id === asset.id);
    return generationIndex < 0 ? null : mkGetConfiguredMeterCount() + generationIndex + 1;
}

function mkRenderAssetIcon(asset) {
    const meta = MK_ASSET_META[asset.type];
    if (asset.type === 'storage') return '<span class="mk-battery-symbol" aria-hidden="true"><span class="mk-battery-level"></span></span>';
    if (asset.type === 'steuve') {
        if (asset.steuveType === 'Wallbox') return '<span class="mk-charge-symbol" aria-hidden="true"><span class="mk-charge-bolt">⚡</span><span class="mk-charge-cable"></span></span>';
        if (asset.steuveType === 'Wärmepumpe') return '<span class="mk-fan-symbol" aria-hidden="true"><span class="mk-fan-blade mk-fan-blade-1"></span><span class="mk-fan-blade mk-fan-blade-2"></span><span class="mk-fan-blade mk-fan-blade-3"></span><span class="mk-fan-hub"></span></span>';
        const icons = { Klimaanlage: '❄' };
        return mkEscapeHtml(icons[asset.steuveType] || meta.short);
    }
    return mkEscapeHtml(meta.short);
}

function mkRenderAsset(asset) {
    const meta = MK_ASSET_META[asset.type];
    const detailMarkup = mkConfiguratorState.viewMode === 'detail'
        ? `<div class="mk-asset-detail-slide" aria-label="Details zu ${mkEscapeHtml(asset.name)}">${mkRenderAssetSummary(asset, true)}</div>`
        : '';
    const typeLabel = mkGetAssetTypeLabel(asset);
    const generationMeterNumber = mkGetGenerationMeterNumber(asset);
    const storageInfoMarkup = asset.type === 'storage' && mkConfiguratorState.viewMode === 'detail'
        ? `<span class="mk-storage-info" data-tooltip="${mkEscapeHtml(MK_STORAGE_INFO_TEXT)}" title="${mkEscapeHtml(MK_STORAGE_INFO_TEXT)}" role="img" tabindex="0" aria-label="Hinweis zum Speicher">i</span>`
        : '';
    const balconyInfoMarkup = asset.type === 'generation' && asset.energyCarrier === 'Balkonkraftwerk' && mkConfiguratorState.viewMode === 'detail'
        ? `<span class="mk-storage-info" data-tooltip="${mkEscapeHtml(MK_BALCONY_INFO_TEXT)}" title="${mkEscapeHtml(MK_BALCONY_INFO_TEXT)}" role="img" tabindex="0" aria-label="Hinweis zum Balkonkraftwerk">i</span>`
        : '';
    const generationMeterMarkup = generationMeterNumber
        ? `<span class="mk-generation-meter" title="Eigener Erzeugungszähler Z${generationMeterNumber}" role="img" aria-label="Z${generationMeterNumber}: eigener Erzeugungszähler für ${mkEscapeHtml(asset.name)}"><b>Z${generationMeterNumber}</b></span><span class="mk-generation-meter-link" aria-hidden="true"></span>`
        : '';

    return `
        <div class="mk-asset-branch ${mkConfiguratorState.viewMode === 'detail' ? 'detail-mode' : 'simple-mode'} ${generationMeterMarkup ? 'has-generation-meter' : ''}">
            ${generationMeterMarkup}
            <article class="mk-asset-card ${mkConfiguratorState.viewMode === 'detail' ? 'detail-mode' : 'simple-mode'}" draggable="true" data-mk-asset-id="${mkEscapeHtml(asset.id)}" data-mk-drag-asset="${mkEscapeHtml(asset.id)}" data-mk-select-asset="${mkEscapeHtml(asset.id)}" role="button" tabindex="0" aria-label="${mkEscapeHtml(asset.name)} auswählen und verschieben">
                <div class="mk-asset-head">
                    <span class="mk-asset-icon ${meta.className} ${mkGetSteuveIconClass(asset)}" aria-label="${asset.type === 'storage' ? 'Batteriespeicher' : mkEscapeHtml(typeLabel || meta.label)}">${mkRenderAssetIcon(asset)}</span>
                    ${balconyInfoMarkup}
                    ${storageInfoMarkup}
                    <button type="button" class="mk-remove-asset" data-mk-remove-asset="${mkEscapeHtml(asset.id)}" title="Baustein entfernen" aria-label="${mkEscapeHtml(asset.name)} entfernen">×</button>
                </div>
                ${detailMarkup}
            </article>
        </div>
    `;
}

function mkGetAssetsPerRow(assetCount = MK_ASSETS_PER_ROW) {
    if (mkConfiguratorState.viewMode === 'detail') {
        return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 480px)').matches
            ? 1
            : MK_ASSETS_PER_ROW;
    }
    return Math.max(MK_ASSETS_PER_ROW, Number(assetCount) || 0);
}

function mkGetSimpleCanvasMinimumWidth(assetCount) {
    return 128 + (Math.max(MK_ASSETS_PER_ROW, Number(assetCount) || 0) * 66);
}

function mkGetParallelCanvasMinimumWidth(meterCount) {
    const longestAssetRow = Math.max(
        MK_ASSETS_PER_ROW,
        ...Array.from({ length: meterCount }, (_, index) => mkGetZoneAssets(`parallel-${index}`).length)
    );
    const minimumBranchWidth = Math.max(364, (longestAssetRow * 132) - 32);
    return (minimumBranchWidth * meterCount) + (Math.max(0, meterCount - 1) * 16);
}

function mkRenderAssetRows(assets) {
    const rows = [];
    const assetsPerRow = mkGetAssetsPerRow(assets.length);
    for (let start = 0; start < assets.length; start += assetsPerRow) {
        const rowAssets = assets.slice(start, start + assetsPerRow);
        const rowClass = start === 0 ? 'primary' : 'secondary';
        rows.push(`<div class="mk-asset-row ${rowClass}" style="--mk-asset-columns: ${rowAssets.length};">${rowAssets.map(mkRenderAsset).join('')}</div>`);
    }
    return rows.join('');
}

function mkRenderDropZone(zone, index) {
    const assets = mkGetZoneAssets(zone);
    const isRestricted = mkConfiguratorState.mode === 'cascade' && index === 0;
    const continuesCascade = mkConfiguratorState.mode === 'cascade' && index < mkConfiguratorState.cascadeLevels - 1;
    const hasWrappedRows = assets.length > mkGetAssetsPerRow(assets.length);
    const rowsMarkup = assets.length ? mkRenderAssetRows(assets) : '<div class="mk-empty-zone">Noch leer</div>';
    return `
        <div class="mk-drop-zone ${isRestricted ? 'restricted' : ''}" data-mk-zone="${mkEscapeHtml(zone)}" aria-label="${mkEscapeHtml(mkGetZoneLabel(index))}">
            <div class="mk-zone-assets ${mkConfiguratorState.viewMode === 'detail' ? 'detail-mode' : 'simple-mode'}${continuesCascade ? ' cascade-link-zone' : ''}"><span class="mk-zone-junction" aria-hidden="true"></span>${hasWrappedRows ? '<span class="mk-zone-wrap-strand" aria-hidden="true"></span>' : ''}${rowsMarkup}</div>
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
    return `
        <div class="mk-meter-node" data-mk-select-meter="${index}" role="button" tabindex="0" aria-label="Z${index + 1} auswählen">
            <span class="mk-meter-symbol">Z${index + 1}</span>
        </div>
    `;
}

function mkRenderMeterLayout(index) {
    if (mkConfiguratorState.viewMode === 'detail') {
        const meterSummary = mkRenderMeterDetailsSummary(index);
        const meterSummaryMarkup = meterSummary
            ? `<div class="mk-asset-detail-slide" aria-label="Details zu Z${index + 1}">${meterSummary}</div>`
            : '';
        return `
            <div class="mk-meter-layout detail-mode">
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
        <div class="mk-meter-layout">
            ${mkRenderMeterNode(index)}
            <div class="mk-connection-line" aria-hidden="true"></div>
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
            <label>Art der Erzeugungsanlage<select data-mk-field="energyCarrier">${mkRenderSelectOptions(MK_ASSET_TYPE_OPTIONS.generation, asset.energyCarrier)}</select></label>
            <label>Leistung<input type="text" data-mk-field="power" value="${mkEscapeHtml(asset.power)}" placeholder="kW / kWp"></label>
            <label>Inbetriebnahme<input type="date" data-mk-field="commissioningDate" value="${mkEscapeHtml(asset.commissioningDate)}"></label>
        </div>
        <label class="mk-check-row"><input type="checkbox" data-mk-field="generationMeter" ${asset.generationMeter ? 'checked' : ''}> Eigener Erzeugungszähler für diese EA</label>
    ` : '';
    const steuveFields = asset.type === 'steuve' ? `
        <div class="mk-asset-form-grid">
            <label>Anlage<select data-mk-field="steuveType">${mkRenderSelectOptions(MK_ASSET_TYPE_OPTIONS.steuve, asset.steuveType)}</select></label>
            <label>Leistung<input type="text" data-mk-field="power" value="${mkEscapeHtml(asset.power)}" placeholder="z. B. 11 kW"></label>
        </div>
        <div data-mk-steuve-notice="${mkEscapeHtml(asset.id)}">${mkRenderSteuveNotice(asset)}</div>
        <div class="mk-asset-form-grid" data-mk-steuve-module-fields="${mkEscapeHtml(asset.id)}">${mkRenderSteuveModuleFields(asset)}</div>
    ` : '';
    const nshFields = asset.type === 'nsh' ? `
        <label>Bestand / Inbetriebnahme<input type="date" data-mk-field="commissioningDate" value="${mkEscapeHtml(asset.commissioningDate)}"></label>
        <p class="mk-nsh-editor-hint">Vor 2024 können historische Tarif- und Messbedingungen gelten. Bei gemeinsamer Messung mit einer aktuellen SteuVE bitte abstimmen.</p>
    ` : '';
    return `
        <div class="mk-object-editor-form" data-mk-asset-id="${mkEscapeHtml(asset.id)}">
            <div class="mk-asset-form">
                <label>Bezeichnung<input type="text" data-mk-field="name" value="${mkEscapeHtml(asset.name)}"></label>
                ${meterFields}
                ${generationFields}
                ${steuveFields}
                ${nshFields}
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
        asset.type === 'generation' ? { label: 'Erzeugungszähler', value: asset.generationMeter ? `Ja · Z${mkGetGenerationMeterNumber(asset)}` : (includeEmpty ? 'Nein' : '') } : null,
        asset.type === 'steuve' ? { label: 'Anlage', value: asset.steuveType || 'Steuerbare Anlage' } : null,
        asset.type === 'steuve' ? { label: 'Leistung', value: asset.power } : null,
        asset.type === 'steuve' ? { label: 'Einordnung', value: mkGetSteuveRegime(asset) } : null,
        asset.type === 'steuve' ? { label: '§14a-Modul', value: asset.steuveModule } : null,
        asset.type === 'nsh' ? { label: 'Bestand / Inbetriebnahme', value: asset.commissioningDate } : null,
        asset.type === 'nsh' ? { label: 'Einordnung', value: mkGetNshRegime(asset) } : null,
        asset.type === 'storage' ? { label: 'Betriebsrolle', value: 'Erzeugung und Bezug · § 14a beim Bezug prüfen' } : null
    ].filter(Boolean).filter(entry => includeEmpty || String(entry.value || '').trim());
    return entries.map(entry => `<div class="mk-meter-detail-value"><span>${mkEscapeHtml(entry.label)}</span><b>${mkEscapeHtml(String(entry.value || '—'))}</b></div>`).join('');
}

function mkRenderMeterEditorFields(index) {
    const details = mkGetMeterDetails(index);
    const fields = MK_METER_DETAIL_FIELDS.map(field => `
        <label>${mkEscapeHtml(field.label)}<input type="${field.type}"${field.maxLength ? ` maxlength="${field.maxLength}"` : ''} data-mk-meter-field="${mkEscapeHtml(field.key)}" data-mk-meter-index="${index}" value="${mkEscapeHtml(details[field.key])}"></label>
    `).join('');
    return `
        <div class="mk-object-editor-head">
            <span class="mk-asset-icon meter">Z${index + 1}</span>
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
            <span class="mk-asset-icon ${MK_ASSET_META[asset.type].className} ${mkGetSteuveIconClass(asset)}" aria-label="${asset.type === 'storage' ? 'Batteriespeicher' : mkEscapeHtml(mkGetAssetTypeLabel(asset) || MK_ASSET_META[asset.type].label)}">${mkRenderAssetIcon(asset)}</span>
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
            ${mkRenderHakNode()}
            ${mkRenderOwnershipConnector()}
            ${mkRenderMeterLayout(0)}
        </div>
    `;
}

function mkRenderHakNode() {
    return '<div class="mk-hak-node" title="Hausanschlusskasten" data-tooltip="HAK = Hausanschlusskasten" role="img" tabindex="0" aria-label="HAK = Hausanschlusskasten"><b>HAK</b></div>';
}

function mkRenderOwnershipConnector() {
    return `
        <div class="mk-supply-connector" aria-label="Eigentumsgrenze">
            <span class="mk-ownership-marker" title="Eigentumsgrenze"></span>
            <span class="mk-ownership-label">Eigentumsgrenze</span>
            <i class="mk-supply-line"></i>
        </div>
    `;
}

function mkRenderParallelCanvas() {
    const branches = [];
    for (let index = 0; index < mkConfiguratorState.cascadeLevels; index += 1) {
        branches.push(`
            <div class="mk-parallel-branch">
                <span class="mk-parallel-branch-connector" aria-hidden="true"></span>
                ${mkRenderMeterLayout(index)}
                ${mkRenderDropZone(`parallel-${index}`, index)}
            </div>
        `);
    }
    const minimumCanvasWidth = mkGetParallelCanvasMinimumWidth(mkConfiguratorState.cascadeLevels);
    return `
        <div class="mk-parallel-stack" style="--mk-parallel-min-width: ${minimumCanvasWidth}px;">
            <div class="mk-parallel-hak-head" aria-label="Hausanschlusskasten mit Eigentumsgrenze">
                ${mkRenderHakNode()}
                ${mkRenderOwnershipConnector()}
            </div>
            <div class="mk-parallel-feed" aria-hidden="true"></div>
            <div class="mk-parallel-branches">
                ${branches.join('')}
            </div>
        </div>
    `;
}

function mkRenderCanvas() {
    if (!mkElements.canvas) return;
    if (mkConfiguratorState.mode === 'parallel') {
        mkElements.canvas.innerHTML = mkRenderParallelCanvas();
        return;
    }
    if (mkConfiguratorState.mode === 'single') {
        const minimumCanvasWidth = mkGetSimpleCanvasMinimumWidth(mkGetZoneAssets('single-main').length);
        mkElements.canvas.innerHTML = `
            <div class="mk-single-stack" style="--mk-cascade-min-width: ${minimumCanvasWidth}px;">
                ${mkRenderHakMeterRow()}
                ${mkRenderDropZone('single-main', 0)}
            </div>
        `;
        return;
    }

    const levels = [];
    const longestAssetRow = Math.max(
        MK_ASSETS_PER_ROW,
        ...Array.from({ length: mkConfiguratorState.cascadeLevels }, (_, index) => mkGetZoneAssets(`cascade-${index}`).length)
    );
    const minimumCanvasWidth = mkGetSimpleCanvasMinimumWidth(longestAssetRow);
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
    mkElements.canvas.innerHTML = `<div class="mk-cascade-stack" style="--mk-cascade-min-width: ${minimumCanvasWidth}px;">${levels.join('<div class="mk-cascade-arrow" aria-hidden="true"></div>')}</div>`;
}

function mkValidation() {
    const assets = mkConfiguratorState.assets;
    const generations = assets.filter(asset => asset.type === 'generation');
    const consumers = assets.filter(asset => asset.type === 'consumer');
    const steuves = assets.filter(asset => asset.type === 'steuve');
    const overThresholdSteuves = steuves.filter(asset => mkGetPowerNumber(asset.power) > 4.2);
    const storages = assets.filter(asset => asset.type === 'storage');
    const nshAssets = assets.filter(asset => asset.type === 'nsh');
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

    if (storages.length) {
        checks.push({ level: 'warning', text: `Speicher bleibt ein eigenes Objekt. Betriebsrolle (Erzeugung und Bezug) fachlich festlegen. ${MK_STORAGE_INFO_TEXT}` });
    }

    if (overThresholdSteuves.length) {
        checks.push({ level: 'warning', text: `${overThresholdSteuves.length} steuerbare ${overThresholdSteuves.length === 1 ? 'Anlage liegt' : 'Anlagen liegen'} über 4,2 kW. Einordnung nach § 14a EnWG, Anmeldung und passendes Modul beim Netzbetreiber prüfen.` });
    }

    if (nshAssets.length) {
        const hasPre2024Asset = nshAssets.some(asset => {
            const year = Number(String(asset.commissioningDate || '').slice(0, 4));
            return !Number.isFinite(year) || year < 2024;
        });
        const regimeHint = hasPre2024Asset
            ? 'Bei Bestandsanlagen vor 2024 können historische Tarif- und Messbedingungen betroffen sein.'
            : 'Die Einordnung ab 2024 ist nicht automatisch mit einer aktuellen SteuVE gleichzusetzen.';
        checks.push({ level: 'warning', text: `Nachtspeicherheizung erkannt. ${regimeHint} Gemeinsame Messung, Tarif und Bestand bitte mit Netzbetreiber und Messstellenbetreiber abstimmen.` });
    }

    if (mkConfiguratorState.mode === 'single') {
        if (steuves.length && consumers.length) {
            checks.push({ level: 'warning', text: 'Steuerbare Anlagen und weitere Verbraucher liegen im selben Messbereich. Tarif- und Messabgrenzung fachlich prüfen.' });
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
        if (upper.some(asset => asset.type === 'consumer')) {
            checks.push({ level: 'error', text: 'Im oberen Kaskadenbereich liegt ein Verbraucher. Dieser Bereich ist in vielen Konzepten eingeschränkt.' });
        }
        if (upper.some(asset => asset.type === 'generation')) {
            checks.push({ level: 'warning', text: 'Eine EA liegt zwischen den ersten Zählern. Erzeugungsmessung und Differenzbildung müssen konkret abgestimmt werden.' });
        }
        if (mkConfiguratorState.cascadeLevels > 2) {
            checks.push({ level: 'warning', text: 'Mehrstufige Kaskade: Zählerreihenfolge, Abrechnung und Messstellenbetrieb separat prüfen.' });
        }
        checks.push({ level: 'ok', text: `Differenzlogik für ${mkConfiguratorState.cascadeLevels} Zähler vorbereitet.` });
    }

    if (mkConfiguratorState.mode === 'parallel') {
        const emptyBranches = [];
        for (let index = 0; index < mkConfiguratorState.cascadeLevels; index += 1) {
            if (!mkGetZoneAssets(`parallel-${index}`).length) emptyBranches.push(`Z${index + 1}`);
        }
        checks.push({ level: 'ok', text: `Parallelmessung mit ${mkConfiguratorState.cascadeLevels} direkt verzweigten Zählern vorbereitet.` });
        if (emptyBranches.length) {
            checks.push({ level: 'warning', text: `${emptyBranches.join(', ')} hat noch keinen zugeordneten Messbereich.` });
        }
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
        if (generationMeters.length) lines.push(`<b>Erzeugungsmessung</b> für ${generationMeters.map(asset => `Z${mkGetGenerationMeterNumber(asset)} · ${mkEscapeHtml(asset.name)}`).join(', ')} markiert.`);
        if (!generationMeters.length) lines.push('EA werden zunächst gemeinsam hinter Z1 erfasst.');
    } else if (mkConfiguratorState.mode === 'cascade') {
        for (let index = 0; index < mkConfiguratorState.cascadeLevels; index += 1) {
            const zoneAssets = mkGetZoneAssets(`cascade-${index}`);
            const names = zoneAssets.filter(asset => asset.type !== 'meter').map(asset => mkEscapeHtml(asset.name));
            const formula = index === 0 ? 'Z1 - Z2' : `Z${index + 1} - Z${Math.min(index + 2, mkConfiguratorState.cascadeLevels)}`;
            lines.push(`<b>Z${index + 1}</b> ${index === 0 ? 'Netzbezug / Lieferung' : `Differenz ${formula}`}${names.length ? ` · ${names.join(', ')}` : ''}.`);
        }
        if (generationMeters.length) lines.push(`<b>Eigene Erzeugungszähler:</b> ${generationMeters.map(asset => `Z${mkGetGenerationMeterNumber(asset)} · ${mkEscapeHtml(asset.name)}`).join(', ')}.`);
    } else {
        for (let index = 0; index < mkConfiguratorState.cascadeLevels; index += 1) {
            const zoneAssets = mkGetZoneAssets(`parallel-${index}`);
            const names = zoneAssets.filter(asset => asset.type !== 'meter').map(asset => mkEscapeHtml(asset.name));
            lines.push(`<b>Z${index + 1}</b> misst einen eigenen Parallelzweig ohne Differenzbildung${names.length ? ` · ${names.join(', ')}` : ''}.`);
        }
        lines.push('Der HAK teilt die Anlage direkt auf die Zählerzweige auf.');
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

function mkUpdateSimpleAssetStrands() {
    if (!mkElements.canvas || mkConfiguratorState.viewMode !== 'simple') return;
    mkElements.canvas.querySelectorAll('.mk-zone-assets.simple-mode').forEach(zone => {
        const junction = zone.querySelector('.mk-zone-junction');
        const branches = [...zone.querySelectorAll('.mk-asset-branch')];
        if (!junction) return;
        const junctionRect = junction.getBoundingClientRect();
        const lastBranch = branches[branches.length - 1];
        const lastBranchRect = lastBranch?.getBoundingClientRect();
        const originX = junctionRect.left + (junctionRect.width / 2);
        const endX = lastBranchRect
            ? lastBranchRect.left + (lastBranchRect.width / 2)
            : originX + 48;
        zone.style.setProperty('--mk-zone-bus-width-px', `${Math.max(0, endX - originX)}px`);
    });
}

function mkCenterParallelViewport() {
    if (!mkElements.canvas || mkConfiguratorState.mode !== 'parallel') return;
    const stack = mkElements.canvas.querySelector('.mk-parallel-stack');
    if (!stack) return;
    const layoutKey = `${mkConfiguratorState.mode}:${Math.round(stack.getBoundingClientRect().width)}`;
    if (mkElements.canvas.dataset.mkViewportLayout === layoutKey) return;
    mkElements.canvas.scrollLeft = Math.max(0, (stack.getBoundingClientRect().width - mkElements.canvas.clientWidth) / 2);
    mkElements.canvas.dataset.mkViewportLayout = layoutKey;
}

function mkRender() {
    if (!mkElements.canvas) return;
    document.querySelectorAll('[data-mk-mode]').forEach(button => {
        const active = button.dataset.mkMode === mkConfiguratorState.mode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-mk-level]').forEach(button => {
        const meterCountMode = ['cascade', 'parallel'].includes(mkConfiguratorState.mode);
        const active = meterCountMode && Number(button.dataset.mkLevel) === mkConfiguratorState.cascadeLevels;
        button.disabled = !meterCountMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-mk-view]').forEach(button => {
        const active = button.dataset.mkView === mkConfiguratorState.viewMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    mkRenderCanvas();
    window.requestAnimationFrame(() => {
        mkUpdateSimpleAssetStrands();
        mkCenterParallelViewport();
    });
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
        mkAddAsset(transfer.type, zone, transfer.steuveType || '', transfer.energyCarrier || '');
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
    if (asset.type === 'steuve' && ['power', 'steuveType'].includes(field)) {
        const notice = document.querySelector(`[data-mk-steuve-notice="${asset.id}"]`);
        if (notice) notice.innerHTML = mkRenderSteuveNotice(asset);
        const moduleFields = document.querySelector(`[data-mk-steuve-module-fields="${asset.id}"]`);
        if (moduleFields) moduleFields.innerHTML = mkRenderSteuveModuleFields(asset);
    }
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
    const meterCount = ['cascade', 'parallel'].includes(mkConfiguratorState.mode) ? mkConfiguratorState.cascadeLevels : 1;
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
                <div class="mk-print-meta"><b>Exportstand</b><span>${mkEscapeHtml(stand.label)}</span><span>${mkConfiguratorState.mode === 'cascade' ? `Kaskade · ${mkConfiguratorState.cascadeLevels} Zähler` : mkConfiguratorState.mode === 'parallel' ? `Parallelmessung · ${mkConfiguratorState.cascadeLevels} Zähler` : '1 Zähler'}</span></div>
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
        objectModal: document.getElementById('mk-object-modal'),
        objectModalContent: document.getElementById('mk-object-modal-content'),
        objectModalTitle: document.getElementById('mk-object-modal-title')
    };
    if (!mkElements.canvas) return;

    ['btn-open-messkonzept-card'].forEach(id => {
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
    document.querySelectorAll('[data-mk-mode]').forEach(button => button.addEventListener('click', () => mkChangeMode(button.dataset.mkMode)));
    document.querySelectorAll('[data-mk-level]').forEach(button => button.addEventListener('click', () => mkChangeCascadeLevels(button.dataset.mkLevel)));
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
        button.addEventListener('dragstart', event => {
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('application/json', JSON.stringify({ source: 'palette', type: button.dataset.mkType, steuveType: button.dataset.mkSteuveType || '', energyCarrier: button.dataset.mkEnergyCarrier || '' }));
        });
        button.addEventListener('click', () => {
            const type = button.dataset.mkType;
            if (!MK_ASSET_META[type]) return;
            mkAddAsset(type, mkDefaultZone(), button.dataset.mkSteuveType || '', button.dataset.mkEnergyCarrier || '');
            mkNotify(`${button.querySelector('.mk-palette-label')?.textContent || 'Baustein'} eingefügt.`, 'info');
        });
    });

    mkElements.canvas.addEventListener('dragover', event => {
        const zone = event.target.closest('[data-mk-zone]');
        if (!zone) return;
        event.preventDefault();
        zone.classList.add('dragover');
    });
    let mkResizeTimer = null;
    window.addEventListener('resize', () => {
        window.clearTimeout(mkResizeTimer);
        mkResizeTimer = window.setTimeout(() => mkRender(), 120);
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
