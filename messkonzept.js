/*
 * Wattspur Messkonzept-Konfigurator
 *
 * Eigenständiger MVP ohne Backend: Die Oberfläche bildet eigene, schematische
 * Bausteine ab. Sie ist bewusst kein Nachbau lizenzierter VBEW-Auswahlblätter.
 */

const MK_MODEL = window.WattspurMesskonzeptModel;
const MK_ASSET_META = MK_MODEL.assetMeta;
const MK_ASSET_TYPE_OPTIONS = MK_MODEL.assetTypeOptions;
const MK_STEUVE_MODULE_OPTIONS = MK_MODEL.steuveModuleOptions;
const MK_STORAGE_INFO_TEXT = MK_MODEL.storageInfoText;
const MK_BALCONY_INFO_TEXT = MK_MODEL.balconyInfoText;
const MK_ASSETS_PER_ROW = 3;
const MK_CANVAS_ZOOM = Object.freeze({ min: 0.4, max: 1.2, step: 0.1 });
// Die wiederverwendbaren Geometrie-Regeln liegen bewusst in einem eigenen
// Modul. Dieser Alias hält die bisherige interne Schnittstelle stabil,
// während die eigentliche Zustands- und Renderlogik im Hauptmodul verbleibt.
const MK_GEOMETRY = window.WattspurMesskonzeptGeometry;
const MK_LAYOUT_GEOMETRY = MK_GEOMETRY.constants;
const MK_TOPOLOGY = window.WattspurMesskonzeptTopology;
const MK_RULES = window.WattspurMesskonzeptRules;

const MK_METER_DETAIL_FIELDS = MK_MODEL.meterDetailFields;
const mkConfiguratorState = MK_MODEL.state;

const MK_RENDER = window.WattspurMesskonzeptRender.createRenderer({
    state: mkConfiguratorState,
    assetMeta: MK_ASSET_META,
    escapeHtml: mkEscapeHtml,
    getViewMode: () => mkConfiguratorState.viewMode,
    getAssetTypeLabel: mkGetAssetTypeLabel,
    getSteuveIconClass: mkGetSteuveIconClass,
    getMeterForAsset: mkGetMeterForAsset,
    getAssetMeters: mkGetAssetMeters,
    getMeterAssets: mkGetMeterAssets,
    getMeterNumber: mkGetMeterNumber,
    getMeterDetailIndex: mkGetMeterDetailIndex,
    getGenerationMeterNumber: mkGetGenerationMeterNumber,
    renderAssetIcon: mkRenderAssetIcon,
    renderInlineMeter: mkRenderInlineMeter,
    renderAssetSummary: mkRenderAssetSummary,
    canBuildCascadeAfterMeter: mkCanBuildCascadeAfterMeter,
    getAdditionalMeters: mkGetAdditionalMeters,
    getRailEntries: mkGetRailEntries,
    getAssetsPerRow: mkGetAssetsPerRow,
    getLayoutGeometry: () => MK_LAYOUT_GEOMETRY,
    storageInfoText: MK_STORAGE_INFO_TEXT,
    balconyInfoText: MK_BALCONY_INFO_TEXT
});

let mkElements = {};
let mkGeometryFrame = 0;
let mkGeometryObserver = null;
let mkActiveDrag = null;
let mkCanvasPan = null;
let mkPanSpaceHeld = false;
let mkFieldHistoryDraft = null;

const MK_CONNECTIONS = window.WattspurMesskonzeptConnections.createConnections({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    getStageScale: stage => MK_GEOMETRY.getStageScale(stage),
    findIncomingMeterLayout: zone => MK_GEOMETRY.findIncomingMeterLayout(zone),
    hasNestedMeterRail: zone => mkHasNestedMeterRail(zone),
    getAdditionalMeters: () => mkGetAdditionalMeters(),
    getAssetBranchAnchor: branch => MK_GEOMETRY.getAssetBranchAnchor(branch),
    getStagePoint: (element, stageRect, scale, horizontal, vertical) => MK_GEOMETRY.getStagePoint(element, stageRect, scale, horizontal, vertical),
    buildWire: (start, end) => MK_GEOMETRY.buildDynamicWire(start, end),
    buildNode: point => MK_GEOMETRY.buildDynamicNode(point),
    layoutGeometry: MK_LAYOUT_GEOMETRY
});

const MK_EXPORT = window.WattspurMesskonzeptExport.createExporter({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    escapeHtml: mkEscapeHtml,
    validate: () => mkValidation(),
    getMeasurementSummaryMarkup: () => mkElements.measurementSummary?.innerHTML || '',
    renderMeterDetailsSummary: (index, includeEmpty) => mkRenderMeterDetailsSummary(index, includeEmpty),
    renderAssetSummary: (asset, includeEmpty) => mkRenderAssetSummary(asset, includeEmpty),
    getMeterNumber: meter => mkGetMeterNumber(meter),
    getAssetMeta: type => MK_ASSET_META[type],
    notify: (message, type) => mkNotify(message, type)
});

// Der Verlauf betrifft ausschließlich die fachliche Messkonzept-Skizze.
// Projektangaben, Kommentar, Zoom und die Darstellung werden bewusst nicht
// darin gespeichert, damit ein Tippfehler im Projekttext nicht die Skizze
// überschreibt.
const mkHistory = MK_MODEL.history;

function mkCaptureHistoryState() {
    return MK_MODEL.captureHistoryState(mkConfiguratorState);
}

function mkUpdateHistoryButtons() {
    const undoButton = document.getElementById('btn-mk-undo');
    const redoButton = document.getElementById('btn-mk-redo');
    if (undoButton) {
        const available = mkHistory.undo.length > 0;
        undoButton.disabled = !available;
        undoButton.setAttribute('aria-disabled', String(!available));
    }
    if (redoButton) {
        const available = mkHistory.redo.length > 0;
        redoButton.disabled = !available;
        redoButton.setAttribute('aria-disabled', String(!available));
    }
}

function mkRecordHistory(previousState) {
    if (MK_MODEL.recordHistory(mkConfiguratorState, previousState)) mkUpdateHistoryButtons();
}

function mkGetFieldHistoryBefore(event) {
    if (event.type === 'input') {
        if (!mkFieldHistoryDraft || mkFieldHistoryDraft.target !== event.target) {
            mkFieldHistoryDraft = { target: event.target, before: mkCaptureHistoryState() };
        }
        return null;
    }
    const previousState = mkFieldHistoryDraft?.target === event.target
        ? mkFieldHistoryDraft.before
        : mkCaptureHistoryState();
    if (event.type === 'change') mkFieldHistoryDraft = null;
    return previousState;
}

function mkRestoreHistoryState(snapshot) {
    if (!snapshot) return;
    MK_MODEL.restoreHistoryState(mkConfiguratorState, snapshot);
    mkRender();
    mkUpdateHistoryButtons();
}

function mkUndo() {
    if (!mkHistory.undo.length) return;
    const currentState = mkCaptureHistoryState();
    const previousState = mkHistory.undo.pop();
    mkHistory.redo.push(currentState);
    mkRestoreHistoryState(previousState);
    mkNotify('Letzte Messkonzept-Änderung rückgängig gemacht.', 'info');
}

function mkRedo() {
    if (!mkHistory.redo.length) return;
    const currentState = mkCaptureHistoryState();
    const nextState = mkHistory.redo.pop();
    mkHistory.undo.push(currentState);
    mkRestoreHistoryState(nextState);
    mkNotify('Messkonzept-Änderung wiederhergestellt.', 'info');
}

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
    return MK_MODEL.createMeterDetails();
}

function mkGetMeterDetails(index) {
    return MK_MODEL.getMeterDetails(mkConfiguratorState, index);
}

function mkNotify(message, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(message, type);
    }
}

function mkDefaultZone() {
    return MK_MODEL.getDefaultZone(mkConfiguratorState);
}

function mkAddAsset(type, zone = mkDefaultZone(), steuveType = '', energyCarrier = '', options = {}) {
    if (type === 'meter' && !options.targetAssetId && options.parentBaseMeterIndex === undefined) {
        mkNotify('Zähler bitte direkt auf eine Anlage ziehen.', 'warning');
        return null;
    }
    const asset = MK_MODEL.addAsset(
        mkConfiguratorState,
        type,
        zone,
        steuveType,
        energyCarrier,
        options,
        mkGetMeterForAsset
    );
    if (!asset) return null;
    mkRender();
    return asset;
}

function mkReset() {
    const previousState = mkCaptureHistoryState();
    MK_MODEL.reset(mkConfiguratorState);
    mkRender();
    mkRecordHistory(previousState);
}

function mkSyncProjectFields() {
    document.getElementById('btn-mk-undo')?.addEventListener('click', mkUndo);
    document.getElementById('btn-mk-redo')?.addEventListener('click', mkRedo);
    document.querySelectorAll('[data-mk-project-field]').forEach(field => {
        const key = field.dataset.mkProjectField;
        if (Object.prototype.hasOwnProperty.call(mkConfiguratorState.project, key) && field.value !== mkConfiguratorState.project[key]) {
            field.value = mkConfiguratorState.project[key];
        }
    });
    const notesField = document.querySelector('[data-mk-notes-field]');
    if (notesField && notesField.value !== mkConfiguratorState.notes) notesField.value = mkConfiguratorState.notes;
}

function mkChangeViewMode(viewMode) {
    if (!['simple', 'detail'].includes(viewMode) || viewMode === mkConfiguratorState.viewMode) return;
    mkConfiguratorState.viewMode = viewMode;
    mkRender();
}

function mkChangeMode(mode) {
    if (!['single', 'parallel'].includes(mode) || mode === mkConfiguratorState.mode) return;

    const previousState = mkCaptureHistoryState();
    if (!MK_MODEL.changeMode(mkConfiguratorState, mode)) return;
    mkRender();
    mkRecordHistory(previousState);
}

function mkChangeCascadeLevels(levels) {
    if (mkConfiguratorState.mode !== 'parallel') return;
    const previousState = mkCaptureHistoryState();
    if (!MK_MODEL.changeCascadeLevels(mkConfiguratorState, levels)) return;
    mkRender();
    mkRecordHistory(previousState);
}

function mkGetZoneAssets(zone) {
    return MK_MODEL.getZoneAssets(mkConfiguratorState, zone);
}

/**
 * Tauscht die Position zweier Anlagenkarten im lokalen Modell.
 * Der Tausch gilt bewusst innerhalb desselben Messbereichs. Beim Ziehen in
 * einen anderen Bereich bleibt die bisherige Umplatzierungslogik erhalten.
 */
function mkSwapAssetPositions(sourceId, targetId) {
    return MK_MODEL.swapAssetPositions(mkConfiguratorState, sourceId, targetId);
}

function mkGetAdditionalMeters() {
    return MK_TOPOLOGY.getMeters(mkConfiguratorState.assets);
}

