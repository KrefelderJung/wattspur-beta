/*
 * Wattspur Messkonzept – Topologie-Grundlagen
 *
 * Dieses Modul bildet die fachliche Zählerhierarchie ab. Es kennt weder DOM
 * noch Leitungskoordinaten: Eine Anlage kann dadurch hinter einem Zusatz-
 * zähler liegen, der selbst wieder hinter einem anderen Zusatz-Zähler liegt.
 */
(function exposeMesskonzeptTopology(global) {
    'use strict';

    function getMeters(assets) {
        return (assets || []).filter(asset => asset?.type === 'meter');
    }

    function getMeterById(assets, meterId) {
        if (!meterId) return null;
        return getMeters(assets).find(meter => meter.id === meterId) || null;
    }

    function getAssetMeters(assets, assetId) {
        if (!assetId) return [];
        return getMeters(assets).filter(meter => meter.meterScope === 'asset' && meter.targetAssetId === assetId);
    }

    function getMeterForAsset(assets, asset) {
        if (!asset || asset.type === 'meter') return null;
        const assignedMeter = getMeterById(assets, asset.meterId);
        if (assignedMeter) return assignedMeter;
        // Mehrere Zusatzzaehler koennen nacheinander vor derselben Anlage
        // liegen. Ohne explizite meterId ist der zuletzt angelegte davon die
        // unmittelbare Messstufe vor der Anlage.
        return getAssetMeters(assets, asset.id).at(-1) || null;
    }

    function getMeterMembers(assets, meterId) {
        const meter = getMeterById(assets, meterId);
        if (!meter) return [];

        const directMembers = (assets || []).filter(asset => asset?.type !== 'meter' && asset.meterId === meter.id);
        if (directMembers.length) return directMembers;

        // Rueckwaertskompatibilitaet fuer gespeicherte Skizzen, bei denen der
        // erste Baustein nur als targetAssetId am Zähler hinterlegt wurde.
        const target = (assets || []).find(asset => asset?.id === meter.targetAssetId && asset.type !== 'meter');
        return target && (!target.meterId || target.meterId === meter.id) ? [target] : [];
    }

    function isMeterExpanded(assets, meterId) {
        const meter = getMeterById(assets, meterId);
        const memberCount = getMeterMembers(assets, meterId).length;
        const hasChildMeter = getMeters(assets).some(childMeter => childMeter.parentMeterId === meterId);
        // Ein bewusst leer gesetzter Messpunkt bleibt als Knoten sichtbar.
        // So zerstört das Löschen der letzten Anlage nicht die Kaskadenstruktur.
        // Ein Zusatzzaehler mit genau einer Anlage bleibt dagegen inline auf
        // der bestehenden Sammelschiene. Erst ab der zweiten Anlage wird er
        // zu einer eigenen Unter-Sammelschiene. Dadurch bleiben Z5 und Z6,
        // wenn sie jeweils nur eine Anlage messen, auf derselben Hoehe.
        return meter?.meterScope === 'base'
            || memberCount > 1
            || hasChildMeter
            || (Boolean(meter?.keepEmptyRail) && memberCount === 0);
    }

    function getDisplayParentMeterId(assets, asset) {
        if (!asset || asset.type === 'meter') return '';
        const meter = getMeterForAsset(assets, asset);
        if (meter) {
            return isMeterExpanded(assets, meter.id)
                ? meter.id
                : String(meter.parentMeterId || '');
        }
        return '';
    }

    function getContextAssets(assets, zone, parentMeterId = '') {
        return (assets || []).filter(asset => asset?.type !== 'meter'
            && asset.zone === zone
            && getDisplayParentMeterId(assets, asset) === parentMeterId);
    }

    function getChildMeters(assets, zone, parentMeterId = '') {
        const orderFor = meter => Math.max(0, (assets || []).findIndex(asset => asset.id === meter.targetAssetId));
        return getMeters(assets)
            .filter(meter => meter.zone === zone
                && String(meter.parentMeterId || '') === String(parentMeterId || '')
                && isMeterExpanded(assets, meter.id))
            .sort((first, second) => {
                // Ein anlagenbezogener Zähler (z. B. Z4) ist bei zwei oder
                // mehr Anlagen ein lokaler Gruppen-Messpunkt, keine neue
                // Kaskadenstufe. Er wird deshalb vor den Basis-Zählern des
                // gleichen Elternbereichs gerendert. So landet eine zweite
                // Anlage an Z4 nicht optisch hinter Z3, obwohl sie fachlich
                // weiterhin zu Z4 gehört.
                const firstRole = first.meterScope === 'asset' ? 0 : 1;
                const secondRole = second.meterScope === 'asset' ? 0 : 1;
                return (firstRole - secondRole) || (orderFor(first) - orderFor(second));
            });
    }

    function getMeterDescendantIds(assets, meterId) {
        const descendants = new Set();
        const visit = parentMeterId => {
            getMeters(assets)
                .filter(meter => meter.parentMeterId === parentMeterId && !descendants.has(meter.id))
                .forEach(meter => {
                    descendants.add(meter.id);
                    visit(meter.id);
                });
        };
        visit(meterId);
        return descendants;
    }

    function buildZoneMeterTree(assets, zone) {
        const buildRail = (meterId, depth, ancestors) => {
            if (ancestors.has(meterId)) {
                return { meterId, depth, assets: [], children: [] };
            }
            const nextAncestors = new Set(ancestors);
            if (meterId) nextAncestors.add(meterId);
            const meter = getMeterById(assets, meterId);
            return {
                meterId,
                depth,
                meterScope: meter?.meterScope || '',
                assets: getContextAssets(assets, zone, meterId),
                children: getChildMeters(assets, zone, meterId)
                    .map(meter => buildRail(meter.id, depth + 1, nextAncestors))
            };
        };
        return buildRail('', 0, new Set());
    }

    global.WattspurMesskonzeptTopology = Object.freeze({
        getMeters,
        getMeterById,
        getAssetMeters,
        getMeterForAsset,
        getMeterMembers,
        isMeterExpanded,
        getDisplayParentMeterId,
        getContextAssets,
        getChildMeters,
        getMeterDescendantIds,
        buildZoneMeterTree
    });
}(window));
