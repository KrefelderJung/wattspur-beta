/*
 * Wattspur Messkonzept – HTML-Renderer für Anlagenkarten und Messschienen
 *
 * Dieses Modul erzeugt ausschließlich Markup. Es kennt weder document noch
 * SVG-Geometrie und verändert den Zustand nicht. Fachliche Abfragen werden
 * über die injizierten Funktionen des Konfigurators bezogen.
 */
(function exposeMesskonzeptRender(global) {
    'use strict';

    function createRenderer(deps = {}) {
        const state = deps.state || {};
        const assetMeta = deps.assetMeta || {};
        const escapeHtml = deps.escapeHtml || (value => String(value ?? ''));
        const getViewMode = deps.getViewMode || (() => state.viewMode || 'simple');
        const getAssetTypeLabel = deps.getAssetTypeLabel || (() => '');
        const getSteuveIconClass = deps.getSteuveIconClass || (() => '');
        const getMeterForAsset = deps.getMeterForAsset || (() => null);
        const getAssetMeters = deps.getAssetMeters || (() => []);
        const getMeterAssets = deps.getMeterAssets || (() => []);
        const getMeterNumber = deps.getMeterNumber || (() => null);
        const getMeterLabel = deps.getMeterLabel || (meter => {
            const number = getMeterNumber(meter);
            return number ? `Z${number}` : '';
        });
        const getMeterDetailIndex = deps.getMeterDetailIndex || (() => 0);
        const getGenerationMeterNumber = deps.getGenerationMeterNumber || (() => null);
        const renderAssetIcon = deps.renderAssetIcon || (() => '');
        const renderInlineMeter = deps.renderInlineMeter || (() => '');
        const renderAssetSummary = deps.renderAssetSummary || (() => '');
        const canBuildCascadeAfterMeter = deps.canBuildCascadeAfterMeter || (() => false);
        const getAdditionalMeters = deps.getAdditionalMeters || (() => []);
        const getRailEntries = deps.getRailEntries || (rail => (rail.assets || []).map(asset => ({ kind: 'asset', asset, order: 0 })));
        const getAssetsPerRow = deps.getAssetsPerRow || (count => Math.max(1, count));
        const getLayoutGeometry = deps.getLayoutGeometry || (() => ({}));
        const getStorageOperation = deps.getStorageOperation || (() => ({ notice: '' }));
        const storageInfoText = deps.storageInfoText || '';
        const balconyInfoText = deps.balconyInfoText || '';

        function renderAsset(asset, options = {}) {
            const meta = assetMeta[asset.type] || { label: 'Baustein', className: '', short: '' };
            const viewMode = getViewMode();
            const detailMarkup = viewMode === 'detail'
                ? `<div class="mk-asset-detail-slide" aria-label="Details zu ${escapeHtml(asset.name)}">${renderAssetSummary(asset, true)}</div>`
                : '';
            const typeLabel = getAssetTypeLabel(asset);
            const mieterstromMeterClass = asset.mieterstromObject === 'external-meter' ? 'mk-mieterstrom-participating-meter' : '';
            const mieterstromUserClass = asset.mieterstromObject === 'user' ? ' mk-mieterstrom-user' : '';
            const attachedMeter = getMeterForAsset(asset);
            const ownedMeter = getAssetMeters(asset.id)[0];
            const meterLabel = attachedMeter ? getMeterLabel(attachedMeter) : '';
            const meterGroupSize = attachedMeter ? getMeterAssets(attachedMeter.id).length : 0;
            const generationMeterNumber = asset.type === 'generation' && asset.generationMeter && !attachedMeter
                ? getGenerationMeterNumber(asset)
                : null;
            const storageOperation = asset.type === 'storage' ? getStorageOperation(asset) : null;
            const storageNotice = [storageInfoText, storageOperation?.notice].filter(Boolean).join(' ');
            const storageInfoMarkup = asset.type === 'storage' && viewMode === 'detail'
                ? `<span class="mk-storage-info" data-tooltip="${escapeHtml(storageNotice)}" title="${escapeHtml(storageNotice)}" role="img" tabindex="0" aria-label="Hinweis zum Speicher">i</span>`
                : '';
            const balconyInfoMarkup = asset.type === 'generation' && asset.energyCarrier === 'Balkonkraftwerk' && viewMode === 'detail'
                ? `<span class="mk-storage-info" data-tooltip="${escapeHtml(balconyInfoText)}" title="${escapeHtml(balconyInfoText)}" role="img" tabindex="0" aria-label="Hinweis zum Balkonkraftwerk">i</span>`
                : '';
            const meterDropTargetMarkup = attachedMeter
                ? `data-mk-meter-group-target="${escapeHtml(attachedMeter.id)}" title="Weitere Anlagen an ${escapeHtml(meterLabel)} anschließen"`
                : '';
            const sharedMeterMarkup = attachedMeter && !ownedMeter
                ? `<span class="mk-meter-share-branch" data-mk-meter-group-target="${escapeHtml(attachedMeter.id)}" title="Gemeinsam mit ${escapeHtml(meterLabel)} gemessen" role="img" aria-label="Gemeinsam mit ${escapeHtml(meterLabel)} gemessen; weitere Anlagen hierher ziehen"><span aria-hidden="true"></span></span>`
                : '';
            const suppressOwnedMeter = Boolean(options.suppressOwnedMeter && ownedMeter && attachedMeter?.id === options.suppressOwnedMeter);
            const generationMeterMarkup = ownedMeter && !suppressOwnedMeter
                ? renderInlineMeter(ownedMeter, asset)
                : generationMeterNumber
                    ? `<span class="mk-generation-meter mk-inline-meter" title="Eigener Erzeugungszähler Z${generationMeterNumber}" role="img" aria-label="Z${generationMeterNumber}: Zähler vor ${escapeHtml(asset.name)}"><b>Z${generationMeterNumber}</b></span><span class="mk-generation-meter-link" aria-hidden="true"></span>`
                    : '';

            return `
        <div class="mk-asset-branch ${viewMode === 'detail' ? 'detail-mode' : 'simple-mode'} ${generationMeterMarkup ? 'has-generation-meter' : ''} ${meterGroupSize > 1 ? 'has-meter-group' : ''} ${sharedMeterMarkup ? 'has-shared-meter' : ''}" ${meterDropTargetMarkup}>
            ${generationMeterMarkup}
            ${sharedMeterMarkup}
            <article class="mk-asset-card ${viewMode === 'detail' ? 'detail-mode' : 'simple-mode'}${mieterstromUserClass}" draggable="true" data-mk-asset-id="${escapeHtml(asset.id)}" data-mk-drag-asset="${escapeHtml(asset.id)}" data-mk-select-asset="${escapeHtml(asset.id)}" data-mk-position-target="${escapeHtml(asset.id)}" data-mk-meter-target="${escapeHtml(asset.id)}" role="button" tabindex="0" aria-label="${escapeHtml(asset.name)} auswählen und verschieben">
                <div class="mk-asset-head">
                    <span class="mk-asset-icon ${meta.className} ${mieterstromMeterClass} ${getSteuveIconClass(asset)}" aria-label="${asset.type === 'storage' ? 'Batteriespeicher' : escapeHtml(typeLabel || meta.label)}">${renderAssetIcon(asset)}</span>
                    ${balconyInfoMarkup}
                    ${storageInfoMarkup}
                    <button type="button" class="mk-remove-asset" data-mk-remove-asset="${escapeHtml(asset.id)}" title="Baustein entfernen" aria-label="${escapeHtml(asset.name)} entfernen">×</button>
                </div>
                ${detailMarkup}
            </article>
        </div>
    `;
        }

        function renderReservedMeterSlot(slot) {
            return `<span class="mk-asset-slot-placeholder" data-mk-reserved-meter-slot="${escapeHtml(slot.id)}" aria-hidden="true"></span>`;
        }

        function renderAssetRail(rail, isRoot = false) {
            const rows = [];
            const railEntries = getRailEntries(rail);
            const assetsPerRow = getAssetsPerRow(railEntries.length);
            const parentMeter = rail.meterId
                ? getAdditionalMeters().find(meter => meter.id === rail.meterId)?.parentMeterId || ''
                : '';
            const railAssets = rail.assets || [];
            const railChildren = rail.children || [];
            const railMeter = rail.meterId ? getAdditionalMeters().find(meter => meter.id === rail.meterId) : null;
            // Nur ein anlagenbezogener Zähler mit genau einer Anlage darf
            // ohne eigenen Sammelschienenknoten direkt zur Anlage führen.
            // Ein Kaskadenzähler markiert dagegen immer eine Messstufe und
            // benötigt deshalb auch bei einer oder keiner Anlage seinen
            // standardisierten Schienenknoten.
            const isSingleAssetRail = Boolean(
                railMeter?.meterScope === 'asset'
                && railAssets.length === 1
                && railChildren.length === 0
            );
            const geometry = getLayoutGeometry();
            const railAssetStartGap = Number(geometry.primaryRailClearancePx) || 12.8;
            const meterRemoveClearance = Number(geometry.meterRemoveButtonClearancePx) || 8;
            const railAttributes = ` data-mk-meter-rail="${escapeHtml(rail.meterId || 'root')}" data-mk-depth="${rail.depth}"${rail.meterId ? ` data-mk-parent-meter="${escapeHtml(parentMeter)}" style="--mk-meter-rail-top-gap-px: ${geometry.meterRailTopGapPx}px; --mk-rail-asset-start-gap-px: ${railAssetStartGap}px; --mk-meter-remove-button-clearance-px: ${meterRemoveClearance}px;"` : ` data-mk-root-rail="true" style="--mk-rail-asset-start-gap-px: ${railAssetStartGap}px;"`}`;
            const meterAttributes = rail.meterId ? ` data-mk-meter-group="${escapeHtml(rail.meterId)}"` : '';
            const isAssetGroupRail = Boolean(railMeter?.meterScope === 'asset');
            const railRoleLabel = isAssetGroupRail ? 'gemeinsamer Messpunkt' : 'Kaskadenstufe';
            const railDropHint = railMeter && canBuildCascadeAfterMeter(railMeter)
                ? 'Weitere Anlagen oder Zähler hierher ziehen'
                : 'Weitere Anlagen hierher ziehen · keine weitere Kaskadenstufe';
            // Die Leitung unter einem Rail-Zähler wird ausschließlich vom
            // SVG-Router gezeichnet. Ein zusätzlicher HTML-Strich würde bei
            // Unterkaskaden dieselbe Strecke doppelt überlagern.
            const railMeterLabel = railMeter ? getMeterLabel(railMeter) : '';
            const railMeterMarkup = railMeter
                ? `<div class="mk-rail-meter-node" data-mk-meter-rail-node="${escapeHtml(railMeter.id)}" data-mk-meter-role="${isAssetGroupRail ? 'asset-group' : 'cascade'}" data-mk-meter-target="${escapeHtml(railMeter.id)}" data-mk-meter-group-target="${escapeHtml(railMeter.id)}" title="${escapeHtml(railMeterLabel)} · ${railRoleLabel} · ${railDropHint}"><span class="mk-generation-meter mk-rail-meter${railMeter.mieterstromObject === 'external-meter' ? ' mk-mieterstrom-participating-meter' : ''}" data-mk-select-meter="${getMeterDetailIndex(railMeter)}" role="button" tabindex="0" aria-label="${escapeHtml(railMeterLabel)} auswählen"><b>${escapeHtml(railMeterLabel)}</b></span><button type="button" class="mk-remove-meter" data-mk-remove-meter="${escapeHtml(railMeter.id)}" title="${escapeHtml(railMeterLabel)} entfernen" aria-label="Zähler ${escapeHtml(railMeterLabel)} entfernen">×</button></div>`
                : '';
            const railJunctionMarkup = railMeter && !isSingleAssetRail
                ? `<span class="mk-rail-junction-anchor" data-mk-node-kind="SK" data-mk-rail-junction="${escapeHtml(railMeter.id)}" aria-hidden="true"><span class="mk-rail-junction"></span></span>`
                : '';

            for (let start = 0; start < railEntries.length; start += assetsPerRow) {
                const rowEntries = railEntries.slice(start, start + assetsPerRow);
                const rowClass = isRoot && start === 0 ? 'primary' : 'secondary';
                rows.push(`<div class="mk-asset-row ${rowClass}${rail.meterId ? ' meter-group-row' : ''}"${meterAttributes} style="--mk-asset-columns: ${rowEntries.length};">${rowEntries.map(entry => entry.kind === 'reserved-slot' ? renderReservedMeterSlot(entry.slot) : renderAsset(entry.asset, { suppressOwnedMeter: rail.meterId || '' })).join('')}</div>`);
            }

            return `<section class="mk-meter-rail${rail.meterId ? ' meter-group-rail' : ' root-rail'}${isAssetGroupRail ? ' asset-group-rail' : ''}${isSingleAssetRail ? ' single-asset-rail' : ''}" data-mk-meter-role="${isAssetGroupRail ? 'asset-group' : rail.meterId ? 'cascade' : 'root'}"${railAttributes}>${railMeterMarkup}${railJunctionMarkup}${rows.join('')}${railChildren.map(child => renderAssetRail(child, false)).join('')}</section>`;
        }

        return Object.freeze({ renderAsset, renderAssetRail, renderReservedMeterSlot });
    }

    global.WattspurMesskonzeptRender = Object.freeze({ createRenderer });
}(window));
