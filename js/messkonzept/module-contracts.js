/**
 * Wattspur Messkonzept – explizite Modulverträge
 *
 * Die Anwendung nutzt derzeit bewusst klassische Scripts. Dieser kleine
 * Vertrag hält aber bereits fest, welche öffentlichen Factory-APIs vor dem
 * Einstiegspunkt vorhanden sein müssen. So kann die spätere Umstellung auf
 * native ES-Module schrittweise erfolgen, ohne stille Ladefehler.
 */
(function exposeMesskonzeptModuleContracts(global) {
    'use strict';

    const REQUIRED_FACTORIES = Object.freeze([
        'WattspurMesskonzeptModel',
        'WattspurMesskonzeptPresets',
        'WattspurMesskonzeptPresetLoader',
        'WattspurMesskonzeptGeometry',
        'WattspurMesskonzeptTopology',
        'WattspurMesskonzeptRules',
        'WattspurMesskonzeptLayoutCalculations',
        'WattspurMesskonzeptValidationStatus',
        'WattspurMesskonzeptLayout',
        'WattspurMesskonzeptRender',
        'WattspurMesskonzeptConnections',
        'WattspurMesskonzeptExport',
        'WattspurMesskonzeptViewport',
        'WattspurMesskonzeptHistory',
        'WattspurMesskonzeptCommands',
        'WattspurMesskonzeptProjectMeta',
        'WattspurMesskonzeptCanvasRenderer',
        'WattspurMesskonzeptDragDrop',
        'WattspurMesskonzeptInteraction',
        'WattspurMesskonzeptBootstrap'
    ]);

    function getMissingFactories() {
        return REQUIRED_FACTORIES.filter(name => !global[name]);
    }

    function assertLoaded() {
        const missing = getMissingFactories();
        if (missing.length) {
            throw new Error(`Messkonzept-Module fehlen oder sind falsch geladen: ${missing.join(', ')}`);
        }
        return true;
    }

    global.WattspurMesskonzeptModuleContracts = Object.freeze({
        requiredFactories: REQUIRED_FACTORIES,
        getMissingFactories,
        assertLoaded
    });
}(window));
