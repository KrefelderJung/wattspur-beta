/**
 * Application State Kapselung (js/state/app-state.js)
 */

class ApplicationStateStore {
    constructor() {
        this.reset();
    }

    reset() {
        this._datasets = [];
        this._activeDatasetIds = [];
        this._dateRange = { start: null, end: null };
        this._displayUnit = 'kW';
        this._activeView = 'dashboard';
        this._analysisResults = {};
        this._dataVersion = 1;
        this._listeners = new Set();
    }

    getSnapshot() {
        return {
            datasets: this._datasets,
            activeDatasetIds: [...this._activeDatasetIds],
            dateRange: { ...this._dateRange },
            displayUnit: this._displayUnit,
            activeView: this._activeView,
            dataVersion: this._dataVersion,
            analysisResults: { ...this._analysisResults }
        };
    }

    getDatasets() {
        return this._datasets;
    }

    getDatasetById(id) {
        return this._datasets.find(ds => ds.id === id) || null;
    }

    addDataset(dataset) {
        if (!dataset) return;
        this._datasets.push(dataset);
        this._dataVersion++;
        this.invalidateAnalysisCache();
        this._notify();
    }

    updateDataset(id, updater) {
        const ds = this.getDatasetById(id);
        if (!ds) return;
        if (typeof updater === 'function') {
            updater(ds);
        } else if (typeof updater === 'object') {
            Object.assign(ds, updater);
        }
        this._dataVersion++;
        this.invalidateAnalysisCache();
        this._notify();
    }

    removeDataset(id) {
        this._datasets = this._datasets.filter(ds => ds.id !== id);
        this._activeDatasetIds = this._activeDatasetIds.filter(activeId => activeId !== id);
        this._dataVersion++;
        this.invalidateAnalysisCache();
        this._notify();
    }

    setActiveDatasetIds(ids) {
        this._activeDatasetIds = Array.isArray(ids) ? [...ids] : [];
        this._notify();
    }

    setDateRange(start, end) {
        this._dateRange = { start, end };
        this._notify();
    }

    setDisplayUnit(unit) {
        this._displayUnit = unit;
        this._notify();
    }

    setActiveView(view) {
        this._activeView = view;
        this._notify();
    }

    setAnalysisResult(type, result) {
        this._analysisResults[type] = result;
        this._notify();
    }

    invalidateAnalysisCache() {
        this._analysisResults = {};
    }

    subscribe(listener) {
        if (typeof listener === 'function') {
            this._listeners.add(listener);
            return () => this._listeners.delete(listener);
        }
        return () => {};
    }

    _notify() {
        const snapshot = this.getSnapshot();
        this._listeners.forEach(fn => {
            try {
                fn(snapshot);
            } catch (err) {
                console.error('[AppState] Error in listener notification:', err);
            }
        });
    }
}

const AppState = new ApplicationStateStore();

if (typeof window !== 'undefined') {
    window.AppState = AppState;
}
