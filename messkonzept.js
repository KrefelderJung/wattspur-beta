/*
 * Wattspur Messkonzept-Konfigurator
 *
 * Eigenständiger MVP ohne Backend: Die Oberfläche bildet eigene, schematische
 * Bausteine ab. Sie ist bewusst kein Nachbau lizenzierter VBEW-Auswahlblätter.
 */

const MK_MODULE_CONTRACTS = window.WattspurMesskonzeptModuleContracts;
MK_MODULE_CONTRACTS.assertLoaded();
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
const MK_BOOTSTRAP = window.WattspurMesskonzeptBootstrap.createBootstrapController();

const MK_METER_DETAIL_FIELDS = MK_MODEL.meterDetailFields;
const mkConfiguratorState = MK_MODEL.state;
let mkElements = {};
let mkGeometryFrame = 0;
let mkActiveDrag = null;

const MK_LAYOUT = window.WattspurMesskonzeptLayout.createLayoutController({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    getViewMode: () => mkConfiguratorState.viewMode,
    getMode: () => mkConfiguratorState.mode,
    getZoneAssets: zone => mkGetZoneAssets(zone),
    getMeterTree: zone => mkBuildZoneMeterTree(zone),
    getAdditionalMeters: () => mkGetAdditionalMeters(),
    getStageScale: stage => MK_GEOMETRY.getStageScale(stage),
    getRailSiblingCollisionShift: (railRight, nextLeft, clearance) => MK_GEOMETRY.getRailSiblingCollisionShift(railRight, nextLeft, clearance),
    assetsPerRowDefault: MK_ASSETS_PER_ROW,
    layoutGeometry: MK_LAYOUT_GEOMETRY
});

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

const MK_HISTORY = window.WattspurMesskonzeptHistory.createHistoryController({
    getHistory: () => MK_MODEL.history,
    captureState: () => MK_MODEL.captureHistoryState(mkConfiguratorState),
    recordState: previousState => MK_MODEL.recordHistory(mkConfiguratorState, previousState),
    restoreState: snapshot => {
        MK_MODEL.restoreHistoryState(mkConfiguratorState, snapshot);
        mkRender();
    },
    getButtons: () => ({
        undo: mkElements.undo,
        redo: mkElements.redo
    }),
    notify: (message, type) => mkNotify(message, type)
});

const MK_COMMANDS = window.WattspurMesskonzeptCommands.createCommandController({
    model: MK_MODEL,
    state: mkConfiguratorState,
    captureHistoryState: () => mkCaptureHistoryState(),
    recordHistory: previousState => mkRecordHistory(previousState),
    render: () => mkRender(),
    notify: (message, type) => mkNotify(message, type),
    getDefaultZone: () => mkDefaultZone(),
    getMeterForAsset: asset => mkGetMeterForAsset(asset),
    getMeterDescendantIds: meterId => mkGetMeterDescendantIds(meterId)
});

const MK_PROJECT_META = window.WattspurMesskonzeptProjectMeta.createProjectMetaController({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    bindHistoryButtons: () => MK_HISTORY.bindButtons()
});

const MK_VALIDATION_STATUS = window.WattspurMesskonzeptValidationStatus.createValidationStatusController({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    rules: MK_RULES,
    getZoneAssets: zone => mkGetZoneAssets(zone),
    parsePower: value => mkGetPowerNumber(value),
    escapeHtml: value => mkEscapeHtml(value),
    storageInfoText: MK_STORAGE_INFO_TEXT
});

