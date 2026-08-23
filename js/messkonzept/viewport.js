/*
 * Wattspur Messkonzept – Canvas-Ansicht
 *
 * Dieses Modul kapselt ausschließlich die Bedienung der Zeichenfläche:
 * Zoom, Zentrierung, Größenbeobachtung und Verschieben. Es kennt weder
 * Messzähler noch Anlagen und kann deshalb unabhängig von der Topologie
 * weiterentwickelt und getestet werden.
 */
(function attachMesskonzeptViewport(global) {
    'use strict';

    function createViewportController(options = {}) {
        const getElements = options.getElements || (() => ({}));
        const getState = options.getState || (() => ({}));
        const getZoomConfig = options.getZoomConfig || (() => ({ min: 0.4, max: 1.2, step: 0.1 }));
        const getMode = options.getMode || (() => getState().mode);
        const scheduleGeometry = options.scheduleGeometry || (() => {});
        const getWindow = () => {
            const canvas = getElements().canvas;
            return canvas?.ownerDocument?.defaultView || global;
        };
        const getDocument = () => getElements().canvas?.ownerDocument || global.document;

        let geometryObserver = null;
        let canvasPan = null;
        let panSpaceHeld = false;
        let panInitialized = false;

        const requestFrame = callback => {
            const view = getWindow();
            if (typeof view?.requestAnimationFrame === 'function') return view.requestAnimationFrame(callback);
            return view.setTimeout(callback, 0);
        };

        function renderZoomControls() {
            const state = getState();
            const config = getZoomConfig();
            const percentage = `${Math.round(Number(state.canvasZoom || 1) * 100)} %`;
            const fitButton = getDocument()?.querySelector('[data-mk-zoom="fit"]');
            if (fitButton) {
                fitButton.title = `Ansicht einpassen (aktuell ${percentage})`;
                fitButton.setAttribute('aria-label', `Ansicht einpassen, aktuell ${percentage}`);
            }
            getDocument()?.querySelectorAll('[data-mk-zoom]').forEach(button => {
                const action = button.dataset.mkZoom;
                const zoom = Number(state.canvasZoom || 1);
                button.disabled = (action === 'out' && zoom <= config.min)
                    || (action === 'in' && zoom >= config.max);
            });
        }

        function applyCanvasZoom() {
            const elements = getElements();
            const state = getState();
            const stage = elements.canvas?.querySelector('.mk-canvas-stage');
            if (stage) stage.style.setProperty('--mk-canvas-zoom', String(state.canvasZoom));
            renderZoomControls();
            scheduleGeometry();
        }

        function changeCanvasZoom(action) {
            const state = getState();
            const config = getZoomConfig();
            const current = Number(state.canvasZoom || 1);
            if (action === 'out') {
                state.canvasZoom = Math.max(config.min, Number((current - config.step).toFixed(2)));
                applyCanvasZoom();
                return;
            }
            if (action === 'in') {
                state.canvasZoom = Math.min(config.max, Number((current + config.step).toFixed(2)));
                applyCanvasZoom();
                return;
            }
            if (action === 'reset') {
                state.canvasZoom = 1;
                applyCanvasZoom();
                return;
            }
            if (action !== 'fit') return;

            if (getElements().canvas) {
                getElements().canvas.scrollLeft = 0;
                getElements().canvas.scrollTop = 0;
            }
            state.canvasZoom = 1;
            applyCanvasZoom();
            requestFrame(() => {
                const elements = getElements();
                const topology = elements.canvas?.querySelector('.mk-topology-content');
                if (!topology || !elements.canvas) return;
                const availableWidth = Math.max(1, elements.canvas.clientWidth - 28);
                const requiredWidth = Math.max(1, topology.scrollWidth);
                state.canvasZoom = Math.min(1, Math.max(config.min, availableWidth / requiredWidth));
                applyCanvasZoom();
            });
        }

        function observeConnectorGeometry() {
            const canvas = getElements().canvas;
            const ResizeObserverCtor = getWindow()?.ResizeObserver || global.ResizeObserver;
            if (!canvas || typeof ResizeObserverCtor === 'undefined') return;
            geometryObserver?.disconnect();
            geometryObserver = new ResizeObserverCtor(() => scheduleGeometry());
            geometryObserver.observe(canvas);
            const stage = canvas.querySelector('.mk-canvas-stage');
            if (stage) geometryObserver.observe(stage);
        }

        function centerParallelViewport() {
            const elements = getElements();
            const state = getState();
            const canvas = elements.canvas;
            if (!canvas || getMode() !== 'parallel') return;
            const layoutKey = `${getMode()}:${state.canvasZoom}:${canvas.scrollWidth}`;
            if (canvas.dataset.mkViewportLayout === layoutKey) return;
            canvas.scrollLeft = Math.max(0, (canvas.scrollWidth - canvas.clientWidth) / 2);
            canvas.dataset.mkViewportLayout = layoutKey;
        }

        function endCanvasPan(event) {
            if (!canvasPan) return;
            const canvas = getElements().canvas;
            if (canvas && event?.pointerId !== undefined && canvas.hasPointerCapture?.(event.pointerId)) {
                canvas.releasePointerCapture(event.pointerId);
            }
            canvas?.classList.remove('is-panning');
            canvasPan = null;
        }

        function initializeCanvasPan() {
            const canvas = getElements().canvas;
            const documentRef = getDocument();
            const windowRef = getWindow();
            if (!canvas || !documentRef || panInitialized) return;
            panInitialized = true;

            // Die Zeichenfläche lässt sich direkt mit der linken Maustaste
            // verschieben. Interaktive Objekte bleiben davon ausgenommen,
            // damit Auswahl und HTML5-Drag-and-Drop nicht blockiert werden.
            // Der HAK ist dabei bewusst kein Pan-Griff: Ein Klick öffnet sein
            // Objektfenster, ein Ziehen verändert weder Ansicht noch Modell.
            // Leertaste + linke Maustaste und die mittlere Maustaste bleiben
            // als kompatible Alternativen erhalten.
            const isTextField = target => target?.matches?.('input, textarea, select, [contenteditable="true"]');
            const isInteractiveCanvasTarget = target => target?.closest?.(
                '.mk-asset-card, .mk-meter-node, .mk-generation-meter, .mk-rail-meter-node, .mk-inline-meter, .mk-inline-meter-wrap, .mk-meter-annotation-card, [data-mk-select-meter], [data-mk-select-asset], [data-mk-select-hak], [data-mk-remove-asset], [data-mk-remove-meter], button, input, textarea, select, [contenteditable="true"]'
            );
            documentRef.addEventListener('keydown', event => {
                if (event.code !== 'Space' || event.repeat || isTextField(event.target)) return;
                panSpaceHeld = true;
                canvas.classList.add('mk-pan-ready');
                event.preventDefault();
            });
            documentRef.addEventListener('keyup', event => {
                if (event.code !== 'Space') return;
                panSpaceHeld = false;
                canvas.classList.remove('mk-pan-ready');
            });
            windowRef.addEventListener('blur', () => {
                panSpaceHeld = false;
                canvas.classList.remove('mk-pan-ready');
                endCanvasPan();
            });
            canvas.addEventListener('pointerdown', event => {
                const isMiddlePan = event.button === 1;
                const isSpacePan = event.button === 0 && panSpaceHeld;
                const isPrimaryCanvasPan = event.button === 0 && !panSpaceHeld && !isInteractiveCanvasTarget(event.target);
                if (!isMiddlePan && !isSpacePan && !isPrimaryCanvasPan) return;
                canvasPan = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    scrollLeft: canvas.scrollLeft,
                    scrollTop: canvas.scrollTop,
                    button: event.button,
                    requiresSpace: isSpacePan
                };
                canvas.classList.add('is-panning');
                canvas.setPointerCapture?.(event.pointerId);
                event.preventDefault();
            });
            canvas.addEventListener('pointermove', event => {
                if (!canvasPan || event.pointerId !== canvasPan.pointerId) return;
                const buttonHeld = canvasPan.button === 1
                    ? (event.buttons & 4) === 4
                    : (event.buttons & 1) === 1 && (!canvasPan.requiresSpace || panSpaceHeld);
                if (!buttonHeld) {
                    endCanvasPan(event);
                    return;
                }
                canvas.scrollLeft = canvasPan.scrollLeft - (event.clientX - canvasPan.startX);
                canvas.scrollTop = canvasPan.scrollTop - (event.clientY - canvasPan.startY);
                event.preventDefault();
            });
            canvas.addEventListener('pointerup', endCanvasPan);
            canvas.addEventListener('pointercancel', endCanvasPan);
            canvas.addEventListener('lostpointercapture', endCanvasPan);
        }

        function consumePanClickSuppression() {
            // API-Kompatibilität für den Interaktionscontroller. Der HAK ist
            // kein Pan-Griff mehr, daher muss kein Klick unterdrückt werden.
            return false;
        }

        return Object.freeze({
            renderZoomControls,
            applyCanvasZoom,
            changeCanvasZoom,
            observeConnectorGeometry,
            centerParallelViewport,
            endCanvasPan,
            initializeCanvasPan,
            consumePanClickSuppression
        });
    }

    global.WattspurMesskonzeptViewport = Object.freeze({ createViewportController });
}(window));
