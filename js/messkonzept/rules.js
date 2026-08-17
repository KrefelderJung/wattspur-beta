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

    const RULESET_VERSION = '2026-08-17-beta.4';
    const RULE_CATALOG = Object.freeze({
        STORAGE_ROLE: Object.freeze({ id: 'MK-ASSET-001', title: 'Speicher – Betriebsrolle und Meldungen', category: 'Anlage' }),
        STEUVE_THRESHOLD: Object.freeze({ id: 'MK-ASSET-002', title: 'Steuerbare Anlage über 4,2 kW', category: 'Anlage' }),
        NSH_REGIME: Object.freeze({ id: 'MK-ASSET-003', title: 'Nachtspeicherheizung – zeitliche Einordnung', category: 'Anlage' }),
        SINGLE_MIXED_LOAD: Object.freeze({ id: 'MK-SINGLE-001', title: 'Steuerbare Anlage und weitere Verbraucher', category: 'Messung' })
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
        const overThresholdSteuves = steuves.filter(asset => parsePower(asset.power) > 4.2);
        const storages = assets.filter(asset => asset.type === 'storage');
        const nshAssets = assets.filter(asset => asset.type === 'nsh');
        const checks = [];

        if (storages.length) {
            const storageHints = storages.map(getStorageOperationHint).filter(Boolean);
            checks.push(makeCheck('STORAGE_ROLE', 'warning', `Speicher bleibt ein eigenes Objekt. Betriebsrolle, MaStR, mögliche §14a-Relevanz und Messkonzept fachlich prüfen. ${storageInfoText} ${storageHints.join(' ')}`));
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