// Die DOM-Komposition der Messskizze liegt in einem eigenen Renderer. Der
// Hauptbaustein bleibt dadurch Orchestrator: Zustand, Regeln und Geometrie
// werden nur noch über kleine injizierte Adapter verbunden.
const MK_CANVAS_RENDERER = window.WattspurMesskonzeptCanvasRenderer.createCanvasRenderer({
    state: mkConfiguratorState,
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    assetMeta: MK_ASSET_META,
    assetTypeOptions: MK_ASSET_TYPE_OPTIONS,
    steuveModuleOptions: MK_STEUVE_MODULE_OPTIONS,
    meterDetailFields: MK_METER_DETAIL_FIELDS,
    layoutGeometry: MK_LAYOUT_GEOMETRY,
    escapeHtml: mkEscapeHtml,
    getMeterDetails: index => mkGetMeterDetails(index),
    getBaseMeterZone: index => mkGetBaseMeterZone(index),
    renderSelectOptions: (options, selected, placeholder) => mkRenderSelectOptions(options, selected, placeholder),
    renderSteuveNotice: asset => mkRenderSteuveNotice(asset),
    renderSteuveModuleFields: asset => mkRenderSteuveModuleFields(asset),
    getAssetMeterNumber: asset => mkGetAssetMeterNumber(asset),
    getGenerationMeterNumber: asset => mkGetGenerationMeterNumber(asset),
    getSteuveRegime: asset => mkGetSteuveRegime(asset),
    getNshRegime: asset => mkGetNshRegime(asset),
    getSteuveIconClass: asset => mkGetSteuveIconClass(asset),
    getAssetTypeLabel: asset => mkGetAssetTypeLabel(asset),
    renderAssetIcon: asset => mkRenderAssetIcon(asset),
    getParallelLayoutMetrics: count => mkGetParallelLayoutMetrics(count),
    renderDropZone: (zone, index) => mkRenderDropZone(zone, index),
    getSimpleCanvasMinimumWidth: assetCount => mkGetSimpleCanvasMinimumWidth(assetCount),
    getZoneAssets: zone => mkGetZoneAssets(zone),
    render: () => mkRender()
});

// Die Zeichenflächen-Bedienung ist bewusst vom Messkonzept- und
// Topologie-Code getrennt. Der Hauptbaustein liefert nur noch Zustand und
// Geometrie-Callback; Zoom, Pan und ResizeObserver leben in viewport.js.
const MK_VIEWPORT = window.WattspurMesskonzeptViewport.createViewportController({
    getElements: () => mkElements,
    getState: () => mkConfiguratorState,
    getZoomConfig: () => MK_CANVAS_ZOOM,
    getMode: () => mkConfiguratorState.mode,
    scheduleGeometry: () => mkScheduleConnectorGeometry()
});

const MK_DRAG_DROP = window.WattspurMesskonzeptDragDrop.createDragDropController({
    getState: () => mkConfiguratorState,
    getActiveDrag: () => mkActiveDrag,
    setActiveDrag: value => { mkActiveDrag = value; },
    getAssetMeta: () => MK_ASSET_META,
    api: {
        captureHistoryState: () => mkCaptureHistoryState(),
        recordHistory: previousState => mkRecordHistory(previousState),
        getBaseMeterZone: index => mkGetBaseMeterZone(index),
        getBaseChainChild: (parentMeter, baseMeterIndex, zone) => mkGetBaseChainChild(parentMeter, baseMeterIndex, zone),
        canBuildCascadeAfterMeter: meter => mkCanBuildCascadeAfterMeter(meter),
        addAsset: (...args) => MK_COMMANDS.addAsset(...args),
        render: () => mkRender(),
        notify: (message, type) => mkNotify(message, type),
        moveAssetBefore: (assetId, beforeId) => MK_COMMANDS.moveAssetBefore(assetId, beforeId),
        moveAssetAfter: (assetId, afterId) => MK_COMMANDS.moveAssetAfter(assetId, afterId),
        getMeterForAsset: asset => mkGetMeterForAsset(asset),
        resolveDropZone: (zone, baseZone, targetAsset, targetMeter) => mkResolveDropZone(zone, baseZone, targetAsset, targetMeter),
        canAddMeterToAsset: asset => mkCanAddMeterToAsset(asset),
        getMeterDropOptions: asset => mkGetMeterDropOptions(asset),
        swapAssetPositions: (sourceId, targetId) => MK_COMMANDS.swapAssetPositions(sourceId, targetId),
        getAssetMeters: assetId => mkGetAssetMeters(assetId),
        getMeterDescendantIds: meterId => mkGetMeterDescendantIds(meterId),
        moveMeterSubtreeToZone: (meter, zone) => MK_COMMANDS.moveMeterSubtreeToZone(meter, zone),
        getAdditionalMeters: () => mkGetAdditionalMeters(),
        getMeterAssets: meterId => mkGetMeterAssets(meterId),
        openObjectModal: selection => mkOpenObjectModal(selection)
    }
});

