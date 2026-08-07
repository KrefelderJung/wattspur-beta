/**
 * Editor Controller Module (js/ui/editor-controller.js)
 * Manages load profile editing, structuredClone deep backup, save and abort operations
 */

if (typeof window !== 'undefined') {
    if (typeof window.EditorController === 'undefined') {
        window.EditorController = {
            _backupState: null,
            _activeDatasetId: null,

            startEditing: function(datasetId) {
                const snapshot = window.AppState ? window.AppState.getSnapshot() : { datasets: [] };
                const ds = (snapshot.datasets || []).find(d => d.id === datasetId);
                if (!ds) return;

                this._activeDatasetId = datasetId;
                this._backupState = typeof structuredClone === 'function' ? structuredClone(ds) : JSON.parse(JSON.stringify(ds));

                if (window.EditorView) {
                    window.EditorView.renderTable('editor-container', ds);
                }
            },

            saveEdits: function(newPoints) {
                if (!this._activeDatasetId) return;
                if (window.AppState) {
                    window.AppState.updateDataset(this._activeDatasetId, { data: newPoints });
                }
                this._backupState = null;
                if (window.ModalView) {
                    window.ModalView.showToast('Änderungen im Editor gespeichert.', 'success');
                }
            },

            abortEdits: function() {
                if (this._activeDatasetId && this._backupState) {
                    if (window.AppState) {
                        window.AppState.updateDataset(this._activeDatasetId, this._backupState);
                    }
                    if (window.ModalView) {
                        window.ModalView.showToast('Änderungen verworfen, Ursprungstand wiederhergestellt.', 'info');
                    }
                }
                this._backupState = null;
                this._activeDatasetId = null;
            }
        };
    }
}
