(function exposeMesskonzeptIdentifiers(global) {
    'use strict';

    /**
     * Fachliche Kennungen für Zähler und Erzeugungsanlagen.
     *
     * Nummern und sichtbare Kurzkennungen gehören zusammen, sind aber weder
     * Render-Markup noch Leitungsgeometrie. Das Modul arbeitet ausschließlich
     * mit injizierten Zustands- und Topologie-Adaptern.
     */
    function createIdentifierController(options = {}) {
        const getState = options.getState || (() => ({}));
        const getAdditionalMeters = options.getAdditionalMeters || (() => []);
        const getMeterForAsset = options.getMeterForAsset || (() => null);
        const getGenerationDisplay = options.getGenerationDisplay || (() => ({ prefix: 'EA' }));

        function getTopologyMeterCount(state) {
            return state?.mode === 'parallel' ? Number(state.cascadeLevels) || 1 : 1;
        }

        function isMieterstromMeter(meter) {
            return meter?.mieterstromObject === 'external-meter';
        }

        function getAdditionalMeterIndex(meter, predicate = () => true) {
            if (!meter) return -1;
            return getAdditionalMeters().filter(predicate).findIndex(item => item.id === meter.id);
        }

        function getMeterNumber(meter) {
            if (!meter || isMieterstromMeter(meter)) return null;
            const index = getAdditionalMeterIndex(meter, item => !isMieterstromMeter(item));
            return index < 0 ? null : getTopologyMeterCount(getState()) + index + 1;
        }

        function getMieterstromMeterNumber(meter) {
            if (!meter || !isMieterstromMeter(meter)) return null;
            const index = getAdditionalMeterIndex(meter, isMieterstromMeter);
            return index < 0 ? null : index + 1;
        }

        function getMeterLabel(meter) {
            if (isMieterstromMeter(meter)) {
                const number = getMieterstromMeterNumber(meter);
                return number ? `ZN${number}` : '';
            }
            const number = getMeterNumber(meter);
            return number ? `Z${number}` : '';
        }

        function getMeterDetailIndex(meter) {
            const index = getAdditionalMeters().findIndex(item => item.id === meter?.id);
            return index < 0 ? null : getTopologyMeterCount(getState()) + index;
        }

        function getAssetMeterNumber(asset) {
            const meter = getMeterForAsset(asset);
            return meter ? getMeterNumber(meter) : null;
        }

        function getAssetMeterLabel(asset) {
            const meter = getMeterForAsset(asset);
            return meter ? getMeterLabel(meter) : '';
        }

        function getConfiguredMeterCount() {
            const state = getState();
            const additionalMeterCount = (state?.assets || []).filter(asset => asset.type === 'meter' && !isMieterstromMeter(asset)).length;
            return getTopologyMeterCount(state) + additionalMeterCount;
        }

        function getGenerationAssetNumber(asset) {
            if (!asset || asset.type !== 'generation') return null;
            const storedNumber = Number(asset.generationNumber);
            if (Number.isFinite(storedNumber) && storedNumber > 0) return storedNumber;
            const assets = getState()?.assets || [];
            const index = assets.filter(item => item.type === 'generation').findIndex(item => item.id === asset.id);
            return index < 0 ? null : index + 1;
        }

        function getConsumerAssetNumber(asset) {
            if (!asset || asset.type !== 'consumer') return null;
            const isMieterstromUser = asset.mieterstromObject === 'user';
            const assets = getState()?.assets || [];
            const sameCategory = assets.filter(item => item.type === 'consumer'
                && (item.mieterstromObject === 'user') === isMieterstromUser);
            const index = sameCategory.findIndex(item => item.id === asset.id);
            return index < 0 ? null : index + 1;
        }

        function getGenerationMeterNumber(asset) {
            if (!asset || asset.type !== 'generation' || !asset.generationMeter) return null;
            const attachedNumber = getAssetMeterNumber(asset);
            if (attachedNumber) return attachedNumber;
            const assets = getState()?.assets || [];
            const generationMeters = assets.filter(item => item.type === 'generation' && item.generationMeter);
            const generationIndex = generationMeters.findIndex(item => item.id === asset.id);
            return generationIndex < 0 ? null : getConfiguredMeterCount() + generationIndex + 1;
        }

        function syncGenerationName(asset) {
            if (asset?.type !== 'generation' || !/^(?:EA|PV|BHKW|WE)\s*\d+$|^Balkonkraftwerk\s+\d+$/.test(String(asset.name || '').trim())) return;
            const number = getGenerationAssetNumber(asset);
            if (number) asset.name = `${getGenerationDisplay(asset.energyCarrier).prefix}${number}`;
        }

        return Object.freeze({
            isMieterstromMeter,
            getMeterNumber,
            getMieterstromMeterNumber,
            getMeterLabel,
            getMeterDetailIndex,
            getAssetMeterNumber,
            getAssetMeterLabel,
            getConfiguredMeterCount,
            getGenerationMeterNumber,
            getGenerationAssetNumber,
            getConsumerAssetNumber,
            syncGenerationName
        });
    }

    global.WattspurMesskonzeptIdentifiers = Object.freeze({
        createIdentifierController
    });
}(window));