const MK_INTERACTION = window.WattspurMesskonzeptInteraction.createInteractionController({
    getElements: () => mkElements,
    callbacks: {
        showScreen: () => mkShowScreen(),
        hideScreen: () => mkHideScreen(),
        reset: () => MK_COMMANDS.reset(),
        notify: (message, type) => mkNotify(message, type),
        downloadPdf: () => mkDownloadPdf(),
        changeMode: mode => MK_COMMANDS.changeMode(mode),
        changeCascadeLevels: level => MK_COMMANDS.changeCascadeLevels(level),
        changeViewMode: view => MK_COMMANDS.changeViewMode(view),
        changeCanvasZoom: action => mkChangeCanvasZoom(action),
        closeModal: () => mkCloseObjectModal(),
        openObjectModal: selection => mkOpenObjectModal(selection),
        undo: () => mkUndo(),
        redo: () => mkRedo(),
        updateAssetField: event => mkUpdateAssetField(event),
        updateMeterDetailField: event => mkUpdateMeterDetailField(event),
        updateProjectField: (key, value) => {
            MK_PROJECT_META.updateProjectField(key, value);
        },
        updateNotes: value => {
            MK_PROJECT_META.updateNotes(value);
        },
        handlePaletteDragStart: (event, button) => mkHandlePaletteDragStart(event, button),
        handlePaletteDragEnd: event => mkHandlePaletteDragEnd(event),
        handleCanvasDragOver: event => mkHandleCanvasDragOver(event),
        handleCanvasDragLeave: event => mkHandleCanvasDragLeave(event),
        handleCanvasDrop: event => mkHandleCanvasDrop(event),
        handleCanvasDragStart: event => mkHandleCanvasDragStart(event),
        handleCanvasDragEnd: event => mkHandleCanvasDragEnd(event),
        handleCanvasClick: event => mkHandleCanvasClick(event)
    }
});

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
    renderMeterDetailsSummary: (index, includeEmpty) => mkRenderMeterDetailsSummary(index, includeEmpty),
    renderAssetSummary: (asset, includeEmpty) => mkRenderAssetSummary(asset, includeEmpty),
    getMeterNumber: meter => mkGetMeterNumber(meter),
    getAssetMeta: type => MK_ASSET_META[type],
    notify: (message, type) => mkNotify(message, type)
});

function mkCaptureHistoryState() {
    return MK_HISTORY.capture();
}

function mkUpdateHistoryButtons() {
    MK_HISTORY.updateButtons();
}

function mkRecordHistory(previousState) {
    return MK_HISTORY.record(previousState);
}

function mkGetFieldHistoryBefore(event) {
    return MK_HISTORY.getFieldHistoryBefore(event);
}

function mkRestoreHistoryState(snapshot) {
    return MK_HISTORY.restore(snapshot);
}

function mkUndo() {
    return MK_HISTORY.undo();
}

function mkRedo() {
    return MK_HISTORY.redo();
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
    return MK_COMMANDS.addAsset(type, zone, steuveType, energyCarrier, options);
}

function mkReset() {
    return MK_COMMANDS.reset();
}

function mkSyncProjectFields() {
    return MK_PROJECT_META.sync();
}

function mkChangeViewMode(viewMode) {
    return MK_COMMANDS.changeViewMode(viewMode);
}

function mkChangeMode(mode) {
    return MK_COMMANDS.changeMode(mode);
}

function mkChangeCascadeLevels(levels) {
    return MK_COMMANDS.changeCascadeLevels(levels);
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
    return MK_COMMANDS.swapAssetPositions(sourceId, targetId);
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
    return MK_COMMANDS.moveAssetBefore(assetId, beforeId);
}

function mkMoveAssetAfter(assetId, afterId) {
    return MK_COMMANDS.moveAssetAfter(assetId, afterId);
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
    return MK_COMMANDS.moveMeterSubtreeToZone(meter, zone);
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
    return MK_LAYOUT.getAssetsPerRow(assetCount);
}

function mkGetSimpleCanvasMinimumWidth(assetCount) {
    return MK_LAYOUT.getSimpleCanvasMinimumWidth(assetCount);
}

function mkGetParallelBranchWidth(assetCount) {
    return MK_LAYOUT.getParallelBranchWidth(assetCount);
}

function mkGetZoneMeterDepth(zone) {
    return MK_LAYOUT.getZoneMeterDepth(zone);
}

function mkGetParallelLayoutMetrics(meterCount) {
    return MK_LAYOUT.getParallelLayoutMetrics(meterCount);
}

