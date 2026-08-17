/*
 * Wattspur Messkonzept – Drop-Zonen und Rail-Komposition
 *
 * Dieses Modul erzeugt nur das HTML für einen Messbereich. Es kennt weder
 * globale Modellvariablen noch DOM-Messungen. Topologie, Layout und Labels
 * werden über kleine Callbacks eingespeist.
 */
(function exposeMesskonzeptZoneRenderer(global) {
    'use strict';

    function createZoneRenderer(options = {}) {
        const getState = options.getState || (() => ({}));
        const getDefaultZone = options.getDefaultZone || (() => 'single-main');
        const getZoneAssets = options.getZoneAssets || (() => []);
        const buildZoneMeterTree = options.buildZoneMeterTree || (() => ({ children: [] }));
        const getRailEntries = options.getRailEntries || (() => []);
        const renderAssetRail = options.renderAssetRail || (() => '');
        const getAdditionalMeters = options.getAdditionalMeters || (() => []);
        const getAssetsPerRow = options.getAssetsPerRow || (count => count);
        const getZoneLabel = options.getZoneLabel || (() => 'Messbereich');
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));

        function renderAssetRows(assets, zoneOverride = '') {
            const zone = zoneOverride || assets[0]?.zone || getDefaultZone();
            const tree = buildZoneMeterTree(zone);
            // Auch eine leere, bewusst erhaltene Unterkaskade braucht ein DOM-
            // Rail, damit Zähler, Achse und Sammelschienenknoten sichtbar bleiben.
            if (!assets.length && !tree.children.length) return '';
            return renderAssetRail(tree, true);
        }

        function renderDropZone(zone, index) {
            const state = getState();
            const assets = getZoneAssets(zone);
            const tree = buildZoneMeterTree(zone);
            const hasMeterGroups = tree.children.length > 0;
            // Der oberste Sammelschienenanker bleibt für die Geometrie im DOM,
            // wird aber bei einer reinen Zählerkette nicht dekorativ gezeigt.
            const showRootJunction = getRailEntries(tree).length > 0;
            const hasEmptyMeterRail = getAdditionalMeters().some(meter => meter.zone === zone && meter.keepEmptyRail);
            const hasRenderableRail = assets.length > 0 || hasMeterGroups || hasEmptyMeterRail;
            const hasWrappedRows = assets.length > getAssetsPerRow(assets.length);
            const rowsMarkup = hasRenderableRail
                ? renderAssetRows(assets, zone)
                : '<div class="mk-empty-zone">Noch leer</div>';
            const dropZoneClass = `mk-drop-zone ${hasRenderableRail ? 'filled' : 'empty'}`;
            const viewClass = state.viewMode === 'detail' ? 'detail-mode' : 'simple-mode';
            return `
        <div class="${dropZoneClass}" data-mk-zone="${escapeHtml(zone)}" aria-label="${escapeHtml(getZoneLabel(index))}" data-mk-layout-container="true">
            <div class="mk-zone-assets ${viewClass}${hasMeterGroups ? ' has-meter-groups' : ''}"><span class="mk-zone-junction${showRootJunction ? '' : ' mk-zone-junction-structural'}" data-mk-node-kind="SK" aria-hidden="true"></span>${hasWrappedRows ? '<span class="mk-zone-wrap-strand" aria-hidden="true"></span>' : ''}${rowsMarkup}</div>
        </div>
    `;
        }

        return Object.freeze({ renderAssetRows, renderDropZone });
    }

    global.WattspurMesskonzeptZoneRenderer = Object.freeze({ createZoneRenderer });
}(window));
