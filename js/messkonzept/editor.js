/*
 * Wattspur Messkonzept – Objekteditor
 *
 * Der Editor verbindet Eingaben im Objekt-Dialog mit dem fachlichen Zustand.
 * Er kennt keine Topologie und zeichnet nichts selbst. Alle Änderungen laufen
 * über kleine, injizierte Adapter aus messkonzept.js. Dadurch bleibt die
 * Ereignis-Schicht schlank und der Editor lässt sich separat testen.
 */
(function exposeMesskonzeptEditor(global) {
    'use strict';

    function createEditorController(options = {}) {
        const getElements = options.getElements || (() => ({}));
        const getState = options.getState || (() => ({}));
        const callbacks = options.callbacks || {};
        let initialized = false;

        const call = (name, ...args) => {
            const callback = callbacks[name];
            return typeof callback === 'function' ? callback(...args) : undefined;
        };

        function updateAssetField(event) {
            const target = event?.target;
            const card = target?.closest?.('[data-mk-asset-id]');
            const field = target?.dataset?.mkField;
            if (!card || !field) return;
            const state = getState() || {};
            const asset = state.assets?.find(item => item.id === card.dataset.mkAssetId);
            if (!asset) return;

            const previousState = call('getFieldHistoryBefore', event);
            asset[field] = target.type === 'checkbox' ? target.checked : target.value;
            if (asset.type === 'generation' && field === 'energyCarrier') {
                call('syncGenerationName', asset);
                // PV/Wind erhalten ein Wechselrichterfeld, BHKW nicht. Nach
                // einem Wechsel der Anlagenart muss der Dialog deshalb seine
                // technischen Felder neu aufbauen.
                call('refreshObjectModal', { kind: 'asset', id: asset.id });
            }
            if (asset.type === 'storage' && ['storageGridFeedIn', 'storageGridImport'].includes(field)) {
                const notice = card.querySelector(`[data-mk-storage-notice="${asset.id}"]`);
                if (notice) {
                    notice.textContent = call('getStorageOperation', asset)?.notice || '';
                }
                call('render');
            }
            if (asset.type === 'steuve' && ['power', 'steuveType'].includes(field)) {
                const notice = card.querySelector(`[data-mk-steuve-notice="${asset.id}"]`);
                if (notice) notice.innerHTML = call('renderSteuveNotice', asset) || '';
                const moduleFields = card.querySelector(`[data-mk-steuve-module-fields="${asset.id}"]`);
                if (moduleFields) moduleFields.innerHTML = call('renderSteuveModuleFields', asset) || '';
                // Nach einem Wechsel der Anlagenart muss der Dialog seine
                // fachlich passende Leistungsbezeichnung neu aufbauen.
                if (field === 'steuveType') call('refreshObjectModal', { kind: 'asset', id: asset.id });
            }
            call('refreshInlineStatus');
            if (previousState) call('recordHistory', previousState);
        }

        function updateMeterDetailField(event) {
            const target = event?.target;
            const field = target?.dataset?.mkMeterField;
            if (!field) return;
            const index = Number(target.dataset.mkMeterIndex) || 0;
            const previousState = call('getFieldHistoryBefore', event);
            const details = call('getMeterDetails', index);
            if (!details) return;
            details[field] = target.value;
            if (previousState) call('recordHistory', previousState);
        }

        function updateHakField(event) {
            const target = event?.target;
            const field = target?.dataset?.mkHakField;
            if (!field) return;
            const previousState = call('getFieldHistoryBefore', event);
            call('updateHakField', field, target.type === 'checkbox' ? target.checked : target.value);
            call('render');
            if (getState()?.selectedObject?.kind === 'hak') {
                call('refreshObjectModal', getState().selectedObject);
            }
            if (previousState) call('recordHistory', previousState);
        }

        function handleFieldEvent(event) {
            updateAssetField(event);
            updateMeterDetailField(event);
            updateHakField(event);
        }

        function initialize() {
            if (initialized) return;
            const modal = getElements()?.objectModal;
            if (!modal?.addEventListener) return;
            initialized = true;
            modal.addEventListener('input', handleFieldEvent);
            modal.addEventListener('change', handleFieldEvent);
        }

        return Object.freeze({
            initialize,
            updateAssetField,
            updateMeterDetailField,
            updateHakField
        });
    }

    global.WattspurMesskonzeptEditor = Object.freeze({ createEditorController });
}(window));
