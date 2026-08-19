/**
 * Wattspur Messkonzept – Prüfstatus
 *
 * Die fachliche Bewertung kommt aus rules.js. Dieses Modul übersetzt die
 * strukturierten Checks in die kompakte Prüfstatus-Anzeige. Zustand, DOM und
 * Formatierung werden ausschließlich injiziert.
 */
(function exposeMesskonzeptValidationStatus(global) {
    'use strict';

    function createValidationStatusController(options = {}) {
        const getState = options.getState || (() => ({}));
        const getElements = options.getElements || (() => ({}));
        const rules = options.rules || global.WattspurMesskonzeptRules;
        const getZoneAssets = options.getZoneAssets || (() => []);
        const parsePower = options.parsePower || (value => rules.parsePowerNumber(value));
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
        const storageInfoText = options.storageInfoText || '';

        function evaluate() {
            return rules.evaluate(getState(), {
                getZoneAssets,
                parsePower,
                storageInfoText
            });
        }

        function getCheckAssetIds(check) {
            const ids = [
                ...(Array.isArray(check?.assetIds) ? check.assetIds : []),
                ...(Array.isArray(check?.missingPowerAssetIds) ? check.missingPowerAssetIds : []),
                ...(Array.isArray(check?.assessments) ? check.assessments.map(item => item?.assetId) : []),
                ...(Array.isArray(check?.measurementGroups) ? check.measurementGroups.flatMap(group => [
                    ...(Array.isArray(group?.assetIds) ? group.assetIds : []),
                    ...(Array.isArray(group?.nshAssetIds) ? group.nshAssetIds : []),
                    ...(Array.isArray(group?.steuveAssetIds) ? group.steuveAssetIds : [])
                ]) : [])
            ];
            return [...new Set(ids.filter(Boolean))];
        }

        function getAssetTagToneClass(asset) {
            if (!asset) return 'mixed';
            if (asset.type === 'generation') return 'generation';
            if (asset.type === 'storage') return 'storage';
            if (asset.type === 'nsh') return 'nsh';
            if (asset.type === 'consumer') return asset.mieterstromObject === 'user' ? 'mieterstrom-user' : 'consumer';
            if (asset.type === 'meter') return asset.mieterstromObject === 'external-meter' ? 'meter-external' : 'meter';
            if (asset.type === 'steuve') {
                return {
                    Wallbox: 'wallbox',
                    Wärmepumpe: 'heatpump',
                    Klimaanlage: 'climate'
                }[asset.steuveType] || 'steuve';
            }
            return 'mixed';
        }

        function getCheckAssetTags(check) {
            const assets = Array.isArray(getState()?.assets) ? getState().assets : [];
            const byId = new Map(assets.map(asset => [asset.id, asset]));
            const tags = getCheckAssetIds(check)
                .map(id => {
                    const asset = byId.get(id);
                    const label = String(asset?.name || '').trim();
                    return label ? { label, toneClass: getAssetTagToneClass(asset) } : null;
                })
                .filter(Boolean);
            const uniqueTags = tags.filter((tag, index, list) => list.findIndex(item => item.label === tag.label) === index);
            return uniqueTags.length > 3
                ? [{ label: `${uniqueTags.length} Anlagen`, toneClass: 'mixed' }]
                : uniqueTags;
        }

        function renderValidation() {
            const elements = getElements();
            if (!elements.validation) return;
            const checks = evaluate();
            const statusCounters = new Map();
            elements.validation.innerHTML = checks.map(check => {
                const statusLabel = check.level === 'error' ? 'Fehler'
                    : check.level === 'warning' ? 'Hinweis'
                        : check.level === 'ok' ? 'OK' : 'Info';
                const statusNumber = (statusCounters.get(statusLabel) || 0) + 1;
                statusCounters.set(statusLabel, statusNumber);
                const statusTag = `${statusLabel} ${statusNumber}`;
                const assetLabels = getCheckAssetTags(check);
                const assetTags = assetLabels
                    .map(tag => `<span class="mk-validation-asset-tag mk-validation-asset-tag--${escapeHtml(tag.toneClass)}">${escapeHtml(tag.label)}</span>`)
                    .join('');
                const links = Array.isArray(check.links) && check.links.length
                    ? `<div class="mk-validation-links">${check.links.map(link => `<a class="mk-reference-link" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} ↗</a>`).join('')}</div>`
                    : '';
                const title = check.title || 'Prüfhinweis';
                const accessibleLabel = `${statusTag}${assetLabels.length ? `, ${assetLabels.map(tag => tag.label).join(', ')}` : ''}: ${title}`;
                return `<details class="mk-validation-item ${check.level}" data-mk-rule-id="${escapeHtml(check.ruleId || check.ruleKey || '')}">
                    <summary aria-label="${escapeHtml(accessibleLabel)}"><span class="mk-validation-tag ${check.level}">${escapeHtml(statusTag)}</span>${assetTags}</summary>
                    <div class="mk-validation-body"><p class="mk-validation-rule-title">${escapeHtml(title)}</p><p>${escapeHtml(check.text)}</p>${links}</div>
                </details>`;
            }).join('');
        }

        function refresh() {
            renderValidation();
        }

        return Object.freeze({ evaluate, renderValidation, refresh });
    }

    global.WattspurMesskonzeptValidationStatus = Object.freeze({ createValidationStatusController });
}(window));
