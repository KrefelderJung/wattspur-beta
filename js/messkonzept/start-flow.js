/*
 * Wattspur Messkonzept – Startfluss
 *
 * Diese Schicht verwaltet nur den Weg zwischen Werkzeugauswahl, Startvorlagen
 * und freiem Konfigurator. Sie kennt weder Messlogik noch Leitungsgeometrie.
 * Zustandsänderungen und Rendering werden über injizierte Callbacks geführt.
 */
(function exposeMesskonzeptStartFlow(global) {
    'use strict';

    function createStartFlowController(options = {}) {
        const getElements = options.getElements || (() => ({}));
        const getPresets = options.getPresets || (() => null);
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
        const getFlowChipClass = options.getFlowChipClass || (() => 'mk-start-flow-chip--neutral');
        const callbacks = options.callbacks || {};
        let initialized = false;

        const call = (name, ...args) => {
            const callback = callbacks[name];
            return typeof callback === 'function' ? callback(...args) : undefined;
        };

        function renderPresetInfo(groupId) {
            const info = getPresets()?.getGroupInfo?.(groupId);
            if (!info) return '';
            const renderList = items => `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
            const renderLinks = links => links?.length
                ? `<div class="mk-start-info-links"><span>Mehr erfahren:</span>${links.map(link => `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} ↗</a>`).join('')}</div>`
                : '';
            return `
                <p class="mk-start-info-intro">${escapeHtml(info.intro)}</p>
                <div class="mk-start-info-columns">
                    <div><strong>Vorteile</strong>${renderList(info.advantages)}</div>
                    <div><strong>Worauf achten?</strong>${renderList(info.cautions)}</div>
                </div>
                ${renderLinks(info.links)}
            `;
        }

        function renderPresetCards() {
            const startPanel = getElements()?.startPanel;
            const presets = getPresets();
            if (!startPanel || !presets?.getCatalog) return;
            startPanel.querySelectorAll('[data-mk-preset-group]').forEach(group => {
                const groupId = group.dataset.mkPresetGroup;
                const entries = presets.getCatalog().filter(entry => entry.group === groupId);
                const infoHost = group.closest('.mk-start-group')?.querySelector('[data-mk-preset-info]');
                if (infoHost) infoHost.innerHTML = renderPresetInfo(groupId);
                group.innerHTML = entries.map(entry => `
                    <button type="button" class="mk-start-card" data-mk-preset="${escapeHtml(entry.id)}" aria-label="${escapeHtml(`${entry.modelCode ? `${entry.modelCode}: ${entry.modelName}. ` : ''}Vorlage ${entry.title} laden.${entry.showSummary && entry.summary ? ` ${entry.summary}` : ''}`)}">
                        ${entry.modelCode ? `<span class="mk-start-card-model"><span class="mk-start-card-model-code">${escapeHtml(entry.modelCode)}:</span><span class="mk-start-card-model-name">${escapeHtml(entry.modelName)}</span></span>` : ''}
                        ${entry.showSummary && entry.summary ? `<span class="mk-start-card-summary">${escapeHtml(entry.summary)}</span>` : ''}
                        <span class="mk-start-card-flow" aria-hidden="true">${entry.flow.map(label => `<span class="mk-start-flow-chip ${getFlowChipClass(label)}">${escapeHtml(label)}</span>`).join('')}</span>
                    </button>
                `).join('');
                group.querySelectorAll('[data-mk-preset]').forEach(button => {
                    button.addEventListener('click', () => loadPreset(button.dataset.mkPreset));
                });
            });
        }

        function setBuilderVisibility(showBuilder) {
            const elements = getElements();
            elements.startPanel?.classList.toggle('hidden', showBuilder);
            elements.builderShell?.classList.toggle('hidden', !showBuilder);
        }

        function scrollToTop() {
            global.scrollTo?.({ top: 0, behavior: 'smooth' });
        }

        function showStartPanel() {
            renderPresetCards();
            setBuilderVisibility(false);
            scrollToTop();
        }

        function startFreeConfigurator() {
            call('reset');
            call('clearHistory');
            setBuilderVisibility(true);
            call('render');
        }

        function loadPreset(presetId) {
            try {
                call('applyPreset', presetId);
                call('clearHistory');
                setBuilderVisibility(true);
                call('render');
            } catch (error) {
                call('notify', error.message || 'Vorlage konnte nicht geladen werden.', 'error');
            }
        }

        function showScreen() {
            const { uploadScreen: upload, dashboardScreen: dashboard, messkonzeptScreen: screen } = getElements();
            upload?.classList.add('hidden');
            dashboard?.classList.add('hidden');
            screen?.classList.remove('hidden');
            showStartPanel();
            global.requestAnimationFrame?.(() => call('render'));
        }

        function hideScreen() {
            const { messkonzeptScreen: screen, uploadScreen: upload } = getElements();
            screen?.classList.add('hidden');
            upload?.classList.remove('hidden');
            scrollToTop();
        }

        function initialize() {
            if (initialized) return;
            initialized = true;
            renderPresetCards();
            setBuilderVisibility(false);
        }

        return Object.freeze({
            initialize,
            renderPresetCards,
            setBuilderVisibility,
            showStartPanel,
            startFreeConfigurator,
            loadPreset,
            showScreen,
            hideScreen
        });
    }

    global.WattspurMesskonzeptStartFlow = Object.freeze({ createStartFlowController });
}(window));