function mkGetParallelCanvasMinimumWidth(meterCount) {
    return MK_LAYOUT.getParallelCanvasMinimumWidth(meterCount);
}

function mkGetRailEntries(rail) {
    return MK_LAYOUT.getRailEntries(rail);
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
    const tree = mkBuildZoneMeterTree(zone);
    const hasMeterGroups = tree.children.length > 0;
    // Der oberste Sammelschienenanker bleibt für die Geometrie im DOM, wird
    // aber bei einer reinen Zählerkette nicht als dekorativer Punkt gezeigt.
    // Sichtbar wird er erst, wenn auf dieser Ebene tatsächlich ein Ast bzw.
    // eine Sammelschiene beginnt.
    const showRootJunction = mkGetRailEntries(tree).length > 0;
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
            <div class="mk-zone-assets ${mkConfiguratorState.viewMode === 'detail' ? 'detail-mode' : 'simple-mode'}${hasMeterGroups ? ' has-meter-groups' : ''}"><span class="mk-zone-junction${showRootJunction ? '' : ' mk-zone-junction-structural'}" data-mk-node-kind="SK" aria-hidden="true"></span>${hasWrappedRows ? '<span class="mk-zone-wrap-strand" aria-hidden="true"></span>' : ''}${rowsMarkup}</div>
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
    return MK_CANVAS_RENDERER.renderMeterDetailsSummary(index, includeEmpty);
}

function mkRenderMeterNode(index) {
    return MK_CANVAS_RENDERER.renderMeterNode(index);
}

function mkRenderMeterLayout(index) {
    return MK_CANVAS_RENDERER.renderMeterLayout(index);
}

function mkRenderAssetEditorFields(asset) {
    return MK_CANVAS_RENDERER.renderAssetEditorFields(asset);
}

function mkRenderAssetSummary(asset, includeEmpty = false) {
    return MK_CANVAS_RENDERER.renderAssetSummary(asset, includeEmpty);
}

function mkRenderMeterEditorFields(index) {
    return MK_CANVAS_RENDERER.renderMeterEditorFields(index);
}

function mkRenderObjectEditor(selection) {
    return MK_CANVAS_RENDERER.renderObjectEditor(selection);
}

function mkOpenObjectModal(selection) {
    return MK_CANVAS_RENDERER.openObjectModal(selection);
}

function mkCloseObjectModal() {
    return MK_CANVAS_RENDERER.closeObjectModal();
}

function mkRenderHakMeterRow() {
    return MK_CANVAS_RENDERER.renderHakMeterRow();
}

function mkRenderHakNode() {
    return MK_CANVAS_RENDERER.renderHakNode();
}

function mkRenderOwnershipConnector() {
    return MK_CANVAS_RENDERER.renderOwnershipConnector();
}

function mkRenderParallelCanvas() {
    return MK_CANVAS_RENDERER.renderParallelCanvas();
}

function mkRenderCanvasStage(topologyMarkup) {
    return MK_CANVAS_RENDERER.renderCanvasStage(topologyMarkup);
}

function mkRenderCanvas() {
    return MK_CANVAS_RENDERER.renderCanvas();
}

function mkValidation() {
    return MK_VALIDATION_STATUS.evaluate();
}

function mkRenderValidation() {
    return MK_VALIDATION_STATUS.renderValidation();
}

function mkRefreshInlineStatus() {
    return MK_VALIDATION_STATUS.refresh();
}

function mkGetStageScale(stage) {
    return MK_GEOMETRY.getStageScale(stage);
}

function mkHasNestedMeterRail(zone) {
    return Boolean(zone?.querySelector('.mk-meter-rail.meter-group-rail, .mk-asset-row[data-mk-meter-group]'));
}

function mkUpdateSimpleAssetStrands() {
    return MK_LAYOUT.updateSimpleAssetStrands();
}

function mkUpdateMeterGroupOffsets() {
    return MK_LAYOUT.updateMeterGroupOffsets();
}

function mkUpdateParallelBus() {
    return MK_LAYOUT.updateParallelBus();
}


