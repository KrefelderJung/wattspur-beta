/*
 * Wattspur Messkonzept – Bootstrap und DOM-Komposition
 *
 * Dieses Modul kennt nur den Einstiegspunkt der Oberfläche: Es sammelt die
 * statischen DOM-Anker, wartet auf den passenden Lebenszykluszeitpunkt und
 * stellt die globale Resize-Verkabelung bereit. Fachliche Zustände und
 * Renderentscheidungen bleiben im Konfigurator bzw. in den Fachmodulen.
 */
(function exposeMesskonzeptBootstrap(global) {
    'use strict';

    const SELECTORS = Object.freeze({
        canvas: '#mk-canvas',
        validation: '#mk-validation-list',
        objectModal: '#mk-object-modal',
        objectModalContent: '#mk-object-modal-content',
        objectModalTitle: '#mk-object-modal-title',
        zoomLevel: '#mk-zoom-level',
        undoButton: '#btn-mk-undo',
        redoButton: '#btn-mk-redo',
        projectFields: '[data-mk-project-field]',
        notesField: '[data-mk-notes-field]',
        modeButtons: '[data-mk-mode]',
        levelButtons: '[data-mk-level]',
        uploadScreen: '#upload-screen',
        dashboardScreen: '#dashboard-screen',
        messkonzeptScreen: '#messkonzept-screen',
        startPanel: '#mk-start-panel',
        builderShell: '#mk-builder-shell'
    });

    function collectElements(documentRef = global.document) {
        if (!documentRef) return {};
        const query = selector => documentRef.querySelector(selector);
        const queryAll = selector => [...documentRef.querySelectorAll(selector)];
        return {
            body: documentRef.body || null,
            canvas: query(SELECTORS.canvas),
            validation: query(SELECTORS.validation),
            objectModal: query(SELECTORS.objectModal),
            objectModalContent: query(SELECTORS.objectModalContent),
            objectModalTitle: query(SELECTORS.objectModalTitle),
            zoomLevel: query(SELECTORS.zoomLevel),
            undo: query(SELECTORS.undoButton),
            redo: query(SELECTORS.redoButton),
            projectFields: queryAll(SELECTORS.projectFields),
            notesField: query(SELECTORS.notesField),
            modeButtons: queryAll(SELECTORS.modeButtons),
            levelButtons: queryAll(SELECTORS.levelButtons),
            uploadScreen: query(SELECTORS.uploadScreen),
            dashboardScreen: query(SELECTORS.dashboardScreen),
            messkonzeptScreen: query(SELECTORS.messkonzeptScreen),
            startPanel: query(SELECTORS.startPanel),
            builderShell: query(SELECTORS.builderShell)
        };
    }

    function createBootstrapController(options = {}) {
        const getDocument = options.getDocument || (() => global.document);
        const getWindow = options.getWindow || (() => global);
        let resizeTimer = 0;
        let resizeHandler = null;

        function collect() {
            return collectElements(getDocument());
        }

        function bindResize(render, delay = 120) {
            const windowRef = getWindow();
            if (typeof render !== 'function' || !windowRef?.addEventListener) return () => {};
            if (resizeHandler) windowRef.removeEventListener('resize', resizeHandler);
            resizeHandler = () => {
                windowRef.clearTimeout?.(resizeTimer);
                resizeTimer = windowRef.setTimeout
                    ? windowRef.setTimeout(() => render(), delay)
                    : 0;
            };
            windowRef.addEventListener('resize', resizeHandler);
            return () => {
                windowRef.removeEventListener?.('resize', resizeHandler);
                windowRef.clearTimeout?.(resizeTimer);
                resizeHandler = null;
                resizeTimer = 0;
            };
        }

        function start(onReady) {
            if (typeof onReady !== 'function') return () => {};
            const documentRef = getDocument();
            if (!documentRef) return () => {};
            let started = false;
            const run = () => {
                if (started) return;
                started = true;
                onReady(collect());
            };
            if (documentRef.readyState === 'loading') {
                documentRef.addEventListener('DOMContentLoaded', run, { once: true });
                return () => documentRef.removeEventListener?.('DOMContentLoaded', run);
            }
            run();
            return () => {};
        }

        return Object.freeze({ collectElements: collect, bindResize, start });
    }

    global.WattspurMesskonzeptBootstrap = Object.freeze({
        SELECTORS,
        collectElements,
        createBootstrapController
    });
}(window));
