/**
 * Wattspur Messkonzept – Layout- und Geometrie-Orchestrierung
 *
 * Dieses Modul berechnet die sichtbaren Breiten und Abstände der
 * Messschienen. Es darf fachliche Beziehungen nur lesen und erhält Zustand,
 * DOM-Elemente und Geometrie-Helfer über injizierte Abhängigkeiten.
 *
 * Die eigentliche SVG-Leitung bleibt in connections.js. Dieses Modul setzt
 * ausschließlich CSS-Variablen und misst bereits gerendertes HTML.
 */
(function exposeMesskonzeptLayout(global) {
    'use strict';

    function createLayoutController(options = {}) {
        const getState = options.getState || (() => options.state || {});
        const getElements = options.getElements || (() => ({}));
        const getViewMode = options.getViewMode || (() => getState().viewMode || 'simple');
        const getMode = options.getMode || (() => getState().mode || 'single');
        const getZoneAssets = options.getZoneAssets || (() => []);
        const getMeterTree = options.getMeterTree || (() => ({ children: [] }));
        const getAdditionalMeters = options.getAdditionalMeters || (() => []);
        const getStageScale = options.getStageScale || (() => 1);
        const getRailSiblingCollisionShift = options.getRailSiblingCollisionShift || (() => 0);
        const geometry = options.layoutGeometry || {};
        const assetsPerRowDefault = Number(options.assetsPerRowDefault) || 3;
        const calculations = options.calculations
            || global.WattspurMesskonzeptLayoutCalculations?.createLayoutCalculations({
                getState,
                getViewMode,
                getMeterTree,
                getAdditionalMeters,
                layoutGeometry: geometry,
                assetsPerRowDefault
            });

        const getAssetOrder = assetId => {
            const assets = getState()?.assets || [];
            return assets.findIndex(asset => asset.id === assetId);
        };

        function getAssetsPerRow(assetCount = assetsPerRowDefault) {
            if (calculations) return calculations.getAssetsPerRow(assetCount);
            const isNarrowViewport = typeof window !== 'undefined'
                && window.matchMedia?.('(max-width: 480px)').matches;
            const normalizedAssetCount = Math.max(1, Number(assetCount) || 0);
            if (getViewMode() === 'detail') {
                return isNarrowViewport ? 1 : assetsPerRowDefault;
            }
            // Die einfache Skizze bildet eine elektrische Parallelschaltung ab.
            // Sie bleibt daher unabhängig von der Bildschirmbreite horizontal;
            // Zoom und Verschieben übernehmen die Bedienung bei breiten Rails.
            return normalizedAssetCount;
        }

        function getSimpleCanvasMinimumWidth(assetCount) {
            if (calculations) return calculations.getSimpleCanvasMinimumWidth(assetCount);
            return 128 + (Math.max(1, Number(assetCount) || 0) * 66);
        }

        function getWidestRailCellCount(zone) {
            if (calculations) return calculations.getWidestRailCellCount(zone);
            const tree = getMeterTree(zone);
            const countRailCells = rail => {
                if (!rail) return 0;
                const directCellCount = getRailEntries(rail).length;
                const childCellCount = (rail.children || []).reduce(
                    (maximum, child) => Math.max(maximum, countRailCells(child)),
                    0
                );
                return Math.max(directCellCount, childCellCount);
            };
            return Math.max(0, countRailCells(tree));
        }

        function getParallelBranchWidth(assetCount) {
            if (calculations) return calculations.getParallelBranchWidth(assetCount);
            const normalizedAssetCount = Math.max(0, Number(assetCount) || 0);
            const columns = getAssetsPerRow(Math.max(1, normalizedAssetCount));
            const viewMode = getViewMode();
            const isSimple = viewMode === 'simple';
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
            // Die Breite enthält Anlagenreihe, Messachse und Ablagebereich.
            const contentWidth = rowWidth + leftOffset + rightPadding + dropZonePadding;
            const minimumWidth = normalizedAssetCount
                ? (isSimple ? 148 : 300)
                : (isSimple ? 148 : 206);
            return Math.max(minimumWidth, contentWidth);
        }

        function getZoneMeterDepth(zone) {
            if (calculations) return calculations.getZoneMeterDepth(zone);
            const getDepth = rail => rail.children.reduce(
                (maximum, child) => Math.max(maximum, getDepth(child)),
                rail.depth || 0
            );
            return getDepth(getMeterTree(zone));
        }

        function getParallelLayoutMetrics(meterCount) {
            if (calculations) return calculations.getParallelLayoutMetrics(meterCount);
            const branchCount = Math.max(1, Number(meterCount) || 1);
            // Die tatsächliche HTML-Ausdehnung wird nach dem Rendern vermessen.
            // Eine pauschale Einrückung würde Nachbarzweige unnötig verschieben.
            const railIndent = 0;
            const branchWidths = Array.from({ length: branchCount }, (_, index) => {
                const zone = `parallel-${index}`;
                // Die Breite richtet sich nach der breitesten sichtbaren
                // Sammelschiene, nicht nach allen Anlagen des Zweigs. Anlagen
                // in tieferen Rails dürfen den Basiszähler nicht künstlich
                // vom HAK wegspreizen. Die anschließende DOM-Messung erweitert
                // den Track bei echten Kollisionen weiterhin automatisch.
                return getParallelBranchWidth(getWidestRailCellCount(zone))
                    + (getZoneMeterDepth(zone) * railIndent);
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

        function getParallelCanvasMinimumWidth(meterCount) {
            return getParallelLayoutMetrics(meterCount).minimumCanvasWidth;
        }

        function getReservedMeterSlots(rail) {
            if (calculations) return calculations.getReservedMeterSlots(rail);
            const visibleAssetIds = new Set((rail.assets || []).map(asset => asset.id));
            return (rail.children || [])
                .map(child => ({
                    child,
                    meter: getAdditionalMeters().find(meter => meter.id === child.meterId)
                }))
                .filter(entry => entry.child.meterScope === 'asset'
                    && entry.meter?.id
                    && entry.meter.targetAssetId)
                .map(entry => ({
                    id: entry.meter.id,
                    targetAssetId: entry.meter.targetAssetId,
                    order: getAssetOrder(entry.meter.targetAssetId)
                }))
                .filter(slot => slot.order >= 0 && !visibleAssetIds.has(slot.targetAssetId));
        }

        function getRailEntries(rail) {
            if (calculations) return calculations.getRailEntries(rail);
            const entries = (rail.assets || []).map(asset => ({
                kind: 'asset',
                asset,
                order: getAssetOrder(asset.id)
            }));
            const slots = getReservedMeterSlots(rail)
                .map(slot => ({ kind: 'reserved-slot', slot, order: slot.order }));
            return [...entries, ...slots].sort((first, second) => {
                if (first.order !== second.order) return first.order - second.order;
                // Bei gleicher Position bleibt das reservierte Feld vor einer
                // sichtbaren Karte, damit die alte Anlagenachse erhalten bleibt.
                return first.kind === second.kind ? 0 : first.kind === 'reserved-slot' ? -1 : 1;
            });
        }

        function updateSimpleAssetStrands() {
            const elements = getElements();
            const state = getState();
            if (!elements.canvas || state.viewMode !== 'simple') return;
            const stage = elements.canvas.querySelector('.mk-canvas-stage');
            const scale = getStageScale(stage);
            const getPrimaryRow = zone => zone.querySelector(
                ':scope > .mk-meter-rail.root-rail > .mk-asset-row.primary'
            ) || zone.querySelector(':scope > .mk-asset-row.primary');
            const ensurePrimaryRailClearance = (zone, row, junction, branches) => {
                if (!row || !junction) return;
                // Eine einzelne Anlage ohne Unterzaehler wird weiterhin gerade
                // auf der Messachse angeschlossen. Der Versatz gilt nur fuer
                // eine Sammelschiene bzw. einen aufgeklappten Unter-Rail.
                const hasMeterGroup = Boolean(zone.querySelector(
                    ':scope > .mk-meter-rail.root-rail > .mk-meter-rail.meter-group-rail'
                ));
                row.style.setProperty('--mk-primary-rail-clearance-shift-px', '0px');
                if (branches.length < 2 && !hasMeterGroup) return;
                const firstBranch = branches.find(branch => {
                    const rect = branch.getBoundingClientRect?.();
                    return rect && rect.width > 0 && rect.height > 0;
                });
                const junctionRect = junction.getBoundingClientRect?.();
                const firstRect = firstBranch?.getBoundingClientRect?.();
                if (!junctionRect || !firstRect) return;
                const junctionCenter = junctionRect.left + (junctionRect.width / 2);
                const clearancePx = Number(geometry.primaryRailClearancePx)
                    || Number(geometry.parallelAssetClearancePx)
                    || 12.8;
                const requiredLeft = junctionCenter + (clearancePx * scale);
                const correction = (requiredLeft - firstRect.left) / scale;
                if (correction > 0.1) {
                    row.style.setProperty('--mk-primary-rail-clearance-shift-px', `${correction}px`);
                }
            };
            elements.canvas.querySelectorAll('.mk-zone-assets.simple-mode').forEach(zone => {
                const junction = zone.querySelector('.mk-zone-junction');
                const primaryRow = getPrimaryRow(zone);
                const branches = primaryRow
                    ? [...primaryRow.children].filter(child => child.matches('.mk-asset-branch'))
                    : [];
                if (!junction) return;
                ensurePrimaryRailClearance(zone, primaryRow, junction, branches);
                if (!branches.length) {
                    zone.style.setProperty('--mk-zone-bus-width-px', '0px');
                    return;
                }
                // Bei genau einer Anlage existiert noch keine Sammelschiene.
                // Die direkte Leitung übernimmt den Anschluss.
                const hasMeterGroup = Boolean(zone.querySelector(
                    '.mk-meter-rail.meter-group-rail, .mk-asset-row[data-mk-meter-group]'
                ));
                if (branches.length === 1 && !hasMeterGroup) {
                    zone.style.setProperty('--mk-zone-bus-width-px', '0px');
                    return;
                }
                const junctionRect = junction.getBoundingClientRect();
                const lastBranch = branches[branches.length - 1];
                const lastBranchRect = lastBranch?.getBoundingClientRect();
                const originX = junctionRect.left + (junctionRect.width / 2);
                const endX = lastBranchRect.left + (lastBranchRect.width / 2);
                const busWidth = Math.max(0, (endX - originX) / scale);
                zone.style.setProperty('--mk-zone-bus-width-px', `${busWidth}px`);
            });
        }

        function updateMeterGroupOffsets() {
            const elements = getElements();
            if (!elements.canvas) return;
            const stage = elements.canvas.querySelector('.mk-canvas-stage');
            if (!stage) return;
            const scale = getStageScale(stage);
            const meters = getAdditionalMeters();

            const getRailMeterElement = rail => {
                const meter = meters.find(item => item.id === rail.dataset.mkMeterRail);
                if (!meter) return null;
                const railNode = rail.querySelector(`:scope > [data-mk-meter-rail-node="${meter.id}"]`);
                if (railNode) return railNode;
                const target = rail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`);
                return target?.closest('.mk-asset-branch')?.querySelector('.mk-generation-meter') || null;
            };
            const getCenterX = element => {
                const rect = element?.getBoundingClientRect?.();
                return rect ? rect.left + (rect.width / 2) : null;
            };
            const resetCollisionShifts = zone => {
                zone.querySelectorAll('.mk-asset-row > .mk-asset-branch').forEach(branch => {
                    branch.style.setProperty('--mk-branch-collision-shift-px', '0px');
                });
                zone.querySelectorAll('.mk-meter-rail.single-asset-rail > .mk-asset-row').forEach(row => {
                    row.style.setProperty('--mk-single-asset-row-align-px', '0px');
                });
            };
            const alignSingleAssetRails = zone => {
                zone.querySelectorAll('.mk-meter-rail.single-asset-rail').forEach(rail => {
                    const meterNode = rail.querySelector(':scope > .mk-rail-meter-node');
                    const row = rail.querySelector(':scope > .mk-asset-row');
                    const branch = row?.querySelector(':scope > .mk-asset-branch');
                    if (!meterNode || !row || !branch) return;
                    const meterRect = meterNode.getBoundingClientRect?.();
                    const branchRect = branch.getBoundingClientRect?.();
                    if (!meterRect || !branchRect) return;
                    const meterCenter = meterRect.left + (meterRect.width / 2);
                    const branchCenter = branchRect.left + (branchRect.width / 2);
                    const correction = (meterCenter - branchCenter) / scale;
                    row.style.setProperty('--mk-single-asset-row-align-px', `${correction}px`);
                });
            };
            const directRailCells = rail => [...rail.children]
                .filter(child => child.matches('.mk-asset-row'))
                .flatMap(row => [...row.children]
                    .filter(child => child.matches('.mk-asset-branch, .mk-asset-slot-placeholder')));
            const railVisualRight = rail => {
                const candidates = [rail, ...rail.querySelectorAll(
                    '.mk-asset-branch, .mk-asset-slot-placeholder, .mk-rail-meter-node'
                )];
                return candidates.reduce((right, element) => {
                    const rect = element.getBoundingClientRect?.();
                    return rect ? Math.max(right, rect.right) : right;
                }, Number.NEGATIVE_INFINITY);
            };
            const applyRailSiblingCollisionShifts = zone => {
                const rootRail = zone.querySelector(':scope > .mk-meter-rail.root-rail');
                if (!rootRail) return;
                const rails = [rootRail, ...rootRail.querySelectorAll('.mk-meter-rail.meter-group-rail')]
                    .sort((first, second) => Number(first.dataset.mkDepth || 0) - Number(second.dataset.mkDepth || 0));
                const meterById = new Map(meters.map(meter => [meter.id, meter]));
                const alignAssetRailToTarget = (parentRail, child, meter) => {
                    const targetCell = parentRail.querySelector(`:scope > .mk-asset-row [data-mk-reserved-meter-slot="${meter.id}"]`)
                        || parentRail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`)?.closest('.mk-asset-branch');
                    const meterElement = getRailMeterElement(child);
                    const targetRect = targetCell?.getBoundingClientRect?.();
                    const meterRect = meterElement?.getBoundingClientRect?.();
                    if (!targetRect || !meterRect) return;
                    const desiredCenter = targetRect.left + (targetRect.width / 2);
                    const currentCenter = meterRect.left + (meterRect.width / 2);
                    const currentOffset = Number.parseFloat(child.style.getPropertyValue('--mk-meter-rail-x-offset-px')) || 0;
                    const correction = (desiredCenter - currentCenter) / scale;
                    if (Math.abs(correction) > 0.1) {
                        child.style.setProperty('--mk-meter-rail-x-offset-px', `${currentOffset + correction}px`);
                    }
                };
                for (let pass = 0; pass < 3; pass += 1) {
                    rails.forEach(parentRail => {
                        const cells = directRailCells(parentRail);
                        if (!cells.length) return;
                        const children = [...parentRail.children]
                            .filter(child => child.matches('.mk-meter-rail.meter-group-rail'))
                            .map(child => ({ child, meter: meterById.get(child.dataset.mkMeterRail) }))
                            .filter(entry => entry.meter?.meterScope === 'asset');
                        children.forEach(({ child, meter }) => alignAssetRailToTarget(parentRail, child, meter));
                        // Unter-Rails desselben Elternbusses brauchen einen eigenen
                        // horizontalen Korridor. Der gesamte vorherige Rail wird
                        // als belegte Breite behandelt.
                        let previousRailRight = Number.NEGATIVE_INFINITY;
                        children.forEach(({ child }) => {
                            const meterElement = getRailMeterElement(child);
                            const meterRect = meterElement?.getBoundingClientRect?.();
                            if (!meterRect) return;
                            const currentCenter = meterRect.left + (meterRect.width / 2);
                            const requiredCenter = previousRailRight
                                + ((Number(geometry.railSiblingClearancePx) || 0) * scale);
                            if (Number.isFinite(previousRailRight) && currentCenter < requiredCenter) {
                                const currentOffset = Number.parseFloat(child.style.getPropertyValue('--mk-meter-rail-x-offset-px')) || 0;
                                child.style.setProperty('--mk-meter-rail-x-offset-px', `${currentOffset + ((requiredCenter - currentCenter) / scale)}px`);
                            }
                            previousRailRight = Math.max(previousRailRight, railVisualRight(child));
                        });
                        children.forEach(({ child, meter }) => {
                            const targetCell = parentRail.querySelector(`:scope > .mk-asset-row [data-mk-reserved-meter-slot="${meter.id}"]`)
                                || parentRail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`)?.closest('.mk-asset-branch');
                            const targetIndex = targetCell ? cells.indexOf(targetCell) : -1;
                            if (targetIndex < 0) return;
                            const nextBranch = cells.slice(targetIndex + 1).find(cell => cell.matches('.mk-asset-branch'));
                            if (!nextBranch) return;
                            const railRight = railVisualRight(child);
                            const nextRect = nextBranch.getBoundingClientRect();
                            const requiredShift = getRailSiblingCollisionShift(
                                railRight,
                                nextRect.left,
                                (Number(geometry.railSiblingClearancePx) || 0) * scale
                            ) / scale;
                            if (requiredShift <= 0.1) return;
                            const currentShift = Number.parseFloat(nextBranch.style.getPropertyValue('--mk-branch-collision-shift-px')) || 0;
                            if (requiredShift > currentShift + 0.1) {
                                nextBranch.style.setProperty('--mk-branch-collision-shift-px', `${requiredShift}px`);
                            }
                        });
                    });
                }
            };

            elements.canvas.querySelectorAll('.mk-zone-assets.has-meter-groups').forEach(zone => {
                resetCollisionShifts(zone);
                zone.querySelectorAll('.mk-asset-row[data-mk-meter-group]').forEach(row => {
                    row.style.setProperty('--mk-group-row-offset-px', `${Number(geometry.groupStartOffsetPx) || 0}px`);
                });

                const rootAnchor = zone.querySelector(':scope > .mk-zone-junction');
                const rails = [...zone.querySelectorAll(':scope > .mk-meter-rail.root-rail .mk-meter-rail.meter-group-rail')]
                    .sort((first, second) => Number(first.dataset.mkDepth || 0) - Number(second.dataset.mkDepth || 0));
                const directBranches = rail => [...rail.children]
                    .filter(child => child.matches('.mk-asset-row'))
                    .flatMap(row => [...row.children].filter(child => child.matches('.mk-asset-branch')));
                const getGroupAnchorCenter = (rail, parentRail, meterElement, meter) => {
                    if (!parentRail || meter?.meterScope !== 'asset') return null;
                    // Ein aufgeklappter Anlagenzähler ersetzt seine Zielkarte im
                    // Elternrail durch einen unsichtbaren Reservierungsplatz.
                    const targetCell = parentRail.querySelector(`:scope > .mk-asset-row [data-mk-reserved-meter-slot="${meter.id}"]`)
                        || parentRail.querySelector(`:scope > .mk-asset-row [data-mk-asset-id="${meter.targetAssetId}"]`)?.closest('.mk-asset-branch');
                    const targetRect = targetCell?.getBoundingClientRect?.();
                    const meterRect = meterElement?.getBoundingClientRect?.();
                    if (targetRect && meterRect) {
                        return {
                            desiredCenter: targetRect.left + (targetRect.width / 2),
                            currentCenter: meterRect.left + (meterRect.width / 2)
                        };
                    }
                    const targetOrder = getAssetOrder(meter.targetAssetId);
                    if (targetOrder < 0) return null;
                    const branches = directBranches(parentRail)
                        .map(branch => ({
                            branch,
                            order: getAssetOrder(branch.querySelector('[data-mk-asset-id]')?.dataset.mkAssetId)
                        }))
                        .filter(entry => entry.order >= 0);
                    if (!branches.length) return null;
                    const before = branches.filter(entry => entry.order < targetOrder);
                    const after = branches.filter(entry => entry.order > targetOrder);
                    const row = branches[0].branch.parentElement;
                    const gap = Number.parseFloat(getComputedStyle(row).columnGap || getComputedStyle(row).gap || '0') || 0;
                    const firstRect = branches[0].branch.getBoundingClientRect();
                    const defaultStep = firstRect.width + gap;
                    const stepFrom = (first, second) => {
                        if (!first || !second) return defaultStep;
                        const firstRect = first.branch.getBoundingClientRect();
                        const secondRect = second.branch.getBoundingClientRect();
                        return Math.max(1, secondRect.left - firstRect.left);
                    };
                    let desiredCenter = null;
                    if (before.length) {
                        const last = before[before.length - 1];
                        const previous = before[before.length - 2];
                        const rect = last.branch.getBoundingClientRect();
                        desiredCenter = rect.left + (rect.width / 2) + stepFrom(previous, last);
                    } else if (after.length) {
                        const first = after[0];
                        const next = after[1];
                        const rect = first.branch.getBoundingClientRect();
                        desiredCenter = rect.left + (rect.width / 2) - stepFrom(first, next);
                    }
                    if (!Number.isFinite(desiredCenter)) return null;
                    const currentMeterRect = meterElement?.getBoundingClientRect?.();
                    return currentMeterRect
                        ? { desiredCenter, currentCenter: currentMeterRect.left + (currentMeterRect.width / 2) }
                        : null;
                };
                rails.forEach(rail => {
                    const parentRail = rail.parentElement?.closest('.mk-meter-rail');
                    const parentAnchor = parentRail && !parentRail.classList.contains('root-rail')
                        ? getRailMeterElement(parentRail)
                        : rootAnchor;
                    const meterElement = getRailMeterElement(rail);
                    rail.style.setProperty('--mk-meter-rail-x-offset-px', '0px');
                    const meterX = getCenterX(meterElement);
                    const meter = meters.find(item => item.id === rail.dataset.mkMeterRail);
                    const groupAnchor = getGroupAnchorCenter(rail, parentRail, meterElement, meter);
                    const parentX = getCenterX(parentAnchor);
                    const desiredX = groupAnchor?.desiredCenter ?? parentX;
                    const currentX = groupAnchor?.currentCenter ?? meterX;
                    const offset = desiredX !== null && currentX !== null
                        ? (desiredX - currentX) / scale
                        : 0;
                    rail.style.setProperty('--mk-meter-rail-x-offset-px', `${offset}px`);
                    if (!groupAnchor && parentX !== null && meterElement) {
                        const alignedX = getCenterX(meterElement);
                        const correction = alignedX === null ? 0 : (parentX - alignedX) / scale;
                        if (Math.abs(correction) > 0.1) {
                            rail.style.setProperty('--mk-meter-rail-x-offset-px', `${offset + correction}px`);
                        }
                    }
                });
                alignSingleAssetRails(zone);
                applyRailSiblingCollisionShifts(zone);
            });
        }

        function updateParallelBus() {
            const elements = getElements();
            const state = getState();
            if (!elements.canvas || state.mode !== 'parallel') return;
            const stage = elements.canvas.querySelector('.mk-canvas-stage');
            const bus = stage?.querySelector('.mk-parallel-branches');
            const branches = bus
                ? [...bus.children].filter(child => child.matches('.mk-parallel-branch'))
                : [];
            if (!stage || !bus || !branches.length) return;
            const scale = getStageScale(stage);
            const declaredTrackWidth = branch => {
                const value = Number.parseFloat(branch.style.getPropertyValue('--mk-parallel-branch-width'));
                return Number.isFinite(value) ? value : 0;
            };
            const visualRight = branch => [branch, ...branch.querySelectorAll(
                '.mk-asset-branch, .mk-asset-slot-placeholder, .mk-meter-rail, .mk-rail-meter-node'
            )].reduce((right, element) => {
                const rect = element.getBoundingClientRect?.();
                return rect ? Math.max(right, rect.right) : right;
            }, Number.NEGATIVE_INFINITY);
            const fitBranchTracks = () => {
                const widths = branches.map(branch => {
                    const rect = branch.getBoundingClientRect();
                    const right = visualRight(branch);
                    const required = Number.isFinite(rect.left) && Number.isFinite(right)
                        ? ((right - rect.left) / scale) + 16
                        : 0;
                    return Math.max(declaredTrackWidth(branch), required);
                });
                bus.style.setProperty('--mk-parallel-grid-template-columns', widths
                    .map(width => `${Math.ceil(width)}px`).join(' '));
            };
            // Zweiter Durchlauf berücksichtigt die neue Position eines
            // nachfolgenden Zweigs nach einer Track-Erweiterung.
            fitBranchTracks();
            fitBranchTracks();
            const busRect = bus.getBoundingClientRect();
            const firstAnchor = branches[0].querySelector('.mk-meter-node')
                || branches[0].querySelector('.mk-parallel-branch-connector')
                || branches[0];
            const lastAnchor = branches[branches.length - 1].querySelector('.mk-meter-node')
                || branches[branches.length - 1].querySelector('.mk-parallel-branch-connector')
                || branches[branches.length - 1];
            const firstRect = firstAnchor.getBoundingClientRect();
            const lastRect = lastAnchor.getBoundingClientRect();
            const firstCenter = firstRect.left + (firstRect.width / 2);
            const lastCenter = lastRect.left + (lastRect.width / 2);
            bus.style.setProperty('--mk-parallel-bus-left-px', `${Math.max(0, (firstCenter - busRect.left) / scale)}px`);
            bus.style.setProperty('--mk-parallel-bus-width-px', `${Math.max(0, (lastCenter - firstCenter) / scale)}px`);
            const stack = stage.querySelector('.mk-parallel-stack');
            const feed = stage.querySelector('.mk-parallel-feed');
            if (stack && feed) {
                const stackRect = stack.getBoundingClientRect();
                const busCenter = (firstCenter + lastCenter) / 2;
                const stackCenter = stackRect.left + (stackRect.width / 2);
                stack.style.setProperty('--mk-parallel-feed-offset-px', `${(busCenter - stackCenter) / scale}px`);
            }
        }

        return Object.freeze({
            getAssetsPerRow,
            getSimpleCanvasMinimumWidth,
            getParallelBranchWidth,
            getZoneMeterDepth,
            getParallelLayoutMetrics,
            getParallelCanvasMinimumWidth,
            getReservedMeterSlots,
            getRailEntries,
            updateSimpleAssetStrands,
            updateMeterGroupOffsets,
            updateParallelBus
        });
    }

    global.WattspurMesskonzeptLayout = Object.freeze({ createLayoutController });
}(window));
