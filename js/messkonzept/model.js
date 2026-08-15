/*
 * Wattspur Messkonzept – fachliches Zustandsmodell
 *
 * Dieses Modul kennt weder DOM noch CSS noch SVG. Es verwaltet ausschließlich
 * den fachlichen Zustand und die Änderungen an Anlagen, Zählern und Modi.
 * Die Oberfläche greift über WattspurMesskonzeptModel darauf zu.
 */
(function exposeMesskonzeptModel(global) {
    'use strict';

    const assetMeta = Object.freeze({
        meter: { label: 'Zähler', short: 'Z', className: 'meter', detail: 'Zusätzlicher Messpunkt' },
        generation: { label: 'Erzeugungsanlage', short: 'EA', className: 'generation', detail: 'PV, KWK, Wind, Balkonkraftwerk' },
        consumer: { label: 'Sonstige Verbraucher', short: 'V', className: 'consumer', detail: 'Allgemeine Last' },
        steuve: { label: 'Steuerbare Anlage', short: '⚡', className: 'steuve', detail: 'Leistungsabhängig nach § 14a EnWG prüfen' },
        storage: { label: 'Batteriespeicher', short: '▤', className: 'storage', detail: 'Speicheranlage' },
        nsh: { label: 'Nachtspeicherheizung', short: 'NSH', className: 'nsh', detail: 'Historische Tarif- und Messbehandlung prüfen' }
    });

    const assetTypeOptions = Object.freeze({
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

    const steuveModuleOptions = Object.freeze([
        { value: 'Modul 1', label: 'Modul 1' },
        { value: 'Modul 2', label: 'Modul 2' },
        { value: 'Modul 3', label: 'Modul 3' }
    ]);

    const storageInfoText = 'Achtung: Die Registrierung des Stromspeichers im Marktstammdatenregister ist zu prüfen. Beim netzbezogenen Laden ist zusätzlich zu prüfen, ob § 14a EnWG greift; Einspeisung und Bezug sind getrennt zu betrachten. Messkonzept mit dem Verteilnetzbetreiber abstimmen.';
    const balconyInfoText = 'Balkonkraftwerk / Steckersolargerät: Registrierung im Marktstammdatenregister prüfen. Die vereinfachte Behandlung hängt unter anderem von Leistungsgrenzen und der gewählten EEG-Veräußerungsform ab.';
    const meterDetailFields = Object.freeze([
        { key: 'maloBezug', label: 'MaLo Bezug', type: 'text' },
        { key: 'maloLieferung', label: 'MaLo Lieferung', type: 'text' },
        { key: 'melo', label: 'MeLo', type: 'text', maxLength: 33 },
        { key: 'meterNumber', label: 'Zählernummer', type: 'text' },
        { key: 'installationDate', label: 'Einbaudatum', type: 'date' }
    ]);

    function createState() {
        return {
            mode: 'single',
            viewMode: 'simple',
            canvasZoom: 1,
            cascadeLevels: 2,
            nextId: 1,
            assets: [],
            meterDetails: {},
            project: { name: '', reference: '', street: '', houseNumber: '', postalCode: '', city: '', planStatus: 'Aktuell' },
            notes: '',
            selectedObject: null
        };
    }

    const state = createState();
    const history = { undo: [], redo: [], limit: 60, applying: false };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function captureHistoryState(currentState) {
        return {
            mode: currentState.mode,
            cascadeLevels: currentState.cascadeLevels,
            nextId: currentState.nextId,
            assets: clone(currentState.assets),
            meterDetails: clone(currentState.meterDetails)
        };
    }

    function historyStatesEqual(first, second) {
        return JSON.stringify(first) === JSON.stringify(second);
    }

    function recordHistory(currentState, previousState) {
        if (history.applying || !previousState) return false;
        const currentSnapshot = captureHistoryState(currentState);
        if (historyStatesEqual(previousState, currentSnapshot)) return false;
        history.undo.push(previousState);
        if (history.undo.length > history.limit) history.undo.shift();
        history.redo = [];
        return true;
    }

    function restoreHistoryState(currentState, snapshot) {
        if (!snapshot) return;
        history.applying = true;
        currentState.mode = snapshot.mode;
        currentState.cascadeLevels = snapshot.cascadeLevels;
        currentState.nextId = snapshot.nextId;
        currentState.assets = clone(snapshot.assets);
        currentState.meterDetails = clone(snapshot.meterDetails);
        currentState.selectedObject = null;
        history.applying = false;
    }

    function createMeterDetails() {
        return meterDetailFields.reduce((details, field) => {
            details[field.key] = '';
            return details;
        }, {});
    }

    function getMeterDetails(currentState, index) {
        const key = String(index + 1);
        if (!currentState.meterDetails[key]) currentState.meterDetails[key] = createMeterDetails();
        return currentState.meterDetails[key];
    }

    function createAsset(currentState, type, zone, steuveType = '', energyCarrier = '') {
        const meta = assetMeta[type] || assetMeta.consumer;
        const selectedEnergyCarrier = type === 'generation' ? energyCarrier || 'PV' : '';
        const sameType = currentState.assets.filter(asset => asset.type === type
            && (type !== 'steuve' || asset.steuveType === steuveType)
            && (type !== 'generation' || asset.energyCarrier === selectedEnergyCarrier)).length + 1;
        // Erzeugungsanlagen erhalten eine eigene, energietraegerunabhaengige
        // laufende Nummer. Dadurch bleiben PV, KWK und Wind im Schema als
        // EA1, EA2, EA3 eindeutig unterscheidbar.
        const existingGenerationNumbers = currentState.assets
            .filter(asset => asset.type === 'generation')
            .map((asset, index) => {
                const storedNumber = Number(asset.generationNumber);
                // Alte gespeicherte Konzepte haben dieses Feld noch nicht.
                // Ihre Reihenfolge ist deshalb der sichere Rueckfallwert.
                return Number.isFinite(storedNumber) && storedNumber > 0 ? storedNumber : index + 1;
            });
        const generationNumber = type === 'generation'
            ? Math.max(0, ...existingGenerationNumbers) + 1
            : null;
        const defaultNames = {
            meter: `Zusatzzaehler ${sameType}`,
            generation: selectedEnergyCarrier === 'Balkonkraftwerk' ? `Balkonkraftwerk ${generationNumber}` : `EA ${generationNumber}`,
            consumer: `Sonstiger Verbraucher ${sameType}`,
            steuve: `${steuveType || 'Steuerbare Anlage'} ${sameType}`,
            storage: `Speicher ${sameType}`,
            nsh: `Nachtspeicherheizung ${sameType}`
        };

        return {
            id: `mk-${currentState.nextId++}`,
            type,
            zone,
            name: defaultNames[type] || meta.label,
            energyCarrier: selectedEnergyCarrier,
            steuveType: type === 'steuve' ? steuveType : '',
            steuveModule: '',
            power: '',
            commissioningDate: '',
            meterRole: type === 'meter' ? 'Bezug / Lieferung' : '',
            generationMeter: false,
            generationNumber,
            meterScope: type === 'meter' ? 'asset' : '',
            targetAssetId: '',
            parentMeterId: '',
            meterId: '',
            keepEmptyRail: false
        };
    }

    function getDefaultZone(currentState) {
        if (currentState.mode === 'parallel') return 'parallel-0';
        return 'single-main';
    }

    function addAsset(currentState, type, zone, steuveType = '', energyCarrier = '', options = {}, getMeterForAsset) {
        if (!assetMeta[type]) return null;
        const isBaseMeterChild = type === 'meter' && options.parentBaseMeterIndex !== undefined;
        if (type === 'meter' && !options.targetAssetId && !isBaseMeterChild) return null;
        const assignedMeter = type !== 'meter' && options.meterId
            ? currentState.assets.find(item => item.id === options.meterId && item.type === 'meter')
            : null;
        const asset = createAsset(currentState, type, assignedMeter?.zone || zone, steuveType, energyCarrier);
        if (assignedMeter) {
            asset.meterId = assignedMeter.id;
            assignedMeter.keepEmptyRail = false;
        }
        if (type === 'meter') {
            asset.meterScope = isBaseMeterChild ? 'base' : 'asset';
            asset.targetAssetId = options.targetAssetId || '';
            asset.name = 'Zähler vor Anlage';
            asset.parentBaseMeterIndex = isBaseMeterChild ? Number(options.parentBaseMeterIndex) : null;
            asset.parentMeterId = options.parentMeterId || '';
            asset.keepEmptyRail = Boolean(options.keepEmptyRail || isBaseMeterChild);
            const target = currentState.assets.find(item => item.id === options.targetAssetId);
            if (target) {
                // Bei einem Drop auf einen bestehenden Zähler wird die
                // Reihenfolge ausdrücklich als Unterkaskade gespeichert.
                // Dadurch bleibt die Kette Z2 → Z3 → Anlage auch dann
                // erhalten, wenn der neue Zähler zunächst nur einen
                // Einzelanschluss besitzt.
                asset.parentMeterId = options.parentMeterId || getMeterForAsset?.(target)?.id || '';
                asset.keepEmptyRail = Boolean(options.keepEmptyRail || options.parentMeterId);
                target.meterId = asset.id;
            }
        }
        currentState.assets.push(asset);
        return asset;
    }

    function reset(currentState) {
        currentState.mode = 'single';
        currentState.viewMode = 'simple';
        currentState.cascadeLevels = 2;
        currentState.nextId = 1;
        currentState.assets = [];
        currentState.meterDetails = {};
        currentState.selectedObject = null;
    }

    function mapAssetZoneForMode(zone, previousMode, nextMode, levels) {
        if (nextMode === 'single') return 'single-main';
        const maxIndex = Math.max(0, levels - 1);
        const previousZone = String(zone || '');
        if (nextMode === 'parallel') {
            const previousParallelMatch = previousMode === 'parallel' ? previousZone.match(/^parallel-(\d+)$/) : null;
            const index = previousParallelMatch ? Number(previousParallelMatch[1]) : 0;
            return `parallel-${Math.min(maxIndex, Math.max(0, index))}`;
        }
        return 'single-main';
    }

    function changeMode(currentState, mode) {
        if (!['single', 'parallel'].includes(mode) || mode === currentState.mode) return false;
        const previousMode = currentState.mode;
        const previousLevels = currentState.cascadeLevels;
        if (mode === 'parallel') {
            const keepMeterCount = previousMode === 'parallel';
            currentState.cascadeLevels = keepMeterCount ? Math.min(4, Math.max(2, previousLevels)) : 2;
        }
        currentState.assets.forEach(asset => {
            asset.zone = mapAssetZoneForMode(asset.zone, previousMode, mode, currentState.cascadeLevels);
        });
        currentState.mode = mode;
        return true;
    }

    function changeCascadeLevels(currentState, levels) {
        if (currentState.mode !== 'parallel') return false;
        const parsed = Math.min(4, Math.max(2, Number(levels) || 2));
        currentState.cascadeLevels = parsed;
        currentState.assets.forEach(asset => {
            const prefix = 'parallel';
            const match = String(asset.zone).match(/^parallel-(\d+)$/);
            if (!match) {
                asset.zone = `${prefix}-${parsed - 1}`;
                return;
            }
            asset.zone = `${prefix}-${Math.min(parsed - 1, Math.max(0, Number(match[1])))}`;
        });
        return true;
    }

    function getZoneAssets(currentState, zone) {
        return currentState.assets.filter(asset => asset.zone === zone && asset.type !== 'meter');
    }

    function swapAssetPositions(currentState, sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) return false;
        const source = currentState.assets.find(asset => asset.id === sourceId);
        const target = currentState.assets.find(asset => asset.id === targetId);
        if (!source || !target || source.type === 'meter' || target.type === 'meter' || source.zone !== target.zone) return false;
        const sourceIndex = currentState.assets.findIndex(asset => asset.id === sourceId);
        const targetIndex = currentState.assets.findIndex(asset => asset.id === targetId);
        if (sourceIndex < 0 || targetIndex < 0) return false;
        [currentState.assets[sourceIndex], currentState.assets[targetIndex]] = [currentState.assets[targetIndex], currentState.assets[sourceIndex]];
        return true;
    }

    function moveAssetBefore(currentState, assetId, beforeId) {
        if (!assetId || !beforeId || assetId === beforeId) return false;
        const sourceIndex = currentState.assets.findIndex(asset => asset.id === assetId);
        const beforeIndex = currentState.assets.findIndex(asset => asset.id === beforeId);
        if (sourceIndex < 0 || beforeIndex < 0) return false;
        const [asset] = currentState.assets.splice(sourceIndex, 1);
        const targetIndex = currentState.assets.findIndex(item => item.id === beforeId);
        currentState.assets.splice(targetIndex < 0 ? beforeIndex : targetIndex, 0, asset);
        return true;
    }

    function moveAssetAfter(currentState, assetId, afterId) {
        if (!assetId || !afterId || assetId === afterId) return false;
        const sourceIndex = currentState.assets.findIndex(asset => asset.id === assetId);
        const afterIndex = currentState.assets.findIndex(asset => asset.id === afterId);
        if (sourceIndex < 0 || afterIndex < 0) return false;
        const [asset] = currentState.assets.splice(sourceIndex, 1);
        const targetIndex = currentState.assets.findIndex(item => item.id === afterId);
        currentState.assets.splice(targetIndex < 0 ? afterIndex + 1 : targetIndex + 1, 0, asset);
        return true;
    }

    function moveMeterSubtreeToZone(currentState, meter, zone, descendantIds = []) {
        if (!meter || !zone) return;
        const meterIds = new Set([meter.id, ...descendantIds]);
        currentState.assets.forEach(asset => {
            if (meterIds.has(asset.id) || meterIds.has(asset.meterId)) asset.zone = zone;
        });
    }

    global.WattspurMesskonzeptModel = Object.freeze({
        assetMeta,
        assetTypeOptions,
        steuveModuleOptions,
        storageInfoText,
        balconyInfoText,
        meterDetailFields,
        state,
        history,
        createState,
        clone,
        captureHistoryState,
        historyStatesEqual,
        recordHistory,
        restoreHistoryState,
        createMeterDetails,
        getMeterDetails,
        createAsset,
        getDefaultZone,
        addAsset,
        reset,
        mapAssetZoneForMode,
        changeMode,
        changeCascadeLevels,
        getZoneAssets,
        swapAssetPositions,
        moveAssetBefore,
        moveAssetAfter,
        moveMeterSubtreeToZone
    });
}(window));
