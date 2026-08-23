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
        generation: { label: 'Erzeugungsanlage', short: 'EA', className: 'generation', detail: 'PV, BHKW, Windenergieanlage, Steckersolar' },
        consumer: { label: 'Sonstige Verbraucher', short: 'V', className: 'consumer', detail: 'Allgemeine Last' },
        steuve: { label: 'Steuerbare Anlage', short: '⚡', className: 'steuve', detail: 'Leistungsabhängig nach § 14a EnWG prüfen' },
        storage: { label: 'Batteriespeicher', short: '▤', className: 'storage', detail: 'Speicheranlage' },
        nsh: { label: 'Nachtspeicherheizung', short: 'NSH', className: 'nsh', detail: 'Historische Tarif- und Messbehandlung prüfen' }
    });

    // Sichtbare Kurzbezeichnungen werden zentral gepflegt. Die internen Werte
    // bleiben fachlich stabil (z. B. "KWK" und "Balkonkraftwerk"), damit
    // bestehende Prüfregeln und gespeicherte Skizzen unverändert funktionieren.
    const generationDisplay = Object.freeze({
        PV: Object.freeze({ label: 'PV', prefix: 'PV' }),
        KWK: Object.freeze({ label: 'BHKW', prefix: 'BHKW' }),
        Wind: Object.freeze({ label: 'Windenergieanlage', prefix: 'WE' }),
        Balkonkraftwerk: Object.freeze({ label: 'PV', prefix: 'PV' })
    });
    const defaultGenerationDisplay = Object.freeze({ label: 'Erzeugungsanlage', prefix: 'EA' });

    const assetTypeOptions = Object.freeze({
        generation: [
            { value: 'PV', label: generationDisplay.PV.label },
            { value: 'KWK', label: generationDisplay.KWK.label },
            { value: 'Wind', label: generationDisplay.Wind.label },
            // Im Messkonzept bleibt die sichtbare Kurzkennung PV. In
            // Auswahlfeldern muss die Variante jedoch eindeutig erkennbar
            // sein, damit normale PV und Stecker-PV nicht gleich aussehen.
            { value: 'Balkonkraftwerk', label: generationDisplay.Balkonkraftwerk.label, selectionLabel: 'Stecker-PV' }
        ],
        steuve: [
            { value: 'Wärmepumpe', label: 'Wärmepumpe' },
            { value: 'Wallbox', label: 'Wallbox' },
            { value: 'Klimaanlage', label: 'Klimaanlage' },
            { value: 'offen', label: 'Fachliche Einordnung offen' }
        ]
    });

    // Die frühere Auswahl „Sonstige steuerbare Anlage“ wird nicht mehr
    // angeboten. Alte Entwürfe werden trotzdem in einen neutralen Zustand
    // überführt, ohne daraus automatisch eine §14a-Einordnung abzuleiten.
    function normalizeSteuveType(value) {
        if (value === 'Sonstige' || value === 'Fachliche Einordnung offen' || !value) return 'offen';
        return ['Wärmepumpe', 'Wallbox', 'Klimaanlage', 'offen'].includes(value) ? value : 'offen';
    }

    const steuveModuleOptions = Object.freeze([
        { value: 'Modul 1', label: 'Modul 1' },
        { value: 'Modul 2', label: 'Modul 2' },
        { value: 'Modul 3', label: 'Modul 3' }
    ]);

    const storageGridOptions = Object.freeze([
        { value: 'unknown', label: 'Noch nicht festgelegt' },
        { value: 'no', label: 'Nein' },
        { value: 'yes', label: 'Ja' }
    ]);
    const storageInfoText = 'Achtung: Die Registrierung des Stromspeichers im Marktstammdatenregister ist zu prüfen. Einspeisung und Bezug sind getrennt zu betrachten. Die konkrete Betriebsweise und das Messkonzept mit dem Verteilnetzbetreiber abstimmen.';
    const balconyInfoText = 'Balkonkraftwerk / Steckersolargerät: Registrierung im Marktstammdatenregister prüfen. Die vereinfachte Behandlung hängt unter anderem von Leistungsgrenzen und der gewählten EEG-Veräußerungsform ab.';
    const hakVoltageLevels = Object.freeze([
        { value: 'low', label: 'Niederspannung', objectLabel: 'HAK' },
        { value: 'medium', label: 'Mittelspannung', objectLabel: 'Trafo' }
    ]);
    const meterDetailFields = Object.freeze([
        { key: 'maloBezug', label: 'Marktlokation Bezug', type: 'text' },
        { key: 'maloLieferung', label: 'Marktlokation Lieferung', type: 'text' },
        { key: 'melo', label: 'Messlokation', type: 'text', maxLength: 33 },
        { key: 'meterNumber', label: 'Zählernummer', type: 'text', maxLength: 11, inputmode: 'numeric', pattern: '[0-9]*' },
        { key: 'installationDate', label: 'Einbaudatum', type: 'date' },
        { key: 'remark', label: 'Bemerkung', type: 'textarea', maxLength: 240, rows: 3 }
    ]);

    function getGenerationDisplay(energyCarrier) {
        return generationDisplay[energyCarrier] || defaultGenerationDisplay;
    }

    // PV und Steckersolar teilen sich bewusst einen sichtbaren Nummernkreis.
    // BHKW/KWK und Windenergieanlagen werden jeweils separat gezählt.
    function getGenerationNumberKey(energyCarrier) {
        return energyCarrier === 'Balkonkraftwerk' ? 'PV' : energyCarrier || 'PV';
    }

    function normalizeStorageGridChoice(value) {
        return ['yes', 'no'].includes(value) ? value : 'unknown';
    }

    function normalizeHakVoltageLevel(value) {
        return value === 'medium' ? 'medium' : 'low';
    }

    function getHakVoltageLevel(currentState) {
        return normalizeHakVoltageLevel(currentState?.hak?.voltageLevel);
    }

    function setHakVoltageLevel(currentState, value) {
        if (!currentState) return 'low';
        if (!currentState.hak || typeof currentState.hak !== 'object') currentState.hak = {};
        currentState.hak.voltageLevel = normalizeHakVoltageLevel(value);
        return currentState.hak.voltageLevel;
    }

    function getStorageOperation(storage) {
        const feedIn = normalizeStorageGridChoice(storage?.storageGridFeedIn);
        const gridImport = normalizeStorageGridChoice(storage?.storageGridImport);
        if (feedIn === 'no' && gridImport === 'no') {
            return {
                key: 'pv-surplus-only',
                label: 'Nur PV-Überschuss laden',
                notice: 'Kein Netzbezug zum Laden und keine Netzeinspeisung des Speichers ausgewählt. Das entspricht einem reinen PV-Überschussbetrieb, sofern ausschließlich erneuerbarer Strom geladen wird.'
            };
        }
        if (feedIn === 'yes' && gridImport === 'no') {
            return {
                key: 'grid-feed-in',
                label: 'Netzeinspeisung ohne Netzbezug zum Laden',
                notice: 'Bei Einspeisung aus dem Speicher muss der Vermarktungsweg geklärt werden. Je nach Anlage und Vergütungsweg kann Direktvermarktung erforderlich sein.'
            };
        }
        if (feedIn === 'no' && gridImport === 'yes') {
            return {
                key: 'grid-import-only',
                label: 'Netzbezug zum Laden, keine Netzeinspeisung',
                notice: 'Netzbezug zum Laden ausgewählt. § 14a EnWG, Messung und die Auswirkungen auf eine mögliche EEG-Behandlung sind fachlich zu prüfen.'
            };
        }
        if (feedIn === 'yes' && gridImport === 'yes') {
            return {
                key: 'mixed-grid-operation',
                label: 'Mischbetrieb mit Netzbezug und Netzeinspeisung',
                notice: 'Bei Netzbezug zum Laden und späterer Einspeisung können EEG-Förderung und Umlagebehandlung von Betriebsweise und Messung abhängen. Reiner EE-Speicher und Mischbetrieb sind getrennt zu bewerten.'
            };
        }
        return {
            key: 'open',
            label: 'Betriebsweise noch offen',
            notice: 'Bitte festlegen, ob der Speicher aus dem öffentlichen Netz laden oder in das öffentliche Netz einspeisen darf.'
        };
    }

    function createState() {
        return {
            mode: 'single',
            viewMode: 'simple',
            canvasZoom: 1,
            cascadeLevels: 2,
            nextId: 1,
            assets: [],
            meterDetails: {},
            // Positionen der optionalen Zähler-Infokarten. Die Koordinaten
            // liegen relativ zur Skizzenbühne und beeinflussen keine
            // fachliche Zähler- oder Leitungslogik.
            meterAnnotationPositions: {},
            // Infokarten bleiben zunächst aus, damit eine neue Skizze ruhig
            // startet. Wer eine Karte einschaltet oder eine Bemerkung einträgt,
            // erhält die relevanten Angaben automatisch.
            hak: { voltageLevel: 'low', annotationVisible: false, remark: '' },
            project: { name: '', reference: '', measurementConcept: '', street: '', houseNumber: '', postalCode: '', city: '' },
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
            meterDetails: clone(currentState.meterDetails),
            meterAnnotationPositions: clone(currentState.meterAnnotationPositions || {}),
            hak: clone(currentState.hak || { voltageLevel: 'low' })
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
        // Die Oberfläche bietet bewusst nur die einfache Ansicht an. Auch alte
        // Verlaufsstände dürfen daher niemals eine Detailansicht reaktivieren.
        currentState.viewMode = 'simple';
        currentState.cascadeLevels = snapshot.cascadeLevels;
        currentState.nextId = snapshot.nextId;
        currentState.assets = clone(snapshot.assets);
        currentState.meterDetails = clone(snapshot.meterDetails);
        currentState.meterAnnotationPositions = clone(snapshot.meterAnnotationPositions || {});
        currentState.hak = clone(snapshot.hak || { voltageLevel: 'low' });
        setHakVoltageLevel(currentState, currentState.hak.voltageLevel);
        currentState.selectedObject = null;
        history.applying = false;
    }

    function createMeterDetails() {
        const details = meterDetailFields.reduce((result, field) => {
            result[field.key] = '';
            return result;
        }, {});
        details.annotationVisible = false;
        return details;
    }

    function getMeterDetails(currentState, index) {
        const key = String(index + 1);
        if (!currentState.meterDetails[key]) currentState.meterDetails[key] = createMeterDetails();
        if (currentState.meterDetails[key].annotationVisible === undefined) currentState.meterDetails[key].annotationVisible = false;
        return currentState.meterDetails[key];
    }

    function createAsset(currentState, type, zone, steuveType = '', energyCarrier = '', assetOptions = {}) {
        const meta = assetMeta[type] || assetMeta.consumer;
        const selectedEnergyCarrier = type === 'generation' ? energyCarrier || 'PV' : '';
        const selectedSteuveType = type === 'steuve' ? normalizeSteuveType(steuveType) : '';
        const selectedSteuveLabel = assetTypeOptions.steuve.find(option => option.value === selectedSteuveType)?.label || 'Fachliche Einordnung offen';
        const isMieterstromUser = type === 'consumer' && assetOptions.mieterstromObject === 'user';
        const sameType = currentState.assets.filter(asset => asset.type === type
            && (type !== 'steuve' || normalizeSteuveType(asset.steuveType) === selectedSteuveType)
            && (type !== 'generation' || asset.energyCarrier === selectedEnergyCarrier)
            && (type !== 'consumer' || (asset.mieterstromObject === 'user') === isMieterstromUser)).length + 1;
        // Erzeugungsanlagen erhalten je fachlicher Gruppe einen eigenen
        // Nummernkreis. Die sichtbare Kennung (z. B. PV1, BHKW1 oder WE1)
        // wird aus der gewählten Anlagenart abgeleitet; Steckersolar teilt
        // bewusst den PV-Nummernkreis.
        const generationNumberKey = type === 'generation'
            ? getGenerationNumberKey(selectedEnergyCarrier)
            : '';
        const existingGenerationNumbers = currentState.assets
            .filter(asset => asset.type === 'generation'
                && getGenerationNumberKey(asset.energyCarrier) === generationNumberKey)
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
            generation: `${getGenerationDisplay(selectedEnergyCarrier).prefix}${generationNumber}`,
            consumer: assetOptions.mieterstromObject === 'user' ? `Mieterstromnutzer ${sameType}` : `Sonstiger Verbraucher ${sameType}`,
            steuve: `${selectedSteuveLabel} ${sameType}`,
            storage: `Speicher ${sameType}`,
            nsh: `Nachtspeicherheizung ${sameType}`
        };

        return {
            id: `mk-${currentState.nextId++}`,
            type,
            zone,
            name: defaultNames[type] || meta.label,
            energyCarrier: selectedEnergyCarrier,
            steuveType: selectedSteuveType,
            steuveModule: '',
            power: '',
            // Technische Stammdaten werden bewusst getrennt von der
            // Messlogik gespeichert. Die Werte dokumentieren die Anlage,
            // lösen aber keine automatische Netzbetreiberentscheidung aus.
            inverterPower: type === 'generation' ? '' : '',
            commissioningDate: '',
            remark: '',
            annotationVisible: false,
            meterRole: type === 'meter' ? 'Bezug / Lieferung' : '',
            generationMeter: false,
            storageGridFeedIn: type === 'storage' ? 'unknown' : '',
            storageGridImport: type === 'storage' ? 'unknown' : '',
            storageCapacity: type === 'storage' ? '' : '',
            storageChargePower: type === 'storage' ? '' : '',
            storageDischargePower: type === 'storage' ? '' : '',
            storageInverterPower: type === 'storage' ? '' : '',
            generationNumber,
            generationNumberKey,
            meterScope: type === 'meter' ? 'asset' : '',
            targetAssetId: '',
            // Wird nur bei einer Zielanlagen-Loeschung gesetzt. Der Wert
            // bewahrt den bisherigen Anschlussplatz der Unter-Sammelschiene,
            // waehrend der Zaehler auf eine verbleibende Anlage umhaengt.
            railAnchorOrder: null,
            parentMeterId: '',
            meterId: '',
            // Mieterstromrollen sind bewusst nur technische Kennzeichnungen.
            // Der historische Wert "external-meter" bleibt aus Kompatibilitäts-
            // gründen erhalten. Er beschreibt hier den teilnehmenden Zähler,
            // der aus der regulären Netzbetreiberabrechnung herausgenommen ist.
            // Das ist eine Modellannahme und keine automatische Rechtsprüfung.
            mieterstromObject: assetOptions.mieterstromObject || '',
            mieterstromParticipation: assetOptions.mieterstromObject === 'external-meter' ? 'excluded' : '',
            marketLocationStatus: assetOptions.mieterstromObject === 'external-meter' ? 'inactive' : '',
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
        const asset = createAsset(currentState, type, assignedMeter?.zone || zone, steuveType, energyCarrier, options);
        if (assignedMeter) {
            asset.meterId = assignedMeter.id;
            assignedMeter.keepEmptyRail = false;
        }
        if (type === 'meter') {
            asset.meterScope = isBaseMeterChild ? 'base' : 'asset';
            asset.targetAssetId = options.targetAssetId || '';
            asset.name = 'Zähler vor Anlage';
            if (options.mieterstromObject === 'external-meter') {
                asset.mieterstromObject = 'external-meter';
                asset.mieterstromParticipation = 'excluded';
                asset.marketLocationStatus = 'inactive';
            }
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
        currentState.meterAnnotationPositions = {};
        currentState.hak = { voltageLevel: 'low', annotationVisible: false, remark: '' };
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
        normalizeSteuveType,
        generationDisplay,
        storageGridOptions,
        hakVoltageLevels,
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
        moveMeterSubtreeToZone,
        getGenerationDisplay,
        getGenerationNumberKey,
        normalizeStorageGridChoice,
        getStorageOperation,
        normalizeHakVoltageLevel,
        getHakVoltageLevel,
        setHakVoltageLevel
    });
}(window));