function mkGetBaseChainChild(parentMeter = null, baseMeterIndex = null, zone = '') {
    const parentId = parentMeter?.id || '';
    return mkGetAdditionalMeters().find(meter => meter.meterScope === 'base'
        && (baseMeterIndex === null || Number(meter.parentBaseMeterIndex) === Number(baseMeterIndex))
        && (!zone || meter.zone === zone)
        && String(meter.parentMeterId || '') === String(parentId)) || null;
}

function mkCanBuildCascadeAfterMeter(meter) {
    // Nur Zaehler auf dem Hauptstrang (meterScope=base) duerfen eine weitere
    // Kaskadenstufe erhalten. Ein Zaehler vor einer einzelnen Anlage bleibt
    // ein Anlagen-Messpunkt und darf nicht durch einen weiteren Drop in eine
    // unkontrollierte Unterkaskade umgewandelt werden.
    return Boolean(meter && meter.type === 'meter' && meter.meterScope === 'base');
}

function mkMoveAssetBefore(assetId, beforeId) {
    return MK_MODEL.moveAssetBefore(mkConfiguratorState, assetId, beforeId);
}

function mkMoveAssetAfter(assetId, afterId) {
    return MK_MODEL.moveAssetAfter(mkConfiguratorState, assetId, afterId);
}

function mkGetAssetMeters(assetId) {
    return MK_TOPOLOGY.getAssetMeters(mkConfiguratorState.assets, assetId);
}

/* Eine Anlage darf einen eigenen vorgeschalteten Zähler erhalten, auch wenn
 * sie bereits an einer gemeinsamen Sammelschiene hängt. Nicht erlaubt ist
 * nur ein weiterer Zähler vor einem bereits isolierten Einzelzähler; das
 * würde unbeabsichtigt eine neue Unterkaskade erzeugen. */
function mkCanAddMeterToAsset(asset) {
    if (!asset || asset.type === 'meter') return false;
    const ownMeters = mkGetAssetMeters(asset.id);
    const attachedMeter = mkGetMeterForAsset(asset);
    const sharedMeter = attachedMeter
        && mkIsMeterExpanded(attachedMeter.id)
        && mkGetMeterAssets(attachedMeter.id).length > 1;
    return ownMeters.length === 0 || Boolean(sharedMeter);
}

function mkGetMeterDropOptions(asset) {
    const attachedMeter = mkGetMeterForAsset(asset);
    const sharedMeter = attachedMeter
        && mkIsMeterExpanded(attachedMeter.id)
        && mkGetMeterAssets(attachedMeter.id).length > 1;
    return sharedMeter
        ? { targetAssetId: asset.id, parentMeterId: attachedMeter.id, keepEmptyRail: true }
        : { targetAssetId: asset.id };
}

/**
 * Liefert den Zusatzzaehler, an dem eine Anlage tatsaechlich haengt.
 * Der erste Baustein eines Messpunkts besitzt targetAssetId; weitere Anlagen
 * speichern dagegen nur die gemeinsame meterId.
 */
function mkGetMeterForAsset(asset) {
    return MK_TOPOLOGY.getMeterForAsset(mkConfiguratorState.assets, asset);
}

function mkGetMeterAssets(meterId) {
    return MK_TOPOLOGY.getMeterMembers(mkConfiguratorState.assets, meterId);
}

function mkGetMeterDescendantIds(meterId) {
    return MK_TOPOLOGY.getMeterDescendantIds(mkConfiguratorState.assets, meterId);
}

function mkMoveMeterSubtreeToZone(meter, zone) {
    if (!meter || !zone) return;
    MK_MODEL.moveMeterSubtreeToZone(mkConfiguratorState, meter, zone, mkGetMeterDescendantIds(meter.id));
}

function mkIsMeterExpanded(meterId) {
    return MK_TOPOLOGY.isMeterExpanded(mkConfiguratorState.assets, meterId);
}

function mkGetDisplayParentMeterId(asset) {
    return MK_TOPOLOGY.getDisplayParentMeterId(mkConfiguratorState.assets, asset);
}

function mkBuildZoneMeterTree(zone) {
    return MK_TOPOLOGY.buildZoneMeterTree(mkConfiguratorState.assets, zone);
}

function mkGetMeterNumber(meter) {
    if (!meter) return null;
    const topologyCount = mkConfiguratorState.mode === 'parallel' ? mkConfiguratorState.cascadeLevels : 1;
    const index = mkGetAdditionalMeters().findIndex(item => item.id === meter.id);
    return index < 0 ? null : topologyCount + index + 1;
}

function mkGetMeterDetailIndex(meter) {
    if (!meter) return null;
    const topologyCount = mkConfiguratorState.mode === 'parallel' ? mkConfiguratorState.cascadeLevels : 1;
    const additionalIndex = mkGetAdditionalMeters().findIndex(item => item.id === meter.id);
    const meterNumber = additionalIndex < 0 ? null : topologyCount + additionalIndex + 1;
    return meterNumber ? meterNumber - 1 : null;
}

function mkGetAssetMeterNumber(asset) {
    const meter = mkGetMeterForAsset(asset);
    return meter ? mkGetMeterNumber(meter) : null;
}

function mkGetZoneLabel(index) {
    if (mkConfiguratorState.mode === 'parallel') return `Hinter Z${index + 1} · eigener Parallel-Messbereich`;
    return 'Hinter Z1 · Verbraucher- und Anlagenbereich';
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
    return MK_RULES.parsePowerNumber(value);
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
    const topologyMeters = mkConfiguratorState.mode === 'parallel'
        ? mkConfiguratorState.cascadeLevels
        : 1;
    const additionalMeterAssets = mkConfiguratorState.assets.filter(asset => asset.type === 'meter').length;
    return topologyMeters + additionalMeterAssets;
}

/** Liefert die fortlaufende Nummer eines eigenen Erzeugungszählers. */
function mkGetGenerationMeterNumber(asset) {
    if (!asset || asset.type !== 'generation' || !asset.generationMeter) return null;
    const attachedNumber = mkGetAssetMeterNumber(asset);
    if (attachedNumber) return attachedNumber;
    const generationMeters = mkConfiguratorState.assets.filter(item => item.type === 'generation' && item.generationMeter);
    const generationIndex = generationMeters.findIndex(item => item.id === asset.id);
    return generationIndex < 0 ? null : mkGetConfiguredMeterCount() + generationIndex + 1;
}

function mkGetGenerationAssetNumber(asset) {
    if (!asset || asset.type !== 'generation') return null;
    const storedNumber = Number(asset.generationNumber);
    if (Number.isFinite(storedNumber) && storedNumber > 0) return storedNumber;
    const generationAssets = mkConfiguratorState.assets.filter(item => item.type === 'generation');
    const index = generationAssets.findIndex(item => item.id === asset.id);
    return index < 0 ? null : index + 1;
}

function mkRenderAssetIcon(asset) {
    const meta = MK_ASSET_META[asset.type];
    if (asset.type === 'generation') {
        const number = mkGetGenerationAssetNumber(asset);
        return number ? `EA${number}` : meta.short;
    }
    if (asset.type === 'storage') return '<span class="mk-battery-symbol" aria-hidden="true"><span class="mk-battery-level"></span></span>';
    if (asset.type === 'steuve') {
        if (asset.steuveType === 'Wallbox') return '<span class="mk-charge-symbol" aria-hidden="true"><span class="mk-charge-bolt">⚡</span><span class="mk-charge-cable"></span></span>';
        if (asset.steuveType === 'Wärmepumpe') return '<span class="mk-fan-symbol" aria-hidden="true"><span class="mk-fan-blade mk-fan-blade-1"></span><span class="mk-fan-blade mk-fan-blade-2"></span><span class="mk-fan-blade mk-fan-blade-3"></span><span class="mk-fan-hub"></span></span>';
        const icons = { Klimaanlage: '❄' };
        return mkEscapeHtml(icons[asset.steuveType] || meta.short);
    }
    return mkEscapeHtml(meta.short);
}

function mkRenderInlineMeterLegacy(meter, asset) {
    const number = mkGetMeterNumber(meter);
    if (!number) return '';
    const dropHint = mkCanBuildCascadeAfterMeter(meter)
        ? 'Weitere Anlagen oder Zähler hierher ziehen'
        : 'Weitere Anlagen hierher ziehen · keine weitere Kaskadenstufe';
    return `<span class="mk-generation-meter mk-inline-meter" data-mk-meter-target="${mkEscapeHtml(meter.id)}" data-mk-meter-group-target="${mkEscapeHtml(meter.id)}" title="Zähler Z${number} vor ${mkEscapeHtml(asset?.name || 'Anlage')} · ${dropHint}" role="img" aria-label="Z${number}: Zähler vor ${mkEscapeHtml(asset?.name || 'Anlage')}; ${dropHint}"><b>Z${number}</b></span><span class="mk-generation-meter-link" aria-hidden="true"></span>`;
}

function mkRenderInlineMeter(meter, asset) {
    const number = mkGetMeterNumber(meter);
    if (!number) return '';
    const detailIndex = mkGetMeterDetailIndex(meter);
    const dropHint = mkCanBuildCascadeAfterMeter(meter)
        ? 'Weitere Anlagen oder Zähler hierher ziehen'
        : 'Weitere Anlagen hierher ziehen · keine weitere Kaskadenstufe';
    const label = `Z${number}: Zusatzzaehler vor ${asset?.name || 'Anlage'}; ${dropHint}`;
    return `<span class="mk-inline-meter-wrap" data-mk-meter-target="${mkEscapeHtml(meter.id)}" data-mk-meter-group-target="${mkEscapeHtml(meter.id)}" title="Z${number} vor ${mkEscapeHtml(asset?.name || 'Anlage')} · ${dropHint}"><span class="mk-meter-drop-hitbox" aria-hidden="true"></span><span class="mk-generation-meter mk-inline-meter" data-mk-select-meter="${detailIndex}" role="button" tabindex="0" aria-label="${mkEscapeHtml(label)}"><b>Z${number}</b></span><button type="button" class="mk-remove-meter" data-mk-remove-meter="${mkEscapeHtml(meter.id)}" title="Z${number} entfernen" aria-label="Zähler Z${number} entfernen">×</button></span><span class="mk-generation-meter-link" aria-hidden="true"></span>`;
}

function mkRenderAsset(asset, options = {}) {
    return MK_RENDER.renderAsset(asset, options);
}

function mkGetAssetsPerRow(assetCount = MK_ASSETS_PER_ROW) {
    const isNarrowViewport = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 480px)').matches;
    const normalizedAssetCount = Math.max(1, Number(assetCount) || 0);
    if (mkConfiguratorState.viewMode === 'detail') {
        return isNarrowViewport
            ? 1
            : MK_ASSETS_PER_ROW;
    }
    // Die einfache Skizze bildet eine elektrische Parallelschaltung ab.
    // Sie bleibt daher unabhängig von der Bildschirmbreite eine horizontale
    // Sammelschiene; für breite Konzepte stehen Zoom und Verschieben bereit.
    return normalizedAssetCount;
}

