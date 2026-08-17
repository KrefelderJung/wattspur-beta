/*
 * Wattspur Messkonzept – Laufzeit-Orchestrierung der Leitungsgeometrie
 *
 * Dieses Modul verbindet Layout, Verbindungen und Viewport zu einem einzigen
 * stabilen Nachlauf. Es kennt keine Messobjekte und misst keine DOM-Elemente.
 * Die fachlichen und visuellen Bausteine werden ausschließlich über
 * Callbacks eingespeist.
 */
(function exposeMesskonzeptGeometryRuntime(global) {
    'use strict';

    function createGeometryRuntimeController(options = {}) {
        const getWindow = options.getWindow || (() => global);
        const updateSimpleAssetStrands = options.updateSimpleAssetStrands || (() => {});
        const updateMeterGroupOffsets = options.updateMeterGroupOffsets || (() => {});
        const updateParallelBus = options.updateParallelBus || (() => {});
        const updateDynamicConnections = options.updateDynamicConnections || (() => {});
        const centerParallelViewport = options.centerParallelViewport || (() => {});
        let geometryFrame = 0;

        function updateNow() {
            // Erst die Root-Sammelschiene lösen, danach die Unter-Rails an den
            // finalen Karten ausrichten. Der zweite Root-Lauf gleicht die
            // echten DOM-Abstände nach dem Kollisionsversatz wieder an.
            updateSimpleAssetStrands();
            updateMeterGroupOffsets();
            updateSimpleAssetStrands();
            updateParallelBus();
            updateDynamicConnections();
            centerParallelViewport();
        }

        function schedule() {
            const windowRef = getWindow();
            windowRef?.cancelAnimationFrame?.(geometryFrame);
            const run = () => {
                geometryFrame = 0;
                updateNow();
            };
            if (typeof windowRef?.requestAnimationFrame === 'function') {
                geometryFrame = windowRef.requestAnimationFrame(run);
                return geometryFrame;
            }
            if (typeof windowRef?.setTimeout === 'function') {
                geometryFrame = windowRef.setTimeout(run, 0);
                return geometryFrame;
            }
            run();
            return 0;
        }

        function cancel() {
            const windowRef = getWindow();
            windowRef?.cancelAnimationFrame?.(geometryFrame);
            windowRef?.clearTimeout?.(geometryFrame);
            geometryFrame = 0;
        }

        return Object.freeze({ schedule, updateNow, cancel });
    }

    global.WattspurMesskonzeptGeometryRuntime = Object.freeze({
        createGeometryRuntimeController
    });
}(window));
