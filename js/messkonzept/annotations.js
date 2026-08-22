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
        const getStageScale = options.getStageScale || (() => 1);
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
        const meterDetailFields = options.meterDetailFields || [];
        const captureHistoryState = options.captureHistoryState || (() => null);
        const recordHistory = options.recordHistory || (() => {});
        const refreshInlineStatus = options.refreshInlineStatus || (() => {});

        let activeDrag = null;

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
                return record.asset?.remark
                    ? [{ key: 'remark', label: 'Bemerkung', value: String(record.asset.remark).trim() }]
                    : [];
            }
            if (record.kind === 'hak') {
                return record.hak?.remark
                    ? [{ key: 'remark', label: 'Bemerkung', value: String(record.hak.remark).trim() }]
                    : [];
            }
            const details = getMeterDetails(record.index) || {};
            return meterDetailFields
                .map(field => ({
                    key: field.key,
                    label: field.label,
                    value: String(details[field.key] || '').trim()
                }))
                .filter(entry => entry.value);
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

        function getStageMetrics(stage) {
            const scale = Math.max(0.01, Number(getStageScale(stage)) || 1);
            const stageRect = stage.getBoundingClientRect();
            const width = Math.max(stage.offsetWidth || 0, stage.scrollWidth || 0, 1);
            const height = Math.max(stage.offsetHeight || 0, stage.scrollHeight || 0, 1);
            return { scale, stageRect, width, height };
        }

        function getTargetPoint(stage, target, metrics) {
            if (!target?.getBoundingClientRect) return null;
            const rect = target.getBoundingClientRect();
            return {
                x: (rect.left - metrics.stageRect.left + rect.width / 2) / metrics.scale,
                y: (rect.top - metrics.stageRect.top + rect.height / 2) / metrics.scale
            };
        }

        function clampPosition(stage, card, x, y, metrics) {
            const cardWidth = Math.max(1, card.offsetWidth || 160);
            const cardHeight = Math.max(1, card.offsetHeight || 60);
            const margin = 6;
            return {
                x: Math.max(margin, Math.min(metrics.width - cardWidth - margin, Number(x) || 0)),
                y: Math.max(margin, Math.min(metrics.height - cardHeight - margin, Number(y) || 0))
            };
        }

        function getSavedPosition(key) {
            const saved = ensurePositionStore()[key];
            return saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))
                ? { x: Number(saved.x), y: Number(saved.y), manual: Boolean(saved.manual) }
                : null;
        }

        function setSavedPosition(key, position, manual = true) {
            ensurePositionStore()[key] = {
                x: Math.round(position.x),
                y: Math.round(position.y),
                manual: Boolean(manual)
            };
        }

        function getAutomaticPosition(record, target, card, metrics) {
            const targetPoint = getTargetPoint(null, target, metrics);
            if (!targetPoint) return { x: 8, y: 8 };
            const cardWidth = Math.max(1, card.offsetWidth || 160);
            const cardHeight = Math.max(1, card.offsetHeight || 60);
            const gap = 24;
            const right = targetPoint.x + gap;
            const left = targetPoint.x - cardWidth - gap;
            const x = right + cardWidth <= metrics.width - 6 ? right : Math.max(6, left);
            // Neue Infokarten starten bevorzugt oben rechts. Die Skizze baut
            // weitere Objekte typischerweise nach unten rechts aus, sodass
            // dieser Anker den häufigsten Überlappungsfall vermeidet. An den
            // oberen Rand wird nur dann nach unten ausgewichen, wenn dort kein
            // ausreichender Platz vorhanden ist.
            const above = targetPoint.y - cardHeight - 18;
            const below = targetPoint.y + 18;
            const y = above >= 6 ? above : Math.min(metrics.height - cardHeight - 6, below);
            return clampPosition(null, card, x, y, metrics);
        }

        function applyCardPosition(card, position) {
            card.style.left = `${Math.round(position.x)}px`;
            card.style.top = `${Math.round(position.y)}px`;
        }

        function renderCard(record, entries) {
            const values = renderEntryValues(entries);
            const aria = `${record.label}: ${entries.map(entry => `${entry.label} ${entry.value}`).join(', ')}`;
            const title = record.kind === 'meter'
                ? 'Infobox verschieben · Werte doppelklicken zum Bearbeiten'
                : 'Infobox verschieben';
            return `<article class="mk-meter-annotation-card mk-annotation-card" data-mk-annotation="${escapeHtml(record.key)}" data-mk-meter-annotation="${escapeHtml(record.key)}" data-mk-meter-annotation-editable="true" role="group" tabindex="0" aria-label="${escapeHtml(aria)}" title="${title}">
                <button type="button" class="mk-annotation-dismiss" data-mk-annotation-dismiss="${escapeHtml(record.key)}" aria-label="Infobox ausblenden" title="Infobox ausblenden">×</button>
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

        function beginInlineEdit(card, valueNode) {
            if (!card || !valueNode || card.querySelector('.mk-meter-annotation-inline-editor')) return;
            const record = getRecordForCard(card);
            if (record?.kind !== 'meter') return;
            const fieldKey = valueNode.dataset.mkMeterAnnotationField;
            const field = meterDetailFields.find(item => item.key === fieldKey);
            if (!record || !field) return;
            const details = getMeterDetails(record.index) || {};
            const before = captureHistoryState();
            const control = getDocument().createElement(field.type === 'textarea' ? 'textarea' : 'input');
            control.className = 'mk-meter-annotation-inline-editor';
            control.value = String(details[field.key] || '');
            control.setAttribute('aria-label', field.label);
            if (field.maxLength) control.maxLength = field.maxLength;
            if (field.rows) control.rows = field.rows;
            if (field.type !== 'textarea') control.type = field.type;
            if (field.inputmode) control.setAttribute('inputmode', field.inputmode);
            if (field.pattern) control.setAttribute('pattern', field.pattern);
            valueNode.replaceWith(control);
            card.classList.add('is-editing');
            let finished = false;
            let confirmButton = null;
            const removeConfirmButton = () => {
                confirmButton?.remove();
                confirmButton = null;
            };
            const cancel = () => {
                if (finished) return;
                finished = true;
                card.classList.remove('is-editing');
                removeConfirmButton();
                sync();
            };
            const commit = () => {
                if (finished) return;
                finished = true;
                details[field.key] = control.value;
                card.classList.remove('is-editing');
                removeConfirmButton();
                if (before) recordHistory(before);
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
            confirmButton = getDocument().createElement('button');
            confirmButton.type = 'button';
            confirmButton.className = 'mk-annotation-confirm';
            confirmButton.textContent = '✓';
            confirmButton.setAttribute('aria-label', 'Änderung bestätigen');
            confirmButton.title = 'Änderung bestätigen';
            // Der Klick auf das Häkchen darf weder einen Karten-Drag noch den
            // Blur-Commit auslösen, bevor der Button seine Bestätigung ausführt.
            confirmButton.addEventListener('pointerdown', event => {
                event.preventDefault();
                event.stopPropagation();
            });
            confirmButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                commit();
            });
            card.appendChild(confirmButton);
            control.focus();
            if (control.select) control.select();
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
            const width = Math.max(metrics.width, stage.offsetWidth || 1);
            const height = Math.max(metrics.height, stage.offsetHeight || 1);
            connector.setAttribute('viewBox', `0 0 ${width} ${height}`);
            connector.setAttribute('width', String(width));
            connector.setAttribute('height', String(height));
            records.forEach(record => {
                const card = cardMap.get(record.key);
                const target = getTargetElement(stage, record);
                if (!card || !target) return;
                const targetPoint = getTargetPoint(stage, target, metrics);
                if (!targetPoint) return;
                const cardX = Number.parseFloat(card.style.left) || 0;
                const cardY = Number.parseFloat(card.style.top) || 0;
                const cardWidth = card.offsetWidth || 160;
                const cardHeight = card.offsetHeight || 60;
                const cardCenterX = cardX + cardWidth / 2;
                const cardCenterY = cardY + cardHeight / 2;
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
            const metrics = getStageMetrics(stage);
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
                const target = getTargetElement(stage, record);
                const saved = getSavedPosition(record.key);
                const position = saved?.manual
                    ? clampPosition(stage, card, saved.x, saved.y, metrics)
                    : getAutomaticPosition(record, target, card, metrics);
                applyCardPosition(card, position);
            });
            updateConnectors(stage, records, getCardMap(parts.cards), metrics, parts.connector);
        }

        function updatePositionFromPointer(event) {
            if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
            const stage = getElements().canvas?.querySelector('.mk-canvas-stage');
            if (!stage) return;
            const metrics = getStageMetrics(stage);
            const next = clampPosition(stage, activeDrag.card,
                activeDrag.startPosition.x + (event.clientX - activeDrag.startX) / metrics.scale,
                activeDrag.startPosition.y + (event.clientY - activeDrag.startY) / metrics.scale,
                metrics);
            setSavedPosition(activeDrag.key, next, true);
            applyCardPosition(activeDrag.card, next);
            const parts = getLayerParts(stage);
            if (parts) updateConnectors(stage, getVisibleRecords(), getCardMap(parts.cards), metrics, parts.connector);
            activeDrag.moved = true;
            event.preventDefault();
        }

        function endPointerDrag(event) {
            if (!activeDrag || (event?.pointerId !== undefined && event.pointerId !== activeDrag.pointerId)) return;
            const card = activeDrag.card;
            if (card?.hasPointerCapture?.(activeDrag.pointerId)) card.releasePointerCapture(activeDrag.pointerId);
            card?.classList.remove('is-dragging');
            if (activeDrag.moved && activeDrag.history) recordHistory(activeDrag.history);
            activeDrag = null;
        }

        function nudgeCard(card, key, dx, dy) {
            const stage = getElements().canvas?.querySelector('.mk-canvas-stage');
            if (!stage) return;
            const before = captureHistoryState();
            const metrics = getStageMetrics(stage);
            const current = getSavedPosition(key) || { x: Number.parseFloat(card.style.left) || 6, y: Number.parseFloat(card.style.top) || 6 };
            const next = clampPosition(stage, card, current.x + dx, current.y + dy, metrics);
            setSavedPosition(key, next, true);
            applyCardPosition(card, next);
            const parts = getLayerParts(stage);
            if (parts) updateConnectors(stage, getVisibleRecords(), getCardMap(parts.cards), metrics, parts.connector);
            recordHistory(before);
        }

        function bindLayer(layer) {
            if (!layer || layer.dataset.mkAnnotationBound === 'true') return;
            layer.dataset.mkAnnotationBound = 'true';
            layer.addEventListener('pointerdown', event => {
                const card = event.target.closest?.('.mk-meter-annotation-card');
                if (!card) return;
                if (event.target.closest?.('.mk-annotation-dismiss')) return;
                if (event.target.closest?.('.mk-annotation-confirm')) return;
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
                    moved: false
                };
                card.classList.add('is-dragging');
                card.setPointerCapture?.(event.pointerId);
                event.preventDefault();
                event.stopPropagation();
            });
            layer.addEventListener('pointermove', updatePositionFromPointer, { passive: false });
            layer.addEventListener('pointerup', endPointerDrag);
            layer.addEventListener('pointercancel', endPointerDrag);
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
