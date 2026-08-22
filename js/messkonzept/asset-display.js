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
        const getGenerationNumberKey = options.getGenerationNumberKey || (energyCarrier => {
            return energyCarrier === 'Balkonkraftwerk' ? 'PV' : energyCarrier || 'PV';
        });
        const getPowerNumber = options.getPowerNumber || (() => null);
        const getSteuveEffectivePower = options.getSteuveEffectivePower || ((asset) => {
            return getPowerNumber(asset?.power);
        });
        const renderSelectOptions = options.renderSelectOptions || (() => '');
        const steuveModuleOptions = options.steuveModuleOptions || [];
        const getGenerationAssetNumber = options.getGenerationAssetNumber || (() => null);
        const getConsumerAssetNumber = options.getConsumerAssetNumber || (() => null);
        const getMeterNumber = options.getMeterNumber || (() => null);
        const getMeterLabel = options.getMeterLabel || (meter => {
            const number = getMeterNumber(meter);
            return number ? `Z${number}` : '';
        });
        const getMeterDetailIndex = options.getMeterDetailIndex || (() => null);
        const canBuildCascadeAfterMeter = options.canBuildCascadeAfterMeter || (() => false);
        const getAllAssets = options.getAllAssets || (() => []);
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));

        // Karten mit einer fachlich lesbaren Textkennung (PV1, BHKW1, V1,
        // NSH1 und N1) tragen ihre Nummer direkt im Text. Nur reine
        // Symbolkarten bekommen ein separates Badge, damit keine Doppelung
        // wie „PV1“ plus „1“ entsteht.
        const badgeAssetTypes = new Set(['storage', 'steuve']);

        function getIconObjectSequenceKey(asset) {
            if (!asset || !badgeAssetTypes.has(asset.type)) return '';
            return asset.type === 'steuve'
                ? `steuve:${asset.steuveType || 'offen'}`
                : asset.type === 'generation' ? `generation:${getGenerationNumberKey(asset.energyCarrier)}` : asset.type;
        }

        function getIconObjectNumber(asset) {
            const sequenceKey = getIconObjectSequenceKey(asset);
            if (!sequenceKey) return null;
            const matchingAssets = getAllAssets().filter(item => getIconObjectSequenceKey(item) === sequenceKey);
            const index = matchingAssets.findIndex(item => item.id === asset.id);
            return index < 0 ? null : index + 1;
        }

        function getIconObjectToneClass(asset) {
            if (asset?.type === 'storage') return 'storage';
            if (asset?.type !== 'steuve') return '';
            return {
                Wallbox: 'wallbox',
                Wärmepumpe: 'heatpump',
                Klimaanlage: 'climate'
            }[asset.steuveType] || 'steuve';
        }

        function getAssetTypeLabel(asset) {
            if (asset?.mieterstromObject === 'user') return 'Mieterstromnutzer';
            if (asset?.mieterstromObject === 'external-meter') return 'Mieterstromzähler';
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
            if (power === null) return asset?.steuveType === 'Wärmepumpe' ? 'Gesamtleistung inkl. Heizstab noch offen' : 'Leistung noch offen';
            const unitLabel = asset?.steuveType === 'Wärmepumpe' ? ' kW inkl. Heizstab' : ' kW';
            return `${power.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${unitLabel}`;
        }

        function renderSteuveModuleFields(asset) {
            if (getSteuveEffectivePower(asset) <= 4.2) return '';
            return `
        <label>§14a-Modul<select data-mk-field="steuveModule">${renderSelectOptions(steuveModuleOptions, asset.steuveModule, 'Noch offen')}</select></label>
    `;
        }

        function getNshRegime(asset) {
            const year = Number(String(asset?.commissioningDate || '').slice(0, 4));
            if (!Number.isFinite(year) || year < 1900) return 'Inbetriebnahme noch offen';
            return `Inbetriebnahme ${year}`;
        }

        function getNshAssetNumber(asset) {
            if (!asset || asset.type !== 'nsh') return null;
            const matchingAssets = getAllAssets().filter(item => item.type === 'nsh');
            const index = matchingAssets.findIndex(item => item.id === asset.id);
            return index < 0 ? null : index + 1;
        }

        function renderAssetIcon(asset) {
            const meta = getAssetMeta()[asset.type] || { short: '' };
            if (asset?.type === 'consumer') {
                const number = getConsumerAssetNumber(asset);
                if (asset.mieterstromObject === 'user') return number ? `N${number}` : 'N';
                return number ? `V${number}` : 'V';
            }
            if (asset.type === 'generation') {
                const number = getGenerationAssetNumber(asset);
                const prefix = getGenerationDisplayForAsset(asset).prefix;
                return number ? `${prefix}${number}` : meta.short;
            }
            if (asset.type === 'storage') return '<span class="mk-battery-symbol" aria-hidden="true"><span class="mk-battery-level"></span></span>';
            if (asset.type === 'nsh') {
                const number = getNshAssetNumber(asset);
                return number ? `NSH${number}` : meta.short;
            }
            if (asset.type === 'steuve') {
                if (asset.steuveType === 'Wallbox') return '<svg class="mk-charge-symbol" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect class="mk-charge-body" x="3.5" y="2.5" width="14.5" height="21" rx="3.2"></rect><rect class="mk-charge-display" x="5.5" y="5" width="10" height="9" rx="1.6"></rect><path class="mk-charge-bolt" d="m11.5 5.8-3.2 4.8h2.8l-.9 3.7 4.7-5.8h-2.7l1.2-2.7z"></path><path class="mk-charge-cable" d="M18 15.5c5 0 7.5 2.3 7.5 5.8v1.2"></path><rect class="mk-charge-plug" x="21.4" y="22.2" width="8.2" height="6.8" rx="1.6"></rect><path class="mk-charge-pin" d="M24 28.7v2.8m4-2.8v2.8"></path><circle class="mk-charge-pin-dot" cx="24" cy="31.5" r="0.9"></circle><circle class="mk-charge-pin-dot" cx="28" cy="31.5" r="0.9"></circle></svg>';
                if (asset.steuveType === 'Wärmepumpe') return '<span class="mk-fan-symbol" aria-hidden="true"><span class="mk-fan-blade mk-fan-blade-1"></span><span class="mk-fan-blade mk-fan-blade-2"></span><span class="mk-fan-blade mk-fan-blade-3"></span><span class="mk-fan-hub"></span></span>';
                const icons = { Klimaanlage: '❄' };
                return escapeHtml(icons[asset.steuveType] || meta.short);
            }
            return escapeHtml(meta.short);
        }

        function renderInlineMeter(meter, asset) {
            const label = getMeterLabel(meter);
            if (!label) return '';
            const detailIndex = getMeterDetailIndex(meter);
            const meterClass = meter?.mieterstromObject === 'external-meter' ? ' mk-mieterstrom-participating-meter' : '';
            const dropHint = canBuildCascadeAfterMeter(meter)
                ? 'Weitere Anlagen oder Zähler hierher ziehen'
                : 'Weitere Anlagen hierher ziehen · keine weitere Kaskadenstufe';
            const accessibleLabel = `${label}: Zusatzzaehler vor ${asset?.name || 'Anlage'}; ${dropHint}`;
            return `<span class="mk-inline-meter-wrap" data-mk-meter-target="${escapeHtml(meter.id)}" data-mk-meter-group-target="${escapeHtml(meter.id)}" title="${escapeHtml(label)} vor ${escapeHtml(asset?.name || 'Anlage')} · ${dropHint}"><span class="mk-meter-drop-hitbox" aria-hidden="true"></span><span class="mk-generation-meter mk-inline-meter${meterClass}" data-mk-select-meter="${detailIndex}" data-mk-meter-id="${escapeHtml(meter.id)}" role="button" tabindex="0" aria-label="${escapeHtml(accessibleLabel)}"><b>${escapeHtml(label)}</b></span><button type="button" class="mk-remove-meter" data-mk-remove-meter="${escapeHtml(meter.id)}" title="${escapeHtml(label)} entfernen" aria-label="Zähler ${escapeHtml(label)} entfernen">×</button></span><span class="mk-generation-meter-link" aria-hidden="true"></span>`;
        }

        return Object.freeze({
            getAssetTypeLabel,
            getGenerationDisplay: getGenerationDisplayForAsset,
            getSteuveIconClass,
            getSteuveRegime,
            renderSteuveModuleFields,
            getNshRegime,
            getNshAssetNumber,
            getIconObjectNumber,
            getIconObjectToneClass,
            renderAssetIcon,
            renderInlineMeter
        });
    }

    global.WattspurMesskonzeptAssetDisplay = Object.freeze({
        createAssetDisplayController
    });
}(window));
