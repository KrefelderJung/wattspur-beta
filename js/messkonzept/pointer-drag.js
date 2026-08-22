/*
 * Wattspur Messkonzept: mobile Pointer-Gesten
 *
 * Diese UI-Schicht ergänzt HTML5-Drag-and-Drop für Touch- und Stiftgeräte.
 * Sie kennt keine Messregeln. Nach einer kurzen Haltezeit übergibt sie die
 * Geste an die Adapter des Drag-Drop-Moduls, das dieselben Drop-Regeln wie
 * die Desktop-Bedienung verwendet.
 */
(function exposeMesskonzeptPointerDrag(global) {
    'use strict';

    const SUPPORTED_POINTER_TYPES = new Set(['touch', 'pen']);

    function createPointerDragController(options = {}) {
        const getDocument = options.getDocument || (() => global.document);
        const getWindow = options.getWindow || (() => global);
        const getCanvas = options.getCanvas || (() => null);
        const dragDrop = options.dragDrop || {};
        const holdDelay = Number.isFinite(options.holdDelay) ? options.holdDelay : 180;
        const moveThreshold = Number.isFinite(options.moveThreshold) ? options.moveThreshold : 8;
        let initialized = false;
        let session = null;
        let clickSuppressed = false;

        function call(name, ...args) {
            const callback = dragDrop[name];
            return typeof callback === 'function' ? callback(...args) : undefined;
        }

        function isSupportedPointer(event) {
            return Boolean(event?.isPrimary !== false && SUPPORTED_POINTER_TYPES.has(event.pointerType));
        }

        function findSource(target) {
            const source = target?.closest?.('.mk-palette-item, [data-mk-drag-asset]');
            if (!source || target?.closest?.('[data-mk-remove-asset], [data-mk-remove-meter]')) return null;
            if (source.matches('.mk-palette-item')) return source;
            return getCanvas()?.contains?.(source) ? source : null;
        }

        function clearTimer(currentSession = session) {
            if (currentSession?.timer) getWindow().clearTimeout?.(currentSession.timer);
            if (currentSession) currentSession.timer = 0;
        }

        function updateGhost(event) {
            const ghost = session?.ghost;
            if (!ghost) return;
            ghost.style.left = `${event.clientX}px`;
            ghost.style.top = `${event.clientY}px`;
        }

        function removeGhost(currentSession = session) {
            currentSession?.ghost?.remove?.();
            if (currentSession) currentSession.ghost = null;
        }

        function createGhost(source) {
            const documentRef = getDocument();
            if (!documentRef?.body || !source?.cloneNode) return null;
            const ghost = source.cloneNode(true);
            ghost.removeAttribute?.('id');
            ghost.setAttribute?.('aria-hidden', 'true');
            ghost.classList.add('mk-pointer-drag-ghost');
            documentRef.body.appendChild(ghost);
            return ghost;
        }

        function finishSession({ cancel = false, suppressClick = false } = {}) {
            const currentSession = session;
            if (!currentSession) return;
            clearTimer(currentSession);
            currentSession.source?.classList.remove('mk-pointer-drag-source-active');
            removeGhost(currentSession);
            if (cancel) call('handlePointerDragCancel');
            session = null;
            if (suppressClick) clickSuppressed = true;
        }

        function cancelPending() {
            if (!session) return;
            finishSession({ cancel: session.active });
        }

        function activateSession() {
            if (!session || session.active) return;
            session.active = true;
            session.transfer = call('getPointerTransfer', session.source);
            if (!session.transfer) {
                finishSession({ cancel: true });
                return;
            }
            session.source.classList.add('mk-pointer-drag-source-active');
            session.ghost = createGhost(session.source);
            try {
                session.source.setPointerCapture?.(session.pointerId);
            } catch (error) {
                // Pointer Capture ist auf älteren WebViews optional.
            }
        }

        function getTargetAt(event) {
            const documentRef = getDocument();
            const canvas = getCanvas();
            if (!documentRef?.elementFromPoint || !canvas) return null;
            const target = documentRef.elementFromPoint(event.clientX, event.clientY);
            return target && canvas.contains(target) ? target : null;
        }

        function updateDropTarget(event) {
            if (!session?.active) return;
            const target = getTargetAt(event);
            if (target === session.lastTarget) {
                updateGhost(event);
                return;
            }
            if (session.lastTarget) call('handlePointerDragLeave', session.lastTarget, target);
            session.lastTarget = target;
            if (target) call('handlePointerDragOver', target, session.transfer);
            updateGhost(event);
        }

        function handlePointerDown(event) {
            if (!isSupportedPointer(event) || session) return;
            const source = findSource(event.target);
            if (!source) return;
            session = {
                pointerId: event.pointerId,
                source,
                startX: event.clientX,
                startY: event.clientY,
                active: false,
                timer: getWindow().setTimeout?.(activateSession, holdDelay) || 0,
                transfer: null,
                lastTarget: null,
                ghost: null
            };
        }

        function handlePointerMove(event) {
            if (!session || event.pointerId !== session.pointerId) return;
            if (!session.active) {
                const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
                if (distance > moveThreshold) cancelPending();
                return;
            }
            event.preventDefault?.();
            updateDropTarget(event);
        }

        function handlePointerUp(event) {
            if (!session || event.pointerId !== session.pointerId) return;
            if (!session.active) {
                cancelPending();
                return;
            }
            event.preventDefault?.();
            const target = getTargetAt(event);
            if (session.lastTarget && session.lastTarget !== target) call('handlePointerDragLeave', session.lastTarget, target);
            if (target) call('handlePointerDrop', target, session.transfer);
            else call('handlePointerDragCancel');
            finishSession({ suppressClick: true });
        }

        function handlePointerCancel(event) {
            if (!session || event.pointerId !== session.pointerId) return;
            finishSession({ cancel: session.active, suppressClick: session.active });
        }

        function consumeClickSuppression() {
            const suppressed = clickSuppressed;
            clickSuppressed = false;
            return suppressed;
        }

        function initialize() {
            if (initialized) return;
            const documentRef = getDocument();
            if (!documentRef?.addEventListener) return;
            initialized = true;
            documentRef.addEventListener('pointerdown', handlePointerDown, { passive: true });
            documentRef.addEventListener('pointermove', handlePointerMove, { passive: false });
            documentRef.addEventListener('pointerup', handlePointerUp, { passive: false });
            documentRef.addEventListener('pointercancel', handlePointerCancel, { passive: true });
        }

        return Object.freeze({ initialize, consumeClickSuppression, cancel: () => finishSession({ cancel: Boolean(session?.active) }) });
    }

    global.WattspurMesskonzeptPointerDrag = Object.freeze({ createPointerDragController });
}(window));

