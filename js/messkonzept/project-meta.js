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
                if (key === "streetAddress") {
                    const address = [project.street, project.houseNumber].filter(Boolean).join(" ");
                    if (field.value !== address) field.value = address;
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(project, key) && field.value !== project[key]) {
                    field.value = project[key];
                }
            });

            const notesField = elements.notesField;
            if (notesField && notesField.value !== state.notes) notesField.value = state.notes || '';
        }

        function updateProjectField(key, value) {
            const project = getState().project;
            if (!project) return;
            if (key === "streetAddress") {
                const normalized = String(value || "").trim();
                const match = normalized.match(/^(.*?)(?:\s+)(\d+[A-Za-z]?(?:[-/]\d+[A-Za-z]?)?)$/);
                project.street = match ? match[1].trim() : normalized;
                project.houseNumber = match ? match[2].trim() : "";
                return;
            }
            if (Object.prototype.hasOwnProperty.call(project, key)) project[key] = value;
        }

        function updateNotes(value) {
            getState().notes = value;
        }

        return Object.freeze({ sync, updateProjectField, updateNotes });
    }

    global.WattspurMesskonzeptProjectMeta = Object.freeze({ createProjectMetaController });
}(window));
