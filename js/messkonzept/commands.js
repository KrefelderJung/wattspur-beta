/*
 * Wattspur Messkonzept – Zustandsbefehle
 *
 * Dieses Modul bündelt die Änderungen am Konfiguratorzustand. Es kennt weder
 * DOM noch CSS: Die Oberfläche wird ausschließlich über injizierte Callbacks
 * aktualisiert. Dadurch bleiben Modelländerungen, Historie und Darstellung
 * voneinander getrennt.
 */
(function exposeMesskonzeptCommands(global) {
    'use strict';

    function createCommandController(options = {}) {
        const model = options.model;
        const state = options.state;
        const call = (name, ...args) => typeof options[name] === 'function'
            ? options[name](...args)
            : undefined;

        function render() {
            call('render');
        }

        function captureHistoryState() {
            return call('captureHistoryState');
        }

        function recordHistory(previousState) {
            call('recordHistory', previousState);
        }

        function notify(message, type = 'info') {
            call('notify', message, type);
        }

        function addAsset(type, zone, steuveType = '', energyCarrier = '', assetOptions = {}) {
            const targetZone = zone || call('getDefaultZone') || '';
            if (type === 'meter' && !assetOptions.targetAssetId && assetOptions.parentBaseMeterIndex === undefined) {
                notify('Zähler bitte direkt auf eine Anlage ziehen.', 'warning');
                return null;
            }
            const asset = model?.addAsset?.(
                state,
                type,
                targetZone,
                steuveType,
                energyCarrier,
                assetOptions,
                asset => call('getMeterForAsset', asset)
            );
            if (!asset) return null;
            render();
            return asset;
        }

        function reset() {
            const previousState = captureHistoryState();
            model?.reset?.(state);
            render();
            recordHistory(previousState);
        }

        function changeViewMode(viewMode) {
            if (!['simple', 'detail'].includes(viewMode) || viewMode === state?.viewMode) return false;
            state.viewMode = viewMode;
            render();
            return true;
        }

        function changeMode(mode) {
            if (!['single', 'parallel'].includes(mode) || mode === state?.mode) return false;
            const previousState = captureHistoryState();
            if (!model?.changeMode?.(state, mode)) return false;
            render();
            recordHistory(previousState);
            return true;
        }

        function changeCascadeLevels(levels) {
            if (state?.mode !== 'parallel') return false;
            const previousState = captureHistoryState();
            if (!model?.changeCascadeLevels?.(state, levels)) return false;
            render();
            recordHistory(previousState);
            return true;
        }

        function swapAssetPositions(sourceId, targetId) {
            return model?.swapAssetPositions?.(state, sourceId, targetId) || false;
        }

        function moveAssetBefore(assetId, beforeId) {
            return model?.moveAssetBefore?.(state, assetId, beforeId) || false;
        }

        function moveAssetAfter(assetId, afterId) {
            return model?.moveAssetAfter?.(state, assetId, afterId) || false;
        }

        function moveMeterSubtreeToZone(meter, zone) {
            if (!meter || !zone) return;
            model?.moveMeterSubtreeToZone?.(state, meter, zone, call('getMeterDescendantIds', meter.id));
        }

        return Object.freeze({
            addAsset,
            reset,
            changeViewMode,
            changeMode,
            changeCascadeLevels,
            swapAssetPositions,
            moveAssetBefore,
            moveAssetAfter,
            moveMeterSubtreeToZone
        });
    }

    global.WattspurMesskonzeptCommands = Object.freeze({ createCommandController });
}(window));
