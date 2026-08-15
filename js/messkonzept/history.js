/*
 * Wattspur Messkonzept - Verlauf fuer Rueckgaengig/Wiederholen.
 *
 * Das Modul kennt weder konkrete Messkonzept-Objekte noch die DOM-Struktur.
 * Es verwaltet nur den Aenderungsverlauf und bekommt Zustand, Buttons,
 * Wiederherstellung und Benachrichtigung ueber injizierte Funktionen.
 */
(function attachMesskonzeptHistory(global) {
    'use strict';

    function createHistoryController(options = {}) {
        const getHistory = options.getHistory || (() => ({ undo: [], redo: [] }));
        const captureState = options.captureState || (() => null);
        const recordState = options.recordState || (() => false);
        const restoreState = options.restoreState || (() => {});
        const getButtons = options.getButtons || (() => ({}));
        const notify = options.notify || (() => {});
        let fieldDraft = null;

        function bindButtons() {
            const buttons = getButtons() || {};
            if (buttons.undo) buttons.undo.onclick = undo;
            if (buttons.redo) buttons.redo.onclick = redo;
        }

        function updateButtons() {
            bindButtons();
            const history = getHistory() || {};
            const undoButton = getButtons()?.undo;
            const redoButton = getButtons()?.redo;
            if (undoButton) {
                const available = Array.isArray(history.undo) && history.undo.length > 0;
                undoButton.disabled = !available;
                undoButton.setAttribute('aria-disabled', String(!available));
            }
            if (redoButton) {
                const available = Array.isArray(history.redo) && history.redo.length > 0;
                redoButton.disabled = !available;
                redoButton.setAttribute('aria-disabled', String(!available));
            }
        }

        function capture() {
            return captureState();
        }

        function record(previousState) {
            const changed = Boolean(previousState) && Boolean(recordState(previousState));
            if (changed) updateButtons();
            return changed;
        }

        function getFieldHistoryBefore(event) {
            if (!event?.target) return capture();
            if (event.type === 'input') {
                if (!fieldDraft || fieldDraft.target !== event.target) {
                    fieldDraft = { target: event.target, before: capture() };
                }
                return null;
            }
            const previousState = fieldDraft?.target === event.target
                ? fieldDraft.before
                : capture();
            if (event.type === 'change') fieldDraft = null;
            return previousState;
        }

        function restore(snapshot) {
            if (!snapshot) return;
            restoreState(snapshot);
            updateButtons();
        }

        function undo() {
            const history = getHistory() || {};
            if (!Array.isArray(history.undo) || !history.undo.length) return false;
            const currentState = capture();
            const previousState = history.undo.pop();
            history.redo.push(currentState);
            restore(previousState);
            notify('Letzte Messkonzept-Aenderung rueckgaengig gemacht.', 'info');
            return true;
        }

        function redo() {
            const history = getHistory() || {};
            if (!Array.isArray(history.redo) || !history.redo.length) return false;
            const currentState = capture();
            const nextState = history.redo.pop();
            history.undo.push(currentState);
            restore(nextState);
            notify('Messkonzept-Aenderung wiederhergestellt.', 'info');
            return true;
        }

        return Object.freeze({ bindButtons, updateButtons, capture, record, getFieldHistoryBefore, restore, undo, redo });
    }

    global.WattspurMesskonzeptHistory = Object.freeze({ createHistoryController });
}(window));
