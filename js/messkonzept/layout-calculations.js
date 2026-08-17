/**
 * Wattspur Messkonzept – reine Layoutberechnungen
 *
 * Dieses Modul kennt weder DOM noch Konfigurator-Globals. Es liefert nur
 * Zahlen und sortierte Einträge. Die DOM-Anwendung bleibt in layout.js.
 */
(function exposeMesskonzeptLayoutCalculations(global) {
    'use strict';

    function createLayoutCalculations(options = {}) {
        const getState = options.getState || (() => options.state || {});
        const getViewMode = options.getViewMode || (() => getState().viewMode || 'simple');
        const getMeterTree = options.getMeterTree || (() => ({ children: [] }));
        const getAdditionalMeters = options.getAdditionalMeters || (() => []);
        const geometry = options.layoutGeometry || {};
        const assetsPerRowDefault = Number(options.assetsPerRowDefault) || 3;

        const getAssetOrder = assetId => {
            const assets = getState()?.assets || [];
            return assets.findIndex(asset => asset.id === assetId);
        };

        function getAssetsPerRow(assetCount = assetsPerRowDefault) {
            const isNarrowViewport = typeof window !== 'undefined'
                && window.matchMedia?.('(max-width: 480px)').matches;
            const normalizedAssetCount = Math.max(1, Number(assetCount) || 0);
            if (getViewMode() === 'detail') {
                return isNarrowViewport ? 1 : assetsPerRowDefault;
            }
            return normalizedAssetCount;
        }

        function getSimpleCanvasMinimumWidth(assetCount) {
            return 128 + (Math.max(1, Number(assetCount) || 0) * 66);
        }

        function getReservedMeterSlots(rail) {
            const visibleAssetIds = new Set((rail?.assets || []).map(asset => asset.id));
            return (rail?.children || [])
                .map(child => ({
                    child,
                    meter: getAdditionalMeters().find(meter => meter.id === child.meterId)
                }))
                .filter(entry => entry.child.meterScope === 'asset'
                    && entry.meter?.id
                    && (entry.meter.targetAssetId
                        || (Number.isFinite(Number(entry.meter.railAnchorOrder))
                            && Number(entry.meter.railAnchorOrder) >= 0)))
                .map(entry => ({
                    id: entry.meter.id,
                    targetAssetId: entry.meter.targetAssetId || '',
                    order: Number.isFinite(Number(entry.meter.railAnchorOrder))
                        && Number(entry.meter.railAnchorOrder) >= 0
                        ? Number(entry.meter.railAnchorOrder)
                        : getAssetOrder(entry.meter.targetAssetId)
                }))
                .filter(slot => slot.order >= 0
                    && (!slot.targetAssetId || !visibleAssetIds.has(slot.targetAssetId)));
        }

        function getRailEntries(rail) {
            const entries = (rail?.assets || []).map(asset => ({
                kind: 'asset',
                asset,
                order: getAssetOrder(asset.id)
            }));
            const slots = getReservedMeterSlots(rail)
                .map(slot => ({ kind: 'reserved-slot', slot, order: slot.order }));
            return [...entries, ...slots].sort((first, second) => {
                if (first.order !== second.order) return first.order - second.order;
                return first.kind === second.kind ? 0 : first.kind === 'reserved-slot' ? -1 : 1;
            });
        }

        function getWidestRailCellCount(zone) {
            const countRailCells = rail => {
                if (!rail) return 0;
                const directCellCount = getRailEntries(rail).length;
                const childCellCount = (rail.children || []).reduce(
                    (maximum, child) => Math.max(maximum, countRailCells(child)),
                    0
                );
                return Math.max(directCellCount, childCellCount);
            };
            return Math.max(0, countRailCells(getMeterTree(zone)));
        }

        function getParallelBranchWidth(assetCount) {
            const normalizedAssetCount = Math.max(0, Number(assetCount) || 0);
            const columns = getAssetsPerRow(Math.max(1, normalizedAssetCount));
            const isSimple = getViewMode() === 'simple';
            const cardWidth = isSimple ? 56 : 132;
            const cardGap = isSimple ? 9.6 : 16;
            const leftOffset = isSimple
                ? (Number(geometry.parallelMeterAxisOffsetPx) || 0)
                    + (Number(geometry.parallelAssetClearancePx) || 0)
                : 0;
            const rightPadding = isSimple ? 13 : 20;
            const dropZonePadding = isSimple ? 32 : 40;
            const rowWidth = normalizedAssetCount
                ? (columns * cardWidth) + (Math.max(0, columns - 1) * cardGap)
                : 0;
            return Math.max(
                normalizedAssetCount ? (isSimple ? 148 : 300) : (isSimple ? 148 : 206),
                rowWidth + leftOffset + rightPadding + dropZonePadding
            );
        }

        function getZoneMeterDepth(zone) {
            const getDepth = rail => (rail.children || []).reduce(
                (maximum, child) => Math.max(maximum, getDepth(child)),
                rail.depth || 0
            );
            return getDepth(getMeterTree(zone));
        }

        function getParallelLayoutMetrics(meterCount) {
            const branchCount = Math.max(1, Number(meterCount) || 1);
            const branchWidths = Array.from({ length: branchCount }, (_, index) => {
                const zone = `parallel-${index}`;
                return getParallelBranchWidth(getWidestRailCellCount(zone));
            });
            const branchGap = 16;
            const minimumBranchWidth = Math.max(...branchWidths);
            return {
                branchCount,
                branchWidths,
                minimumBranchWidth,
                gridTemplateColumns: branchWidths.map(width => `${width}px`).join(' '),
                minimumCanvasWidth: branchWidths.reduce((total, width) => total + width, 0)
                    + (Math.max(0, branchCount - 1) * branchGap) + 12
            };
        }

        return Object.freeze({
            getAssetsPerRow,
            getSimpleCanvasMinimumWidth,
            getWidestRailCellCount,
            getParallelBranchWidth,
            getZoneMeterDepth,
            getParallelLayoutMetrics,
            getReservedMeterSlots,
            getRailEntries
        });
    }

    global.WattspurMesskonzeptLayoutCalculations = Object.freeze({ createLayoutCalculations });
}(window));
