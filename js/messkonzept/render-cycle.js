(function exposeMesskonzeptRenderCycle(global) {
    'use strict';

    /**
     * UI-Orchestrierung für einen vollständigen Messkonzept-Renderlauf.
     *
     * Das Modul kennt weder Modell noch DOM-Struktur. Es erhält den Zustand,
     * die UI-Elemente und die bestehenden Renderer als Adapter. Dadurch bleiben
     * Messlogik, Leitungsgeometrie und Fachregeln außerhalb dieser Datei.
     */
    function createRenderCycleController(options = {}) {
        const getState = options.getState || (() => ({}));
        const getElements = options.getElements || (() => ({}));
        const callbacks = options.callbacks || {};

        const call = (name, ...args) => {
            const callback = callbacks[name];
            return typeof callback === 'function' ? callback(...args) : undefined;
        };

        function updateToggleButtons() {
            const state = getState() || {};
            const elements = getElements() || {};

            (elements.modeButtons || []).forEach(button => {
                const active = button.dataset.mkMode === state.mode;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });

            (elements.levelButtons || []).forEach(button => {
                const meterCountMode = state.mode === 'parallel';
                const active = meterCountMode && Number(button.dataset.mkLevel) === state.cascadeLevels;
                button.disabled = !meterCountMode;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });

        }

        function render() {
            const elements = getElements() || {};
            if (!elements.canvas) return;

            call('syncProjectFields');
            updateToggleButtons();
            call('renderCanvas');
            call('observeConnectorGeometry');
            call('renderZoomControls');
            call('scheduleConnectorGeometry');
            call('refreshValidation');
            call('updateHistoryButtons');
        }

        return Object.freeze({
            render,
            updateToggleButtons
        });
    }

    global.WattspurMesskonzeptRenderCycle = Object.freeze({
        createRenderCycleController
    });
}(window));
