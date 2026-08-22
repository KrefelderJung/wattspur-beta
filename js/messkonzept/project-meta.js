/*
 * Wattspur Messkonzept – Projektangaben und Kommentar
 *
 * Kapselt die Synchronisation der optionalen Projektfelder. Das Modul kennt
 * nur die injizierten DOM-Anker und den Zustand, aber keine Messlogik.
 */
(function exposeMesskonzeptProjectMeta(global) {
    'use strict';

    function createProjectMetaController(options = {}) {
        const getState = () => options.getState?.() || {};
        const getElements = () => options.getElements?.() || {};

        function sync() {
            options.bindHistoryButtons?.();
            const state = getState();
            const elements = getElements();
            const project = state.project || {};

            elements.projectFields?.forEach(field => {
                const key = field.dataset.mkProjectField;
                if (Object.prototype.hasOwnProperty.call(project, key) && field.value !== project[key]) {
                    field.value = project[key];
                }
            });

            const notesField = elements.notesField;
            if (notesField && notesField.value !== state.notes) notesField.value = state.notes || '';
        }

        function updateProjectField(key, value) {
            const project = getState().project;
            if (project && Object.prototype.hasOwnProperty.call(project, key)) project[key] = value;
        }

        function updateNotes(value) {
            getState().notes = value;
        }

        return Object.freeze({ sync, updateProjectField, updateNotes });
    }

    global.WattspurMesskonzeptProjectMeta = Object.freeze({ createProjectMetaController });
}(window));