function mkUpdateDynamicConnections() {
    return MK_CONNECTIONS.updateDynamicConnections();
}
function mkScheduleConnectorGeometry() {
    window.cancelAnimationFrame(mkGeometryFrame);
    mkGeometryFrame = window.requestAnimationFrame(() => {
        mkGeometryFrame = 0;
        // Erst die Root-Sammelschiene aus der senkrechten Messachse loesen,
        // danach Unter-Rails an ihren nun endgueltigen Zielkarten ausrichten.
        // Andernfalls misst die Kaskadenlogik noch die alte Kartenposition und
        // kann den Unterzaehler bei einer erneuten Erweiterung verschieben.
        mkUpdateSimpleAssetStrands();
        mkUpdateMeterGroupOffsets();
        mkUpdateParallelBus();
        mkUpdateDynamicConnections();
        mkCenterParallelViewport();
    });
}

function mkRenderZoomControls() {
    return MK_VIEWPORT.renderZoomControls();
}

function mkApplyCanvasZoom() {
    return MK_VIEWPORT.applyCanvasZoom();
}

function mkChangeCanvasZoom(action) {
    return MK_VIEWPORT.changeCanvasZoom(action);
}

function mkObserveConnectorGeometry() {
    // Historisch stand hier mkGeometryObserver.observe(stage); die Beobachtung
    // liegt jetzt vollständig im gekapselten Viewport-Modul.
    return MK_VIEWPORT.observeConnectorGeometry();
}

function mkCenterParallelViewport() {
    // Die Layout-Marke mkViewportLayout wird vom Viewport-Modul geführt.
    return MK_VIEWPORT.centerParallelViewport();
}

function mkEndCanvasPan(event) {
    return MK_VIEWPORT.endCanvasPan(event);
}

function mkInitializeCanvasPan() {
    return MK_VIEWPORT.initializeCanvasPan();
}

