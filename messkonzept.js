/*
 * Wattspur Messkonzept-Konfigurator
 *
 * Eigenständiger MVP ohne Backend: Die Oberfläche bildet eigene, schematische
 * Bausteine ab. Sie ist bewusst kein Nachbau lizenzierter VBEW-Auswahlblätter.
 */

const MK_MODULE_CONTRACTS = window.WattspurMesskonzeptModuleContracts;
MK_MODULE_CONTRACTS.assertLoaded();
const MK_MODEL = window.WattspurMesskonzeptModel;
const MK_PRESETS = window.WattspurMesskonzeptPresets;
const MK_PRESET_LOADER = window.WattspurMesskonzeptPresetLoader.createPresetLoader({
    model: MK_MODEL,
    presets: MK_PRESETS
});
const MK_ASSET_META = MK_MODEL.assetMeta;
const MK_ASSET_TYPE_OPTIONS = MK_MODEL.assetTypeOptions;
const MK_STEUVE_MODULE_OPTIONS = MK_MODEL.steuveModuleOptions;
const MK_STORAGE_GRID_OPTIONS = MK_MODEL.storageGridOptions;
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
    getRailAxisClampShift: (parentAxisCenter, childAxisCenter, clearance) => MK_GEOMETRY.getRailAxisClampShift(parentAxisCenter, childAxisCenter, clearance),
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
    balconyInfoText: MK_BALCONY_INFO_TEXT,
    getStorageOperation: asset => MK_MODEL.getStorageOperation(asset)
});

// Drop-Zonen und Rail-Komposition erzeugen nur Markup. Topologie, Layout und
// Beschriftungen werden über Adapter geliefert, damit die Skizzenkomposition
// nicht erneut in den Orchestrator zurückwandert.
const MK_ZONE_RENDERER = window.WattspurMesskonzeptZoneRenderer.createZoneRenderer({
    getState: () => mkConfiguratorState,
    getDefaultZone: () => mkDefaultZone(),
    getZoneAssets: zone => mkGetZoneAssets(zone),
    buildZoneMeterTree: zone => mkBuildZoneMeterTree(zone),
    getRailEntries: rail => mkGetRailEntries(rail),
    renderAssetRail: (rail, isRoot) => MK_RENDER.renderAssetRail(rail, isRoot),
    getAdditionalMeters: () => mkGetAdditionalMeters(),
    getAssetsPerRow: count => mkGetAssetsPerRow(count),
    getZoneLabel: index => mkGetZoneLabel(index),
    escapeHtml: value => mkEscapeHtml(value)
});

