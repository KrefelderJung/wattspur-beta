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

        function renderValidation() {
            const elements = getElements();
            if (!elements.validation || !elements.statusBadge) return;
            const checks = evaluate();
            elements.validation.innerHTML = checks.map(check => {
                const icon = check.level === 'ok' ? '✓'
                    : check.level === 'error' ? '!'
                        : check.level === 'warning' ? '△' : '·';
                return `<div class="mk-validation-item ${check.level}"><span>${icon}</span><p>${escapeHtml(check.text)}</p></div>`;
            }).join('');
            const hasError = checks.some(check => check.level === 'error');
            const hasWarning = checks.some(check => check.level === 'warning');
            const state = hasError ? 'error'
                : hasWarning ? 'warning'
                    : checks.some(check => check.level === 'ok') ? 'ok' : 'neutral';
            const labels = { error: 'Prüfen', warning: 'Hinweis', ok: 'Unauffällig', neutral: 'Bereit' };
            elements.statusBadge.className = `mk-status-badge ${state}`;
            elements.statusBadge.textContent = labels[state];
        }

        function refresh() {
            renderValidation();
        }

        return Object.freeze({ evaluate, renderValidation, refresh });
    }

    global.WattspurMesskonzeptValidationStatus = Object.freeze({ createValidationStatusController });
}(window));
