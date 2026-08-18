(function exposeMesskonzeptAssetDisplay(global) {
    'use strict';

    /**
     * Semantische Darstellungshilfen für Messobjekte.
     *
     * Dieses Modul liefert Labels, fachliche Kurztexte und Icons. Es misst
     * keine DOM-Elemente und entscheidet keine Topologie.
     */
    function createAssetDisplayController(options = {}) {
        const getAssetMeta = options.getAssetMeta || (() => ({}));
        const getAssetTypeOptions = options.getAssetTypeOptions || (() => ({}));
        const getGenerationDisplay = options.getGenerationDisplay || (() => ({ prefix: 'EA' }));
        const getPowerNumber = options.getPowerNumber || (() => null);
        const getSteuveEffectivePower = options.getSteuveEffectivePower || ((asset) => {
            return getPowerNumber(asset?.power);
        });
        const renderSelectOptions = options.renderSelectOptions || (() => '');
        const steuveModuleOptions = options.steuveModuleOptions || [];
        const getGenerationAssetNumber = options.getGenerationAssetNumber || (() => null);
        const getMeterNumber = options.getMeterNumber || (() => null);
        const getMeterDetailIndex = options.getMeterDetailIndex || (() => null);
        const canBuildCascadeAfterMeter = options.canBuildCascadeAfterMeter || (() => false);
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));

        function getAssetTypeLabel(asset) {
            if (asset?.mieterstromObject === 'user') return 'Nutzer';
            if (asset?.mieterstromObject === 'external-meter') return 'Zähler außerhalb Mieterstrom';
            if (asset?.type === 'generation') {
                return getAssetTypeOptions().generation?.find(option => option.value === asset.energyCarrier)?.label || '';
            }
            if (asset?.type === 'steuve') {
                const steuveType = asset.steuveType === 'Sonstige' ? 'offen' : asset.steuveType;
                return getAssetTypeOptions().steuve?.find(option => option.value === steuveType)?.label || 'Fachliche Einordnung offen';
            }
            if (asset?.type === 'nsh') return getAssetMeta().nsh?.label || '';
            return '';
        }

        function getGenerationDisplayForAsset(asset) {
            return getGenerationDisplay(asset);
        }

        function getSteuveIconClass(asset) {
            if (asset?.type !== 'steuve') return '';
            const classes = {
                Wallbox: 'mk-device-wallbox',
                Wärmepumpe: 'mk-device-heatpump',
                Klimaanlage: 'mk-device-climate'
            };
            return classes[asset.steuveType] || 'mk-device-generic';
        }

        function getSteuveRegime(asset) {
            const power = getSteuveEffectivePower(asset);
            if (power === null) return asset?.steuveType === 'Wärmepumpe' ? 'Elektrische Gesamtleistung inkl. Heizstab noch offen' : 'Leistung noch offen';
            const unitLabel = asset?.steuveType === 'Wärmepumpe' ? ' kW inkl. Heizstab' : ' kW';
            return power > 4.2 ? `${power.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${unitLabel} · § 14a EnWG prüfen` : `${power.toLocaleString('de-DE', { maximumFractionDigits: 2 })} kW · § 14a-EnWG-Prüfung nicht automatisch`;
        }

        function renderSteuveNotice(asset) {
            const isHeatPump = asset?.steuveType === 'Wärmepumpe';
            const power = getSteuveEffectivePower(asset);
            if (power === null) {
                return `<p class="mk-steuve-editor-hint" role="note">${isHeatPump ? 'Die elektrische Gesamtleistung einschließlich Heizstab eintragen.' : 'Leistung eintragen.'} Ab mehr als 4,2 kW die Einordnung nach § 14a EnWG und die Anmeldung beim Netzbetreiber prüfen.</p>`;
            }
            if (power > 4.2) {
                const detail = isHeatPump ? ' Die eingetragene Leistung enthält die Wärmepumpe einschließlich Heizstab.' : '';
                return `<p class="mk-steuve-editor-notice" role="note"><b>Hinweis zu § 14a EnWG:</b> Bei mehr als 4,2 kW ist die Einordnung als steuerbare Verbrauchseinrichtung typischerweise zu prüfen.${detail} Bitte beim Netzbetreiber anmelden und das passende Modul für dieses Messkonzept abstimmen.</p>`;
            }
            return `<p class="mk-steuve-editor-hint" role="note">${isHeatPump ? 'Die elektrische Gesamtleistung einschließlich Heizstab liegt' : 'Die eingetragene Leistung liegt'} bei höchstens 4,2 kW. Daraus folgt nicht automatisch eine § 14a-relevante Einordnung. Die fachliche Prüfung bleibt erforderlich.</p>`;
        }

        function renderSteuveModuleFields(asset) {
            if (getSteuveEffectivePower(asset) <= 4.2) return '';
            return `
        <label>§14a-Modul<select data-mk-field="steuveModule">${renderSelectOptions(steuveModuleOptions, asset.steuveModule, 'Noch offen')}</select></label>
        <p class="mk-steuve-module-hint">Die Auswahl ist eine Vorprüfung und ersetzt keine Abstimmung mit dem Netzbetreiber.</p>
    `;
        }

        function getNshRegime(asset) {
            const year = Number(String(asset?.commissioningDate || '').slice(0, 4));
            if (!Number.isFinite(year) || year < 1900) return 'Einordnung offen · Abstimmung erforderlich';
            if (year < 2024) return 'Bestand vor 2024 · historische SteuVE-/Tarifbehandlung möglich';
            return 'Ab 2024 · nicht automatisch als SteuVE einordnen';
        }

        function renderAssetIcon(asset) {
            const meta = getAssetMeta()[asset.type] || { short: '' };
            if (asset?.mieterstromObject === 'user') return 'N';
            if (asset.type === 'generation') {
                const number = getGenerationAssetNumber(asset);
                const prefix = getGenerationDisplayForAsset(asset).prefix;
                return number ? `${prefix}${number}` : meta.short;
            }
            if (asset.type === 'storage') return '<span class="mk-battery-symbol" aria-hidden="true"><span class="mk-battery-level"></span></span>';
            if (asset.type === 'steuve') {
                if (asset.steuveType === 'Wallbox') return '<svg class="mk-charge-symbol" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect class="mk-charge-body" x="3.5" y="2.5" width="14.5" height="21" rx="3.2"></rect><rect class="mk-charge-display" x="5.5" y="5" width="10" height="9" rx="1.6"></rect><path class="mk-charge-bolt" d="m11.5 5.8-3.2 4.8h2.8l-.9 3.7 4.7-5.8h-2.7l1.2-2.7z"></path><path class="mk-charge-cable" d="M18 15.5c5 0 7.5 2.3 7.5 5.8v1.2"></path><rect class="mk-charge-plug" x="21.4" y="22.2" width="8.2" height="6.8" rx="1.6"></rect><path class="mk-charge-pin" d="M24 28.7v2.8m4-2.8v2.8"></path><circle class="mk-charge-pin-dot" cx="24" cy="31.5" r="0.9"></circle><circle class="mk-charge-pin-dot" cx="28" cy="31.5" r="0.9"></circle></svg>';
                if (asset.steuveType === 'Wärmepumpe') return '<span class="mk-fan-symbol" aria-hidden="true"><span class="mk-fan-blade mk-fan-blade-1"></span><span class="mk-fan-blade mk-fan-blade-2"></span><span class="mk-fan-blade mk-fan-blade-3"></span><span class="mk-fan-hub"></span></span>';
                const icons = { Klimaanlage: '❄' };
                return escapeHtml(icons[asset.steuveType] || meta.short);
            }
            return escapeHtml(meta.short);
        }

        function renderInlineMeter(meter, asset) {
            const number = getMeterNumber(meter);
            if (!number) return '';
            const detailIndex = getMeterDetailIndex(meter);
            const dropHint = canBuildCascadeAfterMeter(meter)
                ? 'Weitere Anlagen oder Zähler hierher ziehen'
                : 'Weitere Anlagen hierher ziehen · keine weitere Kaskadenstufe';
            const label = `Z${number}: Zusatzzaehler vor ${asset?.name || 'Anlage'}; ${dropHint}`;
            return `<span class="mk-inline-meter-wrap" data-mk-meter-target="${escapeHtml(meter.id)}" data-mk-meter-group-target="${escapeHtml(meter.id)}" title="Z${number} vor ${escapeHtml(asset?.name || 'Anlage')} · ${dropHint}"><span class="mk-meter-drop-hitbox" aria-hidden="true"></span><span class="mk-generation-meter mk-inline-meter" data-mk-select-meter="${detailIndex}" role="button" tabindex="0" aria-label="${escapeHtml(label)}"><b>Z${number}</b></span><button type="button" class="mk-remove-meter" data-mk-remove-meter="${escapeHtml(meter.id)}" title="Z${number} entfernen" aria-label="Zähler Z${number} entfernen">×</button></span><span class="mk-generation-meter-link" aria-hidden="true"></span>`;
        }

        return Object.freeze({
            getAssetTypeLabel,
            getGenerationDisplay: getGenerationDisplayForAsset,
            getSteuveIconClass,
            getSteuveRegime,
            renderSteuveNotice,
            renderSteuveModuleFields,
            getNshRegime,
            renderAssetIcon,
            renderInlineMeter
        });
    }

    global.WattspurMesskonzeptAssetDisplay = Object.freeze({
        createAssetDisplayController
    });
}(window));
