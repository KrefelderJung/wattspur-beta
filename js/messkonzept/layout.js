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
        const getRailAxisClampShift = options.getRailAxisClampShift || ((parentAxisCenter, childAxisCenter, clearance = 0) => {
            if (!Number.isFinite(parentAxisCenter) || !Number.isFinite(childAxisCenter)) return 0;
            return Math.max(0, (parentAxisCenter + Math.max(0, Number(clearance) || 0)) - childAxisCenter);
        });
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
        if (!calculations) {
            throw new Error('WattspurMesskonzeptLayout: layout-calculations.js muss vor layout.js geladen werden.');
        }

        const getAssetOrder = assetId => {
            const assets = getState()?.assets || [];
            return assets.findIndex(asset => asset.id === assetId);
        };

        function getAssetsPerRow(assetCount = assetsPerRowDefault) {
            return calculations.getAssetsPerRow(assetCount);
        }

        function getSimpleCanvasMinimumWidth(assetCount) {
            return calculations.getSimpleCanvasMinimumWidth(assetCount);
        }

        function getWidestRailCellCount(zone) {
            return calculations.getWidestRailCellCount(zone);
        }

        function getParallelBranchWidth(assetCount) {
            return calculations.getParallelBranchWidth(assetCount);
        }

        function getZoneMeterDepth(zone) {
            return calculations.getZoneMeterDepth(zone);
        }

        function getParallelLayoutMetrics(meterCount) {
            return calculations.getParallelLayoutMetrics(meterCount);
        }

        function getParallelCanvasMinimumWidth(meterCount) {
            return getParallelLayoutMetrics(meterCount).minimumCanvasWidth;
        }

        function getReservedMeterSlots(rail) {
            return calculations.getReservedMeterSlots(rail);
        }

        function getRailEntries(rail) {
            return calculations.getRailEntries(rail);
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
            const directRailBranches = rail => [...rail.children]
                .filter(child => child.matches('.mk-asset-row'))
                .flatMap(row => [...row.children].filter(child => child.matches('.mk-asset-branch')));
            // Ein reservierter Platz ist fachlich eine echte Position auf der
            // Sammelschiene: Dort hängt ein eigener Zähler. Er darf bei der
            // Achsenberechnung nicht übersprungen werden, nur weil seine
            // Karte unsichtbar ist.
            const directRailCells = rail => [...rail.children]
                .filter(child => child.matches('.mk-asset-row'))
                .flatMap(row => [...row.children].filter(child => child.matches('.mk-asset-branch, .mk-asset-slot-placeholder')));
            const getRailStartElement = (rail, rootJunction) => rail.classList.contains('root-rail')
                ? rootJunction
                : rail.querySelector(':scope > .mk-rail-meter-node');
            const alignRailFirstAsset = (rail, row, startElement, cells) => {
                if (!row || !startElement || !cells.length || rail.classList.contains('single-asset-rail')) return;
                row.style.setProperty('--mk-rail-asset-shift-px', '0px');
                const startRect = startElement.getBoundingClientRect?.();
                if (!startRect || (startRect.width <= 0 && startRect.height <= 0)) return;
                const firstCell = cells.find(cell => {
                    const rect = cell.getBoundingClientRect?.();
                    return rect && rect.width > 0 && rect.height > 0;
                });
                const firstRect = firstCell?.getBoundingClientRect?.();
                if (!startRect || !firstRect) return;
                const clearancePx = Number(geometry.primaryRailClearancePx)
                    || Number(geometry.parallelAssetClearancePx)
                    || 12.8;
                const startCenter = startRect.left + (startRect.width / 2);
                // Root- und Unter-Sammelschienen werden an derselben sichtbaren
                // Regel ausgerichtet: Messachse + SK->AK-Mindestabstand.
                // Layout soll nie nach links ausweichen. Ist eine Position
                // bereits weiter rechts, bleibt sie erhalten; zusätzliche
                // Breite wird nur durch eine positive Korrektur erzeugt.
                let shift = Math.max(0, (startCenter + (clearancePx * scale) - firstRect.left) / scale);
                row.style.setProperty('--mk-rail-asset-shift-px', `${shift}px`);

                // Das X des Zaehlers ist Teil der sichtbaren Geometrie. Es wird
                // aber nur dann beruecksichtigt, wenn es die erste Karte in
                // beiden Achsen tatsaechlich ueberlappt.
                const removeButton = rail.querySelector(':scope > .mk-rail-meter-node > .mk-remove-meter');
                const removeRect = removeButton?.getBoundingClientRect?.();
                const shiftedRect = firstCell.getBoundingClientRect?.();
                const removeClearancePx = Number(geometry.meterRemoveButtonClearancePx) || 8;
                const overlaps = removeRect && shiftedRect
                    && removeRect.right > shiftedRect.left
                    && shiftedRect.right > removeRect.left
                    && removeRect.bottom > shiftedRect.top
                    && shiftedRect.bottom > removeRect.top;
                if (overlaps) {
                    const extraShift = (removeRect.right + (removeClearancePx * scale) - shiftedRect.left) / scale;
                    if (extraShift > 0.1) shift += extraShift;
                }
                row.style.setProperty('--mk-rail-asset-shift-px', `${shift}px`);
            };
            elements.canvas.querySelectorAll('.mk-zone-assets.simple-mode').forEach(zone => {
                const junction = zone.querySelector('.mk-zone-junction');
                const rootRail = zone.querySelector(':scope > .mk-meter-rail.root-rail');
                const primaryRow = getPrimaryRow(zone);
                const branches = primaryRow
                    ? [...primaryRow.children].filter(child => child.matches('.mk-asset-branch'))
                    : [];
                const primaryCells = primaryRow
                    ? [...primaryRow.children].filter(child => child.matches('.mk-asset-branch, .mk-asset-slot-placeholder'))
                    : [];
                if (!junction) return;
                // Ein einzelner direkter Anlagenast besitzt bewusst keinen
                // sichtbaren Sammelschienenknoten. In diesem Zustand ist der
                // HTML-Knoten `display:none` und liefert deshalb eine
                // 0x0-Position am Dokumentursprung. Eine Ausrichtung der
                // Anlagenreihe an diesem unsichtbaren Element erzeugt einen
                // negativen Versatz (die Reihe springt nach links aus dem
                // Bild). Der elektrische Anschluss wird für diesen Fall
                // direkt im Verbindungsmodul vom Zähler zur Anlage geführt;
                // die Reihe darf daher nicht an einem ausgeblendeten SK
                // ausgerichtet werden.
                // Unter-Sammelschienen liegen innerhalb des Root-Rails. Eine
                // reine `:scope >`-Suche auf der Zone übersieht sie und lässt
                // den Root-Rail fälschlich wie einen Einzelast behandeln.
                // Das ist genau der Fall, in dem beim ersten Zusatz-Zähler
                // der sichtbare Strang nach links ausweichen konnte.
                const hasMeterGroup = Boolean(
                    rootRail?.querySelector('.mk-meter-rail.meter-group-rail, .mk-asset-row[data-mk-meter-group]')
                    || zone.querySelector(':scope > .mk-asset-row[data-mk-meter-group]')
                );
                const isSingleDirectAsset = branches.length === 1 && !hasMeterGroup;
                if (rootRail) {
                    if (isSingleDirectAsset) {
                        primaryRow?.style.setProperty('--mk-rail-asset-shift-px', '0px');
                    } else {
                        alignRailFirstAsset(rootRail, primaryRow, junction, primaryCells);
                    }
                    rootRail.querySelectorAll(':scope .mk-meter-rail.meter-group-rail').forEach(rail => {
                        const row = [...rail.children].find(child => child.matches('.mk-asset-row'));
                        alignRailFirstAsset(rail, row, getRailStartElement(rail, junction), directRailCells(rail));
                    });
                }
                if (!branches.length) {
                    zone.style.setProperty('--mk-zone-bus-width-px', '0px');
                    return;
                }
                // Bei genau einer Anlage existiert noch keine Sammelschiene.
                // Die direkte Leitung übernimmt den Anschluss.
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
                // display:none bzw. ein noch nicht layoutierter Anker liefert
                // in Browsern eine 0x0-Rect am Dokumentursprung. Dieser Punkt
                // ist kein gültiger Messachsen-Anker und darf niemals einen
                // negativen Rail-Versatz auslösen.
                if (!rect || (rect.width <= 0 && rect.height <= 0)) return null;
                return rect.left + (rect.width / 2);
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
                    '.mk-asset-branch, .mk-asset-slot-placeholder, .mk-rail-meter-node, .mk-remove-meter'
                )];
                return candidates.reduce((right, element) => {
                    const rect = element.getBoundingClientRect?.();
                    return rect ? Math.max(right, rect.right) : right;
                }, Number.NEGATIVE_INFINITY);
            };
            const applyRailSiblingCollisionShifts = zone => {
                const rootRail = zone.querySelector(':scope > .mk-meter-rail.root-rail');
                if (!rootRail) return;
                // Der Root-Anker gehört zur jeweiligen Messzone. Er muss hier
                // lokal gelesen werden, weil diese Funktion auch für jede
                // einzelne Zone separat läuft. Ohne diese lokale Bindung
                // führte ein Unter-Rail (z. B. nach der zweiten Anlage an Z5)
                // zu einem ReferenceError und brach die komplette
                // Geometrieaktualisierung ab.
                const rootAnchor = zone.querySelector(':scope > .mk-zone-junction');
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

                        // Sicherheitsregel für den äußersten/ersten Unter-Rail:
                        // Eine Erweiterung darf nur nach rechts wachsen. Falls
                        // die Rückrechnung über einen Platzhalter oder einen
                        // Nachbar-Rail einen negativen Versatz erzeugt hat,
                        // wird der gesamte Unter-Rail wieder mindestens auf die
                        // Achse seines direkten Elternzählers zurückgeführt.
                        children.forEach(({ child }) => {
                            const parentElement = parentRail.classList.contains('root-rail')
                                ? rootAnchor
                                : getRailMeterElement(parentRail);
                            const childElement = getRailMeterElement(child);
                            const parentCenter = getCenterX(parentElement);
                            const childCenter = getCenterX(childElement);
                            if (parentCenter === null || childCenter === null) return;
                            const correctionPx = getRailAxisClampShift(
                                parentCenter,
                                childCenter,
                                Number(geometry.railAxisClearancePx) || 0
                            );
                            if (correctionPx <= 0.1) return;
                            const currentOffset = Number.parseFloat(child.style.getPropertyValue('--mk-meter-rail-x-offset-px')) || 0;
                            child.style.setProperty('--mk-meter-rail-x-offset-px', `${currentOffset + (correctionPx / scale)}px`);
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
                    const storedAnchorOrder = Number(meter?.railAnchorOrder);
                    const targetOrder = Number.isFinite(storedAnchorOrder) && storedAnchorOrder >= 0
                        ? storedAnchorOrder
                        : getAssetOrder(meter.targetAssetId);
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
                '.mk-asset-branch, .mk-asset-slot-placeholder, .mk-meter-rail, .mk-rail-meter-node, .mk-remove-meter'
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
