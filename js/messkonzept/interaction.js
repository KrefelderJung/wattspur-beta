/*
 * Wattspur Messkonzept – Bedienereignisse
 *
 * Diese Schicht verbindet DOM-Ereignisse mit fachlichen Befehlen. Sie kennt
 * weder die Zählerhierarchie noch Leitungskoordinaten und bleibt dadurch eine
 * sichere, austauschbare UI-Schicht.
 */
(function attachMesskonzeptInteraction(global) {
    'use strict';

    function createInteractionController(options = {}) {
        const getElements = options.getElements || (() => ({}));
        const getDocument = options.getDocument || (() => global.document);
        const callbacks = options.callbacks || {};
        let initialized = false;

        const call = (name, ...args) => {
            const callback = callbacks[name];
            return typeof callback === 'function' ? callback(...args) : undefined;
        };

        function bindClick(id, handler) {
            const button = getDocument()?.getElementById(id);
            if (button) button.addEventListener('click', handler);
        }

        function isEditingField(target) {
            return target?.matches?.('input, textarea, select, [contenteditable="true"]');
        }

        function handleGlobalKeydown(event) {
            if (!isEditingField(event.target) && (event.ctrlKey || event.metaKey) && !event.altKey) {
                const key = event.key.toLowerCase();
                if (key === 'z') {
                    event.preventDefault();
                    call(event.shiftKey ? 'redo' : 'undo');
                    return;
                }
                if (key === 'y') {
                    event.preventDefault();
                    call('redo');
                    return;
                }
            }
            const modal = getElements().objectModal;
            if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) call('closeModal');
        }

        function handleCanvasKeydown(event) {
            if (!['Enter', ' '].includes(event.key)) return;
            const target = event.target.closest?.('[data-mk-select-meter], [data-mk-select-asset]');
            if (!target) return;
            event.preventDefault();
            if (target.dataset.mkSelectMeter !== undefined) {
                call('openObjectModal', { kind: 'meter', index: Number(target.dataset.mkSelectMeter) || 0 });
            }
            if (target.dataset.mkSelectAsset) call('openObjectModal', { kind: 'asset', id: target.dataset.mkSelectAsset });
        }

        /*
         * Drag-and-drop und Entfernen sind hier bewusst nur Ereignisbrücken.
         * Die fachliche Entscheidung, ob ein Ziel erlaubt ist und wie sich die
         * Zählerhierarchie ändert, bleibt in messkonzept.js. So bleibt diese
         * UI-Schicht austauschbar, ohne Topologie-Regeln zu duplizieren.
         */
        function bindDragAndDropEvents(documentRef, canvas) {
            documentRef.querySelectorAll('.mk-palette-item').forEach(button => {
                button.addEventListener('dragstart', event => call('handlePaletteDragStart', event, button));
                button.addEventListener('dragend', event => call('handlePaletteDragEnd', event, button));
            });
            canvas.addEventListener('dragover', event => call('handleCanvasDragOver', event));
            canvas.addEventListener('dragleave', event => call('handleCanvasDragLeave', event));
            canvas.addEventListener('drop', event => call('handleCanvasDrop', event));
            canvas.addEventListener('dragstart', event => call('handleCanvasDragStart', event));
            canvas.addEventListener('dragend', event => call('handleCanvasDragEnd', event));
            canvas.addEventListener('click', event => call('handleCanvasClick', event));
        }

        function initialize() {
            if (initialized) return;
            const documentRef = getDocument();
            const elements = getElements();
            if (!documentRef || !elements.canvas) return;
            initialized = true;

            bindClick('btn-open-messkonzept-card', () => call('showScreen'));
            bindClick('btn-mk-back', () => call('hideScreen'));
            bindClick('btn-mk-reset', () => {
                call('reset');
                call('notify', 'Messkonzept-Skizze zurückgesetzt.', 'info');
            });
            bindClick('btn-mk-export-pdf', () => call('downloadPdf'));

            documentRef.querySelectorAll('[data-mk-project-field]').forEach(field => {
                field.addEventListener('input', event => {
                    const key = event.target.dataset.mkProjectField;
                    call('updateProjectField', key, event.target.value.trimStart());
                });
            });
            const planStatusField = documentRef.querySelector('[data-mk-project-field="planStatus"]');
            const planStatusButtons = [...documentRef.querySelectorAll('[data-mk-plan-status]')];
            const setPlanStatusButtonState = value => {
                planStatusButtons.forEach(button => {
                    const active = button.dataset.mkPlanStatus === value;
                    button.classList.toggle('is-active', active);
                    button.setAttribute('aria-pressed', String(active));
                });
            };
            const initialPlanStatus = planStatusField?.value || 'Aktuell';
            if (planStatusField && !planStatusField.value) planStatusField.value = initialPlanStatus;
            setPlanStatusButtonState(initialPlanStatus);
            planStatusButtons.forEach(button => button.addEventListener('click', () => {
                const value = button.dataset.mkPlanStatus || 'Aktuell';
                if (planStatusField) planStatusField.value = value;
                setPlanStatusButtonState(value);
                call('updateProjectField', 'planStatus', value);
            }));
            documentRef.querySelector('[data-mk-notes-field]')?.addEventListener('input', event => {
                call('updateNotes', event.target.value);
            });
            documentRef.querySelectorAll('[data-mk-mode]').forEach(button => button.addEventListener('click', () => call('changeMode', button.dataset.mkMode)));
            documentRef.querySelectorAll('[data-mk-level]').forEach(button => button.addEventListener('click', () => call('changeCascadeLevels', button.dataset.mkLevel)));
            documentRef.querySelectorAll('[data-mk-view]').forEach(button => button.addEventListener('click', () => call('changeViewMode', button.dataset.mkView)));
            documentRef.querySelectorAll('[data-mk-zoom]').forEach(button => button.addEventListener('click', () => call('changeCanvasZoom', button.dataset.mkZoom)));

            bindClick('btn-mk-modal-close', () => call('closeModal'));
            bindClick('btn-mk-modal-done', () => call('closeModal'));

            const paletteInfoButton = documentRef.getElementById('btn-mk-palette-info');
            const paletteInfo = documentRef.getElementById('mk-palette-info');
            const paletteInfoClose = documentRef.getElementById('btn-mk-palette-info-close');
            const paletteInfoDone = documentRef.getElementById('btn-mk-palette-info-done');
            let paletteInfoReturnFocus = null;
            const closePaletteInfo = () => {
                if (!paletteInfo || !paletteInfoButton) return;
                paletteInfo.classList.add('hidden');
                paletteInfo.setAttribute('aria-hidden', 'true');
                paletteInfoButton.setAttribute('aria-expanded', 'false');
                paletteInfoReturnFocus?.focus?.();
                paletteInfoReturnFocus = null;
            };
            paletteInfoButton?.addEventListener('click', event => {
                event.stopPropagation();
                const isOpen = !paletteInfo?.classList.contains('hidden');
                if (isOpen) {
                    closePaletteInfo();
                    return;
                }
                paletteInfoReturnFocus = event.currentTarget;
                paletteInfo?.classList.remove('hidden');
                paletteInfo?.setAttribute('aria-hidden', 'false');
                paletteInfoButton.setAttribute('aria-expanded', 'true');
                paletteInfoClose?.focus?.();
            });
            paletteInfoClose?.addEventListener('click', closePaletteInfo);
            paletteInfoDone?.addEventListener('click', closePaletteInfo);
            paletteInfo?.addEventListener('click', event => {
                if (event.target === paletteInfo) closePaletteInfo();
            });
            documentRef.addEventListener('click', event => {
                if (!event.target.closest('.mk-palette-heading') && !event.target.closest('#mk-palette-info')) closePaletteInfo();
            });
            elements.objectModal?.addEventListener('click', event => {
                if (event.target === elements.objectModal) call('closeModal');
            });
            elements.objectModal?.addEventListener('input', event => {
                call('updateAssetField', event);
                call('updateMeterDetailField', event);
            });
            elements.objectModal?.addEventListener('change', event => {
                call('updateAssetField', event);
                call('updateMeterDetailField', event);
            });
            documentRef.addEventListener('keydown', handleGlobalKeydown);
            documentRef.addEventListener('keydown', event => {
                if (event.key === 'Escape') closePaletteInfo();
            });
            elements.canvas.addEventListener('keydown', handleCanvasKeydown);
            bindDragAndDropEvents(documentRef, elements.canvas);
        }

        return Object.freeze({ initialize });
    }

    global.WattspurMesskonzeptInteraction = Object.freeze({ createInteractionController });
}(window));