function mkRender() {
    if (!mkElements.canvas) return;
    mkSyncProjectFields();
    mkElements.modeButtons.forEach(button => {
        const active = button.dataset.mkMode === mkConfiguratorState.mode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    mkElements.levelButtons.forEach(button => {
        const meterCountMode = mkConfiguratorState.mode === 'parallel';
        const active = meterCountMode && Number(button.dataset.mkLevel) === mkConfiguratorState.cascadeLevels;
        button.disabled = !meterCountMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
    mkElements.viewButtons.forEach(button => {
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

function mkHandleDrop(event, zone, targetAssetId = '', meterGroupTargetId = '', positionTargetId = '', baseMeterIndex = '') {
    return MK_DRAG_DROP.handleDrop(event, zone, targetAssetId, meterGroupTargetId, positionTargetId, baseMeterIndex);
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
        const notice = card.querySelector(`[data-mk-steuve-notice="${asset.id}"]`);
        if (notice) notice.innerHTML = mkRenderSteuveNotice(asset);
        const moduleFields = card.querySelector(`[data-mk-steuve-module-fields="${asset.id}"]`);
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
    const { uploadScreen: upload, dashboardScreen: dashboard, messkonzeptScreen: screen } = mkElements;
    if (upload) upload.classList.add('hidden');
    if (dashboard) dashboard.classList.add('hidden');
    if (screen) screen.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.requestAnimationFrame(() => mkRender());
}

function mkHideScreen() {
    const { messkonzeptScreen: screen, uploadScreen: upload } = mkElements;
    if (screen) screen.classList.add('hidden');
    if (upload) upload.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mkHandlePaletteDragStart(event, button) {
    if (MK_DRAG_DROP.handlePaletteDragStart) return MK_DRAG_DROP.handlePaletteDragStart(event, button);
    mkActiveDrag = { source: 'palette', type: button.dataset.mkType };
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', JSON.stringify({
        source: 'palette',
        type: button.dataset.mkType,
        steuveType: button.dataset.mkSteuveType || '',
        energyCarrier: button.dataset.mkEnergyCarrier || ''
    }));
}

function mkHandlePaletteDragEnd() {
    if (MK_DRAG_DROP.handlePaletteDragEnd) return MK_DRAG_DROP.handlePaletteDragEnd();
    mkActiveDrag = null;
}

function mkHandleCanvasDragOver(event) {
    if (MK_DRAG_DROP.handleCanvasDragOver) return MK_DRAG_DROP.handleCanvasDragOver(event);
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
    const canDropOnBaseMeter = baseMeterTarget && (
        (mkActiveDrag?.source === 'palette' && MK_ASSET_META[mkActiveDrag.type])
        || (sourceAsset && sourceAsset.type !== 'meter')
    );
    if (canDropOnBaseMeter) {
        event.preventDefault();
        baseMeterTarget.classList.add('mk-meter-drop-target-active');
        return;
    }
    if (meterTarget && mkActiveDrag?.source === 'palette' && mkActiveDrag.type === 'meter') {
        const targetObject = mkConfiguratorState.assets.find(asset => asset.id === meterTarget.dataset.mkMeterTarget);
        const targetMeter = targetObject?.type === 'meter' ? targetObject : null;
        // Anlagenkarten tragen ebenfalls data-mk-meter-target, damit dort ein
        // Zähler vorgeschaltet werden kann. Sie dürfen nicht irrtümlich wie
        // ein Meterknoten behandelt werden.
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
}

function mkHandleCanvasDragLeave(event) {
    if (MK_DRAG_DROP.handleCanvasDragLeave) return MK_DRAG_DROP.handleCanvasDragLeave(event);
    const meterTarget = event.target.closest('[data-mk-meter-target]');
    const baseMeterTarget = event.target.closest('[data-mk-base-meter-target]');
    if (meterTarget && !meterTarget.contains(event.relatedTarget)) meterTarget.classList.remove('mk-meter-drop-target-active');
    if (baseMeterTarget && !baseMeterTarget.contains(event.relatedTarget)) baseMeterTarget.classList.remove('mk-meter-drop-target-active');
    const meterGroupTarget = event.target.closest('[data-mk-meter-group-target]');
    if (meterGroupTarget && !meterGroupTarget.contains(event.relatedTarget)) meterGroupTarget.classList.remove('mk-meter-group-target-active');
    const positionTarget = event.target.closest('[data-mk-position-target]');
    if (positionTarget && !positionTarget.contains(event.relatedTarget)) positionTarget.classList.remove('mk-position-drop-target-active');
    const zone = event.target.closest('[data-mk-zone]');
    if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('dragover');
}

function mkHandleCanvasDrop(event) {
    if (MK_DRAG_DROP.handleCanvasDrop) return MK_DRAG_DROP.handleCanvasDrop(event);
    const meterTarget = event.target.closest('[data-mk-meter-target]');
    const meterGroupTarget = event.target.closest('[data-mk-meter-group-target]');
    const baseMeterTarget = event.target.closest('[data-mk-base-meter-target]');
    const positionTarget = event.target.closest('[data-mk-position-target]');
    const zone = event.target.closest('[data-mk-zone]') || baseMeterTarget;
    if (!zone) return;
    meterTarget?.classList.remove('mk-meter-drop-target-active');
    baseMeterTarget?.classList.remove('mk-meter-drop-target-active');
    meterGroupTarget?.classList.remove('mk-meter-group-target-active');
    positionTarget?.classList.remove('mk-position-drop-target-active');
    zone.classList.remove('dragover');
    mkHandleDrop(
        event,
        zone?.dataset.mkZone || baseMeterTarget?.dataset.mkZone || '',
        meterTarget?.dataset.mkMeterTarget || '',
        meterGroupTarget?.dataset.mkMeterGroupTarget || '',
        positionTarget?.dataset.mkPositionTarget || '',
        baseMeterTarget?.dataset.mkBaseMeterTarget || ''
    );
}

function mkHandleCanvasDragStart(event) {
    if (MK_DRAG_DROP.handleCanvasDragStart) return MK_DRAG_DROP.handleCanvasDragStart(event);
    const handle = event.target.closest('[data-mk-drag-asset]');
    if (!handle) return;
    mkActiveDrag = { source: 'asset', id: handle.dataset.mkDragAsset };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({ source: 'asset', id: handle.dataset.mkDragAsset }));
}

function mkHandleCanvasDragEnd() {
    if (MK_DRAG_DROP.handleCanvasDragEnd) return MK_DRAG_DROP.handleCanvasDragEnd();
    mkActiveDrag = null;
}

function mkHandleCanvasClick(event) {
    return MK_DRAG_DROP.handleCanvasClick(event);
}

function mkInitialize(elements = MK_BOOTSTRAP.collectElements()) {
    mkElements = elements || {};
    if (!mkElements.canvas) return;
    mkInitializeCanvasPan();

    MK_INTERACTION.initialize();
    MK_BOOTSTRAP.bindResize(() => mkRender());
    mkObserveConnectorGeometry();
    mkReset();
}

MK_BOOTSTRAP.start(mkInitialize);
