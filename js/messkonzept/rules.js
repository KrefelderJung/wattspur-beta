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

    const RULESET_VERSION = '2026-08-17-beta.7';
    const STEUVE_THRESHOLD_KW = 4.2;
    // Für Steckersolargeräte gilt für die vereinfachte Behandlung eine
    // Wechselrichtergrenze von 800 VA. Die Einheit ist VA, nicht kVA.
    const STECKER_PV_MAX_INVERTER_VA = 800;
    const RULE_CATALOG = Object.freeze({
        STORAGE_ROLE: Object.freeze({ id: 'MK-ASSET-001', title: 'Speicher – Betriebsrolle und Meldungen', category: 'Anlage' }),
        STEUVE_THRESHOLD: Object.freeze({ id: 'MK-ASSET-002', title: 'Steuerbare Anlage über 4,2 kW', category: 'Anlage' }),
        NSH_REGIME: Object.freeze({ id: 'MK-ASSET-003', title: 'Nachtspeicherheizung – zeitliche Einordnung', category: 'Anlage' }),
        STEUVE_LEGACY_REGIME: Object.freeze({ id: 'MK-ASSET-004', title: 'SteuVE vor 2024 – Regime prüfen', category: 'Anlage' }),
        SINGLE_MIXED_LOAD: Object.freeze({ id: 'MK-SINGLE-001', title: 'Steuerbare Anlage und weitere Verbraucher', category: 'Messung' }),
        STECKER_PV_INVERTER_LIMIT: Object.freeze({ id: 'MK-ASSET-005', title: 'Stecker-PV – Wechselrichtergrenze', category: 'Anlage' })
    });

    const DEFAULT_STORAGE_INFO_TEXT = 'Achtung: Die Registrierung des Stromspeichers im Marktstammdatenregister ist zu prüfen. Beim netzbezogenen Laden ist zusätzlich zu prüfen, ob § 14a EnWG greift; Einspeisung und Bezug sind getrennt zu betrachten. Messkonzept mit dem Verteilnetzbetreiber abstimmen.';

    function parsePowerNumber(value) {
        const match = String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
        if (!match) return null;
        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? parsed : null;
    }

    /**
     * Liest eine Wechselrichterleistung für Stecker-PV in VA ein.
     * Eingaben mit kVA werden für ältere oder importierte Entwürfe sauber
     * umgerechnet. Eine Eingabe ohne Einheit folgt dem sichtbaren Feld und
     * wird bei Stecker-PV als VA interpretiert.
     */
    function parseInverterPowerVa(value) {
        const text = String(value || '').trim().replace(',', '.');
        const number = parsePowerNumber(text);
        if (number === null) return null;
        if (/mva\b/i.test(text)) return number * 1000000;
        if (/kva\b/i.test(text)) return number * 1000;
        return number;
    }

    function getSteckerPvInverterPowerVa(asset) {
        if (!asset || asset.type !== 'generation' || asset.energyCarrier !== 'Balkonkraftwerk') return null;
        return parseInverterPowerVa(asset.inverterPower);
    }

    function getSteckerPvMeasurementGroups(state) {
        const assets = Array.isArray(state?.assets) ? state.assets : [];
        const groups = new Map();
        assets.filter(asset => asset?.type === 'generation' && asset.energyCarrier === 'Balkonkraftwerk').forEach(asset => {
            const meter = getAssignedMeter(assets, asset);
            const key = meter ? `meter:${meter.id}` : `zone:${asset.zone || 'unbekannt'}`;
            if (!groups.has(key)) groups.set(key, {
                key,
                meterId: meter?.id || '',
                zone: asset.zone || '',
                assets: [],
                effectivePowerVa: [],
                missingPowerAssetIds: [],
                totalPowerVa: 0
            });
            const group = groups.get(key);
            const power = getSteckerPvInverterPowerVa(asset);
            group.assets.push(asset);
            if (power === null) group.missingPowerAssetIds.push(asset.id);
            else {
                group.totalPowerVa += power;
                group.effectivePowerVa.push({ id: asset.id, value: power });
            }
        });
        return [...groups.values()];
    }

    /**
     * Das Leistungsfeld einer Wärmepumpe wird als elektrische
     * Gesamtleistung einschließlich Zusatz- oder Notheizvorrichtung erfasst.
     * Dadurch prüft die Regel genau denselben Wert, den der Nutzer im Dialog
     * dokumentiert. Bei anderen SteuVE bleibt die Anlagenleistung maßgeblich.
     */
    function getSteuveEffectivePower(asset, parsePower = parsePowerNumber) {
        if (!asset || asset.type !== 'steuve') return null;
        return parsePower(asset.power);
    }

    function getZoneAssets(state, zone) {
        return (state?.assets || []).filter(asset => asset?.zone === zone);
    }

    function getAssignedMeter(assets, asset) {
        if (!asset || asset.type === 'meter') return null;
        const directMeter = (assets || []).find(candidate => candidate?.type === 'meter'
            && String(candidate.id) === String(asset.meterId || ''));
        if (directMeter) return directMeter;
        // Alte gespeicherte Konzepte hatten nicht immer meterId am Objekt.
        // Der Zielzähler bleibt dann die belastbare Rückfallinformation.
        return (assets || []).filter(candidate => candidate?.type === 'meter'
            && candidate.targetAssetId === asset.id).at(-1) || null;
    }

    function getMeasurementGroupKey(asset, meter) {
        return meter ? `meter:${meter.id}` : `zone:${asset?.zone || 'unbekannt'}`;
    }

    function getMeasurementGroupLabel(asset, meter) {
        if (meter) {
            return meter.name && meter.name !== 'Zähler vor Anlage'
                ? meter.name
                : 'dem zugeordneten Zähler';
        }
        return 'dem Basiszähler dieses Messbereichs';
    }

    /**
     * Liefert die fachliche Zuordnung der SteuVE zu ihrem Messpunkt.
     * Ein Zusatz-Zähler steht direkt in meterId. Anlagen ohne Zusatz-Zähler
     * werden über ihre Zone dem Basiszähler des Messbereichs zugeordnet.
     * Die Funktion bleibt DOM-frei und ist deshalb auch für Prüfstatus,
     * Export und Tests dieselbe Quelle der Wahrheit.
     */
    function getSteuveMeasurementGroups(state, parsePower = parsePowerNumber) {
        const assets = Array.isArray(state?.assets) ? state.assets : [];
        const groups = new Map();
        assets.filter(asset => asset?.type === 'steuve').forEach(asset => {
            const meter = getAssignedMeter(assets, asset);
            const key = getMeasurementGroupKey(asset, meter);
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    meterId: meter?.id || '',
                    meter: meter || null,
                    meterLabel: getMeasurementGroupLabel(asset, meter),
                    zone: asset.zone || '',
                    assets: [],
                    effectivePowerKw: [],
                    missingPowerAssetIds: [],
                    totalPowerKw: 0
                });
            }
            const group = groups.get(key);
            const power = getSteuveEffectivePower(asset, parsePower);
            group.assets.push(asset);
            if (power === null) {
                group.missingPowerAssetIds.push(asset.id);
            } else {
                group.totalPowerKw += power;
                group.effectivePowerKw.push({ id: asset.id, value: power });
            }
        });
        return [...groups.values()];
    }

    function formatPower(value) {
        return Number(value).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    }

    function formatInverterPowerVa(value) {
        return `${Number(value).toLocaleString('de-DE', { maximumFractionDigits: 1 })} VA`;
    }

    function isPre2024Commissioning(asset) {
        const date = String(asset?.commissioningDate || '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < '2024-01-01';
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

    function getStorageOperationHint(storage) {
        const feedIn = ['yes', 'no'].includes(storage?.storageGridFeedIn) ? storage.storageGridFeedIn : 'unknown';
        const gridImport = ['yes', 'no'].includes(storage?.storageGridImport) ? storage.storageGridImport : 'unknown';
        if (feedIn === 'no' && gridImport === 'no') {
            return 'Kein Netzbezug zum Laden und keine Netzeinspeisung ausgewählt. Das ist als reiner PV-Überschussbetrieb nur dann belastbar, wenn ausschließlich erneuerbarer Strom geladen wird.';
        }
        if (feedIn === 'yes' && gridImport === 'no') {
            return 'Netzeinspeisung aus dem Speicher ausgewählt. Der Vermarktungsweg ist zu klären. Je nach Anlage und Vergütungsweg kann Direktvermarktung erforderlich sein.';
        }
        if (feedIn === 'no' && gridImport === 'yes') {
            return 'Netzbezug zum Laden ausgewählt. § 14a EnWG, Messung und die Auswirkungen auf eine mögliche EEG-Behandlung sind fachlich zu prüfen.';
        }
        if (feedIn === 'yes' && gridImport === 'yes') {
            return 'Mischbetrieb mit Netzbezug und Netzeinspeisung ausgewählt. EEG-Förderung und Umlagebehandlung können von Betriebsweise und Messung abhängen.';
        }
        return 'Die Betriebsweise des Speichers ist noch nicht festgelegt.';
    }

    function evaluate(state, options = {}) {
        const assets = Array.isArray(state?.assets) ? state.assets : [];
        const parsePower = options.parsePower || parsePowerNumber;
        const storageInfoText = options.storageInfoText || DEFAULT_STORAGE_INFO_TEXT;
        const consumers = assets.filter(asset => asset.type === 'consumer');
        const steuves = assets.filter(asset => asset.type === 'steuve');
        const measurementGroups = getSteuveMeasurementGroups(state, parsePower);
        const overThresholdGroups = measurementGroups.filter(group => group.totalPowerKw > STEUVE_THRESHOLD_KW);
        const pre2024Steuves = steuves.filter(isPre2024Commissioning);
        const storages = assets.filter(asset => asset.type === 'storage');
        const nshAssets = assets.filter(asset => asset.type === 'nsh');
        const steckerPvGroups = getSteckerPvMeasurementGroups(state);
        const checks = [];

        const steckerPvLimitGroups = steckerPvGroups.filter(group => group.totalPowerVa > STECKER_PV_MAX_INVERTER_VA);
        const steckerPvMissingGroups = steckerPvGroups.filter(group => group.missingPowerAssetIds.length);
        if (steckerPvLimitGroups.length) {
            checks.push(makeCheck('STECKER_PV_INVERTER_LIMIT', 'error', steckerPvLimitGroups.map(group => {
                const names = group.assets.map(asset => asset.name || 'Stecker-PV').join(', ');
                return `${names}: Die Wechselrichterleistung beträgt zusammen ${formatInverterPowerVa(group.totalPowerVa)} und überschreitet damit 800 VA. Für die vereinfachte Stecker-PV-Behandlung müssen die Wechselrichterleistungen am selben Netzanschlusspunkt zusammen geprüft werden.`;
            }).join(' '), {
                maxInverterPowerVa: STECKER_PV_MAX_INVERTER_VA,
                measurementGroups: steckerPvLimitGroups.map(group => ({
                    key: group.key,
                    meterId: group.meterId,
                    zone: group.zone,
                    assetIds: group.assets.map(asset => asset.id),
                    totalPowerVa: group.totalPowerVa,
                    missingPowerAssetIds: [...group.missingPowerAssetIds]
                }))
            }));
        }
        if (steckerPvMissingGroups.length) {
            checks.push(makeCheck('STECKER_PV_INVERTER_LIMIT', 'warning', 'Bei einer oder mehreren Stecker-PV-Anlagen fehlt die Wechselrichterleistung. Die 800-VA-Grenze kann erst nach der Eingabe geprüft werden.', {
                maxInverterPowerVa: STECKER_PV_MAX_INVERTER_VA,
                missingPowerAssetIds: steckerPvMissingGroups.flatMap(group => group.missingPowerAssetIds)
            }));
        }

        if (storages.length) {
            const storageHints = storages.map(getStorageOperationHint).filter(Boolean);
            checks.push(makeCheck('STORAGE_ROLE', 'warning', `Speicher bleibt ein eigenes Objekt. Betriebsrolle, MaStR, mögliche §14a-Relevanz und Messkonzept fachlich prüfen. ${storageInfoText} ${storageHints.join(' ')}`));
        }

        if (overThresholdGroups.length) {
            const groupTexts = overThresholdGroups.map(group => {
                const heatPumpIncluded = group.assets.some(asset => asset.steuveType === 'Wärmepumpe');
                const powerHint = heatPumpIncluded
                    ? 'Bei Wärmepumpen zählt die Gesamtleistung einschließlich Heizstab.'
                    : '';
                const missingPowerHint = group.missingPowerAssetIds.length
                    ? `Für ${group.missingPowerAssetIds.length === 1 ? 'eine zugeordnete Anlage fehlt' : `${group.missingPowerAssetIds.length} zugeordnete Anlagen fehlen`} noch die Leistungsangabe. Die Summe ist deshalb nur ein Mindestwert.`
                    : '';
                const powerQualifier = group.missingPowerAssetIds.length ? 'mindestens ' : '';
                const assetCountText = group.assets.length > 1
                    ? `${group.assets.length} steuerbare Anlagen werden hinter ${group.meterLabel} gemeinsam gemessen.`
                    : 'Eine steuerbare Anlage wird an diesem Messpunkt gemessen.';
                return `${assetCountText} Die erfasste gemeinsame Leistung beträgt ${powerQualifier}${formatPower(group.totalPowerKw)} kW und liegt damit über 4,2 kW. ${powerHint} ${missingPowerHint} Einordnung nach § 14a EnWG, Anmeldung und passendes Modul beim Netzbetreiber prüfen.`;
            });
            checks.push(makeCheck('STEUVE_THRESHOLD', 'warning', groupTexts.join(' ').replace(/\s+/g, ' ').trim(), {
                effectivePowerKw: overThresholdGroups.flatMap(group => group.effectivePowerKw),
                measurementGroups: overThresholdGroups.map(group => ({
                    key: group.key,
                    meterId: group.meterId,
                    meterLabel: group.meterLabel,
                    zone: group.zone,
                    assetIds: group.assets.map(asset => asset.id),
                    totalPowerKw: group.totalPowerKw,
                    missingPowerAssetIds: [...group.missingPowerAssetIds]
                }))
            }));
        }

        if (pre2024Steuves.length) {
            const countText = pre2024Steuves.length === 1 ? 'Eine steuerbare Anlage' : `${pre2024Steuves.length} steuerbare Anlagen`;
            checks.push(makeCheck('STEUVE_LEGACY_REGIME', 'warning', `${countText} wurde mit einer Inbetriebnahme vor dem 01.01.2024 erfasst. Sie wird hier nicht automatisch als SteuVE nach § 14a EnWG eingeordnet. Ein Wechsel in das neue Regime kann möglich sein, wenn ein konzessionierter Elektrofachbetrieb die technische Vorbereitung auf Steuerbarkeit ausführt und der zuständige Netzbetreiber die Voraussetzungen bestätigt.`, {
                assetIds: pre2024Steuves.map(asset => asset.id),
                commissioningCutoff: '2024-01-01'
            }));
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
        }

        return checks;
    }

    global.WattspurMesskonzeptRules = Object.freeze({
        rulesetVersion: RULESET_VERSION,
        parsePowerNumber,
        parseInverterPowerVa,
        getSteckerPvInverterPowerVa,
        getSteckerPvMeasurementGroups,
        getSteuveEffectivePower,
        getSteuveMeasurementGroups,
        isPre2024Commissioning,
        getZoneAssets,
        getRuleCatalog: () => RULE_CATALOG,
        evaluate
    });
}(window));