const MK_HISTORY = window.WattspurMesskonzeptHistory.createHistoryController({
    getHistory: () => MK_MODEL.history,
    captureState: () => MK_MODEL.captureHistoryState(mkConfiguratorState),
    recordState: previousState => MK_MODEL.recordHistory(mkConfiguratorState, previousState),
    restoreState: snapshot => {
        MK_MODEL.restoreHistoryState(mkConfiguratorState, snapshot);
        MK_RENDER_CYCLE.render();
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
    render: () => MK_RENDER_CYCLE.render(),
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

const MK_DECISION_CALCULATOR = window.WattspurMesskonzeptDecisionCalculator.createController();

const MK_VALIDATION_STATUS = window.WattspurMesskonzeptValidationStatus.createValidationStatusController({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    rules: MK_RULES,
    getZoneAssets: zone => mkGetZoneAssets(zone),
    parsePower: value => mkGetPowerNumber(value),
    escapeHtml: value => mkEscapeHtml(value),
    storageInfoText: MK_STORAGE_INFO_TEXT
});

const MK_IDENTIFIERS = window.WattspurMesskonzeptIdentifiers.createIdentifierController({
    getState: () => mkConfiguratorState,
    getAdditionalMeters: () => mkGetAdditionalMeters(),
    getMeterForAsset: asset => mkGetMeterForAsset(asset),
    getGenerationDisplay: energyCarrier => MK_MODEL.getGenerationDisplay(energyCarrier)
});

const MK_METER_POLICY = window.WattspurMesskonzeptMeterPolicy.createMeterPolicyController({
    getAssetMeters: assetId => mkGetAssetMeters(assetId),
    getMeterForAsset: asset => mkGetMeterForAsset(asset),
    isMeterExpanded: meterId => mkIsMeterExpanded(meterId),
    getMeterAssets: meterId => mkGetMeterAssets(meterId)
});

const MK_ASSET_DISPLAY = window.WattspurMesskonzeptAssetDisplay.createAssetDisplayController({
    getAssetMeta: () => MK_ASSET_META,
    getAssetTypeOptions: () => MK_ASSET_TYPE_OPTIONS,
    getGenerationDisplay: asset => MK_MODEL.getGenerationDisplay(asset?.energyCarrier),
    getPowerNumber: value => MK_RULES.parsePowerNumber(value),
    getSteuveEffectivePower: asset => MK_RULES.getSteuveEffectivePower(asset),
    renderSelectOptions: (options, selected, placeholder) => mkRenderSelectOptions(options, selected, placeholder),
    steuveModuleOptions: MK_STEUVE_MODULE_OPTIONS,
    getGenerationAssetNumber: asset => MK_IDENTIFIERS.getGenerationAssetNumber(asset),
    getConsumerAssetNumber: asset => MK_IDENTIFIERS.getConsumerAssetNumber(asset),
    getMeterNumber: meter => MK_IDENTIFIERS.getMeterNumber(meter),
    getMeterDetailIndex: meter => MK_IDENTIFIERS.getMeterDetailIndex(meter),
    canBuildCascadeAfterMeter: meter => MK_METER_POLICY.canBuildCascadeAfterMeter(meter),
    escapeHtml: value => mkEscapeHtml(value)
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
    storageGridOptions: MK_STORAGE_GRID_OPTIONS,
    hakVoltageLevels: MK_MODEL.hakVoltageLevels,
    steuveModuleOptions: MK_STEUVE_MODULE_OPTIONS,
    meterDetailFields: MK_METER_DETAIL_FIELDS,
    layoutGeometry: MK_LAYOUT_GEOMETRY,
    escapeHtml: mkEscapeHtml,
    getMeterDetails: index => mkGetMeterDetails(index),
    getMeterDetailIndex: meter => mkGetMeterDetailIndex(meter),
    getAdditionalMeters: () => mkGetAdditionalMeters(),
    getHakVoltageLevel: () => MK_MODEL.getHakVoltageLevel(mkConfiguratorState),
    getBaseMeterZone: index => mkGetBaseMeterZone(index),
    renderSelectOptions: (options, selected, placeholder) => mkRenderSelectOptions(options, selected, placeholder),
    renderSteuveNotice: asset => mkRenderSteuveNotice(asset),
    renderSteuveModuleFields: asset => mkRenderSteuveModuleFields(asset),
    getAssetMeterNumber: asset => mkGetAssetMeterNumber(asset),
    getGenerationMeterNumber: asset => mkGetGenerationMeterNumber(asset),
    getGenerationDisplay: asset => mkGetGenerationDisplay(asset),
    getStorageOperation: asset => MK_MODEL.getStorageOperation(asset),
    getSteuveRegime: asset => mkGetSteuveRegime(asset),
    getSteuveEffectivePower: asset => MK_RULES.getSteuveEffectivePower(asset),
    getNshRegime: asset => mkGetNshRegime(asset),
    getSteuveIconClass: asset => mkGetSteuveIconClass(asset),
    getAssetTypeLabel: asset => mkGetAssetTypeLabel(asset),
    renderAssetIcon: asset => mkRenderAssetIcon(asset),
    getParallelLayoutMetrics: count => mkGetParallelLayoutMetrics(count),
    renderDropZone: (zone, index) => mkRenderDropZone(zone, index),
    getSimpleCanvasMinimumWidth: assetCount => mkGetSimpleCanvasMinimumWidth(assetCount),
    getZoneAssets: zone => mkGetZoneAssets(zone),
    render: () => MK_RENDER_CYCLE.render()
});

// Der Objekteditor bindet ausschließlich Dialogfelder an den fachlichen
// Zustand. Die allgemeine Interaktionsschicht bleibt dadurch frei von
// feldspezifischer Zustandslogik.
const MK_EDITOR = window.WattspurMesskonzeptEditor.createEditorController({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    callbacks: {
        getFieldHistoryBefore: event => MK_HISTORY.getFieldHistoryBefore(event),
        recordHistory: previousState => mkRecordHistory(previousState),
        getMeterDetails: index => mkGetMeterDetails(index),
        updateHakField: (field, value) => {
            if (field === 'voltageLevel') MK_MODEL.setHakVoltageLevel(mkConfiguratorState, value);
        },
        refreshObjectModal: selection => MK_CANVAS_RENDERER.openObjectModal(selection),
        syncGenerationName: asset => mkSyncGenerationName(asset),
        getStorageOperation: asset => MK_MODEL.getStorageOperation(asset),
        renderSteuveNotice: asset => mkRenderSteuveNotice(asset),
        renderSteuveModuleFields: asset => mkRenderSteuveModuleFields(asset),
        refreshInlineStatus: () => MK_VALIDATION_STATUS.refresh(),
        render: () => MK_RENDER_CYCLE.render()
    }
});

const MK_START_FLOW = window.WattspurMesskonzeptStartFlow.createStartFlowController({
    getElements: () => mkElements,
    getPresets: () => MK_PRESETS,
    escapeHtml: value => mkEscapeHtml(value),
    getFlowChipClass: label => mkGetPresetFlowChipClass(label),
    callbacks: {
        reset: () => MK_COMMANDS.reset(),
        clearHistory: () => {
            MK_MODEL.history.undo = [];
            MK_MODEL.history.redo = [];
        },
        applyPreset: presetId => MK_PRESET_LOADER.applyPreset(mkConfiguratorState, presetId),
        render: () => MK_RENDER_CYCLE.render(),
        notify: (message, type) => mkNotify(message, type)
    }
});

// Der vollständige UI-Renderlauf ist als Orchestrator ausgelagert. Die
// bestehenden Fach- und Geometriefunktionen bleiben über Adapter unverändert.
const MK_RENDER_CYCLE = window.WattspurMesskonzeptRenderCycle.createRenderCycleController({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    callbacks: {
        syncProjectFields: () => mkSyncProjectFields(),
        renderCanvas: () => mkRenderCanvas(),
        observeConnectorGeometry: () => mkObserveConnectorGeometry(),
        renderZoomControls: () => mkRenderZoomControls(),
        scheduleConnectorGeometry: () => mkScheduleConnectorGeometry(),
        refreshValidation: () => MK_VALIDATION_STATUS.refresh(),
        updateHistoryButtons: () => mkUpdateHistoryButtons()
    }
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
        render: () => MK_RENDER_CYCLE.render(),
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
        showScreen: () => MK_START_FLOW.showScreen(),
        hideScreen: () => MK_START_FLOW.hideScreen(),
        startFree: () => MK_START_FLOW.startFreeConfigurator(),
        showStartPanel: () => MK_START_FLOW.showStartPanel(),
        loadPreset: presetId => MK_START_FLOW.loadPreset(presetId),
        reset: () => MK_COMMANDS.reset(),
        notify: (message, type) => mkNotify(message, type),
        downloadPdf: options => mkDownloadPdf(options),
        changeMode: mode => MK_COMMANDS.changeMode(mode),
        changeCascadeLevels: level => MK_COMMANDS.changeCascadeLevels(level),
        changeViewMode: view => MK_COMMANDS.changeViewMode(view),
        changeCanvasZoom: action => mkChangeCanvasZoom(action),
        closeModal: () => mkCloseObjectModal(),
        openObjectModal: selection => mkOpenObjectModal(selection),
        undo: () => mkUndo(),
        redo: () => mkRedo(),
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

// Der Geometrie-Nachlauf ist eine eigene Laufzeit-Schicht. Sie kennt nur die
// Reihenfolge der visuellen Aktualisierungen und bleibt damit unabhängig von
// Messobjekten, Drop-Regeln und DOM-Komposition.
const MK_GEOMETRY_RUNTIME = window.WattspurMesskonzeptGeometryRuntime.createGeometryRuntimeController({
    getWindow: () => window,
    updateSimpleAssetStrands: () => MK_LAYOUT.updateSimpleAssetStrands(),
    updateMeterGroupOffsets: () => MK_LAYOUT.updateMeterGroupOffsets(),
    updateParallelBus: () => MK_LAYOUT.updateParallelBus(),
    updateDynamicConnections: () => MK_CONNECTIONS.updateDynamicConnections(),
    centerParallelViewport: () => MK_VIEWPORT.centerParallelViewport()
});

const MK_EXPORT = window.WattspurMesskonzeptExport.createExporter({
    getState: () => mkConfiguratorState,
    getElements: () => mkElements,
    escapeHtml: mkEscapeHtml,
    validate: () => MK_VALIDATION_STATUS.evaluate(),
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
    return `${placeholderMarkup}${options.map(option => {
        const visibleLabel = option.selectionLabel || option.label;
        return `<option value="${mkEscapeHtml(option.value)}" ${option.value === selectedValue ? 'selected' : ''}>${mkEscapeHtml(visibleLabel)}</option>`;
    }).join('')}`;
}

function mkGetPresetFlowChipClass(label) {
    const normalized = String(label || '').toLocaleLowerCase('de-DE');
    const kinds = [];
    if (normalized.includes('haushalt')) kinds.push('consumer');
    if (normalized.includes('pv')) kinds.push('generation');
    if (normalized.includes('speicher')) kinds.push('storage');
    if (normalized.includes('wallbox')) kinds.push('wallbox');
    if (normalized.includes('wärmepumpe')) kinds.push('heatpump');
    if (normalized.includes('klimaanlage')) kinds.push('climate');
    if (normalized.includes('nachtspeicher')) kinds.push('nsh');
    if (kinds.length > 1) return 'mk-start-flow-chip--mixed';
    return kinds.length === 1 ? `mk-start-flow-chip--${kinds[0]}` : 'mk-start-flow-chip--neutral';
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
    return MK_METER_POLICY.canBuildCascadeAfterMeter(meter);
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
    return MK_METER_POLICY.canAddMeterToAsset(asset);
}

function mkGetMeterDropOptions(asset) {
    return MK_METER_POLICY.getMeterDropOptions(asset);
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
    return MK_IDENTIFIERS.getMeterNumber(meter);
}

function mkGetMeterDetailIndex(meter) {
    return MK_IDENTIFIERS.getMeterDetailIndex(meter);
}

function mkGetAssetMeterNumber(asset) {
    return MK_IDENTIFIERS.getAssetMeterNumber(asset);
}

function mkGetZoneLabel(index) {
    if (mkConfiguratorState.mode === 'parallel') return `Hinter Z${index + 1} · eigener Parallel-Messbereich`;
    return 'Hinter Z1 · Verbraucher- und Anlagenbereich';
}

function mkGetAssetTypeLabel(asset) {
    return MK_ASSET_DISPLAY.getAssetTypeLabel(asset);
}

function mkGetGenerationDisplay(asset) {
    return MK_ASSET_DISPLAY.getGenerationDisplay(asset);
}

function mkGetSteuveIconClass(asset) {
    return MK_ASSET_DISPLAY.getSteuveIconClass(asset);
}

function mkGetPowerNumber(value) {
    return MK_RULES.parsePowerNumber(value);
}

function mkGetSteuveRegime(asset) {
    return MK_ASSET_DISPLAY.getSteuveRegime(asset);
}

function mkRenderSteuveNotice(asset) {
    return MK_ASSET_DISPLAY.renderSteuveNotice(asset);
}

function mkRenderSteuveModuleFields(asset) {
    return MK_ASSET_DISPLAY.renderSteuveModuleFields(asset);
}

function mkGetNshRegime(asset) {
    return MK_ASSET_DISPLAY.getNshRegime(asset);
}

/**
 * Anzahl der bereits vorhandenen Zähler in der aktuellen Topologie.
 * Grundzähler der Topologie und eventuelle zusätzliche Zählerobjekte werden
 * gemeinsam gezählt, damit eigene Erzeugungszähler fortlaufend nummeriert
 * werden können.
 */
function mkGetConfiguredMeterCount() {
    return MK_IDENTIFIERS.getConfiguredMeterCount();
}

/** Liefert die fortlaufende Nummer eines eigenen Erzeugungszählers. */
function mkGetGenerationMeterNumber(asset) {
    return MK_IDENTIFIERS.getGenerationMeterNumber(asset);
}

function mkGetGenerationAssetNumber(asset) {
    return MK_IDENTIFIERS.getGenerationAssetNumber(asset);
}

function mkGetConsumerAssetNumber(asset) {
    return MK_IDENTIFIERS.getConsumerAssetNumber(asset);
}

function mkSyncGenerationName(asset) {
    return MK_IDENTIFIERS.syncGenerationName(asset);
}

function mkRenderAssetIcon(asset) {
    return MK_ASSET_DISPLAY.renderAssetIcon(asset);
}

function mkRenderInlineMeter(meter, asset) {
    return MK_ASSET_DISPLAY.renderInlineMeter(meter, asset);
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
    return MK_ZONE_RENDERER.renderAssetRows(assets, zoneOverride);
}

function mkRenderDropZone(zone, index) {
    return MK_ZONE_RENDERER.renderDropZone(zone, index);
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
    return MK_GEOMETRY_RUNTIME.schedule();
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

function mkHandleDrop(event, zone, targetAssetId = '', meterGroupTargetId = '', positionTargetId = '', baseMeterIndex = '') {
    return MK_DRAG_DROP.handleDrop(event, zone, targetAssetId, meterGroupTargetId, positionTargetId, baseMeterIndex);
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

function mkRenderPrintSheet(stand, options) {
    return MK_EXPORT.renderPrintSheet(stand, options);
}

function mkDownloadPdf(options) {
    return MK_EXPORT.downloadPdf(options);
}

function mkHandlePaletteDragStart(event, button) {
    return MK_DRAG_DROP.handlePaletteDragStart(event, button);
}

function mkHandlePaletteDragEnd() {
    return MK_DRAG_DROP.handlePaletteDragEnd();
}

function mkHandleCanvasDragOver(event) {
    return MK_DRAG_DROP.handleCanvasDragOver(event);
}

function mkHandleCanvasDragLeave(event) {
    return MK_DRAG_DROP.handleCanvasDragLeave(event);
}

function mkHandleCanvasDrop(event) {
    return MK_DRAG_DROP.handleCanvasDrop(event);
}

function mkHandleCanvasDragStart(event) {
    return MK_DRAG_DROP.handleCanvasDragStart(event);
}

function mkHandleCanvasDragEnd() {
    return MK_DRAG_DROP.handleCanvasDragEnd();
}

function mkHandleCanvasClick(event) {
    return MK_DRAG_DROP.handleCanvasClick(event);
}

function mkInitialize(elements = MK_BOOTSTRAP.collectElements()) {
    mkElements = elements || {};
    if (!mkElements.canvas) return;
    MK_DECISION_CALCULATOR.initialize();
    mkInitializeCanvasPan();

    MK_EDITOR.initialize();
    MK_INTERACTION.initialize();
    MK_BOOTSTRAP.bindResize(() => MK_RENDER_CYCLE.render());
    mkObserveConnectorGeometry();
    MK_START_FLOW.initialize();
    mkReset();
    if (window.location.hash === '#messkonzept') {
        MK_START_FLOW.showScreen();
    }
}

MK_BOOTSTRAP.start(mkInitialize);
