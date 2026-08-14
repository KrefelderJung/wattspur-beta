/*
 * Wattspur Messkonzept – fachliche Prüfregeln
 *
 * Dieses Modul ist bewusst DOM-frei. Es bewertet nur den Messkonzept-Zustand
 * und liefert strukturierte Hinweise zurück. Die Darstellung im Browser und
 * der PDF-Export bleiben im UI-Modul.
 *
 * Die Regel-IDs sind die gemeinsame Sprache zwischen UI, Dokumentation und
 * Tests. Sie beschreiben Orientierungshinweise, keine technische Freigabe.
 */
(function exposeMesskonzeptRules(global) {
    'use strict';

    const RULESET_VERSION = '2026-08-14-beta.1';
    const RULE_CATALOG = Object.freeze({
        EMPTY_STATE: Object.freeze({ id: 'MK-DATA-001', title: 'Leerer Messbereich', category: 'Datenqualität' }),
        ASSET_COUNT: Object.freeze({ id: 'MK-DATA-002', title: 'Bausteine im Schema', category: 'Datenqualität' }),
        EXTRA_METER: Object.freeze({ id: 'MK-TOPO-001', title: 'Zusätzliche Zähler', category: 'Topologie' }),
        STORAGE_ROLE: Object.freeze({ id: 'MK-ASSET-001', title: 'Speicher – Betriebsrolle und Meldungen', category: 'Anlage' }),
        STEUVE_THRESHOLD: Object.freeze({ id: 'MK-ASSET-002', title: 'Steuerbare Anlage über 4,2 kW', category: 'Anlage' }),
        NSH_REGIME: Object.freeze({ id: 'MK-ASSET-003', title: 'Nachtspeicherheizung – zeitliche Einordnung', category: 'Anlage' }),
        SINGLE_MIXED_LOAD: Object.freeze({ id: 'MK-SINGLE-001', title: 'Steuerbare Anlage und weitere Verbraucher', category: 'Messung' }),
        GENERATION_OWN_METER: Object.freeze({ id: 'MK-SINGLE-002', title: 'Eigene Erzeugungsmessung', category: 'Messung' }),
        GENERATION_SHARED: Object.freeze({ id: 'MK-SINGLE-003', title: 'Mehrere Erzeugungsanlagen ohne Erzeugungszähler', category: 'Messung' }),
        PARALLEL_READY: Object.freeze({ id: 'MK-PARALLEL-001', title: 'Parallele Messzweige', category: 'Messung' }),
        PARALLEL_EMPTY: Object.freeze({ id: 'MK-PARALLEL-002', title: 'Leerer Parallelzweig', category: 'Messung' })
    });

    const DEFAULT_STORAGE_INFO_TEXT = 'Achtung: Die Registrierung des Stromspeichers im Marktstammdatenregister ist zu prüfen. Beim netzbezogenen Laden ist zusätzlich zu prüfen, ob § 14a EnWG greift; Einspeisung und Bezug sind getrennt zu betrachten. Messkonzept mit dem Verteilnetzbetreiber abstimmen.';

    function parsePowerNumber(value) {
        const match = String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
        if (!match) return null;
        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getZoneAssets(state, zone) {
        return (state?.assets || []).filter(asset => asset?.zone === zone);
    }

    function makeCheck(ruleKey, level, text, details = {}) {
        const rule = RULE_CATALOG[ruleKey] || { id: ruleKey, title: ruleKey, category: 'Unbekannt' };
        return {
            ruleId: rule.id,
            ruleKey,
            title: rule.title,
            category: rule.category,
            level,
            text,
            ...details
        };
    }

    function evaluate(state, options = {}) {
        const assets = Array.isArray(state?.assets) ? state.assets : [];
        const getAssets = options.getZoneAssets || ((zone) => getZoneAssets(state, zone));
        const parsePower = options.parsePower || parsePowerNumber;
        const storageInfoText = options.storageInfoText || DEFAULT_STORAGE_INFO_TEXT;
        const generations = assets.filter(asset => asset.type === 'generation');
        const consumers = assets.filter(asset => asset.type === 'consumer');
        const steuves = assets.filter(asset => asset.type === 'steuve');
        const overThresholdSteuves = steuves.filter(asset => parsePower(asset.power) > 4.2);
        const storages = assets.filter(asset => asset.type === 'storage');
        const nshAssets = assets.filter(asset => asset.type === 'nsh');
        const extraMeters = assets.filter(asset => asset.type === 'meter');
        const checks = [];

        if (!assets.length) {
            checks.push(makeCheck('EMPTY_STATE', 'neutral', 'Noch keine Bausteine angelegt.'));
        } else {
            checks.push(makeCheck('ASSET_COUNT', 'ok', `${assets.length} Baustein${assets.length === 1 ? '' : 'e'} im Schema.`));
        }

        if (extraMeters.length) {
            checks.push(makeCheck('EXTRA_METER', 'warning', 'Zusätzliche Zähler sind angelegt. Prüfe die Zuordnung zu Anlagen und Unterzählern; die Skizze ersetzt keine fachliche Abstimmung.'));
        }

        if (storages.length) {
            checks.push(makeCheck('STORAGE_ROLE', 'warning', `Speicher bleibt ein eigenes Objekt. Betriebsrolle (Erzeugung und Bezug) fachlich festlegen. ${storageInfoText}`));
        }

        if (overThresholdSteuves.length) {
            checks.push(makeCheck('STEUVE_THRESHOLD', 'warning', `${overThresholdSteuves.length} steuerbare ${overThresholdSteuves.length === 1 ? 'Anlage liegt' : 'Anlagen liegen'} über 4,2 kW. Einordnung nach § 14a EnWG, Anmeldung und passendes Modul beim Netzbetreiber prüfen.`));
        }

        if (nshAssets.length) {
            const hasPre2024Asset = nshAssets.some(asset => {
                const year = Number(String(asset.commissioningDate || '').slice(0, 4));
                return !Number.isFinite(year) || year < 2024;
            });
            const regimeHint = hasPre2024Asset
                ? 'Bei Bestandsanlagen vor 2024 können historische Tarif- und Messbedingungen betroffen sein.'
                : 'Die Einordnung ab 2024 ist nicht automatisch mit einer aktuellen SteuVE gleichzusetzen.';
            checks.push(makeCheck('NSH_REGIME', 'warning', `Nachtspeicherheizung erkannt. ${regimeHint} Gemeinsame Messung, Tarif und Bestand bitte mit Netzbetreiber und Messstellenbetreiber abstimmen.`));
        }

        if (state?.mode === 'single') {
            if (steuves.length && consumers.length) {
                checks.push(makeCheck('SINGLE_MIXED_LOAD', 'warning', 'Steuerbare Anlagen und weitere Verbraucher liegen im selben Messbereich. Tarif- und Messabgrenzung fachlich prüfen.'));
            }
            if (generations.some(asset => asset.generationMeter)) {
                checks.push(makeCheck('GENERATION_OWN_METER', 'ok', 'Mindestens eine EA ist mit eigener Erzeugungsmessung markiert.'));
            }
            if (generations.length > 1 && generations.every(asset => !asset.generationMeter)) {
                checks.push(makeCheck('GENERATION_SHARED', 'warning', 'Mehrere EA teilen sich den gemeinsamen Messbereich ohne Erzeugungszähler. Energieträger, Vergütung und Zusammenfassung prüfen.'));
            }
        }

        if (state?.mode === 'parallel') {
            const emptyBranches = [];
            for (let index = 0; index < (state.cascadeLevels || 0); index += 1) {
                if (!getAssets(`parallel-${index}`).length) emptyBranches.push(`Z${index + 1}`);
            }
            checks.push(makeCheck('PARALLEL_READY', 'ok', `Parallelmessung mit ${state.cascadeLevels} direkt verzweigten Zählern vorbereitet.`));
            if (emptyBranches.length) {
                checks.push(makeCheck('PARALLEL_EMPTY', 'warning', `${emptyBranches.join(', ')} hat noch keinen zugeordneten Messbereich.`));
            }
        }

        return checks;
    }

    global.WattspurMesskonzeptRules = Object.freeze({
        rulesetVersion: RULESET_VERSION,
        parsePowerNumber,
        getZoneAssets,
        getRuleCatalog: () => RULE_CATALOG,
        evaluate
    });
}(window));