function mkGetSimpleCanvasMinimumWidth(assetCount) {
    return 128 + (Math.max(1, Number(assetCount) || 0) * 66);
}

function mkGetParallelBranchWidth(assetCount) {
    const normalizedAssetCount = Math.max(0, Number(assetCount) || 0);
    const columns = mkGetAssetsPerRow(Math.max(1, normalizedAssetCount));
    const isSimple = mkConfiguratorState.viewMode === 'simple';
    const cardWidth = isSimple ? 56 : 132;
    const cardGap = isSimple ? 9.6 : 16;
    const leftOffset = isSimple ? 12.8 : 0;
    const rightPadding = isSimple ? 13 : 20;
    const dropZonePadding = isSimple ? 32 : 40;
    const rowWidth = normalizedAssetCount
        ? (columns * cardWidth) + (Math.max(0, columns - 1) * cardGap)
        : 0;
    // The parallel strand starts at the left edge of its own branch. The
    // width must include the object row and drop-zone padding so the branch
    // stays compact without overlapping its neighbor.
    const contentWidth = rowWidth + leftOffset + rightPadding + dropZonePadding;
    // Ein leerer Parallelzweig braucht nur eine kleine, sichtbare Ablagefläche.
    // Die bisherige Mindestbreite des gefüllten Zweigs wurde sonst auch auf
    // leere Zweige übertragen und erzeugte große ungenutzte Bereiche.
    const minimumWidth = normalizedAssetCount
        ? (isSimple ? 148 : 300)
        : (isSimple ? 148 : 206);
    return Math.max(minimumWidth, contentWidth);
}

function mkGetZoneMeterDepth(zone) {
    const getDepth = rail => rail.children.reduce((maximum, child) => Math.max(maximum, getDepth(child)), rail.depth || 0);
    return getDepth(mkBuildZoneMeterTree(zone));
}

function mkGetParallelLayoutMetrics(meterCount) {
    const branchCount = Math.max(1, Number(meterCount) || 1);
    // Parallelzweige stehen nebeneinander. Eine pauschale Einrueckung pro
    // Rail-Tiefe hat den Nachbarzweig bei jeder Unter-Sammelschiene zu weit
    // nach rechts geschoben. Die tatsaechliche HTML-Ausdehnung wird nach dem
    // Rendern vermessen; die Startbreite bleibt deshalb bewusst neutral.
    const railIndent = 0;
    const branchWidths = Array.from({ length: branchCount }, (_, index) => {
        const zone = `parallel-${index}`;
        return mkGetParallelBranchWidth(mkGetZoneAssets(zone).length) + (mkGetZoneMeterDepth(zone) * railIndent);
    });
    const branchGap = 16;
    const minimumBranchWidth = Math.max(...branchWidths);
    return {
        branchCount,
        branchWidths,
        minimumBranchWidth,
        gridTemplateColumns: branchWidths.map(width => `${width}px`).join(' '),
        minimumCanvasWidth: branchWidths.reduce((total, width) => total + width, 0) + (Math.max(0, branchCount - 1) * branchGap) + 12
    };
}

function mkGetParallelCanvasMinimumWidth(meterCount) {
    return mkGetParallelLayoutMetrics(meterCount).minimumCanvasWidth;
}

/*
 * Wenn ein anlagenbezogener Zähler von einer Einzelmessung zu einem
 * gemeinsamen Messpunkt erweitert wird, wandert seine Zielanlage in den
 * Unter-Rail. Die Position darf im Eltern-Rail trotzdem nicht frei werden:
 * Sonst rücken die nachfolgenden Karten nach links und der Sammelschienen-
 * String läuft durch die falsche Anlage. Der Eintrag ist bewusst unsichtbar;
 * er reserviert nur dieselbe Spalte im Layout.
 */
function mkGetReservedMeterSlots(rail) {
    const visibleAssetIds = new Set((rail.assets || []).map(asset => asset.id));
    const assetOrder = assetId => mkConfiguratorState.assets.findIndex(asset => asset.id === assetId);
    return (rail.children || [])
        .map(child => ({
            child,
            meter: mkGetAdditionalMeters().find(meter => meter.id === child.meterId)
        }))
        .filter(entry => entry.child.meterScope === 'asset' && entry.meter?.id && entry.meter.targetAssetId)
        .map(entry => ({
            id: entry.meter.id,
            targetAssetId: entry.meter.targetAssetId,
            order: assetOrder(entry.meter.targetAssetId)
        }))
        .filter(slot => slot.order >= 0 && !visibleAssetIds.has(slot.targetAssetId));
}

function mkGetRailEntries(rail) {
    const entries = (rail.assets || []).map(asset => ({
        kind: 'asset',
        asset,
        order: mkConfiguratorState.assets.findIndex(item => item.id === asset.id)
    }));
    const slots = mkGetReservedMeterSlots(rail).map(slot => ({ kind: 'reserved-slot', slot, order: slot.order }));
    return [...entries, ...slots].sort((first, second) => {
        if (first.order !== second.order) return first.order - second.order;
        // Bei gleicher Position bleibt das reservierte Feld vor einer
        // eventuell noch sichtbaren Karte, damit der Platz eindeutig dem
        // vorgeschalteten Zähler gehört.
        return first.kind === second.kind ? 0 : first.kind === 'reserved-slot' ? -1 : 1;
    });
}

function mkRenderReservedMeterSlot(slot) {
    return MK_RENDER.renderReservedMeterSlot(slot);
}

function mkRenderAssetRail(rail, isRoot = false) {
    return MK_RENDER.renderAssetRail(rail, isRoot);
}

function mkRenderAssetRows(assets, zoneOverride = '') {
    const zone = zoneOverride || assets[0]?.zone || mkDefaultZone();
    const tree = mkBuildZoneMeterTree(zone);
    // Auch eine leere, bewusst erhaltene Unterkaskade braucht ein DOM-Rail,
    // damit Zähler, Achse und Sammelschienenknoten sichtbar bleiben.
    if (!assets.length && !tree.children.length) return '';
    return mkRenderAssetRail(tree, true);
}

function mkRenderDropZone(zone, index) {
    const assets = mkGetZoneAssets(zone);
    const hasMeterGroups = mkBuildZoneMeterTree(zone).children.length > 0;
    const hasEmptyMeterRail = mkGetAdditionalMeters().some(meter => meter.zone === zone && meter.keepEmptyRail);
    // Auch ein struktureller Basis-Zähler ohne Anlagen ist ein sichtbarer
    // Unter-Rail. Er darf beim Befüllen der oberen Schiene nicht mit der
    // leeren Einfügezone verschwinden.
    const hasRenderableRail = assets.length > 0 || hasMeterGroups || hasEmptyMeterRail;
    const hasWrappedRows = assets.length > mkGetAssetsPerRow(assets.length);
    const rowsMarkup = hasRenderableRail ? mkRenderAssetRows(assets, zone) : '<div class="mk-empty-zone">Noch leer</div>';
    const dropZoneClass = `mk-drop-zone ${hasRenderableRail ? 'filled' : 'empty'}`;
    return `
        <div class="${dropZoneClass}" data-mk-zone="${mkEscapeHtml(zone)}" aria-label="${mkEscapeHtml(mkGetZoneLabel(index))}" data-mk-layout-container="true">
            <div class="mk-zone-assets ${mkConfiguratorState.viewMode === 'detail' ? 'detail-mode' : 'simple-mode'}${hasMeterGroups ? ' has-meter-groups' : ''}"><span class="mk-zone-junction" data-mk-node-kind="SK" aria-hidden="true"></span>${hasWrappedRows ? '<span class="mk-zone-wrap-strand" aria-hidden="true"></span>' : ''}${rowsMarkup}</div>
        </div>
    `;
}

function mkGetBaseMeterZone(index) {
    const normalizedIndex = Math.max(0, Number(index) || 0);
    if (mkConfiguratorState.mode === 'parallel') return `parallel-${Math.min(mkConfiguratorState.cascadeLevels - 1, normalizedIndex)}`;
    return 'single-main';
}

