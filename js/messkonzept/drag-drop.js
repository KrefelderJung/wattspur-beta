/*
 * Wattspur Messkonzept - fachliche Drag-and-drop- und Loeschbefehle.
 *
 * Dieses Modul kennt die Regeln fuer Drops und das Entfernen von Objekten,
 * aber keine konkrete Render- oder DOM-Struktur. Abhaengigkeiten werden vom
 * Einstiegspunkt injiziert. Dadurch bleibt die Topologie an einer Stelle
 * nachvollziehbar und kann spaeter gezielt getestet werden.
 */
(function attachMesskonzeptDragDrop(global) {
    'use strict';

    function createDragDropController(options = {}) {
        const getState = options.getState || (() => ({}));
        const getActiveDrag = options.getActiveDrag || (() => null);
        const setActiveDrag = options.setActiveDrag || (() => {});
        const getAssetMeta = options.getAssetMeta || (() => ({}));
        const api = options.api || {};

        const call = (name, ...args) => {
            const callback = api[name];
            return typeof callback === 'function' ? callback(...args) : undefined;
        };

        function parseTransfer(event) {
            try {
                return JSON.parse(event.dataTransfer.getData('application/json'));
            } catch (error) {
                return null;
            }
        }

        function handlePaletteDragStart(event, button) {
            setActiveDrag({ source: 'palette', type: button.dataset.mkType });
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('application/json', JSON.stringify({
                source: 'palette',
                type: button.dataset.mkType,
                steuveType: button.dataset.mkSteuveType || '',
                energyCarrier: button.dataset.mkEnergyCarrier || ''
            }));
        }

        function handlePaletteDragEnd() {
            setActiveDrag(null);
        }

        function handleCanvasDragOver(event) {
            const activeDrag = getActiveDrag();
            const state = getState();
            const meterTarget = event.target.closest('[data-mk-meter-target]');
            const meterGroupTarget = event.target.closest('[data-mk-meter-group-target]');
            const baseMeterTarget = event.target.closest('[data-mk-base-meter-target]');
            const positionTarget = event.target.closest('[data-mk-position-target]');
            const zone = event.target.closest('[data-mk-zone]');
            const sourceAsset = activeDrag?.source === 'asset'
                ? state.assets.find(asset => asset.id === activeDrag.id)
                : null;
            const targetAsset = positionTarget
                ? state.assets.find(asset => asset.id === positionTarget.dataset.mkPositionTarget)
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
                (activeDrag?.source === 'palette' && getAssetMeta()[activeDrag.type])
                || (sourceAsset && sourceAsset.type !== 'meter')
            );
            if (canDropOnBaseMeter) {
                event.preventDefault();
                baseMeterTarget.classList.add('mk-meter-drop-target-active');
                return;
            }
            if (meterTarget && activeDrag?.source === 'palette' && activeDrag.type === 'meter') {
                const targetObject = state.assets.find(asset => asset.id === meterTarget.dataset.mkMeterTarget);
                const targetMeter = targetObject?.type === 'meter' ? targetObject : null;
                if (targetObject?.type !== 'meter') {
                    if (!targetObject || !call('canAddMeterToAsset', targetObject)) return;
                    event.preventDefault();
                    meterTarget.classList.add('mk-meter-drop-target-active');
                    return;
                }
                if (!call('canBuildCascadeAfterMeter', targetMeter)) return;
                event.preventDefault();
                meterTarget.classList.add('mk-meter-drop-target-active');
                return;
            }
            const canDropPaletteOnMeterGroup = meterGroupTarget
                && activeDrag?.source === 'palette'
                && activeDrag.type !== 'meter';
            const canDropAssetOnMeterGroup = meterGroupTarget
                && activeDrag?.source === 'asset'
                && activeDrag.id !== meterGroupTarget.dataset.mkMeterGroupTarget;
            if (canDropPaletteOnMeterGroup || canDropAssetOnMeterGroup) {
                event.preventDefault();
                meterGroupTarget.classList.add('mk-meter-group-target-active');
                return;
            }
            if (activeDrag?.source === 'palette' && activeDrag.type === 'meter') return;
            if (!zone) return;
            event.preventDefault();
            zone.classList.add('dragover');
        }

        function handleCanvasDragLeave(event) {
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

        function handleCanvasDrop(event) {
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
            handleDrop(
                event,
                zone?.dataset.mkZone || baseMeterTarget?.dataset.mkZone || '',
                meterTarget?.dataset.mkMeterTarget || '',
                meterGroupTarget?.dataset.mkMeterGroupTarget || '',
                positionTarget?.dataset.mkPositionTarget || '',
                baseMeterTarget?.dataset.mkBaseMeterTarget || ''
            );
        }

        function handleCanvasDragStart(event) {
            const handle = event.target.closest('[data-mk-drag-asset]');
            if (!handle) return;
            setActiveDrag({ source: 'asset', id: handle.dataset.mkDragAsset });
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('application/json', JSON.stringify({ source: 'asset', id: handle.dataset.mkDragAsset }));
        }

        function handleCanvasDragEnd() {
            setActiveDrag(null);
        }

        function handleDrop(event, zone, targetAssetId = '', meterGroupTargetId = '', positionTargetId = '', baseMeterIndex = '') {
            event.preventDefault();
            const transfer = parseTransfer(event);
            if (!transfer) return;
            const state = getState();
            const previousState = call('captureHistoryState');
            const baseZone = baseMeterIndex !== '' ? call('getBaseMeterZone', baseMeterIndex) : '';
            const targetObject = targetAssetId
                ? state.assets.find(item => item.id === targetAssetId)
                : null;
            const targetAsset = targetObject?.type !== 'meter' ? targetObject : null;
            const directMeterTarget = targetObject?.type === 'meter' ? targetObject : null;

            // Der gemeinsame Messpunkt wird aus der Zielanlage abgeleitet,
            // wenn der kleine Zaehler-Hitbereich nicht direkt getroffen wurde.
            if (!meterGroupTargetId && targetAssetId) {
                const draggedAsset = transfer.source === 'asset'
                    ? state.assets.find(item => item.id === transfer.id)
                    : null;
                const draggedType = transfer.source === 'palette' ? transfer.type : draggedAsset?.type;
                if (targetAsset && draggedType !== 'meter' && draggedAsset?.id !== targetAsset.id) {
                    meterGroupTargetId = call('getMeterForAsset', targetAsset)?.id || '';
                }
            }
            const targetMeter = meterGroupTargetId
                ? state.assets.find(item => item.id === meterGroupTargetId && item.type === 'meter')
                : directMeterTarget;
            zone = call('resolveDropZone', zone, baseZone, targetAsset, targetMeter);

            if (transfer.source === 'palette' && getAssetMeta()[transfer.type]) {
                if (transfer.type === 'meter') {
                    if (baseMeterIndex !== '') {
                        const normalizedBaseIndex = Number(baseMeterIndex);
                        const existingBaseChild = call('getBaseChainChild', null, normalizedBaseIndex, zone);
                        if (existingBaseChild && !call('canBuildCascadeAfterMeter', existingBaseChild)) {
                            call('notify', 'Hinter diesem Basiszaehler ist bereits ein Zusatzzaehler angelegt.', 'warning');
                            return;
                        }
                        const insertedMeter = call('addAsset', 'meter', zone, '', '', {
                            parentBaseMeterIndex: normalizedBaseIndex,
                            parentMeterId: existingBaseChild?.parentMeterId || '',
                            keepEmptyRail: true
                        });
                        if (insertedMeter && existingBaseChild) {
                            existingBaseChild.parentMeterId = insertedMeter.id;
                            call('moveAssetBefore', insertedMeter.id, existingBaseChild.id);
                            call('render');
                        }
                        call('recordHistory', previousState);
                        return;
                    }
                    if (directMeterTarget) {
                        if (!call('canBuildCascadeAfterMeter', directMeterTarget)) {
                            call('notify', 'Einzelzaehler vor einer Anlage kann nicht als Kaskadenstufe erweitert werden. Ziehe den neuen Zaehler auf einen Hauptzaehler.', 'warning');
                            return;
                        }
                        if (directMeterTarget.meterScope === 'base') {
                            const existingChild = call('getBaseChainChild', directMeterTarget, directMeterTarget.parentBaseMeterIndex ?? null, directMeterTarget.zone);
                            const insertedMeter = call('addAsset', 'meter', directMeterTarget.zone, '', '', {
                                parentBaseMeterIndex: Number.isFinite(Number(directMeterTarget.parentBaseMeterIndex))
                                    ? Number(directMeterTarget.parentBaseMeterIndex)
                                    : 0,
                                parentMeterId: directMeterTarget.id,
                                keepEmptyRail: true
                            });
                            if (insertedMeter) {
                                if (existingChild) {
                                    existingChild.parentMeterId = insertedMeter.id;
                                    call('moveAssetBefore', insertedMeter.id, existingChild.id);
                                } else {
                                    call('moveAssetAfter', insertedMeter.id, directMeterTarget.id);
                                }
                                call('render');
                            }
                            call('recordHistory', previousState);
                            return;
                        }
                        const chainTarget = state.assets.find(item => item.id === directMeterTarget.targetAssetId && item.type !== 'meter');
                        if (!chainTarget) {
                            call('notify', 'Dieser Zaehler hat noch keine Anlage, an die ein weiterer Zaehler angehaengt werden kann.', 'warning');
                            return;
                        }
                        const insertedMeter = call('addAsset', 'meter', directMeterTarget.zone, '', '', {
                            targetAssetId: chainTarget.id,
                            parentMeterId: directMeterTarget.id,
                            keepEmptyRail: true
                        });
                        if (insertedMeter) {
                            call('moveAssetAfter', insertedMeter.id, directMeterTarget.id);
                            call('render');
                        }
                        call('recordHistory', previousState);
                        return;
                    }
                    if (targetAssetId) {
                        const attachTarget = state.assets.find(item => item.id === targetAssetId && item.type !== 'meter');
                        if (!attachTarget || !call('canAddMeterToAsset', attachTarget)) {
                            call('notify', 'Fuer diese Anlage ist bereits ein zusaetzlicher Zaehler vorhanden.', 'warning');
                            return;
                        }
                        call('addAsset', 'meter', zone, '', '', call('getMeterDropOptions', attachTarget));
                        call('recordHistory', previousState);
                        return;
                    }
                    call('notify', 'Zaehler bitte direkt auf eine Anlage ziehen.', 'warning');
                    return;
                }
                if (baseZone && !targetAssetId && !meterGroupTargetId) {
                    call('addAsset', transfer.type, baseZone, transfer.steuveType || '', transfer.energyCarrier || '');
                    call('recordHistory', previousState);
                    return;
                }
                if (meterGroupTargetId) {
                    const meter = targetMeter || state.assets.find(item => item.id === meterGroupTargetId && item.type === 'meter');
                    if (!meter) return;
                    call('addAsset', transfer.type, meter.zone, transfer.steuveType || '', transfer.energyCarrier || '', { meterId: meter.id });
                    call('recordHistory', previousState);
                    return;
                }
                call('addAsset', transfer.type, zone, transfer.steuveType || '', transfer.energyCarrier || '');
                call('recordHistory', previousState);
            }
            if (transfer.source !== 'asset') return;

            const asset = state.assets.find(item => item.id === transfer.id);
            if (!asset) return;
            const positionTarget = positionTargetId
                ? state.assets.find(item => item.id === positionTargetId)
                : null;
            if (positionTarget && asset.type !== 'meter' && positionTarget.type !== 'meter' && asset.zone === positionTarget.zone) {
                if (call('swapAssetPositions', asset.id, positionTarget.id)) {
                    call('render');
                    call('recordHistory', previousState);
                }
                return;
            }
            if (baseZone && !targetAssetId && !meterGroupTargetId && asset.type !== 'meter') {
                asset.zone = baseZone;
                asset.meterId = '';
                call('getAssetMeters', asset.id).forEach(meter => {
                    meter.parentMeterId = '';
                    call('moveMeterSubtreeToZone', meter, baseZone);
                });
                call('render');
                call('recordHistory', previousState);
                return;
            }
            if (asset.type === 'meter') {
                if (!targetAssetId) {
                    call('notify', 'Zaehler bitte auf eine Anlage ziehen.', 'warning');
                    return;
                }
                const target = state.assets.find(item => item.id === targetAssetId);
                if (!target) return;
                const descendants = call('getMeterDescendantIds', asset.id);
                if (target.meterId === asset.id || descendants.has(target.meterId) || descendants.has(call('getAssetMeters', target.id)[0]?.id)) {
                    call('notify', 'Zaehler kann nicht in seinen eigenen Unterstrang verschoben werden.', 'warning');
                    return;
                }
                const parentMeter = call('getMeterForAsset', target);
                state.assets.forEach(item => {
                    if (item.meterId === asset.id) item.meterId = '';
                });
                asset.zone = target.zone;
                asset.meterScope = 'asset';
                asset.targetAssetId = target.id;
                asset.parentMeterId = parentMeter?.id === asset.id ? '' : parentMeter?.id || '';
                target.meterId = asset.id;
                call('moveMeterSubtreeToZone', asset, target.zone);
            } else if (meterGroupTargetId) {
                const meter = targetMeter || state.assets.find(item => item.id === meterGroupTargetId && item.type === 'meter');
                if (!meter) return;
                asset.zone = meter.zone;
                asset.meterId = meter.id;
            } else {
                asset.zone = zone;
                call('getAssetMeters', asset.id).forEach(meter => { meter.zone = zone; });
                asset.meterId = call('getAssetMeters', asset.id)[0]?.id || '';
            }
            call('render');
            call('recordHistory', previousState);
        }

        function handleCanvasClick(event) {
            const state = getState();
            const removeMeterButton = event.target.closest('[data-mk-remove-meter]');
            if (removeMeterButton) {
                const previousState = call('captureHistoryState');
                const removedId = removeMeterButton.dataset.mkRemoveMeter;
                const removedMeter = call('getAdditionalMeters').find(asset => asset.id === removedId);
                state.assets = state.assets.filter(asset => asset.id !== removedId);
                state.assets.forEach(asset => {
                    if (asset.type === 'meter' && asset.parentMeterId === removedId) asset.parentMeterId = removedMeter?.parentMeterId || '';
                    if (asset.meterId === removedId || asset.targetAssetId === removedId) {
                        asset.meterId = '';
                        asset.targetAssetId = '';
                        asset.meterScope = asset.type === 'meter' ? 'zone' : '';
                    }
                });
                call('render');
                call('recordHistory', previousState);
                return;
            }
            const removeButton = event.target.closest('[data-mk-remove-asset]');
            if (removeButton) {
                const previousState = call('captureHistoryState');
                const removedId = removeButton.dataset.mkRemoveAsset;
                const replacementMeters = call('getAdditionalMeters')
                    .filter(meter => meter.targetAssetId === removedId)
                    .map(meter => ({
                        meter,
                        replacement: call('getMeterAssets', meter.id).find(asset => asset.id !== removedId) || null
                    }));
                state.assets = state.assets.filter(asset => asset.id !== removedId);
                state.assets.forEach(asset => {
                    if (asset.type === 'meter' && asset.parentMeterId === removedId) asset.parentMeterId = '';
                    if (asset.meterId === removedId || asset.targetAssetId === removedId) {
                        asset.meterId = '';
                        asset.targetAssetId = '';
                        asset.meterScope = asset.type === 'meter' ? 'zone' : '';
                    }
                });
                replacementMeters.forEach(({ meter, replacement }) => {
                    const currentMeter = call('getAdditionalMeters').find(asset => asset.id === meter.id);
                    if (!currentMeter) return;
                    if (replacement) {
                        currentMeter.targetAssetId = replacement.id;
                        currentMeter.keepEmptyRail = false;
                        replacement.meterId = currentMeter.id;
                    } else {
                        currentMeter.targetAssetId = '';
                        currentMeter.keepEmptyRail = true;
                    }
                });
                if (state.selectedObject?.kind === 'asset' && state.selectedObject.id === removedId) state.selectedObject = null;
                call('render');
                call('recordHistory', previousState);
                return;
            }
            const meter = event.target.closest('[data-mk-select-meter]');
            if (meter) {
                call('openObjectModal', { kind: 'meter', index: Number(meter.dataset.mkSelectMeter) || 0 });
                return;
            }
            const asset = event.target.closest('[data-mk-select-asset]');
            if (asset) call('openObjectModal', { kind: 'asset', id: asset.dataset.mkSelectAsset });
        }

        return Object.freeze({
            handleDrop,
            handleCanvasClick,
            handlePaletteDragStart,
            handlePaletteDragEnd,
            handleCanvasDragOver,
            handleCanvasDragLeave,
            handleCanvasDrop,
            handleCanvasDragStart,
            handleCanvasDragEnd,
            parseTransfer
        });
    }

    global.WattspurMesskonzeptDragDrop = Object.freeze({ createDragDropController });
}(window));
