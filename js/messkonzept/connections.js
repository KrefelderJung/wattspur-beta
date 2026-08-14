/*
 * Wattspur Messkonzept – Leitungs- und Verbindungsorchestrierung
 *
 * Dieses Modul verbindet die semantischen HTML-Anker (SK, AK, ZK und MK)
 * mit der SVG-Leitungsebene. Es besitzt bewusst keinen direkten Zugriff auf
 * den globalen Messkonzept-Zustand. Abhängigkeiten werden beim Erzeugen des
 * Routers injiziert; dadurch bleibt die Leitungslogik isoliert testbar.
 */
(function exposeMesskonzeptConnections(global) {
    'use strict';

    function createConnections(options = {}) {
        const getState = options.getState || (() => options.state || {});
        const getElements = options.getElements || (() => ({}));
        const getStageScale = options.getStageScale || (() => 1);
        const findIncomingMeterLayout = options.findIncomingMeterLayout || (() => null);
        const hasNestedMeterRail = options.hasNestedMeterRail || (() => false);
        const getAdditionalMeters = options.getAdditionalMeters || (() => []);
        const getAssetBranchAnchor = options.getAssetBranchAnchor || (branch => branch);
        const getStagePoint = options.getStagePoint || (() => null);
        const buildWire = options.buildWire || (() => '');
        const buildNode = options.buildNode || (() => '');
        const geometry = options.layoutGeometry || {};

        function buildAssetBranchWires(zone, junctionPoint, pointFor, dynamicNodes = []) {
            const wires = [];
            const state = getState();
            const topologyEntryForBranch = branch => ({
                branch,
                asset: (state.assets || []).find(asset => asset.id === branch.querySelector('[data-mk-asset-id]')?.dataset.mkAssetId),
                anchor: getAssetBranchAnchor(branch)
            });
            const topologyBranchEntries = row => [...row.children]
                .filter(child => child.matches('.mk-asset-branch'))
                .map(topologyEntryForBranch)
                .filter(entry => entry.asset);
            const rootRail = zone.querySelector(':scope > .mk-zone-assets > .mk-meter-rail.root-rail');
            if (!rootRail) return wires;

            const directRows = rail => [...rail.children].filter(child => child.matches('.mk-asset-row'));
            const childRails = rail => [...rail.children].filter(child => child.matches('.mk-meter-rail.meter-group-rail'));
            const meterForRail = rail => getAdditionalMeters().find(meter => meter.id === rail.dataset.mkMeterRail) || null;
            const meterElementForRail = rail => {
                const meter = meterForRail(rail);
                if (!meter) return null;
                const railNode = rail.querySelector(`:scope > [data-mk-meter-rail-node="${meter.id}"]`);
                if (railNode) return railNode;
                const target = rail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`);
                return target?.closest('.mk-asset-branch')?.querySelector('.mk-generation-meter') || null;
            };

            const drawRail = (rail, feedPoint) => {
                const railMeter = meterForRail(rail);
                const rows = directRows(rail);
                const entries = rows.flatMap(topologyBranchEntries);
                const children = childRails(rail);
                if (!entries.length && !children.length) return;

                // Ein Zusatzzaehler mit genau einer Anlage ist noch keine
                // Sammelschiene. Er bleibt als gerader Abgang vom Zaehler zur
                // Anlage sichtbar; erst ab zwei Anlagen wird ein eigener Bus
                // mit Sammelschienenknoten aufgebaut.
                const isSingleAssetRail = Boolean(
                    rail.classList.contains('single-asset-rail')
                    && entries.length === 1
                    && children.length === 0
                );
                if (isSingleAssetRail) {
                    const meterElement = meterElementForRail(rail);
                    const meterBottom = meterElement ? pointFor(meterElement, 'center', 'bottom') : null;
                    const assetPoint = entries[0]?.anchor
                        ? pointFor(entries[0].anchor, 'center', 'top')
                        : null;
                    if (meterBottom && assetPoint) wires.push(buildWire(meterBottom, assetPoint));
                    return;
                }

                const childConnections = children.map(child => {
                    const meterElement = meterElementForRail(child);
                    if (!meterElement) return null;
                    const meterTop = pointFor(meterElement, 'center', 'top');
                    const meterBottom = pointFor(meterElement, 'center', 'bottom');
                    const meter = meterForRail(child);
                    return meterTop && meterBottom ? { child, meter, meterTop, meterBottom } : null;
                }).filter(Boolean);
                const pointForEntry = entry => {
                    const isRailOwner = railMeter?.targetAssetId === entry.asset.id;
                    const anchor = isRailOwner
                        ? entry.branch.querySelector('.mk-asset-card') || entry.anchor
                        : entry.anchor;
                    return pointFor(anchor, 'center', 'top');
                };
                const rowEntries = rows.map(row => topologyBranchEntries(row));
                const assetPoints = (rowEntries[0] || []).map(pointForEntry).filter(Boolean);
                const groupMeterPoints = childConnections
                    .filter(connection => connection.meter?.meterScope === 'asset')
                    .map(connection => connection.meterTop);
                const busRight = Math.max(feedPoint.x, ...assetPoints.map(point => point.x), ...groupMeterPoints.map(point => point.x));

                if (busRight - feedPoint.x > 1) {
                    wires.push(`<path class="mk-dynamic-wire mk-asset-row-bus" d="M ${feedPoint.x} ${feedPoint.y} H ${busRight}" />`);
                    if (railMeter) dynamicNodes.push({ x: feedPoint.x, y: feedPoint.y });
                }
                assetPoints.forEach(point => {
                    wires.push(buildWire({ x: point.x, y: feedPoint.y }, point));
                    dynamicNodes.push({ x: point.x, y: feedPoint.y });
                });

                // Mehrzeilige Detail-Rails erhalten je Reihe einen eigenen Bus.
                let previousRowBusY = feedPoint.y;
                rows.slice(1).forEach((row, rowIndex) => {
                    const rowPoints = (rowEntries[rowIndex + 1] || []).map(pointForEntry).filter(Boolean);
                    if (!rowPoints.length) return;
                    const proposedBusY = rowPoints[0].y - geometry.busToAssetGapPx;
                    const rowBusY = Math.max(previousRowBusY + geometry.routeBendPx, proposedBusY);
                    const rowBusRight = Math.max(feedPoint.x, ...rowPoints.map(point => point.x));
                    wires.push(buildWire({ x: feedPoint.x, y: previousRowBusY }, { x: feedPoint.x, y: rowBusY }));
                    if (rowBusRight - feedPoint.x > 1) {
                        wires.push(`<path class="mk-dynamic-wire mk-asset-row-bus" d="M ${feedPoint.x} ${rowBusY} H ${rowBusRight}" />`);
                    }
                    rowPoints.forEach(point => {
                        wires.push(buildWire({ x: point.x, y: rowBusY }, point));
                        dynamicNodes.push({ x: point.x, y: rowBusY });
                    });
                    previousRowBusY = rowBusY;
                });

                childConnections.forEach(({ child, meter, meterTop, meterBottom }) => {
                    const meterElement = meterElementForRail(child);
                    if (!meterElement || !meterTop || !meterBottom) return;
                    // Die Zuleitung des Kindes bleibt auf dessen Messachse. Eine
                    // waagerechte Strecke entsteht erst unterhalb des Zählers.
                    const childFeedPoint = { x: meterTop.x, y: feedPoint.y };
                    wires.push(buildWire(childFeedPoint, meterTop));
                    const childRow = child.querySelector(':scope > .mk-asset-row');
                    const childRailTop = pointFor(childRow || child, 'left', 'top');
                    const childFirstBranch = child.querySelector(':scope > .mk-asset-row > .mk-asset-branch');
                    const childFirstAssetTop = childFirstBranch
                        ? pointFor(getAssetBranchAnchor(childFirstBranch), 'center', 'top')
                        : null;
                    const minimumChildBusY = meterBottom.y + geometry.meterToSubBusGapPx;
                    const standardChildBusY = childFirstAssetTop
                        ? childFirstAssetTop.y - geometry.busToAssetGapPx
                        : childRailTop?.y || null;
                    const childBusY = Number.isFinite(standardChildBusY)
                        ? Math.max(standardChildBusY, minimumChildBusY)
                        : minimumChildBusY;
                    const childBusFeedPoint = { x: meterBottom.x, y: childBusY };
                    wires.push(buildWire(meterBottom, childBusFeedPoint));
                    drawRail(child, childBusFeedPoint);
                });
            };

            drawRail(rootRail, junctionPoint);
            return wires;
        }

        function updateDynamicConnections() {
            const elements = getElements();
            const stage = elements.canvas?.querySelector('.mk-canvas-stage');
            const layer = stage?.querySelector('.mk-connector-layer');
            if (!stage || !layer || !stage.offsetWidth || !stage.offsetHeight) return;

            const stageRect = stage.getBoundingClientRect();
            const scale = getStageScale(stage);
            const topology = stage.querySelector('.mk-topology-content');
            const width = Math.ceil(Math.max(stage.offsetWidth, topology?.scrollWidth || 0, topology?.offsetWidth || 0));
            const height = Math.ceil(Math.max(stage.offsetHeight, topology?.scrollHeight || 0, topology?.offsetHeight || 0));
            const wires = [];
            const dynamicNodes = [];
            const pointFor = (element, horizontal, vertical) => getStagePoint(element, stageRect, scale, horizontal, vertical);

            stage.querySelectorAll('.mk-drop-zone').forEach(zone => {
                const rootRail = zone.querySelector(':scope > .mk-zone-assets > .mk-meter-rail.root-rail');
                if (!zone.querySelector('.mk-asset-branch') && !rootRail?.querySelector('.mk-rail-meter-node')) return;
                const meterLayout = findIncomingMeterLayout(zone);
                const junction = zone.querySelector('.mk-zone-junction');
                if (!meterLayout || !junction) return;
                const zoneAssets = zone.querySelector('.mk-zone-assets');
                const branches = [...zone.querySelectorAll('.mk-asset-branch')];
                const hasMeterGroup = hasNestedMeterRail(zone);
                const isSingleDirectAsset = branches.length === 1 && !hasMeterGroup;
                const junctionPoint = pointFor(junction);

                zoneAssets?.classList.toggle('mk-single-asset-direct', isSingleDirectAsset);
                if (isSingleDirectAsset) {
                    const directStart = pointFor(meterLayout, 'center', 'bottom');
                    const directEnd = pointFor(getAssetBranchAnchor(branches[0]), 'center', 'top');
                    wires.push(buildWire(directStart, directEnd));
                    return;
                }

                wires.push(buildWire(pointFor(meterLayout, 'center', 'bottom'), junctionPoint));
                wires.push(...buildAssetBranchWires(zone, junctionPoint, pointFor, dynamicNodes));
            });

            layer.setAttribute('viewBox', `0 0 ${width} ${height}`);
            layer.setAttribute('width', String(width));
            layer.setAttribute('height', String(height));
            layer.style.setProperty('--mk-connector-width-px', `${width}px`);
            layer.style.setProperty('--mk-connector-height-px', `${height}px`);
            layer.innerHTML = wires.filter(Boolean).join('') + dynamicNodes.map(buildNode).join('');
        }

        return Object.freeze({
            buildAssetBranchWires,
            updateDynamicConnections
        });
    }

    global.WattspurMesskonzeptConnections = Object.freeze({ createConnections });
}(window));
