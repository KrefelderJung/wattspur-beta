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

    const RULESET_VERSION = '2026-08-22-beta.16';
    const STEUVE_THRESHOLD_KW = 4.2;
    const SMART_METER_CONTROL_THRESHOLD_KW = 7;
    const DIRECT_MARKETING_THRESHOLD_KW = 100;
    // Für Steckersolargeräte gilt für die vereinfachte Behandlung eine
    // Wechselrichtergrenze von 800 VA. Die Einheit ist VA, nicht kVA.
    const STECKER_PV_MAX_INVERTER_VA = 800;
    const RULE_CATALOG = Object.freeze({
        STORAGE_ROLE: Object.freeze({ id: 'MK-ASSET-001', title: 'Speicher – Betriebsrolle und Meldungen', category: 'Anlage' }),
        STEUVE_THRESHOLD: Object.freeze({ id: 'MK-ASSET-002', title: 'Steuerbare Anlage über 4,2 kW', category: 'Anlage' }),
        NSH_REGIME: Object.freeze({ id: 'MK-ASSET-003', title: 'Nachtspeicherheizung – zeitliche Einordnung', category: 'Anlage' }),
        STEUVE_LEGACY_REGIME: Object.freeze({ id: 'MK-ASSET-004', title: 'SteuVE vor 2024 – Regime prüfen', category: 'Anlage' }),
        SINGLE_MIXED_LOAD: Object.freeze({ id: 'MK-SINGLE-001', title: 'Steuerbare Anlage und weitere Verbraucher', category: 'Messung' }),
        STECKER_PV_INVERTER_LIMIT: Object.freeze({ id: 'MK-ASSET-005', title: 'Stecker-PV – Wechselrichtergrenze', category: 'Anlage' }),
        DIRECT_MARKETING: Object.freeze({ id: 'MK-ASSET-006', title: 'Vermarktungsform ab mehr als 100 kW/kWp prüfen', category: 'Anlage' }),
        COMMISSIONING_DATE_MISSING: Object.freeze({ id: 'MK-ASSET-007', title: 'Inbetriebnahmedatum optional ergänzen', category: 'Anlage' }),
        SMART_METER_CONTROL: Object.freeze({ id: 'MK-ASSET-008', title: 'Intelligentes Messsystem und Steuerung ab mehr als 7 kW prüfen', category: 'Anlage' }),
        STECKER_PV_MASTR: Object.freeze({ id: 'MK-ASSET-009', title: 'Stecker-PV im Marktstammdatenregister registrieren', category: 'Anlage' }),
        STEUVE_TARIFF_SEPARATION: Object.freeze({ id: 'MK-STEUVE-001', title: '§14a-Anmeldung und Energietarif getrennt prüfen', category: 'Messung' }),
        KWK_BAFA: Object.freeze({ id: 'MK-KWK-001', title: 'KWK-Vergütung und BAFA-Zulassung prüfen', category: 'Anlage' }),
        KWK_MEASUREMENT: Object.freeze({ id: 'MK-KWK-002', title: 'KWK-Erzeugungs- und Einspeisemessung prüfen', category: 'Messung' }),
        NSH_STEUVE_MIXED: Object.freeze({ id: 'MK-NSH-001', title: 'Nachtspeicherheizung und neue SteuVE getrennt prüfen', category: 'Messung' })
    });

    const KWK_BAFA_LINKS = Object.freeze([
        Object.freeze({
            label: 'BAFA: KWK-Zulassung und Merkblatt',
            href: 'https://www.bafa.de/SharedDocs/Downloads/DE/Energie/kwk_anlagen_mb_zulassung.pdf?__blob=publicationFile&v=4'
        }),
        Object.freeze({
            label: 'BAFA: Anzeigeverfahren bis 50 kWel',
            href: 'https://www.bafa.de/SharedDocs/Downloads/DE/Energie/kwk_anlagen_50kw_mb_elektronisches_anzeigeverfahren.pdf?__blob=publicationFile&v=2'
        })
    ]);

    const NSH_STEUVE_LINKS = Object.freeze([
        Object.freeze({
            label: 'BNetzA: Bestandsanlagen und § 14a EnWG',
            href: 'https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500'
        })
    ]);

    const DEFAULT_STORAGE_INFO_TEXT = 'Achtung: Die Registrierung des Stromspeichers im Marktstammdatenregister ist zu prüfen. Beim netzbezogenen Laden ist zusätzlich zu prüfen, ob § 14a EnWG greift; Einspeisung und Bezug sind getrennt zu betrachten. Messkonzept mit dem Verteilnetzbetreiber abstimmen.';

    function parsePowerNumber(value) {
        const match = String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
        if (!match) return null;
        const parsed = Number(match[0]);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getGenerationPowerUnit(asset) {
        return ['PV', 'Balkonkraftwerk'].includes(asset?.energyCarrier) ? 'kWp' : 'kW';
    }

    /**
     * Bewertet ausschließlich die eingetragene Nennleistung einer
     * Erzeugungsanlage. Die Wechselrichterleistung ist dafür nicht der
     * Schwellenwert. Die Rückgabe bleibt DOM-frei und kann daher von
     * Prüfstatus, Editor und Tests gemeinsam verwendet werden.
     */
    function getGenerationDirectMarketingAssessment(asset, parsePower = parsePowerNumber) {
        if (!asset || asset.type !== 'generation') return null;
        const power = parsePower(asset.power);
        const unit = getGenerationPowerUnit(asset);
        const isKwk = asset.energyCarrier === 'KWK';
        return {
            assetId: asset.id || '',
            power,
            unit,
            threshold: DIRECT_MARKETING_THRESHOLD_KW,
            exceedsThreshold: power !== null && power > DIRECT_MARKETING_THRESHOLD_KW,
            category: isKwk ? 'KWK' : 'EEG'
        };
    }

    /**
     * Fasst KWK-Anlagen für die vorsichtige BAFA- und Messprüfung zusammen.
     * `generationMeter` ist die technische Angabe aus dem Objekteditor. Sie
     * ist ein Indiz für eine eigene Erzeugungsmessung, ersetzt aber keine
     * Prüfung der tatsächlichen Zähleranordnung und Abrechnung.
     */
    function getKwkAssessments(state) {
        const assets = Array.isArray(state?.assets) ? state.assets : [];
        return assets
            .filter(asset => asset?.type === 'generation' && asset.energyCarrier === 'KWK')
            .map(asset => ({
                assetId: asset.id || '',
                name: asset.name || 'KWK-Anlage',
                hasGenerationMeter: asset.generationMeter === true,
                generationMeterNumber: asset.generationMeter ? asset.generationNumber || null : null
            }));
    }

    /**
     * Bewertet die Messstellen-Ausstattung für Erzeugungsanlagen über 7 kW.
     * Das ist bewusst von der Direktvermarktung und von § 14a getrennt: Die
     * 7-kW-Schwelle beschreibt den iMSys-Rollout nach dem MsbG, nicht die
     * 4,2-kW-Schwelle für steuerbare Verbrauchseinrichtungen.
     */
    function getSmartMeterControlAssessment(asset, parsePower = parsePowerNumber) {
        if (!asset || asset.type !== 'generation') return null;
        const power = parsePower(asset.power);
        const unit = getGenerationPowerUnit(asset);
        return {
            assetId: asset.id || '',
            power,
            unit,
            threshold: SMART_METER_CONTROL_THRESHOLD_KW,
            exceedsThreshold: power !== null && power > SMART_METER_CONTROL_THRESHOLD_KW
        };
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
     * Liefert die für §14a maßgebliche Leistung am Messpunkt.
     * Das Leistungsfeld einer Wärmepumpe wird als elektrische Gesamtleistung
     * einschließlich Zusatz- oder Notheizvorrichtung erfasst. Bei Speichern
     * ist die maximale Ladeleistung maßgeblich, weil der Speicher als
     * steuerbarer Verbrauch bewertet werden kann.
     */
    function getSteuveEffectivePower(asset, parsePower = parsePowerNumber) {
        if (!asset) return null;
        if (asset.type === 'storage') return parsePower(asset.storageChargePower);
        if (asset.type !== 'steuve') return null;
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
     * Findet Messpunkte, an denen eine Nachtspeicherheizung und eine neue oder
     * zeitlich noch nicht eingeordnete SteuVE gemeinsam liegen. Die BNetzA
     * lässt die bisherigen Regelungen für Nachtspeicherheizungen fortgelten.
     * Deshalb wird hier nur ein vorsichtiger Abstimmungshinweis erzeugt.
     */
    function getNshSteuveMeasurementGroups(state) {
        const assets = Array.isArray(state?.assets) ? state.assets : [];
        const groups = new Map();
        assets.filter(asset => ['nsh', 'steuve'].includes(asset?.type)).forEach(asset => {
            const meter = getAssignedMeter(assets, asset);
            const key = getMeasurementGroupKey(asset, meter);
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    meterId: meter?.id || '',
                    zone: asset.zone || '',
                    nshAssets: [],
                    steuveAssets: []
                });
            }
            const group = groups.get(key);
            if (asset.type === 'nsh') group.nshAssets.push(asset);
            else group.steuveAssets.push(asset);
        });
        return [...groups.values()]
            .filter(group => group.nshAssets.length && group.steuveAssets.length)
            .map(group => ({
                ...group,
                newSteuveAssets: group.steuveAssets.filter(asset => {
                    const date = String(asset.commissioningDate || '').trim();
                    return !/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= '2024-01-01';
                })
            }))
            .filter(group => group.newSteuveAssets.length);
    }

    /**
     * Liefert die fachliche Zuordnung der SteuVE und Speicher zu ihrem
     * Messpunkt.
     * Ein Zusatz-Zähler steht direkt in meterId. Anlagen ohne Zusatz-Zähler
     * werden über ihre Zone dem Basiszähler des Messbereichs zugeordnet.
     * Die Funktion bleibt DOM-frei und ist deshalb auch für Prüfstatus,
     * Export und Tests dieselbe Quelle der Wahrheit.
     */
    function getSteuveMeasurementGroups(state, parsePower = parsePowerNumber) {
        const assets = Array.isArray(state?.assets) ? state.assets : [];
        const groups = new Map();
        assets.filter(asset => ['steuve', 'storage'].includes(asset?.type)).forEach(asset => {
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

    function getSeparatedSteuveTariffGroups(state, parsePower = parsePowerNumber) {
        return getSteuveMeasurementGroups(state, parsePower).filter(group => {
            const hasOwnMeter = Boolean(group.meterId);
            const isParallelBranch = state?.mode === 'parallel' && String(group.zone || '').startsWith('parallel-');
            const hasTariffAsset = group.assets.some(asset => ['Wärmepumpe', 'Wallbox'].includes(asset.steuveType));
            return (hasOwnMeter || isParallelBranch) && hasTariffAsset;
        });
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

    function hasCommissioningDate(asset) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(asset?.commissioningDate || '').trim());
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
        const generationAssets = assets.filter(asset => asset.type === 'generation');
        const measurementGroups = getSteuveMeasurementGroups(state, parsePower);
        const overThresholdGroups = measurementGroups.filter(group => group.totalPowerKw > STEUVE_THRESHOLD_KW);
        const pre2024Steuves = steuves.filter(isPre2024Commissioning);
        const mixedNshSteuveGroups = getNshSteuveMeasurementGroups(state);
        const storages = assets.filter(asset => asset.type === 'storage');
        const nshAssets = assets.filter(asset => asset.type === 'nsh');
        const dateRelevantAssets = assets.filter(asset => ['generation', 'steuve', 'nsh'].includes(asset.type));
        const missingCommissioningDateAssets = dateRelevantAssets.filter(asset => !hasCommissioningDate(asset));
        const steckerPvGroups = getSteckerPvMeasurementGroups(state);
        const checks = [];

        if (missingCommissioningDateAssets.length) {
            const count = missingCommissioningDateAssets.length;
            checks.push(makeCheck('COMMISSIONING_DATE_MISSING', 'info', `Bei ${count === 1 ? 'einer Anlage fehlt' : `${count} Anlagen fehlen`} das Inbetriebnahmedatum. Die Angabe ist optional und hilft bei späteren Bestandsregeln.`, {
                assetIds: missingCommissioningDateAssets.map(asset => asset.id)
            }));
        }

        const directMarketingAssets = generationAssets
            .map(asset => ({ asset, assessment: getGenerationDirectMarketingAssessment(asset, parsePower) }))
            .filter(item => item.assessment?.exceedsThreshold);
        if (directMarketingAssets.length) {
            const texts = directMarketingAssets.map(({ asset, assessment }) => {
                const name = asset.name || (assessment.category === 'KWK' ? 'BHKW' : 'Erzeugungsanlage');
                const power = `${formatPower(assessment.power)} ${assessment.unit}`;
                if (assessment.category === 'KWK') {
                    return `${name}: Die elektrische KWK-Leistung beträgt ${power} und liegt damit über 100 kW. Der erzeugte KWK-Strom muss direkt vermarktet oder selbst verbraucht werden. Bei Netzeinspeisung ist der Vermarktungsweg mit dem Netzbetreiber und gegebenenfalls einem Direktvermarkter zu klären.`;
                }
                return `${name}: Die eingetragene Leistung beträgt ${power} und liegt damit über 100 ${assessment.unit}. Für Strom, der ins öffentliche Netz eingespeist wird, ist die passende Vermarktungsform zu prüfen. Häufig ist dafür ein Direktvermarkter erforderlich.`;
            });
            checks.push(makeCheck('DIRECT_MARKETING', 'warning', texts.join(' '), {
                thresholdKw: DIRECT_MARKETING_THRESHOLD_KW,
                assetIds: directMarketingAssets.map(({ asset }) => asset.id),
                assessments: directMarketingAssets.map(({ assessment }) => assessment)
            }));
        }

        const kwkAssessments = getKwkAssessments(state);
        if (kwkAssessments.length) {
            checks.push(makeCheck('KWK_BAFA', 'info', 'Für eine mögliche Vergütung nach dem KWKG ist die Zulassung beziehungsweise Anzeige der KWK-Anlage beim BAFA zu prüfen. Inbetriebnahme, Förderzeitraum, Anlagengröße und Betriebsweise können die Voraussetzungen beeinflussen.', {
                assetIds: kwkAssessments.map(assessment => assessment.assetId),
                assessments: kwkAssessments,
                links: KWK_BAFA_LINKS
            }));

            const missingGenerationMeter = kwkAssessments.filter(assessment => !assessment.hasGenerationMeter);
            if (missingGenerationMeter.length) {
                checks.push(makeCheck('KWK_MEASUREMENT', 'info', 'Bei möglicher KWKG-Vergütung sollte geprüft werden, ob Erzeugung und Einspeisung getrennt nachvollziehbar gemessen werden. In einer Kaskade hängt die Abrechnung der erzeugten und eingespeisten KWK-Arbeit sowie der Vollbenutzungsstunden von der konkreten Zählerzuordnung ab.', {
                    assetIds: missingGenerationMeter.map(assessment => assessment.assetId),
                    assessments: missingGenerationMeter
                }));
            }
        }

        if (mixedNshSteuveGroups.length) {
            const missingDateCount = mixedNshSteuveGroups
                .flatMap(group => group.newSteuveAssets)
                .filter(asset => !hasCommissioningDate(asset)).length;
            const missingDateHint = missingDateCount
                ? ' Bei fehlendem Inbetriebnahmedatum ist die zeitliche Einordnung offen.'
                : '';
            checks.push(makeCheck('NSH_STEUVE_MIXED', 'info', 'Eine Nachtspeicherheizung und eine neue steuerbare Verbrauchseinrichtung werden am selben Messpunkt erfasst. Für Nachtspeicherheizungen gelten bisherige Bestandsregelungen fort, während für neue SteuVE ab dem 01.01.2024 die aktuellen §14a-Regeln gelten. Diese gemeinsame Messung kann unterschiedliche Netzentgeltregelungen vermischen und sollte deshalb vorab mit Netzbetreiber und Messstellenbetreiber abgestimmt werden.' + missingDateHint, {
                measurementGroups: mixedNshSteuveGroups.map(group => ({
                    key: group.key,
                    meterId: group.meterId,
                    zone: group.zone,
                    nshAssetIds: group.nshAssets.map(asset => asset.id),
                    steuveAssetIds: group.newSteuveAssets.map(asset => asset.id)
                })),
                links: NSH_STEUVE_LINKS
            }));
        }

        const smartMeterControlAssets = generationAssets
            .map(asset => ({ asset, assessment: getSmartMeterControlAssessment(asset, parsePower) }))
            .filter(item => item.assessment?.exceedsThreshold);
        if (smartMeterControlAssets.length) {
            const texts = smartMeterControlAssets.map(({ asset, assessment }) => {
                const name = asset.name || (assessment.unit === 'kWp' ? 'PV-Anlage' : 'Erzeugungsanlage');
                return `${name}: Die eingetragene Leistung beträgt ${formatPower(assessment.power)} ${assessment.unit} und liegt damit über 7 kW. Für solche Erzeugungsanlagen ist nach dem Messstellenbetriebsgesetz grundsätzlich ein intelligentes Messsystem vorgesehen. Am Netzanschlusspunkt kann zusätzlich eine Steuerungseinrichtung erforderlich sein. Der Messstellenbetreiber klärt den Einbau. Bitte die konkrete Ausführung frühzeitig mit Messstellenbetreiber und Netzbetreiber abstimmen.`;
            });
            checks.push(makeCheck('SMART_METER_CONTROL', 'info', texts.join(' '), {
                thresholdKw: SMART_METER_CONTROL_THRESHOLD_KW,
                assetIds: smartMeterControlAssets.map(({ asset }) => asset.id),
                assessments: smartMeterControlAssets.map(({ assessment }) => assessment)
            }));
        }

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

        if (steckerPvGroups.length) {
            checks.push(makeCheck('STECKER_PV_MASTR', 'info', 'Stecker-PV muss innerhalb eines Monats nach der Inbetriebnahme im Marktstammdatenregister registriert werden. Innerhalb der vereinfachten Leistungsgrenzen entfällt die separate Meldung beim Netzbetreiber. Die 800-VA-Grenze und die technischen Anschlussbedingungen bleiben zu beachten.', {
                assetIds: steckerPvGroups.flatMap(group => group.assets.map(asset => asset.id)),
                registrationDeadline: 'ein Monat nach Inbetriebnahme'
            }));
        }

        const separatedSteuveTariffGroups = getSeparatedSteuveTariffGroups(state, parsePower);
        if (separatedSteuveTariffGroups.length) {
            const separatedTypes = [...new Set(separatedSteuveTariffGroups.flatMap(group => group.assets.map(asset => asset.steuveType)))];
            const typeLabel = separatedTypes.length === 1
                ? separatedTypes[0]
                : 'Wärmepumpe oder Wallbox';
            checks.push(makeCheck('STEUVE_TARIFF_SEPARATION', 'info', `${typeLabel} separat gemessen: Die Einordnung und Anmeldung nach § 14a EnWG erfolgt, sofern die Voraussetzungen erfüllt sind, beim Netzbetreiber. Einen passenden Wärmepumpen- oder Wallbox-Tarif fragen Sie separat beim gewählten Energieversorger an. Netzentgeltreduzierung nach § 14a EnWG und Energietarif des Lieferanten sind unterschiedliche Dinge.`, {
                measurementGroups: separatedSteuveTariffGroups.map(group => ({
                    key: group.key,
                    meterId: group.meterId,
                    zone: group.zone,
                    assetIds: group.assets.map(asset => asset.id),
                    steuveTypes: [...new Set(group.assets.map(asset => asset.steuveType))]
                }))
            }));
        }

        if (storages.length) {
            const storageHints = storages.map(getStorageOperationHint).filter(Boolean);
            checks.push(makeCheck('STORAGE_ROLE', 'warning', `Speicher bleibt ein eigenes Objekt. Betriebsrolle, MaStR, mögliche §14a-Relevanz und Messkonzept fachlich prüfen. ${storageInfoText} ${storageHints.join(' ')}`));
        }

        if (overThresholdGroups.length) {
            const groupTexts = overThresholdGroups.map(group => {
                const heatPumpIncluded = group.assets.some(asset => asset.steuveType === 'Wärmepumpe');
                const storageIncluded = group.assets.some(asset => asset.type === 'storage');
                const powerHints = [];
                if (heatPumpIncluded) powerHints.push('Bei Wärmepumpen zählt die Gesamtleistung einschließlich Heizstab.');
                if (storageIncluded) powerHints.push('Bei Speichern ist die maximale Ladeleistung maßgeblich.');
                const powerHint = powerHints.join(' ');
                const missingPowerHint = group.missingPowerAssetIds.length
                    ? `Für ${group.missingPowerAssetIds.length === 1 ? 'eine zugeordnete Anlage fehlt' : `${group.missingPowerAssetIds.length} zugeordnete Anlagen fehlen`} noch die Leistungsangabe. Die Summe ist deshalb nur ein Mindestwert.`
                    : '';
                const powerQualifier = group.missingPowerAssetIds.length ? 'mindestens ' : '';
                const assetCountText = group.assets.length > 1
                    ? `${group.assets.length} steuerbare Anlagen werden hinter ${group.meterLabel} gemeinsam gemessen.`
                    : 'Eine steuerbare Anlage wird an diesem Messpunkt gemessen.';
                return `${assetCountText} Die erfasste gemeinsame Leistung beträgt ${powerQualifier}${formatPower(group.totalPowerKw)} kW und liegt damit über 4,2 kW. ${powerHint} ${missingPowerHint} Für neue steuerbare Verbrauchseinrichtungen, die ab dem 01.01.2024 in Betrieb gehen, muss die technische Eignung für die netzorientierte Steuerung sichergestellt sein. Einordnung nach § 14a EnWG, Anmeldung und passendes Modul beim Netzbetreiber prüfen.`;
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
        getGenerationPowerUnit,
        getGenerationDirectMarketingAssessment,
        getKwkAssessments,
        getSmartMeterControlAssessment,
        parseInverterPowerVa,
        getSteckerPvInverterPowerVa,
        getSteckerPvMeasurementGroups,
        getSteuveEffectivePower,
        getSteuveMeasurementGroups,
        getNshSteuveMeasurementGroups,
        getSeparatedSteuveTariffGroups,
        isPre2024Commissioning,
        getZoneAssets,
        getRuleCatalog: () => RULE_CATALOG,
        evaluate
    });
}(window));
