/*
 * Wattspur Messkonzept – Geometrie-Grundlagen
 *
 * Dieses Modul enthält nur wiederverwendbare Geometrie-Helfer. Es kennt
 * weder den Messkonzept-Zustand noch die Darstellung der Oberfläche. Dadurch
 * können Leitungsrouten und Koordinaten später separat getestet werden,
 * ohne Drag-and-Drop oder die fachlichen Daten anzufassen.
 */
(function exposeMesskonzeptGeometry(global) {
    'use strict';

    const constants = Object.freeze({
        routeBendPx: 14,
        groupVerticalClearancePx: 16,
        groupStepPx: 24,
        groupStartOffsetPx: 0,
        // SK-Z -> ZK: sichtbarer Sicherheitsabstand zwischen der oberen
        // Sammelschiene und dem Zusatzzaehler. Dieser Abstand liegt bewusst
        // außerhalb der Kartenhoehe, damit das Loeschsymbol nicht in die
        // erste Anlage ragt.
        meterRailTopGapPx: 16,
        // MK -> SK am Basiszaehler: sichtbare Verbindung vom Zaehler bis zum
        // ersten Sammelschienen-Knoten. Dieser Abstand ist bewusst kuerzer
        // als der Abstand zu einer Unter-Sammelschiene.
        meterToJunctionLinkPx: 11,
        // MK -> SK: eigener, kuerzerer Abstand vom unteren Zaehleranschluss
        // bis zum Knoten der naechsten Unter-Sammelschiene.
        meterToSubBusGapPx: 14,
        // Horizontaler Ausgleich: Das Rail-Element beginnt an der linken
        // Kante des Zusatzzaehler-Knotens, die Sammelschiene aber auf dessen
        // Mittelachse. So starten obere und untere SK -> AK gleich.
        meterRailNodeCenterOffsetPx: 16,
        railSiblingClearancePx: 18,
        // Rueckwaertskompatibler Name fuer bestehende Aufrufer und Tests.
        meterToBusGapPx: 14,
        // Parallelzweige besitzen einen 16px breiten Zaehlerknoten. Die
        // Anlagenreihe braucht zusaetzlich 0.8rem sichtbaren Abstand, damit
        // die erste Karte nicht links in den senkrechten Hauptstrang ragt.
        parallelMeterAxisOffsetPx: 16,
        parallelAssetClearancePx: 12.8,
        // Gemeinsamer Mindestabstand zwischen dem senkrechten Messstrang und
        // der ersten Karte eines aufgeklappten Anlagen-Rails. Dieser Wert ist
        // bewusst eine eigene Regel: Die Kartenbreite und die Zahl der
        // Unterzaehler duerfen die Messachse nicht wieder ueberdecken.
        primaryRailClearancePx: 12.8,
        busToAssetGapPx: 28,
        // Der HTML-Knoten liegt innerhalb der gepaddeten Zonenflaeche. Der
        // erste Unterzaehler wuerde dadurch sonst um diese sichtbare
        // Knoten-Inset-Laenge weiter entfernt stehen als Z3/Z4 unter einem
        // Zusatzzaehler. Die Korrektur macht SK-Z -> ZK in jeder Ebene gleich.
        // Der Root-Inset gleicht den 0.9rem Zonenabstand aus. Dadurch gilt
        // fuer den ersten und jeden weiteren ZK-Abgang derselbe 16px-Standard.
        rootRailJunctionInsetPx: 14
    });

    function getStageScale(stage) {
        if (!stage?.offsetWidth) return 1;
        const stageRect = stage.getBoundingClientRect();
        const scale = stageRect.width / stage.offsetWidth;
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    function getStagePoint(element, stageRect, scale, horizontal = 'center', vertical = 'center') {
        if (!element?.getBoundingClientRect || !stageRect || !Number.isFinite(scale) || scale <= 0) return null;
        const rect = element.getBoundingClientRect();
        const horizontalOffset = horizontal === 'left' ? 0 : horizontal === 'right' ? rect.width : rect.width / 2;
        const verticalOffset = vertical === 'top' ? 0 : vertical === 'bottom' ? rect.height : rect.height / 2;
        return {
            x: (rect.left - stageRect.left + horizontalOffset) / scale,
            y: (rect.top - stageRect.top + verticalOffset) / scale
        };
    }

    function buildDynamicWire(start, end) {
        if (!Number.isFinite(start?.x) || !Number.isFinite(start?.y) || !Number.isFinite(end?.x) || !Number.isFinite(end?.y)) return '';
        const xDifference = Math.abs(start.x - end.x);
        const yDifference = Math.abs(start.y - end.y);
        if (xDifference < 1 && yDifference < 1) return '';
        if (yDifference < 1) return `<path class="mk-dynamic-wire" d="M ${start.x} ${start.y} H ${end.x}" />`;
        const bendY = end.y >= start.y
            ? Math.min(end.y, start.y + constants.routeBendPx)
            : Math.max(end.y, start.y - constants.routeBendPx);
        const path = xDifference < 1
            ? `M ${start.x} ${start.y} V ${end.y}`
            : `M ${start.x} ${start.y} V ${bendY} H ${end.x} V ${end.y}`;
        return `<path class="mk-dynamic-wire" d="${path}" />`;
    }

    function getAssetBranchAnchor(branch) {
        return branch?.querySelector('.mk-generation-meter')
            || branch?.querySelector('.mk-asset-card')
            || branch;
    }

    function buildDynamicNode(point) {
        if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return '';
        return `<circle class="mk-dynamic-node" cx="${point.x}" cy="${point.y}" r="3" />`;
    }

    function getRailSiblingCollisionShift(railRight, nextLeft, clearance = constants.railSiblingClearancePx) {
        if (!Number.isFinite(railRight) || !Number.isFinite(nextLeft)) return 0;
        const safeClearance = Number.isFinite(clearance) ? Math.max(0, clearance) : 0;
        return Math.max(0, railRight + safeClearance - nextLeft);
    }

    function findIncomingMeterLayout(zone) {
        const previous = zone?.previousElementSibling;
        if (!previous) return null;
        return previous.matches('.mk-meter-layout')
            ? previous
            : previous.querySelector('.mk-meter-layout');
    }

    global.WattspurMesskonzeptGeometry = Object.freeze({
        constants,
        getStageScale,
        getStagePoint,
        buildDynamicWire,
        getAssetBranchAnchor,
        buildDynamicNode,
        getRailSiblingCollisionShift,
        findIncomingMeterLayout
    });
}(window));
