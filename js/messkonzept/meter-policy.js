(function exposeMesskonzeptMeterPolicy(global) {
    'use strict';

    /**
     * Fachliche Drop-Regeln für Zusatz-Zähler.
     *
     * Die Schicht entscheidet nur, welche Zuordnung erlaubt ist und welche
     * Zielparameter ein Drop erhalten soll. Sie verändert weder Zustand noch
     * DOM und zeichnet keine Leitungen.
     */
    function createMeterPolicyController(options = {}) {
        const getAssetMeters = options.getAssetMeters || (() => []);
        const getMeterForAsset = options.getMeterForAsset || (() => null);
        const isMeterExpanded = options.isMeterExpanded || (() => false);
        const getMeterAssets = options.getMeterAssets || (() => []);

        function canBuildCascadeAfterMeter(meter) {
            // Nur Zaehler auf dem Hauptstrang duerfen eine weitere Kaskaden-
            // stufe erhalten. Ein Einzelzaehler vor einer Anlage bleibt ein
            // Anlagen-Messpunkt und wird nicht unbeabsichtigt zur Unterkaskade.
            return Boolean(meter && meter.type === 'meter' && meter.meterScope === 'base');
        }

        function hasSharedMeter(asset) {
            const attachedMeter = getMeterForAsset(asset);
            return attachedMeter
                && isMeterExpanded(attachedMeter.id)
                && getMeterAssets(attachedMeter.id).length > 1;
        }

        function canAddMeterToAsset(asset) {
            if (!asset || asset.type === 'meter') return false;
            const ownMeters = getAssetMeters(asset.id);
            return ownMeters.length === 0 || Boolean(hasSharedMeter(asset));
        }

        function getMeterDropOptions(asset) {
            const attachedMeter = getMeterForAsset(asset);
            return hasSharedMeter(asset)
                ? { targetAssetId: asset.id, parentMeterId: attachedMeter.id, keepEmptyRail: true }
                : { targetAssetId: asset.id };
        }

        return Object.freeze({
            canBuildCascadeAfterMeter,
            canAddMeterToAsset,
            getMeterDropOptions
        });
    }

    global.WattspurMesskonzeptMeterPolicy = Object.freeze({
        createMeterPolicyController
    });
}(window));