function mkResolveDropZone(zone, baseZone, targetAsset, targetMeter) {
    // Die konkrete Zielanlage ist immer die stärkste Information. Danach
    // folgt der sichtbare Zusatzzaehler; nur ohne beides darf der Basiszaehler
    // den Bereich bestimmen. So bleibt ein Drop auf einer unteren Sammelschiene
    // auch in Kaskade und Parallelmessung in diesem Messbereich.
    return targetAsset?.zone || targetMeter?.zone || baseZone || zone || mkDefaultZone();
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
    const baseMeterZone = mkGetBaseMeterZone(index);
    const meterGeometryStyle = `style="--mk-meter-to-junction-link-px: ${MK_LAYOUT_GEOMETRY.meterToJunctionLinkPx}px;"`;
    const baseMeterAttributes = `data-mk-base-meter-target="${index}" data-mk-zone="${mkEscapeHtml(baseMeterZone)}" title="Anlagen oder Zusatzzähler hinter Z${index + 1} anschließen"`;
    if (mkConfiguratorState.viewMode === 'detail') {
        const meterSummary = mkRenderMeterDetailsSummary(index);
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
        <p class="mk-meter-assignment-hint">Einen eigenen Zähler setzt du per Drag &amp; Drop aus der Bausteinleiste auf diese Anlage.</p>
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
        asset.type === 'meter' ? { label: 'Messbereich', value: asset.meterScope === 'base' ? 'Hinter Basiszähler' : asset.meterScope === 'asset' ? 'Vor einzelner Anlage' : 'Vor Anlagengruppe' } : null,
        asset.type === 'meter' ? { label: 'Zähler vor', value: asset.meterScope === 'base' ? 'Basiszähler der Messstufe' : asset.meterScope === 'asset' ? (mkConfiguratorState.assets.find(item => item.id === asset.targetAssetId)?.name || 'Einzelanlage') : 'Anlagengruppe' } : null,
        asset.type === 'generation' ? { label: 'Energieträger', value: asset.energyCarrier } : null,
        asset.type === 'generation' ? { label: 'Leistung', value: asset.power } : null,
        asset.type === 'generation' ? { label: 'Inbetriebnahme', value: asset.commissioningDate } : null,
        asset.type === 'generation' ? { label: 'Erzeugungszähler', value: asset.generationMeter ? `Ja · Z${mkGetGenerationMeterNumber(asset)}` : (includeEmpty ? 'Nein' : '') } : null,
        ['generation', 'consumer', 'steuve', 'storage', 'nsh'].includes(asset.type) ? { label: 'Zähler davor', value: mkGetAssetMeterNumber(asset) ? `Ja · Z${mkGetAssetMeterNumber(asset)}` : (includeEmpty ? 'Nein' : '') } : null,
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
    const layoutMetrics = mkGetParallelLayoutMetrics(mkConfiguratorState.cascadeLevels);
    const branches = [];
    for (let index = 0; index < mkConfiguratorState.cascadeLevels; index += 1) {
        const branchWidth = layoutMetrics.branchWidths[index] || layoutMetrics.minimumBranchWidth;
        branches.push(`
            <div class="mk-parallel-branch" style="--mk-parallel-branch-width: ${branchWidth}px;">
                <span class="mk-parallel-branch-connector" aria-hidden="true"></span>
                ${mkRenderMeterLayout(index)}
                ${mkRenderDropZone(`parallel-${index}`, index)}
            </div>
        `);
    }
    return `
        <div class="mk-parallel-stack" style="--mk-parallel-min-width: ${layoutMetrics.minimumCanvasWidth}px; --mk-parallel-count: ${layoutMetrics.branchCount}; --mk-parallel-branch-width: ${layoutMetrics.minimumBranchWidth}px; --mk-parallel-grid-template-columns: ${layoutMetrics.gridTemplateColumns};">
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

function mkRenderCanvasStage(topologyMarkup) {
    return `
        <div class="mk-canvas-stage ${mkConfiguratorState.viewMode === 'detail' ? 'detail-mode' : 'simple-mode'}" style="--mk-canvas-zoom: ${mkConfiguratorState.canvasZoom};">
            <svg class="mk-connector-layer" aria-hidden="true" focusable="false" preserveAspectRatio="none"></svg>
            <div class="mk-topology-content">${topologyMarkup}</div>
        </div>
    `;
}

function mkRenderCanvas() {
    if (!mkElements.canvas) return;
    if (mkConfiguratorState.mode === 'parallel') {
        mkElements.canvas.innerHTML = mkRenderCanvasStage(mkRenderParallelCanvas());
        return;
    }
    if (mkConfiguratorState.mode === 'single') {
        const minimumCanvasWidth = mkGetSimpleCanvasMinimumWidth(mkGetZoneAssets('single-main').length);
        mkElements.canvas.innerHTML = mkRenderCanvasStage(`
            <div class="mk-single-stack" style="--mk-single-min-width: ${minimumCanvasWidth}px;">
                ${mkRenderHakMeterRow()}
                ${mkRenderDropZone('single-main', 0)}
            </div>
        `);
        return;
    }
}

function mkValidation() {
    return MK_RULES.evaluate(mkConfiguratorState, {
        getZoneAssets: mkGetZoneAssets,
        parsePower: mkGetPowerNumber,
        storageInfoText: MK_STORAGE_INFO_TEXT
    });
}

function mkRenderValidation() {
    if (!mkElements.validation || !mkElements.statusBadge) return;
    const checks = mkValidation();
    mkElements.validation.innerHTML = checks.map(check => `<div class="mk-validation-item ${check.level}"><span>${check.level === 'ok' ? '✓' : check.level === 'error' ? '!' : check.level === 'warning' ? '△' : '·'}</span><p>${mkEscapeHtml(check.text)}</p></div>`).join('');
    const hasError = checks.some(check => check.level === 'error');
    const hasWarning = checks.some(check => check.level === 'warning');
    const state = hasError ? 'error' : hasWarning ? 'warning' : checks.some(check => check.level === 'ok') ? 'ok' : 'neutral';
    const labels = { error: 'Prüfen', warning: 'Hinweis', ok: 'Unauffällig', neutral: 'Bereit' };
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
}

function mkGetStageScale(stage) {
    return MK_GEOMETRY.getStageScale(stage);
}

function mkHasNestedMeterRail(zone) {
    return Boolean(zone?.querySelector('.mk-meter-rail.meter-group-rail, .mk-asset-row[data-mk-meter-group]'));
}

function mkIsSingleDirectAssetWithoutMeterGroup(zone, branches) {
    // Die Sammelschiene darf nur bei einer wirklich isolierten Einzelanlage
    // entfallen. Ein leerer Unter-Rail ist bereits ein fachlicher Messpunkt.
    return branches.length === 1 && !zone.querySelector('.mk-meter-rail.meter-group-rail, .mk-asset-row[data-mk-meter-group]');
}

function mkUpdateSimpleAssetStrands() {
    if (!mkElements.canvas || mkConfiguratorState.viewMode !== 'simple') return;
    const stage = mkElements.canvas.querySelector('.mk-canvas-stage');
    const scale = mkGetStageScale(stage);
    mkElements.canvas.querySelectorAll('.mk-zone-assets.simple-mode').forEach(zone => {
        const junction = zone.querySelector('.mk-zone-junction');
        const primaryRow = zone.querySelector('.mk-asset-row:not([data-mk-meter-group])');
        const branches = primaryRow ? [...primaryRow.querySelectorAll('.mk-asset-branch')] : [];
        if (!junction) return;
        if (!branches.length) {
            zone.style.setProperty('--mk-zone-bus-width-px', '0px');
            return;
        }
        // Bei genau einer Anlage existiert noch keine Sammelschiene. Die
        // direkte SVG-Leitung übernimmt den Anschluss; eine dekorative
        // Pseudo-Schiene darf deshalb auch in der mobilen Ansicht nicht
        // wieder als kurzer Zusatzstrang erscheinen.
        if (mkIsSingleDirectAssetWithoutMeterGroup(zone, branches)) {
            zone.style.setProperty('--mk-zone-bus-width-px', '0px');
            return;
        }
        const junctionRect = junction.getBoundingClientRect();
        const lastBranch = branches[branches.length - 1];
        const lastBranchRect = lastBranch?.getBoundingClientRect();
        const originX = junctionRect.left + (junctionRect.width / 2);
        const endX = lastBranchRect.left + (lastBranchRect.width / 2);
        const busWidth = Math.max(0, (endX - originX) / scale);
        zone.style.setProperty('--mk-zone-bus-width-px', `${busWidth}px`);
    });
}

function mkUpdateMeterGroupOffsets() {
    if (!mkElements.canvas) return;
    const stage = mkElements.canvas.querySelector('.mk-canvas-stage');
    if (!stage) return;
    const scale = mkGetStageScale(stage);

    const getRailMeterElement = rail => {
        const meter = mkGetAdditionalMeters().find(item => item.id === rail.dataset.mkMeterRail);
        if (!meter) return null;
        const railNode = rail.querySelector(`:scope > [data-mk-meter-rail-node="${meter.id}"]`);
        if (railNode) return railNode;
        const target = rail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`);
        return target?.closest('.mk-asset-branch')?.querySelector('.mk-generation-meter') || null;
    };
    const getCenterX = element => {
        const rect = element?.getBoundingClientRect?.();
        return rect ? rect.left + (rect.width / 2) : null;
    };

    const resetCollisionShifts = zone => {
        zone.querySelectorAll('.mk-asset-row > .mk-asset-branch').forEach(branch => {
            branch.style.setProperty('--mk-branch-collision-shift-px', '0px');
        });
        zone.querySelectorAll('.mk-meter-rail.single-asset-rail > .mk-asset-row').forEach(row => {
            row.style.setProperty('--mk-single-asset-row-align-px', '0px');
        });
    };
    const alignSingleAssetRails = zone => {
        zone.querySelectorAll('.mk-meter-rail.single-asset-rail').forEach(rail => {
            const meterNode = rail.querySelector(':scope > .mk-rail-meter-node');
            const row = rail.querySelector(':scope > .mk-asset-row');
            const branch = row?.querySelector(':scope > .mk-asset-branch');
            if (!meterNode || !row || !branch) return;
            const meterRect = meterNode.getBoundingClientRect?.();
            const branchRect = branch.getBoundingClientRect?.();
            if (!meterRect || !branchRect) return;
            const meterCenter = meterRect.left + (meterRect.width / 2);
            const branchCenter = branchRect.left + (branchRect.width / 2);
            const correction = (meterCenter - branchCenter) / scale;
            row.style.setProperty('--mk-single-asset-row-align-px', `${correction}px`);
        });
    };
    const directRailCells = rail => [...rail.children]
        .filter(child => child.matches('.mk-asset-row'))
        .flatMap(row => [...row.children]
            .filter(child => child.matches('.mk-asset-branch, .mk-asset-slot-placeholder')));
    const railVisualRight = rail => {
        const candidates = [rail, ...rail.querySelectorAll('.mk-asset-branch, .mk-asset-slot-placeholder, .mk-rail-meter-node')];
        return candidates.reduce((right, element) => {
            const rect = element.getBoundingClientRect?.();
            return rect ? Math.max(right, rect.right) : right;
        }, Number.NEGATIVE_INFINITY);
    };
    const applyRailSiblingCollisionShifts = zone => {
        const rootRail = zone.querySelector(':scope > .mk-meter-rail.root-rail');
        if (!rootRail) return;
        const rails = [rootRail, ...rootRail.querySelectorAll('.mk-meter-rail.meter-group-rail')]
            .sort((first, second) => Number(first.dataset.mkDepth || 0) - Number(second.dataset.mkDepth || 0));
        const meterById = new Map(mkGetAdditionalMeters().map(meter => [meter.id, meter]));
        const alignAssetRailToTarget = (parentRail, child, meter) => {
            const targetCell = parentRail.querySelector(`:scope > .mk-asset-row [data-mk-reserved-meter-slot="${meter.id}"]`)
                || parentRail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`)?.closest('.mk-asset-branch');
            const meterElement = getRailMeterElement(child);
            const targetRect = targetCell?.getBoundingClientRect?.();
            const meterRect = meterElement?.getBoundingClientRect?.();
            if (!targetRect || !meterRect) return;
            const desiredCenter = targetRect.left + (targetRect.width / 2);
            const currentCenter = meterRect.left + (meterRect.width / 2);
            const currentOffset = Number.parseFloat(child.style.getPropertyValue('--mk-meter-rail-x-offset-px')) || 0;
            const correction = (desiredCenter - currentCenter) / scale;
            if (Math.abs(correction) > 0.1) {
                child.style.setProperty('--mk-meter-rail-x-offset-px', `${currentOffset + correction}px`);
            }
        };
        for (let pass = 0; pass < 3; pass += 1) {
            rails.forEach(parentRail => {
                const cells = directRailCells(parentRail);
                if (!cells.length) return;
                const children = [...parentRail.children]
                    .filter(child => child.matches('.mk-meter-rail.meter-group-rail'))
                    .map(child => ({ child, meter: meterById.get(child.dataset.mkMeterRail) }))
                    .filter(entry => entry.meter?.meterScope === 'asset');
                children.forEach(({ child, meter }) => alignAssetRailToTarget(parentRail, child, meter));
                // Unter-Rails desselben Elternbusses brauchen einen eigenen
                // horizontalen Korridor. Sonst fuehrt der senkrechte Abgang
                // von Z5/Z6 durch die Kartenreihe von Z3/Z4, sobald diese
                // Rails selbst mehrere Anlagen enthalten. Der gesamte
                // vorherige Rail wird deshalb als belegte Breite behandelt.
                let previousRailRight = Number.NEGATIVE_INFINITY;
                children.forEach(({ child }) => {
                    const meterElement = getRailMeterElement(child);
                    const meterRect = meterElement?.getBoundingClientRect?.();
                    if (!meterRect) return;
                    const currentCenter = meterRect.left + (meterRect.width / 2);
                    const requiredCenter = previousRailRight + (MK_LAYOUT_GEOMETRY.railSiblingClearancePx * scale);
                    if (Number.isFinite(previousRailRight) && currentCenter < requiredCenter) {
                        const currentOffset = Number.parseFloat(child.style.getPropertyValue('--mk-meter-rail-x-offset-px')) || 0;
                        child.style.setProperty('--mk-meter-rail-x-offset-px', `${currentOffset + ((requiredCenter - currentCenter) / scale)}px`);
                    }
                    previousRailRight = Math.max(previousRailRight, railVisualRight(child));
                });
                children.forEach(({ child, meter }) => {
                    const targetCell = parentRail.querySelector(`:scope > .mk-asset-row [data-mk-reserved-meter-slot="${meter.id}"]`)
                        || parentRail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`)?.closest('.mk-asset-branch');
                    const targetIndex = targetCell ? cells.indexOf(targetCell) : -1;
                    if (targetIndex < 0) return;
                    const nextBranch = cells.slice(targetIndex + 1).find(cell => cell.matches('.mk-asset-branch'));
                    if (!nextBranch) return;
                    const railRight = railVisualRight(child);
                    const nextRect = nextBranch.getBoundingClientRect();
                    const requiredShift = MK_GEOMETRY.getRailSiblingCollisionShift(
                        railRight,
                        nextRect.left,
                        MK_LAYOUT_GEOMETRY.railSiblingClearancePx * scale
                    ) / scale;
                    if (requiredShift <= 0.1) return;
                    const currentShift = Number.parseFloat(nextBranch.style.getPropertyValue('--mk-branch-collision-shift-px')) || 0;
                    if (requiredShift > currentShift + 0.1) {
                        nextBranch.style.setProperty('--mk-branch-collision-shift-px', `${requiredShift}px`);
                    }
                });
            });
        }
    };

    stage.querySelectorAll('.mk-zone-assets.has-meter-groups').forEach(zone => {
        resetCollisionShifts(zone);
        // Ein gemeinsamer Zusatz-Zähler ist eine lokale Unterkaskade. Die
        // zweite Sammelschiene darf nicht hinter alle oberen Anlagen springen;
        // sie startet an ihrem eigenen Messpunkt. Die SVG-Leitung führt erst
        // unterhalb der oberen Reihe zu diesem Punkt und bleibt dadurch frei.
        zone.querySelectorAll('.mk-asset-row[data-mk-meter-group]').forEach(row => {
            row.style.setProperty('--mk-group-row-offset-px', `${MK_LAYOUT_GEOMETRY.groupStartOffsetPx}px`);
        });

        const rootAnchor = zone.querySelector(':scope > .mk-zone-junction');
        const rails = [...zone.querySelectorAll(':scope > .mk-meter-rail.root-rail .mk-meter-rail.meter-group-rail')]
            .sort((first, second) => Number(first.dataset.mkDepth || 0) - Number(second.dataset.mkDepth || 0));

        const directBranches = rail => [...rail.children]
            .filter(child => child.matches('.mk-asset-row'))
            .flatMap(row => [...row.children].filter(child => child.matches('.mk-asset-branch')));
        const assetOrder = assetId => mkConfiguratorState.assets.findIndex(asset => asset.id === assetId);
        const getGroupAnchorCenter = (rail, parentRail, meterElement, meter) => {
            if (!parentRail || meter?.meterScope !== 'asset') return null;
            // Ein aufgeklappter Anlagenzaehler ersetzt seine Zielkarte im
            // Elternrail durch einen unsichtbaren Reservierungsplatz. Dieser
            // Platz ist die fachlich exakte alte Achse. Ohne diesen Vorrang
            // wurde bei mehreren Zaehlern ohne verbleibende direkte Karte auf
            // die Root-Achse zurueckgefallen; der innere Zaehler sprang dann
            // scheinbar in eine andere Sammelschiene.
            const targetCell = parentRail.querySelector(`:scope > .mk-asset-row [data-mk-reserved-meter-slot="${meter.id}"]`)
                || parentRail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`)?.closest('.mk-asset-branch');
            const targetRect = targetCell?.getBoundingClientRect?.();
            const meterRect = meterElement?.getBoundingClientRect?.();
            if (targetRect && meterRect) {
                return {
                    desiredCenter: targetRect.left + (targetRect.width / 2),
                    currentCenter: meterRect.left + (meterRect.width / 2)
                };
            }
            const targetOrder = assetOrder(meter.targetAssetId);
            if (targetOrder < 0) return null;
            const branches = directBranches(parentRail)
                .map(branch => ({
                    branch,
                    order: assetOrder(branch.querySelector('[data-mk-asset-id]')?.dataset.mkAssetId)
                }))
                .filter(entry => entry.order >= 0);
            if (!branches.length) return null;

            const before = branches.filter(entry => entry.order < targetOrder);
            const after = branches.filter(entry => entry.order > targetOrder);
            const row = branches[0].branch.parentElement;
            const gap = Number.parseFloat(getComputedStyle(row).columnGap || getComputedStyle(row).gap || '0') || 0;
            const firstRect = branches[0].branch.getBoundingClientRect();
            const defaultStep = firstRect.width + gap;
            const stepFrom = (first, second) => {
                if (!first || !second) return defaultStep;
                const firstRect = first.branch.getBoundingClientRect();
                const secondRect = second.branch.getBoundingClientRect();
                return Math.max(1, secondRect.left - firstRect.left);
            };
            let desiredCenter = null;
            if (before.length) {
                const last = before[before.length - 1];
                const previous = before[before.length - 2];
                const rect = last.branch.getBoundingClientRect();
                desiredCenter = rect.left + (rect.width / 2) + stepFrom(previous, last);
            } else if (after.length) {
                const first = after[0];
                const next = after[1];
                const rect = first.branch.getBoundingClientRect();
                desiredCenter = rect.left + (rect.width / 2) - stepFrom(first, next);
            }
            if (!Number.isFinite(desiredCenter)) return null;
            const currentMeterRect = meterElement?.getBoundingClientRect?.();
            return currentMeterRect ? { desiredCenter, currentCenter: currentMeterRect.left + (currentMeterRect.width / 2) } : null;
        };
        rails.forEach(rail => {
            const parentRail = rail.parentElement?.closest('.mk-meter-rail');
            // Der direkte Elternknoten einer ersten Unter-Sammelschiene ist die
            // Root-Schiene selbst. Diese hat keinen eigenen Zähleranker; in diesem
            // Fall muss der Zonen-Knotenpunkt als Bezug dienen. Erst ab der
            // zweiten Unterebene ist der Zähler der Elternschiene der Bezugspunkt.
            const parentAnchor = parentRail && !parentRail.classList.contains('root-rail')
                ? getRailMeterElement(parentRail)
                : rootAnchor;
            const meterElement = getRailMeterElement(rail);
            // Immer von der unverformten Ausgangslage messen. Ohne diesen
            // Reset wurde der vorherige CSS-Transform bei der nächsten
            // Geometrie-Runde erneut eingerechnet; dadurch sprang der Rail
            // abwechselnd auf und neben die Messachse.
            rail.style.setProperty('--mk-meter-rail-x-offset-px', '0px');
            const meterX = getCenterX(meterElement);
            const meter = mkGetAdditionalMeters().find(item => item.id === rail.dataset.mkMeterRail);
            const groupAnchor = getGroupAnchorCenter(rail, parentRail, meterElement, meter);
            // Anlagenbezogene Zähler bleiben am ursprünglichen Anlagenplatz.
            // Nur Basiszähler einer Kaskade werden auf die Eltern-Messachse
            // ausgerichtet. Ohne diese Unterscheidung sprang Z6 beim zweiten
            // Anschluss zurück auf die Root-Achse.
            const parentX = getCenterX(parentAnchor);
            const desiredX = groupAnchor?.desiredCenter ?? parentX;
            const currentX = groupAnchor?.currentCenter ?? meterX;
            const offset = desiredX !== null && currentX !== null
                ? (desiredX - currentX) / scale
                : 0;
            rail.style.setProperty('--mk-meter-rail-x-offset-px', `${offset}px`);
            if (!groupAnchor && parentX !== null && meterElement) {
                const alignedX = getCenterX(meterElement);
                const correction = alignedX === null ? 0 : (parentX - alignedX) / scale;
                if (Math.abs(correction) > 0.1) {
                    rail.style.setProperty('--mk-meter-rail-x-offset-px', `${offset + correction}px`);
                }
            }
        });
        // Einzelabgänge werden erst nach allen Rail-Versätzen gemessen. So
        // bleibt die Ausrichtung auch in tieferen Unter-Sammelschienen und bei
        // unterschiedlichen Kartenbreiten identisch.
        alignSingleAssetRails(zone);
        applyRailSiblingCollisionShifts(zone);
    });
}

function mkUpdateParallelBus() {
    if (!mkElements.canvas || mkConfiguratorState.mode !== 'parallel') return;
    const stage = mkElements.canvas.querySelector('.mk-canvas-stage');
    const bus = stage?.querySelector('.mk-parallel-branches');
    const branches = bus
        ? [...bus.children].filter(child => child.matches('.mk-parallel-branch'))
        : [];
    if (!stage || !bus || !branches.length) return;

    const scale = mkGetStageScale(stage);
    // Die Breite eines Parallelzweigs darf nicht aus einer pauschalen
    // Tiefen-Konstante abgeleitet werden. Eine Unter-Sammelschiene kann je
    // nach Zielanlage deutlich unterschiedlich weit nach rechts reichen.
    // Wir vermessen deshalb die sichtbare HTML-Geometrie und erweitern nur
    // den betroffenen Grid-Track. So bleibt Z2 neben Z1, solange kein echter
    // Inhalt Platz benötigt, und verschiebt sich nur um die reale Kollision.
    const declaredTrackWidth = branch => {
        const value = Number.parseFloat(branch.style.getPropertyValue('--mk-parallel-branch-width'));
        return Number.isFinite(value) ? value : 0;
    };
    const visualRight = branch => [branch, ...branch.querySelectorAll('.mk-asset-branch, .mk-asset-slot-placeholder, .mk-meter-rail, .mk-rail-meter-node')]
        .reduce((right, element) => {
            const rect = element.getBoundingClientRect?.();
            return rect ? Math.max(right, rect.right) : right;
        }, Number.NEGATIVE_INFINITY);
    const fitBranchTracks = () => {
        const widths = branches.map(branch => {
            const rect = branch.getBoundingClientRect();
            const required = Number.isFinite(rect.left) && Number.isFinite(visualRight(branch))
                ? ((visualRight(branch) - rect.left) / scale) + 16
                : 0;
            return Math.max(declaredTrackWidth(branch), required);
        });
        bus.style.setProperty('--mk-parallel-grid-template-columns', widths.map(width => `${Math.ceil(width)}px`).join(' '));
    };
    // Ein zweiter Durchlauf berücksichtigt die neue Position eines
    // nachfolgenden Zweigs, nachdem ein vorheriger Track erweitert wurde.
    fitBranchTracks();
    fitBranchTracks();
    const busRect = bus.getBoundingClientRect();
    const firstAnchor = branches[0].querySelector('.mk-meter-node')
        || branches[0].querySelector('.mk-parallel-branch-connector')
        || branches[0];
    const lastAnchor = branches[branches.length - 1].querySelector('.mk-meter-node')
        || branches[branches.length - 1].querySelector('.mk-parallel-branch-connector')
        || branches[branches.length - 1];
    const firstRect = firstAnchor.getBoundingClientRect();
    const lastRect = lastAnchor.getBoundingClientRect();
    const firstCenter = firstRect.left + (firstRect.width / 2);
    const lastCenter = lastRect.left + (lastRect.width / 2);
    const left = Math.max(0, (firstCenter - busRect.left) / scale);
    const width = Math.max(0, (lastCenter - firstCenter) / scale);
    bus.style.setProperty('--mk-parallel-bus-left-px', `${left}px`);
    bus.style.setProperty('--mk-parallel-bus-width-px', `${width}px`);
    const stack = stage.querySelector('.mk-parallel-stack');
    const feed = stage.querySelector('.mk-parallel-feed');
    if (stack && feed) {
        const stackRect = stack.getBoundingClientRect();
        const busCenter = (firstCenter + lastCenter) / 2;
        const stackCenter = stackRect.left + (stackRect.width / 2);
        stack.style.setProperty('--mk-parallel-feed-offset-px', `${(busCenter - stackCenter) / scale}px`);
    }
}

function mkUpdateDynamicConnections() {
    return MK_CONNECTIONS.updateDynamicConnections();
}
function mkScheduleConnectorGeometry() {
    window.cancelAnimationFrame(mkGeometryFrame);
    mkGeometryFrame = window.requestAnimationFrame(() => {
        mkGeometryFrame = 0;
        mkUpdateMeterGroupOffsets();
        mkUpdateSimpleAssetStrands();
        mkUpdateParallelBus();
        mkUpdateDynamicConnections();
        mkCenterParallelViewport();
    });
}

function mkRenderZoomControls() {
    const percentage = `${Math.round(mkConfiguratorState.canvasZoom * 100)} %`;
    if (mkElements.zoomLevel) mkElements.zoomLevel.textContent = percentage;
    document.querySelectorAll('[data-mk-zoom]').forEach(button => {
        const action = button.dataset.mkZoom;
        button.disabled = (action === 'out' && mkConfiguratorState.canvasZoom <= MK_CANVAS_ZOOM.min)
            || (action === 'in' && mkConfiguratorState.canvasZoom >= MK_CANVAS_ZOOM.max);
    });
}

function mkApplyCanvasZoom() {
    const stage = mkElements.canvas?.querySelector('.mk-canvas-stage');
    if (stage) stage.style.setProperty('--mk-canvas-zoom', String(mkConfiguratorState.canvasZoom));
    mkRenderZoomControls();
    mkScheduleConnectorGeometry();
}

function mkChangeCanvasZoom(action) {
    if (action === 'out') {
        mkConfiguratorState.canvasZoom = Math.max(MK_CANVAS_ZOOM.min, Number((mkConfiguratorState.canvasZoom - MK_CANVAS_ZOOM.step).toFixed(2)));
        mkApplyCanvasZoom();
        return;
    }
    if (action === 'in') {
        mkConfiguratorState.canvasZoom = Math.min(MK_CANVAS_ZOOM.max, Number((mkConfiguratorState.canvasZoom + MK_CANVAS_ZOOM.step).toFixed(2)));
        mkApplyCanvasZoom();
        return;
    }
    if (action === 'reset') {
        mkConfiguratorState.canvasZoom = 1;
        mkApplyCanvasZoom();
        return;
    }
    if (action !== 'fit') return;

    mkConfiguratorState.canvasZoom = 1;
    mkApplyCanvasZoom();
    window.requestAnimationFrame(() => {
        const topology = mkElements.canvas?.querySelector('.mk-topology-content');
        if (!topology || !mkElements.canvas) return;
        const availableWidth = Math.max(1, mkElements.canvas.clientWidth - 28);
        const requiredWidth = Math.max(1, topology.scrollWidth);
        mkConfiguratorState.canvasZoom = Math.min(1, Math.max(MK_CANVAS_ZOOM.min, availableWidth / requiredWidth));
        mkApplyCanvasZoom();
    });
}

function mkObserveConnectorGeometry() {
    if (!mkElements.canvas || typeof ResizeObserver === 'undefined') return;
    mkGeometryObserver?.disconnect();
    mkGeometryObserver = new ResizeObserver(() => mkScheduleConnectorGeometry());
    mkGeometryObserver.observe(mkElements.canvas);
    const stage = mkElements.canvas.querySelector('.mk-canvas-stage');
    if (stage) mkGeometryObserver.observe(stage);
}

function mkCenterParallelViewport() {
    if (!mkElements.canvas || mkConfiguratorState.mode !== 'parallel') return;
    const layoutKey = `${mkConfiguratorState.mode}:${mkConfiguratorState.canvasZoom}:${mkElements.canvas.scrollWidth}`;
    if (mkElements.canvas.dataset.mkViewportLayout === layoutKey) return;
    mkElements.canvas.scrollLeft = Math.max(0, (mkElements.canvas.scrollWidth - mkElements.canvas.clientWidth) / 2);
    mkElements.canvas.dataset.mkViewportLayout = layoutKey;
}

function mkEndCanvasPan(event) {
    if (!mkCanvasPan) return;
    const canvas = mkElements.canvas;
    if (canvas && event?.pointerId !== undefined && canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }
    canvas?.classList.remove('is-panning');
    mkCanvasPan = null;
}

function mkInitializeCanvasPan() {
    const canvas = mkElements.canvas;
    if (!canvas) return;

    // Die rechte Maustaste bleibt das normale Kontextmenue. Zum
    // Verschieben wird die uebliche Diagramm-Geste Leertaste + linke
    // Maustaste verwendet; die mittlere Maustaste bleibt als Profi-Kuerzel.
    // Browser-Kontextmenü würde den Ziehvorgang sonst sofort unterbrechen.
    const isTextField = target => target instanceof HTMLElement
        && target.matches('input, textarea, select, [contenteditable="true"]');
    document.addEventListener('keydown', event => {
        if (event.code !== 'Space' || event.repeat || isTextField(event.target)) return;
        mkPanSpaceHeld = true;
        canvas.classList.add('mk-pan-ready');
        event.preventDefault();
    });
    document.addEventListener('keyup', event => {
        if (event.code !== 'Space') return;
        mkPanSpaceHeld = false;
        canvas.classList.remove('mk-pan-ready');
    });
    window.addEventListener('blur', () => {
        mkPanSpaceHeld = false;
        canvas.classList.remove('mk-pan-ready');
        mkEndCanvasPan();
    });
    canvas.addEventListener('pointerdown', event => {
        const isMiddlePan = event.button === 1;
        const isSpacePan = event.button === 0 && mkPanSpaceHeld;
        if (!isMiddlePan && !isSpacePan) return;
        mkCanvasPan = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: canvas.scrollLeft,
            scrollTop: canvas.scrollTop,
            button: event.button
        };
        canvas.classList.add('is-panning');
        canvas.setPointerCapture?.(event.pointerId);
        event.preventDefault();
    });
    canvas.addEventListener('pointermove', event => {
        if (!mkCanvasPan || event.pointerId !== mkCanvasPan.pointerId) return;
        const buttonHeld = mkCanvasPan.button === 1
            ? (event.buttons & 4) === 4
            : (event.buttons & 1) === 1 && mkPanSpaceHeld;
        if (!buttonHeld) {
            mkEndCanvasPan(event);
            return;
        }
        canvas.scrollLeft = mkCanvasPan.scrollLeft - (event.clientX - mkCanvasPan.startX);
        canvas.scrollTop = mkCanvasPan.scrollTop - (event.clientY - mkCanvasPan.startY);
        event.preventDefault();
    });
    canvas.addEventListener('pointerup', mkEndCanvasPan);
    canvas.addEventListener('pointercancel', mkEndCanvasPan);
    canvas.addEventListener('lostpointercapture', mkEndCanvasPan);
}

function mkRender() {
    if (!mkElements.canvas) return;
    mkSyncProjectFields();
    document.querySelectorAll('[data-mk-mode]').forEach(button => {
        const active = button.dataset.mkMode === mkConfiguratorState.mode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-mk-level]').forEach(button => {
        const meterCountMode = mkConfiguratorState.mode === 'parallel';
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
    mkObserveConnectorGeometry();
    mkRenderZoomControls();
    mkScheduleConnectorGeometry();
    mkRefreshInlineStatus();
    mkUpdateHistoryButtons();
}

function mkParseTransfer(event) {
    try {
        return JSON.parse(event.dataTransfer.getData('application/json'));
    } catch (error) {
        return null;
    }
}

function mkHandleDrop(event, zone, targetAssetId = '', meterGroupTargetId = '', positionTargetId = '', baseMeterIndex = '') {
    event.preventDefault();
    const transfer = mkParseTransfer(event);
    if (!transfer) return;
    const previousState = mkCaptureHistoryState();
    const baseZone = baseMeterIndex !== '' ? mkGetBaseMeterZone(baseMeterIndex) : '';
    const targetObject = targetAssetId
        ? mkConfiguratorState.assets.find(item => item.id === targetAssetId)
        : null;
    const targetAsset = targetObject?.type !== 'meter' ? targetObject : null;
    const directMeterTarget = targetObject?.type === 'meter' ? targetObject : null;

    // Die sichtbare Zählerkarte ist nur 32 px groß. Je nach Mausposition kann
    // der Browser deshalb statt des Zähler-Hitbereichs die Anlagenkarte treffen.
    // In diesem Fall wird der gemeinsame Messpunkt aus der Zielanlage abgeleitet
    // und der Drop bleibt unabhängig von der Position des Z3/Z4 konsistent.
    if (!meterGroupTargetId && targetAssetId) {
        const draggedAsset = transfer.source === 'asset'
            ? mkConfiguratorState.assets.find(item => item.id === transfer.id)
            : null;
        const draggedType = transfer.source === 'palette' ? transfer.type : draggedAsset?.type;
        if (targetAsset && draggedType !== 'meter' && draggedAsset?.id !== targetAsset.id) {
            meterGroupTargetId = mkGetMeterForAsset(targetAsset)?.id || '';
        }
    }
    const targetMeter = meterGroupTargetId
        ? mkConfiguratorState.assets.find(item => item.id === meterGroupTargetId && item.type === 'meter')
        : directMeterTarget;
    zone = mkResolveDropZone(zone, baseZone, targetAsset, targetMeter);

    if (transfer.source === 'palette' && MK_ASSET_META[transfer.type]) {
        if (transfer.type === 'meter') {
            if (baseMeterIndex !== '') {
                const normalizedBaseIndex = Number(baseMeterIndex);
                const existingBaseChild = mkGetBaseChainChild(null, normalizedBaseIndex, zone);
                if (existingBaseChild && !mkCanBuildCascadeAfterMeter(existingBaseChild)) {
                    mkNotify('Hinter diesem Basiszähler ist bereits ein Zusatzzähler angelegt.', 'warning');
                    return;
                }
                const insertedMeter = mkAddAsset('meter', zone, '', '', {
                    parentBaseMeterIndex: normalizedBaseIndex,
                    parentMeterId: existingBaseChild?.parentMeterId || '',
                    keepEmptyRail: true
                });
                if (insertedMeter && existingBaseChild) {
                    existingBaseChild.parentMeterId = insertedMeter.id;
                    mkMoveAssetBefore(insertedMeter.id, existingBaseChild.id);
                    mkRender();
                }
                mkRecordHistory(previousState);
                return;
            }
            if (directMeterTarget) {
                if (!mkCanBuildCascadeAfterMeter(directMeterTarget)) {
                    mkNotify('Einzelzaehler vor einer Anlage kann nicht als Kaskadenstufe erweitert werden. Ziehe den neuen Zaehler auf einen Hauptzaehler.', 'warning');
                    return;
                }
                if (directMeterTarget.meterScope === 'base') {
                    const existingChild = mkGetBaseChainChild(directMeterTarget, directMeterTarget.parentBaseMeterIndex ?? null, directMeterTarget.zone);
                    const insertedMeter = mkAddAsset('meter', directMeterTarget.zone, '', '', {
                        parentBaseMeterIndex: Number.isFinite(Number(directMeterTarget.parentBaseMeterIndex))
                            ? Number(directMeterTarget.parentBaseMeterIndex)
                            : 0,
                        parentMeterId: directMeterTarget.id,
                        keepEmptyRail: true
                    });
                    if (insertedMeter) {
                        if (existingChild) {
                            existingChild.parentMeterId = insertedMeter.id;
                            mkMoveAssetBefore(insertedMeter.id, existingChild.id);
                        } else {
                            mkMoveAssetAfter(insertedMeter.id, directMeterTarget.id);
                        }
                        mkRender();
                    }
                    mkRecordHistory(previousState);
                    return;
                }
                const chainTarget = mkConfiguratorState.assets.find(item => item.id === directMeterTarget.targetAssetId && item.type !== 'meter');
                if (!chainTarget) {
                    mkNotify('Dieser Zähler hat noch keine Anlage, an die ein weiterer Zähler angehängt werden kann.', 'warning');
                    return;
                }
                const insertedMeter = mkAddAsset('meter', directMeterTarget.zone, '', '', {
                    targetAssetId: chainTarget.id,
                    parentMeterId: directMeterTarget.id,
                    keepEmptyRail: true
                });
                if (insertedMeter) {
                    mkMoveAssetAfter(insertedMeter.id, directMeterTarget.id);
                    mkRender();
                }
                mkRecordHistory(previousState);
                return;
            }
            if (targetAssetId) {
                const targetAsset = mkConfiguratorState.assets.find(item => item.id === targetAssetId && item.type !== 'meter');
                if (!targetAsset || !mkCanAddMeterToAsset(targetAsset)) {
                    mkNotify('Für diese Anlage ist bereits ein zusätzlicher Zähler vorhanden.', 'warning');
                    return;
                }
                mkAddAsset('meter', zone, '', '', mkGetMeterDropOptions(targetAsset));
                mkRecordHistory(previousState);
                return;
            }
            mkNotify('Zähler bitte direkt auf eine Anlage ziehen.', 'warning');
            return;
        }
        if (baseZone && !targetAssetId && !meterGroupTargetId) {
            mkAddAsset(transfer.type, baseZone, transfer.steuveType || '', transfer.energyCarrier || '');
            mkRecordHistory(previousState);
            return;
        }
        if (meterGroupTargetId) {
            const meter = targetMeter || mkConfiguratorState.assets.find(item => item.id === meterGroupTargetId && item.type === 'meter');
            if (!meter) return;
            mkAddAsset(transfer.type, meter.zone, transfer.steuveType || '', transfer.energyCarrier || '', { meterId: meter.id });
            mkRecordHistory(previousState);
            return;
        }
        mkAddAsset(transfer.type, zone, transfer.steuveType || '', transfer.energyCarrier || '');
        mkRecordHistory(previousState);
    }
    if (transfer.source === 'asset') {
        const asset = mkConfiguratorState.assets.find(item => item.id === transfer.id);
        if (asset) {
            const positionTarget = positionTargetId
                ? mkConfiguratorState.assets.find(item => item.id === positionTargetId)
                : null;
            if (positionTarget && asset.type !== 'meter' && positionTarget.type !== 'meter' && asset.zone === positionTarget.zone) {
                if (mkSwapAssetPositions(asset.id, positionTarget.id)) {
                    mkRender();
                    mkRecordHistory(previousState);
                }
                return;
            }
            if (baseZone && !targetAssetId && !meterGroupTargetId && asset.type !== 'meter') {
                asset.zone = baseZone;
                asset.meterId = '';
                const ownedMeters = mkGetAssetMeters(asset.id);
                ownedMeters.forEach(meter => {
                    meter.parentMeterId = '';
                    mkMoveMeterSubtreeToZone(meter, baseZone);
                });
                mkRender();
                mkRecordHistory(previousState);
                return;
            }
            if (asset.type === 'meter') {
                if (targetAssetId) {
                    const target = mkConfiguratorState.assets.find(item => item.id === targetAssetId);
                    if (!target) return;
                    const descendants = mkGetMeterDescendantIds(asset.id);
                    if (target.meterId === asset.id || descendants.has(target.meterId) || descendants.has(mkGetAssetMeters(target.id)[0]?.id)) {
                        mkNotify('ZÃ¤hler kann nicht in seinen eigenen Unterstrang verschoben werden.', 'warning');
                        return;
                    }
                    const parentMeter = mkGetMeterForAsset(target);
                    mkConfiguratorState.assets.forEach(item => {
                        if (item.meterId === asset.id) item.meterId = '';
                    });
                    asset.zone = target.zone;
                    asset.meterScope = 'asset';
                    asset.targetAssetId = target.id;
                    asset.parentMeterId = parentMeter?.id === asset.id ? '' : parentMeter?.id || '';
                    target.meterId = asset.id;
                    mkMoveMeterSubtreeToZone(asset, target.zone);
                } else {
                    mkNotify('Zähler bitte auf eine Anlage ziehen.', 'warning');
                    return;
                }
            } else if (meterGroupTargetId) {
                const meter = targetMeter || mkConfiguratorState.assets.find(item => item.id === meterGroupTargetId && item.type === 'meter');
                if (!meter) return;
                asset.zone = meter.zone;
                asset.meterId = meter.id;
            } else {
                asset.zone = zone;
                const ownedMeters = mkGetAssetMeters(asset.id);
                ownedMeters.forEach(meter => { meter.zone = zone; });
                asset.meterId = ownedMeters[0]?.id || '';
            }
            mkRender();
            mkRecordHistory(previousState);
        }
    }
}

function mkUpdateAssetField(event) {
    const card = event.target.closest('[data-mk-asset-id]');
    if (!card || !event.target.dataset.mkField) return;
    const asset = mkConfiguratorState.assets.find(item => item.id === card.dataset.mkAssetId);
    if (!asset) return;
    const previousState = mkGetFieldHistoryBefore(event);
    const field = event.target.dataset.mkField;
    asset[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (asset.type === 'steuve' && ['power', 'steuveType'].includes(field)) {
        const notice = document.querySelector(`[data-mk-steuve-notice="${asset.id}"]`);
        if (notice) notice.innerHTML = mkRenderSteuveNotice(asset);
        const moduleFields = document.querySelector(`[data-mk-steuve-module-fields="${asset.id}"]`);
        if (moduleFields) moduleFields.innerHTML = mkRenderSteuveModuleFields(asset);
    }
    mkRefreshInlineStatus();
    if (previousState) mkRecordHistory(previousState);
}

function mkUpdateMeterDetailField(event) {
    const field = event.target.dataset.mkMeterField;
    if (!field) return;
    const index = Number(event.target.dataset.mkMeterIndex) || 0;
    const previousState = mkGetFieldHistoryBefore(event);
    const details = mkGetMeterDetails(index);
    details[field] = event.target.value;
    if (previousState) mkRecordHistory(previousState);
}

function mkGetExportStand() {
    return MK_EXPORT.getExportStand();
}

function mkRenderNotes() {
    return MK_EXPORT.renderNotes();
}

function mkRenderProjectDetails() {
    return MK_EXPORT.renderProjectDetails();
}

function mkRenderExportDetails() {
    return MK_EXPORT.renderExportDetails();
}

function mkRenderPrintSheet(stand) {
    return MK_EXPORT.renderPrintSheet(stand);
}

function mkDownloadPdf() {
    return MK_EXPORT.downloadPdf();
}

function mkShowScreen() {
    const upload = document.getElementById('upload-screen');
    const dashboard = document.getElementById('dashboard-screen');
    const screen = document.getElementById('messkonzept-screen');
    if (upload) upload.classList.add('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    if (screen) screen.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.requestAnimationFrame(() => mkRender());
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
        validation: document.getElementById('mk-validation-list'),
        statusBadge: document.getElementById('mk-status-badge'),
        measurementSummary: document.getElementById('mk-measurement-summary'),
        objectModal: document.getElementById('mk-object-modal'),
        objectModalContent: document.getElementById('mk-object-modal-content'),
        objectModalTitle: document.getElementById('mk-object-modal-title'),
        zoomLevel: document.getElementById('mk-zoom-level')
    };
    if (!mkElements.canvas) return;
    mkInitializeCanvasPan();

    ['btn-open-messkonzept-card'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.addEventListener('click', mkShowScreen);
    });
    document.getElementById('btn-mk-back')?.addEventListener('click', mkHideScreen);
    document.getElementById('btn-mk-reset')?.addEventListener('click', () => {
        mkReset();
        mkNotify('Messkonzept-Skizze zurückgesetzt.', 'info');
    });
    document.querySelectorAll('[data-mk-project-field]').forEach(field => {
        field.addEventListener('input', event => {
            const key = event.target.dataset.mkProjectField;
            if (Object.prototype.hasOwnProperty.call(mkConfiguratorState.project, key)) mkConfiguratorState.project[key] = event.target.value.trimStart();
        });
    });
    document.querySelector('[data-mk-notes-field]')?.addEventListener('input', event => {
        mkConfiguratorState.notes = event.target.value;
    });
    document.getElementById('btn-mk-export-pdf')?.addEventListener('click', mkDownloadPdf);
    document.querySelectorAll('[data-mk-mode]').forEach(button => button.addEventListener('click', () => mkChangeMode(button.dataset.mkMode)));
    document.querySelectorAll('[data-mk-level]').forEach(button => button.addEventListener('click', () => mkChangeCascadeLevels(button.dataset.mkLevel)));
    document.querySelectorAll('[data-mk-view]').forEach(button => button.addEventListener('click', () => mkChangeViewMode(button.dataset.mkView)));
    document.querySelectorAll('[data-mk-zoom]').forEach(button => button.addEventListener('click', () => mkChangeCanvasZoom(button.dataset.mkZoom)));
    document.getElementById('btn-mk-modal-close')?.addEventListener('click', mkCloseObjectModal);
    document.getElementById('btn-mk-modal-done')?.addEventListener('click', mkCloseObjectModal);
    mkElements.objectModal?.addEventListener('click', event => {
        if (event.target === mkElements.objectModal) mkCloseObjectModal();
    });
    document.addEventListener('keydown', event => {
        const isEditingField = event.target instanceof HTMLElement
            && event.target.matches('input, textarea, select, [contenteditable="true"]');
        if (!isEditingField && (event.ctrlKey || event.metaKey) && !event.altKey) {
            const key = event.key.toLowerCase();
            if (key === 'z') {
                event.preventDefault();
                if (event.shiftKey) mkRedo();
                else mkUndo();
                return;
            }
            if (key === 'y') {
                event.preventDefault();
                mkRedo();
                return;
            }
        }
        if (event.key === 'Escape' && mkElements.objectModal && !mkElements.objectModal.classList.contains('hidden')) mkCloseObjectModal();
    });

    document.querySelectorAll('.mk-palette-item').forEach(button => {
        button.addEventListener('dragstart', event => {
            mkActiveDrag = { source: 'palette', type: button.dataset.mkType };
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('application/json', JSON.stringify({ source: 'palette', type: button.dataset.mkType, steuveType: button.dataset.mkSteuveType || '', energyCarrier: button.dataset.mkEnergyCarrier || '' }));
        });
        button.addEventListener('dragend', () => { mkActiveDrag = null; });
    });

    mkElements.canvas.addEventListener('dragover', event => {
        const meterTarget = event.target.closest('[data-mk-meter-target]');
        const meterGroupTarget = event.target.closest('[data-mk-meter-group-target]');
        const baseMeterTarget = event.target.closest('[data-mk-base-meter-target]');
        const positionTarget = event.target.closest('[data-mk-position-target]');
        const zone = event.target.closest('[data-mk-zone]');
        const sourceAsset = mkActiveDrag?.source === 'asset'
            ? mkConfiguratorState.assets.find(asset => asset.id === mkActiveDrag.id)
            : null;
        const targetAsset = positionTarget
            ? mkConfiguratorState.assets.find(asset => asset.id === positionTarget.dataset.mkPositionTarget)
            : null;
        if (positionTarget && sourceAsset && targetAsset && sourceAsset.id === targetAsset.id) {
            event.preventDefault();
            return;
        }
        const canSwapAssets = positionTarget
            && sourceAsset
            && targetAsset
            && sourceAsset.type !== 'meter'
            && targetAsset.type !== 'meter'
            && sourceAsset.id !== targetAsset.id
            && !meterGroupTarget;
        if (canSwapAssets) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            positionTarget.classList.add('mk-position-drop-target-active');
            return;
        }
        if (meterTarget && mkActiveDrag?.source === 'palette' && mkActiveDrag.type === 'meter') {
            const targetObject = mkConfiguratorState.assets.find(asset => asset.id === meterTarget.dataset.mkMeterTarget);
            const targetMeter = targetObject?.type === 'meter' ? targetObject : null;
            // Anlagenkarten tragen ebenfalls data-mk-meter-target, damit
            // dort ein Zähler vorgeschaltet werden kann. Diese Karten dürfen
            // nicht irrtümlich wie ein Meterknoten behandelt werden. Genau
            // das blockierte bisher einzelne Anlagen in einer Unter-Schiene
            // (z. B. EA4), während andere Karten zufällig erreichbar waren.
            if (targetObject?.type !== 'meter') {
                if (!targetObject || !mkCanAddMeterToAsset(targetObject)) return;
                event.preventDefault();
                meterTarget.classList.add('mk-meter-drop-target-active');
                return;
            }
            if (!mkCanBuildCascadeAfterMeter(targetMeter)) return;
            event.preventDefault();
            meterTarget.classList.add('mk-meter-drop-target-active');
            return;
        }
        if (baseMeterTarget && mkActiveDrag?.source === 'palette') {
            event.preventDefault();
            baseMeterTarget.classList.add('mk-base-meter-target-active');
            return;
        }
        const canDropPaletteOnMeterGroup = meterGroupTarget
            && mkActiveDrag?.source === 'palette'
            && mkActiveDrag.type !== 'meter';
        const canDropAssetOnMeterGroup = meterGroupTarget
            && mkActiveDrag?.source === 'asset'
            && mkActiveDrag.id !== meterGroupTarget.dataset.mkMeterGroupTarget;
        if (canDropPaletteOnMeterGroup || canDropAssetOnMeterGroup) {
            event.preventDefault();
            meterGroupTarget.classList.add('mk-meter-group-target-active');
            return;
        }
        if (mkActiveDrag?.source === 'palette' && mkActiveDrag.type === 'meter') return;
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
        const meterTarget = event.target.closest('[data-mk-meter-target]');
        const baseMeterTarget = event.target.closest('[data-mk-base-meter-target]');
        if (meterTarget && !meterTarget.contains(event.relatedTarget)) meterTarget.classList.remove('mk-meter-drop-target-active');
        if (baseMeterTarget && !baseMeterTarget.contains(event.relatedTarget)) baseMeterTarget.classList.remove('mk-base-meter-target-active');
        const meterGroupTarget = event.target.closest('[data-mk-meter-group-target]');
        if (meterGroupTarget && !meterGroupTarget.contains(event.relatedTarget)) meterGroupTarget.classList.remove('mk-meter-group-target-active');
        const positionTarget = event.target.closest('[data-mk-position-target]');
        if (positionTarget && !positionTarget.contains(event.relatedTarget)) positionTarget.classList.remove('mk-position-drop-target-active');
        const zone = event.target.closest('[data-mk-zone]');
        if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('dragover');
    });
    mkElements.canvas.addEventListener('drop', event => {
        const meterTarget = event.target.closest('[data-mk-meter-target]');
        const meterGroupTarget = event.target.closest('[data-mk-meter-group-target]');
        const baseMeterTarget = event.target.closest('[data-mk-base-meter-target]');
        const positionTarget = event.target.closest('[data-mk-position-target]');
        const zone = event.target.closest('[data-mk-zone]') || baseMeterTarget;
        if (!zone) return;
        meterTarget?.classList.remove('mk-meter-drop-target-active');
        baseMeterTarget?.classList.remove('mk-base-meter-target-active');
        meterGroupTarget?.classList.remove('mk-meter-group-target-active');
        positionTarget?.classList.remove('mk-position-drop-target-active');
        zone.classList.remove('dragover');
        mkHandleDrop(event, zone?.dataset.mkZone || baseMeterTarget?.dataset.mkZone || '', meterTarget?.dataset.mkMeterTarget || '', meterGroupTarget?.dataset.mkMeterGroupTarget || '', positionTarget?.dataset.mkPositionTarget || '', baseMeterTarget?.dataset.mkBaseMeterTarget || '');
    });
    mkElements.canvas.addEventListener('dragstart', event => {
        const handle = event.target.closest('[data-mk-drag-asset]');
        if (!handle) return;
        mkActiveDrag = { source: 'asset', id: handle.dataset.mkDragAsset };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/json', JSON.stringify({ source: 'asset', id: handle.dataset.mkDragAsset }));
    });
    mkElements.canvas.addEventListener('dragend', () => { mkActiveDrag = null; });
    mkElements.canvas.addEventListener('click', event => {
        const removeMeterButton = event.target.closest('[data-mk-remove-meter]');
        if (removeMeterButton) {
            const previousState = mkCaptureHistoryState();
            const removedId = removeMeterButton.dataset.mkRemoveMeter;
            const removedMeter = mkGetAdditionalMeters().find(asset => asset.id === removedId);
            mkConfiguratorState.assets = mkConfiguratorState.assets.filter(asset => asset.id !== removedId);
            mkConfiguratorState.assets.forEach(asset => {
                if (asset.type === 'meter' && asset.parentMeterId === removedId) {
                    asset.parentMeterId = removedMeter?.parentMeterId || '';
                }
                if (asset.meterId === removedId || asset.targetAssetId === removedId) {
                    asset.meterId = '';
                    asset.targetAssetId = '';
                    asset.meterScope = asset.type === 'meter' ? 'zone' : '';
                }
            });
            mkRender();
            mkRecordHistory(previousState);
            return;
        }
        const removeButton = event.target.closest('[data-mk-remove-asset]');
        if (removeButton) {
            const previousState = mkCaptureHistoryState();
            const removedId = removeButton.dataset.mkRemoveAsset;
            const replacementMeters = mkGetAdditionalMeters()
                .filter(meter => meter.targetAssetId === removedId)
                .map(meter => ({
                    meter,
                    replacement: mkGetMeterAssets(meter.id).find(asset => asset.id !== removedId) || null
                }));
            mkConfiguratorState.assets = mkConfiguratorState.assets.filter(asset => asset.id !== removedId);
            mkConfiguratorState.assets.forEach(asset => {
                if (asset.type === 'meter' && asset.parentMeterId === removedId) asset.parentMeterId = '';
                if (asset.meterId === removedId || asset.targetAssetId === removedId) {
                    asset.meterId = '';
                    asset.targetAssetId = '';
                    asset.meterScope = asset.type === 'meter' ? 'zone' : '';
                }
            });
            replacementMeters.forEach(({ meter, replacement }) => {
                const currentMeter = mkGetAdditionalMeters().find(asset => asset.id === meter.id);
                if (!currentMeter) return;
                if (replacement) {
                    currentMeter.targetAssetId = replacement.id;
                    currentMeter.keepEmptyRail = false;
                    replacement.meterId = currentMeter.id;
                } else {
                    // Der letzte gemessene Verbraucher wurde entfernt. Der
                    // Zähler bleibt als leerer Sammelschienenknoten bestehen,
                    // damit eine Unterkaskade nicht ihre fachliche Struktur
                    // verliert und später wieder befüllt werden kann.
                    currentMeter.targetAssetId = '';
                    currentMeter.keepEmptyRail = true;
                }
            });
            if (mkConfiguratorState.selectedObject?.kind === 'asset' && mkConfiguratorState.selectedObject.id === removedId) mkConfiguratorState.selectedObject = null;
            mkRender();
            mkRecordHistory(previousState);
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
    mkObserveConnectorGeometry();
    mkReset();
}

document.addEventListener('DOMContentLoaded', mkInitialize);
