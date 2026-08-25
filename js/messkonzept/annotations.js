/*
 * Wattspur Messkonzept – verschiebbare Objekt-Infokarten
 *
 * Diese Darstellungsschicht kennt nur Objektangaben, DOM-Anker und die
 * gespeicherten Kartenpositionen. Sie verändert weder Topologie noch
 * Leitungsgeometrie. Die gleiche HTML/SVG-Schicht wird im PDF mitkopiert.
 */
(function exposeMesskonzeptAnnotations(global) {
    'use strict';

    function createAnnotationController(options = {}) {
        const getState = options.getState || (() => ({}));
        const getElements = options.getElements || (() => ({}));
        const getDocument = options.getDocument || (() => global.document);
        const getMeterDetails = options.getMeterDetails || (() => ({}));
        const getAdditionalMeters = options.getAdditionalMeters || (() => []);
        const getMeterDetailIndex = options.getMeterDetailIndex || (() => null);
        const getMeterLabel = options.getMeterLabel || (meter => meter?.id || 'Zähler');
        const getAssetAnnotationEntries = options.getAssetAnnotationEntries || (() => []);
        const getStageScale = options.getStageScale || (() => 1);
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
        const meterDetailFields = options.meterDetailFields || [];
        const captureHistoryState = options.captureHistoryState || (() => null);
        const recordHistory = options.recordHistory || (() => {});
        const refreshInlineStatus = options.refreshInlineStatus || (() => {});
        const updateAssetField = options.updateAssetField || (() => {});
        const updateHakField = options.updateHakField || (() => {});
        const render = options.render || (() => {});

        let activeDrag = null;
        let activeResize = null;

        function findCard(cards, key) {
            return [...(cards?.querySelectorAll?.('.mk-annotation-card') || [])]
                .find(card => card.dataset.mkAnnotation === key || card.dataset.mkMeterAnnotation === key) || null;
        }

        function ensurePositionStore() {
            const state = getState();
            if (!state.meterAnnotationPositions || typeof state.meterAnnotationPositions !== 'object') {
                state.meterAnnotationPositions = {};
            }
            return state.meterAnnotationPositions;
        }

        function getRecords() {
            const state = getState() || {};
            const baseCount = state.mode === 'parallel'
                ? Math.max(1, Number(state.cascadeLevels) || 1)
                : 1;
            const records = [];
            for (let index = 0; index < baseCount; index += 1) {
                records.push({
                    key: `base:${index}`,
                    kind: 'meter',
                    index,
                    label: `Z${index + 1}`,
                    meter: null,
                    isBase: true,
                    visible: (getMeterDetails(index) || {}).annotationVisible !== false
                });
            }
            getAdditionalMeters().forEach(meter => {
                const index = getMeterDetailIndex(meter);
                if (!Number.isInteger(index)) return;
                records.push({
                    key: `meter:${meter.id}`,
                    kind: 'meter',
                    index,
                    label: getMeterLabel(meter) || `Z${index + 1}`,
                    meter,
                    isBase: false,
                    visible: (getMeterDetails(index) || {}).annotationVisible !== false
                });
            });
            (state.assets || []).filter(asset => asset.type !== 'meter').forEach(asset => {
                records.push({
                    key: `asset:${asset.id}`,
                    kind: 'asset',
                    asset,
                    label: asset.name || 'Objekt',
                    visible: asset.annotationVisible !== false
                });
            });
            if (state.hak) {
                records.push({
                    key: 'hak',
                    kind: 'hak',
                    label: 'Hausanschlusskasten',
                    visible: state.hak.annotationVisible !== false,
                    hak: state.hak
                });
            }
            return records;
        }

        function getEntries(record) {
            if (record.kind === 'asset') {
                return (getAssetAnnotationEntries(record.asset) || []).map(entry => ({
                    ...entry,
                    key: entry.key || getAssetEntryFieldKey(record.asset, entry)
                }));
            }
            if (record.kind === 'hak') {
                const entries = [];
                const voltageLabel = record.hak?.voltageLevel === 'medium'
                    ? 'Mittelspannung'
                    : '';
                if (voltageLabel) entries.push({ key: 'voltageLevel', label: 'Spannungsebene', value: voltageLabel });
                if (String(record.hak?.remark || '').trim()) {
                    entries.push({ key: 'remark', label: 'Bemerkung', value: String(record.hak.remark).trim() });
                }
                return entries;
            }
            const details = getMeterDetails(record.index) || {};
            const entries = meterDetailFields
                .map(field => ({
                    key: field.key,
                    label: field.label,
                    value: String(details[field.key] || '').trim()
                }))
                .filter(entry => entry.value);
            return entries;
        }

        function getAssetEntryFieldKey(asset, entry) {
            const label = String(entry?.label || '').trim();
            if (label === 'Bemerkung') return 'remark';
            if (label === 'Nennleistung' || label === 'Leistung' || label === 'Elektrische Gesamtleistung inkl. Heizstab') return 'power';
            if (label === 'Inbetriebnahme' || label === 'Bestand / Inbetriebnahme') return 'commissioningDate';
            if (label === 'Wechselrichterleistung') return asset?.type === 'storage' ? 'storageInverterPower' : 'inverterPower';
            if (label === '§14a-Modul') return 'steuveModule';
            if (label === 'Speicherkapazität') return 'storageCapacity';
            if (label === 'Max. Ladeleistung') return 'storageChargePower';
            if (label === 'Netzeinspeisung') return 'storageGridFeedIn';
            if (label === 'Netzbezug zum Laden') return 'storageGridImport';
            return '';
        }
        function getVisibleRecords() {
            return getRecords()
                .map(record => ({ ...record, entries: getEntries(record) }))
                .filter(record => record.visible && record.entries.length);
        }

        function getTargetElement(stage, record) {
            if (record.kind === 'hak') return stage.querySelector('[data-mk-select-hak]');
            if (record.kind === 'asset') {
                return [...stage.querySelectorAll('[data-mk-select-asset]')]
                    .find(element => element.dataset.mkSelectAsset === record.asset?.id) || null;
            }
            const candidates = [...stage.querySelectorAll('[data-mk-select-meter]')];
            return candidates.find(element => {
                if (!record.isBase && element.dataset.mkMeterId !== record.meter?.id) return false;
                if (record.isBase && element.dataset.mkMeterId) return false;
                return Number(element.dataset.mkSelectMeter) === record.index
                    && element.matches('.mk-meter-node, .mk-meter-detail-card, .mk-generation-meter, .mk-rail-meter');
            }) || null;
        }

        function getLayerParts(stage) {
            const layer = stage?.querySelector('.mk-meter-annotation-layer');
            if (!layer) return null;
            const connector = layer.querySelector('.mk-meter-annotation-connectors');
            const cards = layer.querySelector('.mk-meter-annotation-cards');
            return connector && cards ? { layer, connector, cards } : null;
        }

        function getTopologyContentHeight(stage) {
            const topology = stage?.querySelector?.('.mk-topology-content');
            const connector = stage?.querySelector?.('.mk-connector-layer');
            const connectorHeight = Number.parseFloat(connector?.getAttribute?.('height') || '0') || 0;
            const storedHeight = Number.parseFloat(stage?.dataset?.mkTopologyContentHeight || '0') || 0;
            return Math.max(topology?.offsetHeight || 0, topology?.scrollHeight || 0, storedHeight, storedHeight ? 0 : connectorHeight, 1);
        }

        function getTopologyContentWidth(stage) {
            const topology = stage?.querySelector?.('.mk-topology-content');
            const connector = stage?.querySelector?.('.mk-connector-layer');
            const connectorWidth = Number.parseFloat(connector?.getAttribute?.('width') || '0') || 0;
            const storedWidth = Number.parseFloat(stage?.dataset?.mkTopologyContentWidth || '0') || 0;
            return Math.max(topology?.offsetWidth || 0, topology?.scrollWidth || 0, storedWidth, storedWidth ? 0 : connectorWidth, 1);
        }

        function getWorkspaceGutters(stage) {
            const read = name => Math.max(0, Number.parseFloat(stage?.style?.getPropertyValue(name) || '0') || 0);
            return {
                left: read('--mk-annotation-gutter-left'),
                right: read('--mk-annotation-gutter-right'),
                top: read('--mk-annotation-gutter-top'),
                bottom: read('--mk-annotation-gutter-bottom')
            };
        }

        function applyAnnotationWorkspace(stage, gutters, { preserveScroll = true } = {}) {
            if (!stage) return;
            const current = getWorkspaceGutters(stage);
            const next = {
                left: Math.max(0, Number(gutters.left) || 0),
                right: Math.max(0, Number(gutters.right) || 0),
                top: Math.max(0, Number(gutters.top) || 0),
                bottom: Math.max(0, Number(gutters.bottom) || 0)
            };
            const canvas = getElements().canvas;
            stage.style.setProperty('--mk-annotation-gutter-left', `${Math.ceil(next.left)}px`);
            stage.style.setProperty('--mk-annotation-gutter-right', `${Math.ceil(next.right)}px`);
            stage.style.setProperty('--mk-annotation-gutter-top', `${Math.ceil(next.top)}px`);
            stage.style.setProperty('--mk-annotation-gutter-bottom', `${Math.ceil(next.bottom)}px`);

            const baseWidth = getTopologyContentWidth(stage);
            const baseHeight = getTopologyContentHeight(stage);
            if (next.right > 0) stage.style.minWidth = `${Math.ceil(baseWidth + next.right)}px`;
            else stage.style.removeProperty('min-width');
            // Ein oberer Arbeitsraum liegt außerhalb des ursprünglichen
            // Bühnenursprungs. Die positive Mindesthöhe stellt sicher, dass
            // dieser Raum auch als vertikaler Scrollbereich berücksichtigt
            // wird. Der obere Rand darf nicht nur optisch als Margin wirken.
            if (next.top > 0 || next.bottom > 0) {
                stage.style.minHeight = `${Math.ceil(baseHeight + next.top + next.bottom)}px`;
            } else {
                stage.style.removeProperty('min-height');
            }

            // Linker und oberer Arbeitsraum liegen vor dem Bühnenursprung.
            // Die Scrollposition wird um genau diese Differenz nachgeführt,
            // damit die Topologie beim Erweitern sichtbar stehen bleibt.
            if (preserveScroll && canvas) {
                canvas.scrollLeft += next.left - current.left;
                canvas.scrollTop += next.top - current.top;
            }
        }

        function getWorkspaceRequirements(stage, records = [], cardMap = new Map(), extra = null) {
            const baseWidth = getTopologyContentWidth(stage);
            const baseHeight = getTopologyContentHeight(stage);
            const requirements = { left: 0, right: 0, top: 0, bottom: 0 };
            const include = (x, y, width, height) => {
                const cardWidth = Math.max(1, Number(width) || 160);
                const cardHeight = Math.max(1, Number(height) || 60);
                const positionX = Number(x) || 0;
                const positionY = Number(y) || 0;
                requirements.left = Math.max(requirements.left, 6 - positionX);
                requirements.right = Math.max(requirements.right, positionX + cardWidth + 6 - baseWidth);
                requirements.top = Math.max(requirements.top, 6 - positionY);
                requirements.bottom = Math.max(requirements.bottom, positionY + cardHeight + 6 - baseHeight);
            };
            records.forEach(record => {
                const saved = getSavedPosition(record.key);
                if (!saved?.manual) return;
                const card = cardMap.get(record.key);
                include(saved.x, saved.y, card?.offsetWidth, card?.offsetHeight);
            });
            if (extra) include(extra.x, extra.y, extra.width, extra.height);
            return {
                left: Math.max(0, requirements.left),
                right: Math.max(0, requirements.right),
                top: Math.max(0, requirements.top),
                bottom: Math.max(0, requirements.bottom)
            };
        }

        function getStageMetrics(stage) {
            const scale = Math.max(0.01, Number(getStageScale(stage)) || 1);
            const stageRect = stage.getBoundingClientRect();
            const gutters = getWorkspaceGutters(stage);
            const width = Math.max(getTopologyContentWidth(stage) + gutters.right, 1);
            const height = Math.max(getTopologyContentHeight(stage) + gutters.bottom, 1);
            return {
                scale,
                stageRect,
                width,
                height,
                minX: 6 - gutters.left,
                minY: 6 - gutters.top
            };
        }

        function ensureAnnotationWorkspace(stage, requirements = {}) {
            if (!stage) return;
            const topologyWidth = getTopologyContentWidth(stage);
            const topologyHeight = getTopologyContentHeight(stage);
            stage.dataset.mkTopologyContentWidth = String(Math.ceil(topologyWidth));
            stage.dataset.mkTopologyContentHeight = String(Math.ceil(topologyHeight));
            applyAnnotationWorkspace(stage, requirements);
        }

        function updateAnnotationContentHeight(stage, records, cardMap) {
            if (!records.length) {
                delete stage.dataset.mkAnnotationContentHeight;
                return;
            }
            const bottom = records.reduce((max, record) => {
                const card = cardMap.get(record.key);
                if (!card) return max;
                const y = Number.parseFloat(card.style.top) || 0;
                return Math.max(max, y + (card.offsetHeight || 60) + 6);
            }, 0);
            stage.dataset.mkAnnotationContentHeight = String(Math.ceil(bottom));
        }

        function getTargetPoint(stage, target, metrics) {
            if (!target?.getBoundingClientRect) return null;
            const rect = target.getBoundingClientRect();
            return {
                x: (rect.left - metrics.stageRect.left + rect.width / 2) / metrics.scale,
                y: (rect.top - metrics.stageRect.top + rect.height / 2) / metrics.scale
            };
        }

        function getTargetEdgePoint(stage, target, metrics, toward) {
            const center = getTargetPoint(stage, target, metrics);
            if (!center || !toward) return center;
            const rect = target.getBoundingClientRect?.();
            if (!rect) return center;
            const dx = Number(toward.x) - center.x;
            const dy = Number(toward.y) - center.y;
            if (!dx && !dy) return center;
            const halfWidth = rect.width / (2 * metrics.scale);
            const halfHeight = rect.height / (2 * metrics.scale);
            const scaleX = dx ? halfWidth / Math.abs(dx) : Infinity;
            const scaleY = dy ? halfHeight / Math.abs(dy) : Infinity;
            const edgeScale = Math.min(scaleX, scaleY);
            return {
                x: center.x + dx * edgeScale,
                y: center.y + dy * edgeScale
            };
        }

        function clampPosition(stage, card, x, y, metrics) {
            const cardWidth = Math.max(1, card.offsetWidth || 160);
            const cardHeight = Math.max(1, card.offsetHeight || 60);
            const margin = 6;
            return {
                x: Math.max(metrics.minX ?? margin, Math.min(metrics.width - cardWidth - margin, Number(x) || 0)),
                y: Math.max(metrics.minY ?? margin, Math.min(metrics.height - cardHeight - margin, Number(y) || 0))
            };
        }

        function getSavedPosition(key) {
            const saved = ensurePositionStore()[key];
            return saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))
                ? { x: Number(saved.x), y: Number(saved.y), manual: Boolean(saved.manual) }
                : null;
        }

        function setSavedPosition(key, position, manual = true) {
            const current = ensurePositionStore()[key] || {};
            ensurePositionStore()[key] = {
                ...current,
                x: Math.round(position.x),
                y: Math.round(position.y),
                manual: Boolean(manual)
            };
        }

        function getSavedSize(key) {
            const saved = ensurePositionStore()[key];
            return saved && Number.isFinite(Number(saved.width)) && Number.isFinite(Number(saved.height))
                ? { width: Number(saved.width), height: Number(saved.height) }
                : null;
        }

        function setSavedSize(key, size) {
            const current = ensurePositionStore()[key] || {};
            ensurePositionStore()[key] = {
                ...current,
                width: Math.round(size.width),
                height: Math.round(size.height)
            };
        }

        function getAutomaticCandidates(record, target, card, metrics) {
            const targetPoint = getTargetPoint(null, target, metrics);
            if (!targetPoint) return [{ x: 8, y: 8 }];
            const cardWidth = Math.max(1, card.offsetWidth || 160);
            const cardHeight = Math.max(1, card.offsetHeight || 60);
            // Infoboxen starten bewusst mit doppeltem Abstand unten links.
            // Dort bleiben die Hauptschienen und die neu angelegten Objekte
            // in der Regel frei zugänglich. Der Benutzer kann die Karte
            // anschließend weiterhin beliebig verschieben.
            const gap = 48;
            return [
                { x: targetPoint.x - cardWidth - gap, y: targetPoint.y + gap },
                { x: targetPoint.x - cardWidth - gap, y: targetPoint.y - cardHeight - gap },
                { x: targetPoint.x + gap, y: targetPoint.y + gap },
                { x: targetPoint.x + gap, y: targetPoint.y - cardHeight - gap }
            ];
        }

        function getPreferredAutomaticCandidate(record, target, card, metrics) {
            const candidates = getAutomaticCandidates(record, target, card, metrics);
            const cardWidth = Math.max(1, card.offsetWidth || 160);
            const cardHeight = Math.max(1, card.offsetHeight || 60);
            const visible = candidate => candidate.x >= 6
                && candidate.y >= 6
                && candidate.x + cardWidth <= metrics.width - 6
                && candidate.y + cardHeight <= metrics.height - 6;
            return candidates.find(visible)
                || candidates.find(candidate => candidate.x >= 6 && candidate.y >= 6)
                || { x: 6, y: 6 };
        }

        function getAutomaticPosition(record, target, card, metrics) {
            const position = getPreferredAutomaticCandidate(record, target, card, metrics);
            return clampPosition(null, card, position.x, position.y, metrics);
        }

        function applyCardPosition(card, position) {
            card.style.left = `${Math.round(position.x)}px`;
            card.style.top = `${Math.round(position.y)}px`;
        }

        function applyCardSize(card, size) {
            if (!card || !size) return;
            card.style.width = `${Math.round(size.width)}px`;
            card.style.height = `${Math.round(size.height)}px`;
        }

        function renderCard(record, entries) {
            const values = renderEntryValues(entries);
            const aria = `${record.label}: ${entries.map(entry => `${entry.label} ${entry.value}`).join(', ')}`;
            const title = record.kind === 'meter'
                ? 'Infobox verschieben · Größe unten rechts ändern · Werte doppelklicken zum Bearbeiten'
                : 'Infobox verschieben';
            return `<article class="mk-meter-annotation-card mk-annotation-card" data-mk-annotation="${escapeHtml(record.key)}" data-mk-meter-annotation="${escapeHtml(record.key)}" data-mk-meter-annotation-editable="true" role="group" tabindex="0" aria-label="${escapeHtml(aria)}" title="${title}">
                <button type="button" class="mk-annotation-dismiss" data-mk-annotation-dismiss="${escapeHtml(record.key)}" aria-label="Infobox ausblenden" title="Infobox ausblenden">×</button>
                <button type="button" class="mk-annotation-resize-handle" data-mk-annotation-resize="${escapeHtml(record.key)}" aria-label="Infoboxgröße ändern" title="Infoboxgröße ändern"></button>
                <div class="mk-meter-annotation-values">${values}</div>
            </article>`;
        }

        function renderEntryValues(entries) {
            return entries.map(entry => `<span class="mk-meter-annotation-value" data-mk-meter-annotation-field="${escapeHtml(entry.key)}" tabindex="0" title="${escapeHtml(entry.label)} · Doppelklicken zum Bearbeiten">${escapeHtml(entry.value)}</span>`).join('');
        }

        function getRecordForCard(card) {
            const key = card?.dataset?.mkAnnotation || card?.dataset?.mkMeterAnnotation;
            return getRecords().find(item => item.key === key) || null;
        }

        function getInlineField(record, valueNode) {
            const fieldKey = valueNode?.dataset?.mkMeterAnnotationField;
            if (!fieldKey) return null;
            if (record?.kind === 'meter') {
                return meterDetailFields.find(item => item.key === fieldKey) || null;
            }
            if (record?.kind === 'asset') {
                return {
                    key: fieldKey,
                    label: valueNode.textContent.trim() || fieldKey,
                    type: fieldKey === 'remark' ? 'textarea' : fieldKey === 'commissioningDate' ? 'date' : 'text',
                    maxLength: fieldKey === 'remark' ? 240 : 120,
                    rows: fieldKey === 'remark' ? 3 : undefined
                };
            }
            if (record?.kind === 'hak') {
                return fieldKey === 'voltageLevel'
                    ? { key: fieldKey, label: 'Spannungsebene', type: 'select' }
                    : { key: fieldKey, label: 'Bemerkung', type: 'textarea', maxLength: 240, rows: 3 };
            }
            return null;
        }

        function getInlineValue(record, field) {
            if (record?.kind === 'meter') return String((getMeterDetails(record.index) || {})[field.key] || '');
            if (record?.kind === 'asset') return String(record.asset?.[field.key] || '');
            if (record?.kind === 'hak') return String(record.hak?.[field.key] || '');
            return '';
        }

        function beginInlineEdit(card, valueNode) {
            if (!card || !valueNode || card.querySelector('.mk-meter-annotation-inline-editor')) return;
            const record = getRecordForCard(card);
            const field = getInlineField(record, valueNode);
            if (!record || !field) return;
            const before = captureHistoryState();
            const previousCardStyle = {
                width: card.style.width,
                height: card.style.height,
                maxHeight: card.style.maxHeight,
                overflow: card.style.overflow
            };
            const wasInlineEditing = card.classList.contains('is-inline-editing');
            const control = getDocument().createElement(field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input');
            control.className = 'mk-meter-annotation-inline-editor';
            control.value = getInlineValue(record, field);
            control.setAttribute('aria-label', field.label);
            if (field.maxLength) control.maxLength = field.maxLength;
            if (field.rows) control.rows = field.rows;
            if (field.type === 'select') {
                control.innerHTML = '<option value="low">Niederspannung</option><option value="medium">Mittelspannung</option>';
            } else if (field.type !== 'textarea') {
                control.type = field.type;
            }
            valueNode.replaceWith(control);
            card.classList.add('is-inline-editing');
            // Die gespeicherte Größe bleibt unverändert. Nur für die Bearbeitung
            // wird die Karte geöffnet, damit mehrzeilige Bemerkungen vollständig
            // sichtbar sind und nicht in einem kleinen Textfeld scrollen müssen.
            card.style.width = 'max-content';
            card.style.height = 'auto';
            card.style.maxHeight = 'none';
            card.style.overflow = 'visible';
            let finished = false;
            const restoreCardStyle = () => {
                card.classList.toggle('is-inline-editing', wasInlineEditing);
                card.style.width = previousCardStyle.width;
                card.style.height = previousCardStyle.height;
                card.style.maxHeight = previousCardStyle.maxHeight;
                card.style.overflow = previousCardStyle.overflow;
            };
            const expandTextarea = () => {
                if (finished || field.type !== 'textarea' || !control.isConnected) return;
                control.style.height = 'auto';
                control.style.overflowY = 'hidden';
                control.style.height = `${Math.max(control.scrollHeight, 64)}px`;
            };
            const cleanup = () => {
                getDocument().removeEventListener('pointerdown', finishOnOutsidePointerDown, true);
            };
            const finishOnOutsidePointerDown = event => {
                if (event.target === control || control.contains(event.target)) return;
                commit();
            };
            const cancel = () => {
                if (finished) return;
                finished = true;
                cleanup();
                restoreCardStyle();
                sync();
            };
            const commit = () => {
                if (finished) return;
                finished = true;
                if (record.kind === 'meter') {
                    const details = getMeterDetails(record.index) || {};
                    details[field.key] = control.value;
                } else if (record.kind === 'asset') {
                    updateAssetField(record.asset, field.key, control.value);
                } else if (record.kind === 'hak') {
                    updateHakField(field.key, control.value);
                }
                cleanup();
                restoreCardStyle();
                if (before) recordHistory(before);
                render();
                refreshInlineStatus();
                sync();
            };
            control.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cancel();
                    return;
                }
                if (event.key === 'Enter' && (field.type !== 'textarea' || event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    commit();
                }
            });
            control.addEventListener('blur', commit, { once: true });
            control.addEventListener('pointerdown', event => event.stopPropagation());
            control.addEventListener('dblclick', event => event.stopPropagation());
            getDocument().addEventListener('pointerdown', finishOnOutsidePointerDown, true);
            control.focus();
            if (control.select && field.type !== 'select') control.select();
            const requestFrame = getDocument()?.defaultView?.requestAnimationFrame || global.requestAnimationFrame;
            if (typeof requestFrame === 'function') requestFrame(expandTextarea);
            else expandTextarea();
        }

        function getCardMap(cards) {
            return new Map([...cards.querySelectorAll('.mk-annotation-card')]
                .map(card => [card.dataset.mkAnnotation || card.dataset.mkMeterAnnotation, card]));
        }

        function setAnnotationVisibility(record, visible) {
            if (!record) return;
            const before = captureHistoryState();
            if (record.kind === 'meter') {
                const details = getMeterDetails(record.index);
                if (details) details.annotationVisible = Boolean(visible);
            } else if (record.kind === 'asset' && record.asset) {
                record.asset.annotationVisible = Boolean(visible);
            } else if (record.kind === 'hak') {
                const state = getState() || {};
                if (!state.hak) state.hak = {};
                state.hak.annotationVisible = Boolean(visible);
            }
            if (before) recordHistory(before);
            refreshInlineStatus();
            sync();
        }

        function updateConnectors(stage, records, cardMap, metrics, connector) {
            const paths = [];
            const minX = Math.min(0, metrics.minX || 0);
            const minY = Math.min(0, metrics.minY || 0);
            const width = Math.max(metrics.width - minX, stage.offsetWidth - minX || 1);
            const height = Math.max(metrics.height - minY, stage.offsetHeight - minY || 1);
            connector.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
            connector.setAttribute('width', String(width));
            connector.setAttribute('height', String(height));
            connector.style.setProperty('left', `${minX}px`);
            connector.style.setProperty('top', `${minY}px`);
            connector.style.setProperty('right', 'auto');
            connector.style.setProperty('bottom', 'auto');
            connector.style.setProperty('width', `${width}px`);
            connector.style.setProperty('height', `${height}px`);
            records.forEach(record => {
                const card = cardMap.get(record.key);
                const target = getTargetElement(stage, record);
                if (!card || !target) return;
                const cardX = Number.parseFloat(card.style.left) || 0;
                const cardY = Number.parseFloat(card.style.top) || 0;
                const cardWidth = card.offsetWidth || 160;
                const cardHeight = card.offsetHeight || 60;
                const cardCenterX = cardX + cardWidth / 2;
                const cardCenterY = cardY + cardHeight / 2;
                const targetPoint = getTargetEdgePoint(stage, target, metrics, { x: cardCenterX, y: cardCenterY });
                if (!targetPoint) return;
                const endX = cardCenterX >= targetPoint.x ? cardX : cardX + cardWidth;
                const endY = Math.max(cardY + 10, Math.min(cardY + cardHeight - 10, targetPoint.y));
                const controlX = targetPoint.x + (endX - targetPoint.x) * 0.45;
                const d = `M ${targetPoint.x} ${targetPoint.y} C ${targetPoint.x} ${targetPoint.y}, ${controlX} ${endY}, ${endX} ${endY}`;
                paths.push(`<path class="mk-meter-annotation-connector" d="${d}" />`);
            });
            connector.innerHTML = paths.join('');
        }

        function sync() {
            const canvas = getElements().canvas;
            const stage = canvas?.querySelector('.mk-canvas-stage');
            const parts = getLayerParts(stage);
            if (!stage || !parts) return;
            const records = getVisibleRecords();
            const activeKeys = new Set(records.map(record => record.key));
            const cardMap = getCardMap(parts.cards);
            cardMap.forEach((card, key) => {
                if (!activeKeys.has(key)) card.remove();
            });
            records.forEach(record => {
                let card = cardMap.get(record.key);
                if (!card) {
                    parts.cards.insertAdjacentHTML('beforeend', renderCard(record, record.entries));
                    card = findCard(parts.cards, record.key);
                } else {
                    const values = card.querySelector('.mk-meter-annotation-values');
                    if (values) values.innerHTML = renderEntryValues(record.entries);
                    card.setAttribute('aria-label', `${record.label}: ${record.entries.map(entry => `${entry.label} ${entry.value}`).join(', ')}`);
                }
                if (!card) return;
                const savedSize = getSavedSize(record.key);
                if (savedSize) applyCardSize(card, savedSize);
            });
            const renderedCards = getCardMap(parts.cards);
            let workspaceRequirements = getWorkspaceRequirements(stage, records, renderedCards);
            const initialMetrics = getStageMetrics(stage);
            records.forEach(record => {
                if (getSavedPosition(record.key)?.manual) return;
                const card = renderedCards.get(record.key);
                const target = getTargetElement(stage, record);
                if (!card || !target) return;
                const candidate = getPreferredAutomaticCandidate(record, target, card, initialMetrics);
                if (!candidate) return;
                const next = getWorkspaceRequirements(stage, records, renderedCards, {
                    x: candidate.x,
                    y: candidate.y,
                    width: card.offsetWidth || 160,
                    height: card.offsetHeight || 60
                });
                workspaceRequirements = {
                    left: Math.max(workspaceRequirements.left, next.left),
                    right: Math.max(workspaceRequirements.right, next.right),
                    top: Math.max(workspaceRequirements.top, next.top),
                    bottom: Math.max(workspaceRequirements.bottom, next.bottom)
                };
            });
            ensureAnnotationWorkspace(stage, workspaceRequirements);
            const metrics = getStageMetrics(stage);
            records.forEach(record => {
                const card = findCard(parts.cards, record.key);
                if (!card) return;
                const target = getTargetElement(stage, record);
                const saved = getSavedPosition(record.key);
                const position = saved?.manual
                    ? clampPosition(stage, card, saved.x, saved.y, metrics)
                    : getAutomaticPosition(record, target, card, metrics);
                applyCardPosition(card, position);
            });
            updateAnnotationContentHeight(stage, records, getCardMap(parts.cards));
            updateConnectors(stage, records, getCardMap(parts.cards), metrics, parts.connector);
        }

        function updatePositionFromPointer(event) {
            if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
            const stage = getElements().canvas?.querySelector('.mk-canvas-stage');
            if (!stage) return;
            const metrics = getStageMetrics(stage);
            const candidateX = activeDrag.startPosition.x + (event.clientX - activeDrag.startX) / metrics.scale;
            const candidateY = activeDrag.startPosition.y + (event.clientY - activeDrag.startY) / metrics.scale;
            const records = getVisibleRecords();
            const parts = getLayerParts(stage);
            const cardMap = parts ? getCardMap(parts.cards) : new Map();
            ensureAnnotationWorkspace(stage, getWorkspaceRequirements(stage, records, cardMap, {
                x: candidateX,
                y: candidateY,
                width: activeDrag.card.offsetWidth || 160,
                height: activeDrag.card.offsetHeight || 60
            }));
            const nextMetrics = getStageMetrics(stage);
            const next = clampPosition(stage, activeDrag.card,
                candidateX,
                candidateY,
                nextMetrics);
            setSavedPosition(activeDrag.key, next, true);
            applyCardPosition(activeDrag.card, next);
            if (parts) {
                updateAnnotationContentHeight(stage, records, cardMap);
                updateConnectors(stage, records, cardMap, nextMetrics, parts.connector);
            }
            activeDrag.moved = true;
            event.preventDefault();
        }

        function updateSizeFromPointer(event) {
            if (!activeResize || event.pointerId !== activeResize.pointerId) return;
            const stage = getElements().canvas?.querySelector('.mk-canvas-stage');
            if (!stage) return;
            const metrics = getStageMetrics(stage);
            const card = activeResize.card;
            const currentX = Number.parseFloat(card.style.left) || 6;
            const currentY = Number.parseFloat(card.style.top) || 6;
            const minWidth = 120;
            const minHeight = 48;
            const requestedWidth = activeResize.startSize.width + (event.clientX - activeResize.startX) / metrics.scale;
            const requestedHeight = activeResize.startSize.height + (event.clientY - activeResize.startY) / metrics.scale;
            const records = getVisibleRecords();
            const parts = getLayerParts(stage);
            const cardMap = parts ? getCardMap(parts.cards) : new Map();
            ensureAnnotationWorkspace(stage, getWorkspaceRequirements(stage, records, cardMap, {
                x: currentX,
                y: currentY,
                width: requestedWidth,
                height: requestedHeight
            }));
            const nextMetrics = getStageMetrics(stage);
            const maxWidth = Math.max(minWidth, nextMetrics.width - currentX - 6);
            const maxHeight = Math.max(minHeight, nextMetrics.height - currentY - 6);
            const width = Math.max(minWidth, Math.min(maxWidth, requestedWidth));
            const height = Math.max(minHeight, Math.min(maxHeight,
                requestedHeight));
            applyCardSize(card, { width, height });
            // Schmale Karten können durch den automatischen Zeilenumbruch mehr
            // Höhe benötigen als der Griff gerade vorgibt. Text wird nicht
            // abgeschnitten, die Karte wächst in diesem Fall minimal mit.
            const requiredHeight = card.scrollHeight || height;
            const adjustedHeight = Math.max(height, Math.min(maxHeight, requiredHeight));
            if (adjustedHeight !== height) applyCardSize(card, { width, height: adjustedHeight });
            setSavedSize(activeResize.key, { width, height: adjustedHeight });
            if (parts) {
                updateAnnotationContentHeight(stage, records, cardMap);
                updateConnectors(stage, records, cardMap, nextMetrics, parts.connector);
            }
            activeResize.moved = true;
            event.preventDefault();
        }

        function schedulePointerUpdate(kind, event) {
            const active = kind === 'drag' ? activeDrag : activeResize;
            if (!active || event.pointerId !== active.pointerId) return;
            active.pending = {
                pointerId: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                preventDefault() {}
            };
            event.preventDefault();
            if (active.frame !== null) return;
            const view = getDocument().defaultView || global;
            const run = () => {
                active.frame = null;
                const pending = active.pending;
                active.pending = null;
                if (!pending) return;
                if (kind === 'drag') updatePositionFromPointer(pending);
                else updateSizeFromPointer(pending);
            };
            active.frame = typeof view.requestAnimationFrame === 'function'
                ? view.requestAnimationFrame(run)
                : view.setTimeout(run, 16);
            active.frameView = view;
        }

        function flushPointerUpdate(kind) {
            const active = kind === 'drag' ? activeDrag : activeResize;
            if (!active) return;
            if (active.frame !== null) {
                const view = active.frameView || getDocument().defaultView || global;
                view.cancelAnimationFrame?.(active.frame);
                view.clearTimeout?.(active.frame);
                active.frame = null;
            }
            const pending = active.pending;
            active.pending = null;
            if (!pending) return;
            if (kind === 'drag') updatePositionFromPointer(pending);
            else updateSizeFromPointer(pending);
        }
        function endPointerDrag(event) {
            flushPointerUpdate('drag');
            if (!activeDrag || (event?.pointerId !== undefined && event.pointerId !== activeDrag.pointerId)) return;
            const card = activeDrag.card;
            if (card?.hasPointerCapture?.(activeDrag.pointerId)) card.releasePointerCapture(activeDrag.pointerId);
            card?.classList.remove('is-dragging');
            if (activeDrag.moved && activeDrag.history) recordHistory(activeDrag.history);
            activeDrag = null;
        }

        function endPointerResize(event) {
            flushPointerUpdate('resize');
            if (!activeResize || (event?.pointerId !== undefined && event.pointerId !== activeResize.pointerId)) return;
            const card = activeResize.card;
            if (card?.hasPointerCapture?.(activeResize.pointerId)) card.releasePointerCapture(activeResize.pointerId);
            card?.classList.remove('is-resizing');
            if (activeResize.moved && activeResize.history) recordHistory(activeResize.history);
            activeResize = null;
        }

        function resizeCardBy(card, key, dx, dy) {
            const stage = getElements().canvas?.querySelector('.mk-canvas-stage');
            if (!stage || !card) return;
            const before = captureHistoryState();
            const currentX = Number.parseFloat(card.style.left) || 6;
            const currentY = Number.parseFloat(card.style.top) || 6;
            const current = getSavedSize(key) || { width: card.offsetWidth || 160, height: card.offsetHeight || 60 };
            const records = getVisibleRecords();
            const parts = getLayerParts(stage);
            const cardMap = parts ? getCardMap(parts.cards) : new Map();
            ensureAnnotationWorkspace(stage, getWorkspaceRequirements(stage, records, cardMap, {
                x: currentX,
                y: currentY,
                width: current.width + dx,
                height: current.height + dy
            }));
            const nextMetrics = getStageMetrics(stage);
            const next = {
                width: Math.max(120, Math.min(nextMetrics.width - currentX - 6, current.width + dx)),
                height: Math.max(48, Math.min(nextMetrics.height - currentY - 6, current.height + dy))
            };
            applyCardSize(card, next);
            const requiredHeight = card.scrollHeight || next.height;
            next.height = Math.max(next.height, Math.min(nextMetrics.height - currentY - 6, requiredHeight));
            applyCardSize(card, next);
            setSavedSize(key, next);
            if (parts) {
                updateAnnotationContentHeight(stage, records, cardMap);
                updateConnectors(stage, records, cardMap, nextMetrics, parts.connector);
            }
            recordHistory(before);
        }

        function nudgeCard(card, key, dx, dy) {
            const stage = getElements().canvas?.querySelector('.mk-canvas-stage');
            if (!stage) return;
            const before = captureHistoryState();
            const current = getSavedPosition(key) || { x: Number.parseFloat(card.style.left) || 6, y: Number.parseFloat(card.style.top) || 6 };
            const records = getVisibleRecords();
            const parts = getLayerParts(stage);
            const cardMap = parts ? getCardMap(parts.cards) : new Map();
            ensureAnnotationWorkspace(stage, getWorkspaceRequirements(stage, records, cardMap, {
                x: current.x + dx,
                y: current.y + dy,
                width: card.offsetWidth || 160,
                height: card.offsetHeight || 60
            }));
            const nextMetrics = getStageMetrics(stage);
            const next = clampPosition(stage, card, current.x + dx, current.y + dy, nextMetrics);
            setSavedPosition(key, next, true);
            applyCardPosition(card, next);
            if (parts) {
                updateAnnotationContentHeight(stage, records, cardMap);
                updateConnectors(stage, records, cardMap, nextMetrics, parts.connector);
            }
            recordHistory(before);
        }

        function bindLayer(layer) {
            if (!layer || layer.dataset.mkAnnotationBound === 'true') return;
            layer.dataset.mkAnnotationBound = 'true';
            layer.addEventListener('pointerdown', event => {
                const card = event.target.closest?.('.mk-meter-annotation-card');
                if (!card) return;
                const resizeHandle = event.target.closest?.('.mk-annotation-resize-handle');
                if (resizeHandle) {
                    const key = card.dataset.mkAnnotation || card.dataset.mkMeterAnnotation;
                    const saved = getSavedSize(key) || {
                        width: card.offsetWidth || 160,
                        height: card.offsetHeight || 60
                    };
                    activeResize = {
                        card,
                        key,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                        startSize: saved,
                        history: captureHistoryState(),
                        moved: false,
                    pending: null,
                    frame: null
                    };
                    card.classList.add('is-resizing');
                    card.setPointerCapture?.(event.pointerId);
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (event.target.closest?.('.mk-annotation-dismiss')) return;
                // Textwerte sind direkte Bearbeitungsziele. Sie dürfen den
                // Karten-Drag nicht starten, sonst wird der native Doppelklick
                // vom Pointer-Handler abgefangen und Inline-Bearbeitung bleibt
                // für Maus, Touch und Stift unzuverlässig.
                if (event.target.closest?.('.mk-meter-annotation-value')) return;
                const key = card.dataset.mkAnnotation || card.dataset.mkMeterAnnotation;
                const current = getSavedPosition(key) || {
                    x: Number.parseFloat(card.style.left) || 6,
                    y: Number.parseFloat(card.style.top) || 6
                };
                activeDrag = {
                    card,
                    key,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    startPosition: current,
                    history: captureHistoryState(),
                    moved: false,
                    pending: null,
                    frame: null
                };
                card.classList.add('is-dragging');
                card.setPointerCapture?.(event.pointerId);
                event.preventDefault();
                event.stopPropagation();
            });
            layer.addEventListener('pointermove', event => schedulePointerUpdate('drag', event), { passive: false });
            layer.addEventListener('pointermove', event => schedulePointerUpdate('resize', event), { passive: false });
            layer.addEventListener('pointerup', endPointerDrag);
            layer.addEventListener('pointerup', endPointerResize);
            layer.addEventListener('pointercancel', endPointerDrag);
            layer.addEventListener('pointercancel', endPointerResize);
            layer.addEventListener('click', event => {
                const dismiss = event.target.closest?.('.mk-annotation-dismiss');
                if (!dismiss) return;
                const card = dismiss.closest?.('.mk-annotation-card');
                const record = getRecordForCard(card);
                event.preventDefault();
                event.stopPropagation();
                setAnnotationVisibility(record, false);
            });
            layer.addEventListener('dblclick', event => {
                const card = event.target.closest?.('.mk-meter-annotation-card');
                const valueNode = event.target.closest?.('.mk-meter-annotation-value');
                if (!card || !valueNode) return;
                event.preventDefault();
                event.stopPropagation();
                beginInlineEdit(card, valueNode);
            });
            layer.addEventListener('keydown', event => {
                const card = event.target.closest?.('.mk-meter-annotation-card');
                if (!card) return;
                const valueNode = event.target.closest?.('.mk-meter-annotation-value');
                if (valueNode && event.key === 'Enter') {
                    event.preventDefault();
                    beginInlineEdit(card, valueNode);
                    return;
                }
                const resizeHandle = event.target.closest?.('.mk-annotation-resize-handle');
                if (resizeHandle) {
                    const card = resizeHandle.closest?.('.mk-meter-annotation-card');
                    const key = card?.dataset.mkAnnotation || card?.dataset.mkMeterAnnotation;
                    const step = event.shiftKey ? 20 : 8;
                    const deltas = {
                        ArrowLeft: [-step, 0], ArrowRight: [step, 0],
                        ArrowUp: [0, -step], ArrowDown: [0, step]
                    };
                    const delta = deltas[event.key];
                    if (!delta || !card || !key) return;
                    event.preventDefault();
                    resizeCardBy(card, key, delta[0], delta[1]);
                    return;
                }
                const step = event.shiftKey ? 10 : 3;
                const deltas = {
                    ArrowLeft: [-step, 0], ArrowRight: [step, 0],
                    ArrowUp: [0, -step], ArrowDown: [0, step]
                };
                const delta = deltas[event.key];
                if (!delta) return;
                event.preventDefault();
                nudgeCard(card, card.dataset.mkAnnotation || card.dataset.mkMeterAnnotation, delta[0], delta[1]);
            });
        }

        function ensureLayerMarkup() {
            const stage = getElements().canvas?.querySelector('.mk-canvas-stage');
            if (!stage) return null;
            let layer = stage.querySelector('.mk-meter-annotation-layer');
            if (!layer) {
                layer = getDocument().createElement('div');
                layer.className = 'mk-meter-annotation-layer';
                layer.setAttribute('aria-label', 'Eingetragene Infoboxen');
                layer.innerHTML = '<svg class="mk-meter-annotation-connectors" aria-hidden="true" focusable="false" preserveAspectRatio="none"></svg><div class="mk-meter-annotation-cards"></div>';
                stage.appendChild(layer);
            }
            bindLayer(layer);
            return layer;
        }

        function update() {
            ensureLayerMarkup();
            sync();
        }

        return Object.freeze({ update, sync, ensureLayerMarkup });
    }

    global.WattspurMesskonzeptAnnotations = Object.freeze({ createAnnotationController });
}(window));
