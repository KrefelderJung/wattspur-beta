/*
 * Wattspur Messkonzept – Exportdarstellung und PDF-Druck
 *
 * Der Export baut weiterhin ein druckbares HTML-Dokument auf. Das eigentliche
 * PDF wird anschließend durch den Browser-Druckdialog erzeugt ("Als PDF
 * speichern"). Zustand, Validierung und Darstellung werden injiziert, damit
 * dieses Modul keine fachlichen Regeln oder DOM-Renderer besitzt.
 */
(function exposeMesskonzeptExport(global) {
    'use strict';

    function createExporter(options = {}) {
        const getState = options.getState || (() => ({}));
        const getElements = options.getElements || (() => ({}));
        const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
        const validate = options.validate || (() => []);
        const renderMeterDetailsSummary = options.renderMeterDetailsSummary || (() => '');
        const getMeterSummaryEntries = options.getMeterSummaryEntries || (() => []);
        const renderAssetSummary = options.renderAssetSummary || (() => '');
        const getAssetSummaryEntries = options.getAssetSummaryEntries || (() => []);
        const getMeterNumber = options.getMeterNumber || (() => '—');
        const getMeterLabel = options.getMeterLabel || (meter => {
            const number = getMeterNumber(meter);
            return number ? `Z${number}` : '—';
        });
        const getAssetMeta = options.getAssetMeta || (() => ({}));
        const notify = options.notify || (() => {});
        const getDocument = options.getDocument || (() => global.document);
        const getWindow = options.getWindow || (() => global);
        const meterExportFields = Object.freeze([
            'Marktlokation Bezug',
            'Marktlokation Lieferung',
            'Messlokation',
            'Zählernummer'
        ]);

        function getExportStand(now = new Date()) {
            return {
                iso: now.toISOString(),
                label: new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(now)
            };
        }

        function sanitizeFileNamePart(value) {
            return String(value ?? '')
                .trim()
                .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/[. ]+$/g, '')
                .trim();
        }

        function getSuggestedFileName() {
            const project = getState().project || {};
            const location = [project.street, project.houseNumber]
                .map(sanitizeFileNamePart)
                .filter(Boolean)
                .join(' ');
            return location || 'Wattspur-Messkonzept';
        }

        function renderNotes() {
            const notes = String(getState().notes || '').trim();
            if (!notes) return '';
            return `<section class="mk-print-notes"><h2>Kommentar</h2><p>${escapeHtml(notes).replace(/\r?\n/g, '<br>')}</p></section>`;
        }

        function renderProjectDetails() {
            const project = getState().project || {};
            const renderRow = rows => `<div class="mk-print-project-row">${rows.map(([label, value]) => `
                <div class="mk-print-project-field">
                    <dt>${escapeHtml(label)}</dt>
                    <dd>${escapeHtml(value || '—')}</dd>
                </div>`).join('')}</div>`;
            return `<section class="mk-print-project"><h2>Projektangaben</h2><dl class="mk-print-project-grid">
                ${renderRow([
                    ['Projektname', project.name],
                    ['Referenz / Artikelnummer', project.reference],
                    ['Messkonzept', project.measurementConcept]
                ])}
                ${renderRow([
                    ['Straße / Hausnummer', [project.street, project.houseNumber].filter(Boolean).join(' ')],
                    ['PLZ', project.postalCode],
                    ['Ort', project.city],
                ])}
            </dl></section>`;
        }

        function renderExportNotice() {
            return `<p class="mk-print-notice"><strong>Wichtiger Hinweis:</strong> Dieser Export zeigt den zum Exportzeitpunkt erfassten Stand. Die Skizze dient nur der Orientierung. Sie ersetzt keine fachliche Prüfung, technische Abstimmung oder Genehmigung. Vor Änderungen muss das Messkonzept durch einen konzessionierten Elektrofachbetrieb geprüft und mit dem zuständigen Netzbetreiber abgestimmt werden.</p>`;
        }

        function renderCompactTable(title, fieldLabels, rows, options = {}) {
            if (!rows.length) return '';
            const effectiveFields = fieldLabels.length ? fieldLabels : ['Hinweis'];
            const leadingField = options.leadingField && effectiveFields.includes(options.leadingField)
                ? options.leadingField
                : null;
            const leadingIndex = leadingField ? effectiveFields.indexOf(leadingField) : -1;
            const columns = effectiveFields
                .filter(label => label !== leadingField);
            const rowLabelHeader = options.rowLabelHeader || 'Objekt';
            const headerCells = leadingField
                ? `<th scope="col">${escapeHtml(options.leadingHeader || leadingField)}</th><th scope="col">${escapeHtml(rowLabelHeader)}</th>`
                : `<th scope="col">${escapeHtml(rowLabelHeader)}</th>`;
            return `
                <section class="mk-print-table-section">
                    <h4>${escapeHtml(title)}</h4>
                    <div class="mk-print-table-wrap">
                        <table class="mk-print-table">
                            <thead><tr>${headerCells}${columns.map(label => `<th scope="col">${escapeHtml(label)}</th>`).join('')}</tr></thead>
                            <tbody>${rows.map(row => {
                                const leadingCell = leadingField
                                    ? `<td>${escapeHtml(row.values[leadingIndex] || '')}</td><th scope="row">${escapeHtml(row.label)}</th>`
                                    : `<th scope="row">${escapeHtml(row.label)}</th>`;
                                const valueCells = columns.map(label => {
                                    const valueIndex = effectiveFields.indexOf(label);
                                    return `<td>${escapeHtml(row.values[valueIndex] || '')}</td>`;
                                }).join('');
                                return `<tr>${leadingCell}${valueCells}</tr>`;
                            }).join('')}</tbody>
                        </table>
                    </div>
                </section>
            `;
        }

        function collectTableFields(rows) {
            const labels = [];
            rows.forEach(row => {
                (row.entries || []).forEach(entry => {
                    const label = String(entry.label || '').trim();
                    if (label && !labels.includes(label) && rows.some(candidate => (candidate.entries || []).some(item => item.label === label && String(item.value || '').trim()))) {
                        labels.push(label);
                    }
                });
            });
            return labels;
        }

        function toTableRows(rows, fieldLabels) {
            return rows.map(row => ({
                label: row.label,
                values: fieldLabels.map(label => {
                    const entry = (row.entries || []).find(item => item.label === label);
                    return entry ? String(entry.value || '') : '';
                })
            }));
        }

        function renderExportDetails() {
            const state = getState();
            const isMediumVoltage = state.hak?.voltageLevel === 'medium';
            const voltageLabel = isMediumVoltage
                ? 'Mittelspannung · Transformator-Darstellung'
                : 'Niederspannung · Hausanschlusskasten';
            const detailSections = [`
                <section class="mk-print-table-section">
                    <h4>Netzanschluss</h4>
                    <div class="mk-print-table-wrap">
                        <table class="mk-print-table mk-print-table--key-value"><tbody><tr><th scope="row">Spannungsebene</th><td>${escapeHtml(voltageLabel)}</td></tr></tbody></table>
                    </div>
                </section>
            `];
            const meterRows = [];
            const meterCount = Math.max(1, Number(state.mode === 'parallel' ? state.cascadeLevels : 1) || 1);
            for (let index = 0; index < meterCount; index += 1) {
                meterRows.push({ label: `Z${index + 1}`, entries: getMeterSummaryEntries(index, false) });
            }
            const assets = Array.isArray(state.assets) ? state.assets : [];
            assets.filter(asset => asset.type === 'meter').forEach(asset => {
                meterRows.push({
                    label: getMeterLabel(asset) || asset.name || 'Zusatzzaehler',
                    entries: getAssetSummaryEntries(asset, false)
                        .filter(entry => meterExportFields.includes(entry.label))
                });
            });
            // Diese fünf Stammdaten gehören zur Weitergabe und bleiben deshalb
            // auch dann als Spalten sichtbar, wenn noch kein Wert eingetragen
            // wurde. Interne Strukturangaben wie Messbereich, Zählerfunktion
            // und „Zähler vor“ bleiben der Logik und Detailansicht vorbehalten.
            const meterFields = meterExportFields;
            detailSections.push(renderCompactTable('Zähler', meterFields, toTableRows(meterRows, meterFields)));

            const assetGroups = new Map();
            assets.filter(asset => asset.type !== 'meter').forEach(asset => {
                const groupKey = asset.type || 'asset';
                if (!assetGroups.has(groupKey)) assetGroups.set(groupKey, []);
                const hideMeterBeforeColumn = ['storage', 'nsh', 'steuve'].includes(asset.type);
                const hideNshClassification = asset.type === 'nsh';
                assetGroups.get(groupKey).push({
                    label: asset.name || getAssetMeta(asset.type)?.label || 'Anlage',
                    entries: getAssetSummaryEntries(asset, false).filter(entry => entry.label !== 'Bezeichnung'
                        && !(hideMeterBeforeColumn && entry.label === 'Zähler davor')
                        && !(hideNshClassification && entry.label === 'Einordnung'))
                });
            });
            assetGroups.forEach((rows, type) => {
                const fields = collectTableFields(rows);
                const tableRows = fields.length
                    ? toTableRows(rows, fields)
                    : rows.map(row => ({ label: row.label, values: ['Keine weiteren Angaben'] }));
                const leadingField = fields.find(field => field === 'Anlagenart' || field === 'Anlage');
                detailSections.push(renderCompactTable(
                    getAssetMeta(type)?.label || 'Anlagen',
                    fields,
                    tableRows,
                    leadingField ? { leadingField, leadingHeader: leadingField, rowLabelHeader: 'Objektbezeichnung' } : {}
                ));
            });

            if (detailSections.length === 1) detailSections.push('<p class="mk-print-muted">Keine zusätzlichen Bausteine angelegt.</p>');
            return `<section class="mk-print-details"><h3>Objektdetails</h3>${detailSections.join('')}</section>`;
        }

        /*
         * Die Editor-Skizze besteht aus zwei Ebenen: dem HTML mit den Karten
         * und einer darüberliegenden SVG-Leitungsebene. Im Drucklayout darf
         * diese Kombination nicht durch Padding, Zoom oder eine neue
         * Mindestbreite auseinandergezogen werden. Deshalb wird die Bühne
         * für den Export in einen eigenen Rahmen gelegt und auf die bereits
         * berechneten SVG-Maße eingefroren. Die Leitungen bleiben damit an
         * exakt denselben Ankern wie im Editor.
         */
        function createVisualBounds() {
            return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, hasContent: false };
        }

        function extendVisualBounds(bounds, x, y, width, height) {
            const values = [x, y, width, height].map(Number);
            if (!values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0) return false;
            bounds.minX = Math.min(bounds.minX, values[0]);
            bounds.minY = Math.min(bounds.minY, values[1]);
            bounds.maxX = Math.max(bounds.maxX, values[0] + values[2]);
            bounds.maxY = Math.max(bounds.maxY, values[1] + values[3]);
            bounds.hasContent = true;
            return true;
        }

        function getStageCoordinateScale(stage) {
            const rect = stage?.getBoundingClientRect?.();
            const layoutWidth = Number(stage?.offsetWidth) || 0;
            const layoutHeight = Number(stage?.offsetHeight) || 0;
            return {
                x: rect?.width && layoutWidth ? rect.width / layoutWidth : 1,
                y: rect?.height && layoutHeight ? rect.height / layoutHeight : 1
            };
        }

        function extendDomBounds(bounds, element, stage, scale, stageRect) {
            const rect = element?.getBoundingClientRect?.();
            if (!rect || !stageRect) return false;
            const x = (rect.left - stageRect.left) / Math.max(0.01, scale.x);
            const y = (rect.top - stageRect.top) / Math.max(0.01, scale.y);
            const width = rect.width / Math.max(0.01, scale.x);
            const height = rect.height / Math.max(0.01, scale.y);
            return extendVisualBounds(bounds, x, y, width, height);
        }

        function extendSvgBounds(bounds, svg, shapeFilter = null) {
            const shapes = svg?.querySelectorAll?.('path,circle,ellipse,line,polyline,polygon,rect');
            if (!shapes?.length) return false;
            let found = false;
            shapes.forEach((shape, index) => {
                if (typeof shapeFilter === 'function' && !shapeFilter(shape, index)) return;
                try {
                    const box = shape.getBBox?.();
                    if (box) found = extendVisualBounds(bounds, box.x, box.y, box.width, box.height) || found;
                } catch (error) {
                    // Ein noch nicht layoutetes SVG wird über den Fallback behandelt.
                }
            });
            return found;
        }


        function hasAnnotationContent(card) {
            return [...(card?.querySelectorAll?.('.mk-meter-annotation-value') || [])]
                .some(value => String(value.textContent || '').trim().length > 0);
        }

        function collectVisualBounds(stage, topologyWidth, topologyHeight, options = {}) {
            const topology = createVisualBounds();
            const annotations = createVisualBounds();
            let measured = false;
            const stageRect = stage?.getBoundingClientRect?.();
            const scale = getStageCoordinateScale(stage);
            const topologyElement = stage?.querySelector?.('.mk-topology-content');
            const topologySelectors = [
                '.mk-hak-node',
                '.mk-meter-node',
                '.mk-meter-detail-card',
                '.mk-generation-meter',
                '.mk-rail-meter-node',
                '.mk-inline-meter',
                '.mk-asset-card',
                '.mk-zone-junction',
                '.mk-ownership-marker',
                '.mk-ownership-label',
                '.mk-transformer-symbol'
            ].join(',');
            topologyElement?.querySelectorAll?.(topologySelectors)?.forEach(element => {
                measured = extendDomBounds(topology, element, stage, scale, stageRect) || measured;
            });

            const connectorLayer = stage?.querySelector?.('.mk-connector-layer');
            const hasTopologySvg = extendSvgBounds(topology, connectorLayer);
            measured = hasTopologySvg || measured;
            if (!hasTopologySvg) {
                extendVisualBounds(topology, 0, 0, topologyWidth, topologyHeight);
            }

            const annotationLayer = stage?.querySelector?.('.mk-meter-annotation-layer');

            const includeAnnotationCard = options.includeAnnotationCard || (() => true);
            annotationLayer?.querySelectorAll?.('.mk-meter-annotation-card')?.forEach(card => {
                if (!includeAnnotationCard(card)) return;
                measured = extendDomBounds(annotations, card, stage, scale, stageRect) || measured;
            });
            const annotationConnector = annotationLayer?.querySelector?.('.mk-meter-annotation-connectors');
            measured = extendSvgBounds(annotations, annotationConnector, options.annotationShapeFilter) || measured;
            return { topology, annotations, measured };
        }

        function escapeSvgText(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }

        function wrapAnnotationText(value, maxCharacters) {
            const text = String(value ?? '').split(String.fromCharCode(13)).join('').trim();
            if (!text) return [];
            const limit = Math.max(8, Number(maxCharacters) || 24);
            return text.split(String.fromCharCode(10)).flatMap(paragraph => {
                const words = paragraph.split(' ').filter(Boolean);
                if (!words.length) return [''];
                const lines = [];
                let line = '';
                words.forEach(word => {
                    if (!line) {
                        line = word;
                        return;
                    }
                    const candidate = line + ' ' + word;
                    if (candidate.length <= limit) {
                        line = candidate;
                        return;
                    }
                    lines.push(line);
                    line = word;
                });
                if (line) lines.push(line);
                return lines;
            });
        }
        function renderNativeAnnotationText(stage, cards, contentFlags, minX, minY) {
            const stageRect = stage?.getBoundingClientRect?.();
            const scale = getStageCoordinateScale(stage);
            if (!stageRect || !cards?.length) return '';
            const textParts = [];
            cards.forEach((card, index) => {
                if (contentFlags[index] === false) return;
                const rect = card.getBoundingClientRect?.();
                if (!rect || rect.width <= 0 || rect.height <= 0) return;
                const x = (rect.left - stageRect.left) / Math.max(0.01, scale.x) - minX;
                const y = (rect.top - stageRect.top) / Math.max(0.01, scale.y) - minY;
                const cardWidth = rect.width / Math.max(0.01, scale.x);
                const padding = 6;
                const fontSize = 11;
                const maxCharacters = Math.max(10, Math.floor((cardWidth - padding * 2) / (fontSize * 0.56)));
                const values = [...(card.querySelectorAll?.('.mk-meter-annotation-value') || [])]
                    .flatMap(valueNode => wrapAnnotationText(valueNode.textContent, maxCharacters));
                if (!values.length) return;
                const xPosition = Math.max(0, x + padding);
                const firstBaseline = Math.max(12, y + 15);
                const tspans = values.map((line, lineIndex) =>
                    '<tspan x="' + xPosition.toFixed(2) + '" dy="' + (lineIndex ? fontSize * 1.28 : 0) + '">' + escapeSvgText(line) + '</tspan>'
                ).join('');
                textParts.push(
                    '<text class="mk-export-annotation-text" x="' + xPosition.toFixed(2)
                    + '" y="' + firstBaseline.toFixed(2)
                    + '" fill="#0f172a" font-family="Arial, sans-serif" font-size="' + fontSize
                    + 'px" font-weight="400" dominant-baseline="alphabetic">' + tspans + '</text>'
                );
            });
            return textParts.join('');
        }

        /*
         * Edge kann SVG-Fremdebenen (foreignObject) bei einer lokalen
         * file://-Seite ablehnen. Für diesen Fall bauen wir die sichtbaren
         * Karten zusätzlich als native SVG-Elemente auf. Das ist kein zweiter
         * Fachrenderer: Leitungen und Positionen stammen weiterhin aus dem
         * bestehenden DOM und der bestehenden Geometrie.
         */
        function escapeSvgAttribute(value) {
            return escapeSvgText(value).replace(/`/g, '&#96;');
        }

        function getNativeElementBox(element, stage, scale, stageRect, minX, minY) {
            const rect = element?.getBoundingClientRect?.();
            if (!rect || !stageRect || rect.width <= 0 || rect.height <= 0) return null;
            return {
                x: (rect.left - stageRect.left) / Math.max(0.01, scale.x) - minX,
                y: (rect.top - stageRect.top) / Math.max(0.01, scale.y) - minY,
                width: rect.width / Math.max(0.01, scale.x),
                height: rect.height / Math.max(0.01, scale.y)
            };
        }

        function getNativePaint(element, win) {
            const computed = win?.getComputedStyle?.(element);
            const background = String(computed?.backgroundColor || '').trim();
            const color = String(computed?.color || '#0f172a').trim();
            const objectBorder = String(computed?.getPropertyValue?.('--mk-object-border') || '').trim();
            const borderColor = String(computed?.borderColor || computed?.borderTopColor || objectBorder || color).trim();
            const borderWidth = Number.parseFloat(computed?.borderTopWidth || computed?.borderWidth || '0') || 0;
            const radius = Number.parseFloat(computed?.borderTopLeftRadius || computed?.borderRadius || '0') || 0;
            const className = String(element?.className?.baseVal || element?.className || '');
            const semanticFill = className.includes('mk-meter-annotation-card') || className.includes('mk-ownership-label')
                ? ''
                : className.includes('mk-hak-node') || className.includes('mk-hak-editor-icon')
                ? '#334155'
                : className.includes('mk-meter') || className.includes('mk-generation-meter')
                    ? '#7dd3fc'
                    : className.includes('mk-device-wallbox')
                        ? '#f3b2c2'
                        : className.includes('mk-device-heatpump')
                            ? '#86efac'
                            : className.includes('mk-device-climate')
                                ? '#bfdbfe'
                                : className.includes('storage')
                                    ? '#c4b5fd'
                                    : className.includes('generation')
                                        ? '#fde68a'
                                        : className.includes('nsh')
                                            ? '#fed7aa'
                                            : className.includes('consumer')
                                                ? '#94a3b8'
                                                : '';
            const isTransparent = !background || /^rgba?\(0,\s*0,\s*0,\s*0\)$/.test(background) || background === 'transparent';
            return {
                // Simple mode keeps the article itself transparent and puts
                // the visible colour on .mk-asset-icon. The native renderer
                // therefore needs a semantic fallback for transparent
                // containers, otherwise only the icon glyph survives.
                fill: !isTransparent ? background : semanticFill || 'transparent',
                color,
                borderColor,
                borderWidth,
                radius,
                objectBorder: objectBorder || ''
            };
        }

        function renderNativeChildCard(child, stage, scale, stageRect, minX, minY, win) {
            const box = getNativeElementBox(child, stage, scale, stageRect, minX, minY);
            if (!box) return { markup: '', box: null, paint: null };
            const paint = getNativePaint(child, win);
            const stroke = paint.borderWidth > 0
                ? paint.borderColor
                : paint.objectBorder && paint.objectBorder !== 'none'
                    ? paint.objectBorder
                    : 'none';
            const strokeWidth = paint.borderWidth > 0 || stroke !== 'none' ? 1 : 0;
            return {
                box,
                paint,
                markup: `<rect x="${box.x.toFixed(2)}" y="${box.y.toFixed(2)}" width="${box.width.toFixed(2)}" height="${box.height.toFixed(2)}" rx="${Math.max(0, paint.radius).toFixed(2)}" fill="${escapeSvgAttribute(paint.fill)}" stroke="${escapeSvgAttribute(stroke)}" stroke-width="${strokeWidth}" />`
            };
        }

        function renderNativeCardIcon(element, box, win, context = {}) {
            const icon = element?.querySelector?.('.mk-asset-icon');
            if (!icon || !box) return '';
            const iconRect = icon.getBoundingClientRect?.();
            const cardRect = element.getBoundingClientRect?.();
            if (!iconRect || !cardRect || !iconRect.width || !iconRect.height) return '';
            const stage = element.closest?.('.mk-canvas-stage');
            const scale = getStageCoordinateScale(stage);
            const stageRect = context.stageRect || stage?.getBoundingClientRect?.();
            const iconX = box.x + (iconRect.left - cardRect.left) / Math.max(0.01, scale.x);
            const iconY = box.y + (iconRect.top - cardRect.top) / Math.max(0.01, scale.y);
            const iconWidth = iconRect.width / Math.max(0.01, scale.x);
            const iconHeight = iconRect.height / Math.max(0.01, scale.y);
            // The coloured .mk-asset-icon is the card. Glyphs such as the
            // battery, fan and Wallbox SVG are smaller children inside it.
            // Using the outer card dimensions for the glyph made these icons
            // fill the complete card in the native fallback.
            const glyph = icon.querySelector?.('svg,.mk-battery-symbol,.mk-fan-symbol');
            const glyphRect = glyph?.getBoundingClientRect?.() || iconRect;
            const x = box.x + (glyphRect.left - cardRect.left) / Math.max(0.01, scale.x);
            const y = box.y + (glyphRect.top - cardRect.top) / Math.max(0.01, scale.y);
            const glyphWidth = glyphRect.width / Math.max(0.01, scale.x);
            const glyphHeight = glyphRect.height / Math.max(0.01, scale.y);
            const iconPaint = getNativePaint(icon, win);
            const iconStroke = iconPaint.borderWidth > 0
                ? iconPaint.borderColor
                : iconPaint.objectBorder && iconPaint.objectBorder !== 'none'
                    ? iconPaint.objectBorder
                    : 'none';
            const iconStrokeWidth = iconStroke === 'none' ? 0 : 1;
            const parts = [`<rect x="${iconX.toFixed(2)}" y="${iconY.toFixed(2)}" width="${iconWidth.toFixed(2)}" height="${iconHeight.toFixed(2)}" rx="${Math.max(0, iconPaint.radius).toFixed(2)}" fill="${escapeSvgAttribute(iconPaint.fill)}" stroke="${escapeSvgAttribute(iconStroke)}" stroke-width="${iconStrokeWidth}" />`];
            if (icon.querySelector?.('.mk-battery-symbol')) {
                const bodyX = x + glyphWidth * 0.08;
                const bodyY = y + glyphHeight * 0.08;
                const bodyWidth = glyphWidth * 0.84;
                const bodyHeight = glyphHeight * 0.84;
                parts.push(`<g stroke="${escapeSvgAttribute(iconPaint.color)}" fill="none" stroke-width="2"><rect x="${bodyX.toFixed(2)}" y="${bodyY.toFixed(2)}" width="${bodyWidth.toFixed(2)}" height="${bodyHeight.toFixed(2)}" rx="2"/><path d="M${(bodyX + bodyWidth * 0.28).toFixed(2)} ${(bodyY - 2).toFixed(2)}h${(bodyWidth * 0.44).toFixed(2)}"/><path d="M${(bodyX + bodyWidth * 0.2).toFixed(2)} ${(bodyY + bodyHeight * 0.72).toFixed(2)}h${(bodyWidth * 0.6).toFixed(2)}"/></g>`);
                return parts.join('');
            }
            if (icon.querySelector?.('.mk-fan-symbol')) {
                const cx = x + glyphWidth / 2;
                const cy = y + glyphHeight / 2;
                const blade = `M${cx.toFixed(2)} ${(cy - 1).toFixed(2)} C${(cx + 7).toFixed(2)} ${(cy - 9).toFixed(2)} ${(cx + 9).toFixed(2)} ${(cy - 2).toFixed(2)} ${(cx + 2).toFixed(2)} ${(cy + 2).toFixed(2)}Z`;
                const fanRadius = Math.max(5, Math.min(glyphWidth, glyphHeight) / 2 - 2);
                parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${fanRadius.toFixed(2)}" fill="none" stroke="${escapeSvgAttribute(iconPaint.color)}" stroke-width="1.5"/><g fill="${escapeSvgAttribute(iconPaint.color)}" opacity="0.9"><path d="${blade}"/><path d="${blade}" transform="rotate(120 ${cx.toFixed(2)} ${cy.toFixed(2)})"/><path d="${blade}" transform="rotate(240 ${cx.toFixed(2)} ${cy.toFixed(2)})"/><circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="2.2"/></g>`);
                return parts.join('');
            }
            const svg = icon.querySelector?.('svg');
            if (svg) {
                const copy = svg.cloneNode(true);
                copy.setAttribute('x', x.toFixed(2));
                copy.setAttribute('y', y.toFixed(2));
                copy.setAttribute('width', glyphWidth.toFixed(2));
                copy.setAttribute('height', glyphHeight.toFixed(2));
                copy.setAttribute('overflow', 'visible');
                copy.setAttribute('color', iconPaint.color);
                copy.setAttribute('fill', 'none');
                copy.setAttribute('stroke', iconPaint.color);
                // Inline styles make the nested icon independent from the
                // stylesheet context of the data URL.
                copy.querySelectorAll?.('*').forEach(child => {
                    const style = win?.getComputedStyle?.(child);
                    if (!style) return;
                    ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity'].forEach(property => {
                        let value = style.getPropertyValue(property);
                        if (value === 'currentColor') value = iconPaint.color;
                        if (child.classList?.contains('mk-charge-body') || child.classList?.contains('mk-charge-cable') || child.classList?.contains('mk-charge-pin')) {
                            if (property === 'stroke') value = iconPaint.color;
                            if (property === 'fill') value = 'none';
                        }
                        if (child.classList?.contains('mk-charge-bolt') && (property === 'fill' || property === 'stroke')) value = '#facc15';
                        if (value) child.setAttribute(property, value);
                    });
                });
                parts.push(copy.outerHTML);
                return parts.join('');
            }
            const text = String(icon.textContent || '').trim();
            if (!text) {
                const cx = x + glyphWidth / 2;
                const cy = y + glyphHeight / 2;
                parts.push(`<text x="${cx.toFixed(2)}" y="${(cy + 5).toFixed(2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="${escapeSvgAttribute(iconPaint.color)}">•</text>`);
                return parts.join('');
            }
            parts.push(`<text x="${(iconX + iconWidth / 2).toFixed(2)}" y="${(iconY + iconHeight / 2 + 5).toFixed(2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${escapeSvgAttribute(iconPaint.color)}">${escapeSvgText(text)}</text>`);
            return parts.join('');
        }

        function renderNativeCards(stage, width, height, minX, minY, win) {
            const stageRect = stage?.getBoundingClientRect?.();
            const scale = getStageCoordinateScale(stage);
            if (!stageRect) return '';
            const parts = [];
            const cardSelector = '.mk-hak-node,.mk-meter-node,.mk-generation-meter,.mk-asset-card,.mk-ownership-label,.mk-meter-annotation-card';
            stage.querySelectorAll?.(cardSelector).forEach(element => {
                if (element.closest?.('.mk-annotation-dismiss, .mk-annotation-resize-handle')) return;
                if (element.matches?.('.mk-meter-annotation-card') && !hasAnnotationContent(element)) return;
                const box = getNativeElementBox(element, stage, scale, stageRect, minX, minY);
                if (!box) return;
                const paint = getNativePaint(element, win);
                const isLabel = element.matches?.('.mk-ownership-label');
                const isAnnotation = element.matches?.('.mk-meter-annotation-card');
                const isMeter = element.matches?.('.mk-meter-node,.mk-generation-meter');
                const isHak = element.matches?.('.mk-hak-node');
                const fill = isLabel || isAnnotation ? 'transparent' : paint.fill;
                const stroke = isAnnotation ? '#0f8bd0' : (paint.borderWidth > 0 ? paint.borderColor : 'none');
                const strokeWidth = isAnnotation ? 1.2 : Math.max(0, paint.borderWidth);
                const dash = isAnnotation ? ' stroke-dasharray="4 4"' : '';
                const radius = isAnnotation ? 8 : Math.max(0, paint.radius);
                // HAK and the compact meter node keep their visible card on
                // a child element. Drawing the transparent parent as well
                // would create a square halo behind the rounded card.
                const drawOuterCard = !isHak && !element.matches?.('.mk-meter-node');
                if (drawOuterCard) {
                    parts.push(`<rect x="${box.x.toFixed(2)}" y="${box.y.toFixed(2)}" width="${box.width.toFixed(2)}" height="${box.height.toFixed(2)}" rx="${radius.toFixed(2)}" fill="${escapeSvgAttribute(fill)}" stroke="${escapeSvgAttribute(stroke)}" stroke-width="${strokeWidth}"${dash} />`);
                }
                if (element.matches?.('.mk-asset-card')) {
                    parts.push(renderNativeCardIcon(element, box, win, { stageRect }));
                    const badge = element.querySelector?.('.mk-icon-object-sequence');
                    const badgeRect = badge?.getBoundingClientRect?.();
                    if (badgeRect) {
                        const bx = (badgeRect.left - stageRect.left) / Math.max(0.01, scale.x) - minX;
                        const by = (badgeRect.top - stageRect.top) / Math.max(0.01, scale.y) - minY;
                        const bp = getNativePaint(badge, win);
                        parts.push(`<circle cx="${(bx + badgeRect.width / 2 / scale.x).toFixed(2)}" cy="${(by + badgeRect.height / 2 / scale.y).toFixed(2)}" r="${Math.max(7, badgeRect.width / scale.x / 2).toFixed(2)}" fill="${escapeSvgAttribute(bp.fill)}" stroke="${escapeSvgAttribute(bp.borderColor)}" stroke-width="1" />`);
                        parts.push(`<text x="${(bx + badgeRect.width / scale.x / 2).toFixed(2)}" y="${(by + badgeRect.height / scale.y / 2 + 4).toFixed(2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="${escapeSvgAttribute(bp.color)}">${escapeSvgText(badge.textContent)}</text>`);
                    }
                }
                const text = isLabel
                    ? String(element.textContent || '').trim()
                    : (isMeter && !element.querySelector?.('.mk-meter-symbol'))
                        ? String(element.textContent || '').trim()
                        : '';
                if (isHak) {
                    const visibleHak = element.querySelector?.('.mk-hak-editor-icon, b');
                    const child = visibleHak ? renderNativeChildCard(visibleHak, stage, scale, stageRect, minX, minY, win) : null;
                    if (child?.markup) {
                        parts.push(child.markup);
                        const label = String(visibleHak.textContent || '').trim();
                        if (label) parts.push(`<text x="${(child.box.x + child.box.width / 2).toFixed(2)}" y="${(child.box.y + child.box.height / 2 + 5).toFixed(2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="${escapeSvgAttribute(child.paint.color)}">${escapeSvgText(label)}</text>`);
                    }
                }
                if (element.matches?.('.mk-meter-node')) {
                    const visibleMeter = element.querySelector?.('.mk-meter-symbol');
                    const child = visibleMeter ? renderNativeChildCard(visibleMeter, stage, scale, stageRect, minX, minY, win) : null;
                    if (child?.markup) {
                        parts.push(child.markup);
                        const label = String(visibleMeter.textContent || '').trim();
                        if (label) parts.push(`<text x="${(child.box.x + child.box.width / 2).toFixed(2)}" y="${(child.box.y + child.box.height / 2 + 4).toFixed(2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${escapeSvgAttribute(child.paint.color)}">${escapeSvgText(label)}</text>`);
                    }
                }
                if (text) {
                    const fontSize = isLabel ? 10 : isHak ? 15 : 12;
                    const fontWeight = isLabel ? 500 : 700;
                    parts.push(`<text x="${(box.x + box.width / 2).toFixed(2)}" y="${(box.y + box.height / 2 + fontSize * 0.35).toFixed(2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${escapeSvgAttribute(paint.color)}">${escapeSvgText(text)}</text>`);
                }
            });
            return parts.join('');
        }

        function renderNativeHakMeterWire(stage, minX, minY) {
            const stageRect = stage?.getBoundingClientRect?.();
            const scale = getStageCoordinateScale(stage);
            const supplyColumn = stage?.querySelector?.('.mk-supply-column');
            const hak = supplyColumn?.querySelector?.(':scope > .mk-hak-node');
            const meter = supplyColumn?.querySelector?.(':scope > .mk-meter-layout .mk-meter-node, :scope > .mk-meter-layout .mk-meter-detail-card');
            if (!stageRect || !hak || !meter) return '';

            // Die HTML/CSS-Leitung zwischen HAK und dem ersten Zähler liegt
            // nicht in .mk-connector-layer. Im nativen Edge-Fallback wird sie
            // deshalb als derselbe fachliche Leitungsabschnitt gezeichnet.
            const hakAnchor = hak.querySelector?.('.mk-hak-editor-icon, .mk-transformer-symbol, b') || hak;
            const hakRect = hakAnchor.getBoundingClientRect?.();
            const meterRect = meter.getBoundingClientRect?.();
            if (!hakRect || !meterRect || hakRect.width <= 0 || meterRect.width <= 0) return '';

            const x1 = (hakRect.left + hakRect.width / 2 - stageRect.left) / Math.max(0.01, scale.x) - minX;
            const y1 = (hakRect.bottom - stageRect.top) / Math.max(0.01, scale.y) - minY;
            const x2 = (meterRect.left + meterRect.width / 2 - stageRect.left) / Math.max(0.01, scale.x) - minX;
            const y2 = (meterRect.top - stageRect.top) / Math.max(0.01, scale.y) - minY;
            if (![x1, y1, x2, y2].every(Number.isFinite) || y2 <= y1) return '';

            const stroke = '#38bdf8';
            if (Math.abs(x2 - x1) < 0.5) {
                return `<line class="mk-export-hak-meter-wire" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" />`;
            }
            const bendY = y1 + Math.max(0, (y2 - y1) / 2);
            return `<path class="mk-export-hak-meter-wire" d="M ${x1.toFixed(2)} ${y1.toFixed(2)} V ${bendY.toFixed(2)} H ${x2.toFixed(2)} V ${y2.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
        }

        function renderNativeOwnershipMarker(stage, minX, minY, win) {
            const stageRect = stage?.getBoundingClientRect?.();
            const marker = stage?.querySelector?.('.mk-ownership-marker');
            const markerRect = marker?.getBoundingClientRect?.();
            const scale = getStageCoordinateScale(stage);
            if (!stageRect || !markerRect || markerRect.width <= 0) return '';

            // Die Eigentumsgrenze ist im Editor ein CSS-border-top auf einem
            // span mit Höhe 0. Ein natives SVG muss diese Linie ausdrücklich
            // zeichnen, weil der Edge-Fallback keine CSS-Elemente übernimmt.
            const x1 = (markerRect.left - stageRect.left) / Math.max(0.01, scale.x) - minX;
            const x2 = (markerRect.right - stageRect.left) / Math.max(0.01, scale.x) - minX;
            const y = (markerRect.top + markerRect.height / 2 - stageRect.top) / Math.max(0.01, scale.y) - minY;
            if (![x1, x2, y].every(Number.isFinite) || x2 <= x1) return '';

            const computed = win?.getComputedStyle?.(marker);
            const stroke = String(computed?.borderTopColor || computed?.borderColor || '#38bdf8').trim();
            const strokeWidth = Math.max(1, Number.parseFloat(computed?.borderTopWidth || '2') || 2);
            return `<line class="mk-export-ownership-marker" x1="${x1.toFixed(2)}" y1="${y.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${escapeSvgAttribute(stroke)}" stroke-width="${strokeWidth.toFixed(2)}" stroke-dasharray="8 6" stroke-linecap="butt" />`;
        }

        function getTopologyMarkup() {
            const canvas = getElements().canvas;
            const stage = canvas?.querySelector?.('.mk-canvas-stage');
            if (!stage) return '<p class="mk-print-muted">Keine Skizze vorhanden.</p>';

            const clone = stage.cloneNode(true);

            const connectorLayer = clone.querySelector('.mk-connector-layer');
            const annotationConnector = clone.querySelector('.mk-meter-annotation-connectors');
            const parseViewBox = element => {
                const values = String(element?.getAttribute?.('viewBox') || '')
                    .trim()
                    .split(/\s+/)
                    .map(Number);
                return values.length === 4 && values.every(Number.isFinite)
                    ? { x: values[0], y: values[1], width: values[2], height: values[3] }
                    : null;
            };
            const viewBox = parseViewBox(connectorLayer);
            const annotationViewBox = parseViewBox(annotationConnector);
            const parseDimension = (value, fallback) => {
                const number = Number.parseFloat(String(value || ''));
                return Number.isFinite(number) && number > 0 ? number : fallback;
            };
            const topologyWidth = parseDimension(
                connectorLayer?.getAttribute('width'),
                parseDimension(viewBox?.width, stage.scrollWidth || stage.offsetWidth || 1)
            );
            const connectorHeight = parseDimension(
                connectorLayer?.getAttribute('height'),
                parseDimension(viewBox?.height, stage.scrollHeight || stage.offsetHeight || 1)
            );
            const topologyHeight = parseDimension(stage.dataset?.mkTopologyContentHeight, connectorHeight);
            const annotationHeight = parseDimension(stage.dataset?.mkAnnotationContentHeight, 0);
            // Die Annotationsebene kann einen negativen Ursprung haben, wenn
            // eine Infobox links oder oberhalb der Skizze abgelegt wurde. Der
            // Export berechnet deshalb den tatsächlichen sichtbaren Rahmen aus
            // SVG-Pfaden und DOM-Karten. Die technische Bühnenbreite bleibt
            // nur ein Fallback, wenn der Browser noch keine Geometrie liefern
            // kann.
            const visualBounds = collectVisualBounds(stage, topologyWidth, topologyHeight);
            const annotationFallback = annotationViewBox && !visualBounds.measured
                ? annotationViewBox
                : null;
            const topologyMinX = visualBounds.topology.hasContent ? visualBounds.topology.minX : 0;
            const topologyMinY = visualBounds.topology.hasContent ? visualBounds.topology.minY : 0;
            const topologyMaxX = visualBounds.topology.hasContent ? visualBounds.topology.maxX : topologyWidth;
            const topologyMaxY = visualBounds.topology.hasContent ? visualBounds.topology.maxY : topologyHeight;
            const annotationMinX = visualBounds.annotations.hasContent
                ? visualBounds.annotations.minX
                : (annotationFallback?.x || 0);
            const annotationMinY = visualBounds.annotations.hasContent
                ? visualBounds.annotations.minY
                : (annotationFallback?.y || 0);
            const annotationMaxX = visualBounds.annotations.hasContent
                ? visualBounds.annotations.maxX
                : (annotationFallback ? annotationFallback.x + annotationFallback.width : 0);
            const annotationMaxY = visualBounds.annotations.hasContent
                ? visualBounds.annotations.maxY
                : (annotationFallback ? annotationFallback.y + annotationFallback.height : annotationHeight);
            const rawMinX = Math.min(topologyMinX, annotationMinX);
            const rawMinY = Math.min(topologyMinY, annotationMinY);
            const rawMaxX = Math.max(topologyMaxX, annotationMaxX);
            const rawMaxY = Math.max(topologyMaxY, annotationMaxY, annotationHeight);
            const cropPadding = visualBounds.measured ? 24 : 0;
            const contentMinX = rawMinX - cropPadding;
            const contentMinY = rawMinY - cropPadding;
            const contentMaxX = rawMaxX + cropPadding;
            const contentMaxY = rawMaxY + cropPadding;
            const width = Math.max(1, contentMaxX - contentMinX);
            const height = Math.max(1, contentMaxY - contentMinY);
            const contentOffsetX = -contentMinX;
            const contentOffsetY = -contentMinY;
            // The one-page export reserves space for the header, notice and
            // project fields. Scale only the isolated PDF copy, never the
            // editor stage, so the editor geometry remains unchanged.
            const maxPrintWidth = 650;
            const maxPrintHeight = 520;
            const scale = Math.min(1, maxPrintWidth / width, maxPrintHeight / height);
            const scaledWidth = Math.ceil(width * scale);
            const scaledHeight = Math.ceil(height * scale);

            clone.classList.add('mk-print-canvas-stage', 'mk-print-geometry-svg-only');
            /*
             * Die langen Leitungswege werden im Editor bereits als geroutete
             * SVG-Pfade in .mk-connector-layer gezeichnet. Ältere HTML/CSS-
             * Anker und Pseudo-Elemente bleiben für die Bedienung wichtig,
             * dürfen aber nicht in die isolierte Druckkopie gelangen. Sonst
             * wird derselbe Weg im PDF doppelt dargestellt.
             */
            if (typeof clone.querySelectorAll === 'function') {
                clone.querySelectorAll([
                    '.mk-connection-line',
                    '.mk-rail-meter-link',
                    '.mk-zone-wrap-strand',
                    '.mk-rail-junction-anchor'
                ].join(',')).forEach(element => element.remove());
            }
            clone.style.setProperty('width', `${Math.ceil(width)}px`);
            clone.style.setProperty('min-width', `${Math.ceil(width)}px`);
            clone.style.setProperty('height', `${Math.ceil(height)}px`);
            clone.style.setProperty('min-height', `${Math.ceil(height)}px`);
            clone.style.setProperty('zoom', '1');
            clone.style.setProperty('transform', `scale(${scale})`);
            clone.style.setProperty('transform-origin', 'top left');
            clone.style.setProperty('--mk-canvas-zoom', '1');

            // Die Druckbühne beginnt bei (0, 0). Alle sichtbaren Ebenen werden
            // gemeinsam verschoben, damit negative Annotation-Koordinaten
            // nicht aus dem PDF-Rahmen herausfallen und die Leitungen weiter
            // exakt zu Karten und Objekten passen.
            if (contentOffsetX || contentOffsetY) {
                const contentTransform = `translate(${contentOffsetX}px, ${contentOffsetY}px)`;
                [
                    clone.querySelector('.mk-connector-layer'),
                    clone.querySelector('.mk-topology-content'),
                    clone.querySelector('.mk-meter-annotation-layer')
                ].filter(Boolean).forEach(element => {
                    element.style.setProperty('transform', contentTransform);
                    element.style.setProperty('transform-origin', 'top left');
                });
            }

            if (connectorLayer) {
                /*
                 * Die Leitungs-SVG bleibt in ihrer eigenen Topologiegröße.
                 * Würde ihre gerenderte Breite auf die gemeinsame Exportbreite
                 * gesetzt, würde preserveAspectRatio="none" die Leitungen
                 * strecken, sobald eine Infobox zusätzlichen Raum erzeugt.
                 * Der gemeinsame Offset verschiebt die Ebene; die
                 * Leitungskoordinaten selbst bleiben unverändert.
                 */
                connectorLayer.setAttribute('width', String(Math.ceil(topologyWidth)));
                connectorLayer.setAttribute('height', String(Math.ceil(connectorHeight)));
                connectorLayer.style.setProperty('width', `${Math.ceil(topologyWidth)}px`);
                connectorLayer.style.setProperty('height', `${Math.ceil(connectorHeight)}px`);
            }

            return `<div class="mk-print-canvas-frame"><div class="mk-print-canvas-fit" style="width:${scaledWidth}px;height:${scaledHeight}px">${clone.outerHTML}</div></div>`;
        }

        function renderPrintSheet(stand = getExportStand()) {
            const topology = getTopologyMarkup();
            return `
        <section class="mk-print-sheet mk-print-sheet--one-page" data-mk-export-scope="one-page" aria-label="Messkonzept-PDF">
            <header class="mk-print-header">
                <div class="mk-print-brand" aria-label="Wattspur Messkonzept-Konfigurator">
                    <img class="mk-print-brand-mark" src="wattspur-mark.svg" alt="Wattspur">
                    <span class="mk-print-brand-copy"><strong>Wattspur</strong><span>Messkonzept-Konfigurator</span></span>
                </div>
            </header>
            <section class="mk-print-topology"><h2>Messskizze</h2>${topology}</section>
            ${renderProjectDetails()}
            ${renderNotes()}
            <footer class="mk-print-footer">
                <span>Wattspur Beta · Messkonzept-Skizze · lokal im Browser erstellt</span>
                ${renderExportNotice()}
            </footer>
        </section>
    `;
        }

        function getInlineStyles(documentRef) {
            return [...(documentRef?.styleSheets || [])].map(sheet => {
                try {
                    return [...(sheet.cssRules || [])].map(rule => rule.cssText).join('\n');
                } catch (error) {
                    return '';
                }
            }).filter(Boolean).join('\n');
        }

        function inlineComputedStyles(root, win) {
            if (!root || !win?.getComputedStyle) return;
            const documentRef = root.ownerDocument;
            const host = documentRef?.createElement?.("div");
            if (!host || !documentRef.body) return;
            host.style.cssText = "position:absolute;left:-100000px;top:0;pointer-events:none;opacity:0;";
            host.appendChild(root);
            documentRef.body.appendChild(host);
            try {
                const elements = [root, ...(root.querySelectorAll?.("*") || [])];
                elements.forEach(element => {
                    const computed = win.getComputedStyle(element);
                    for (let index = 0; index < computed.length; index += 1) {
                        const property = computed.item(index);
                        if (!property || property === "cursor" || property === "transition" || property === "animation") continue;
                        element.style.setProperty(property, computed.getPropertyValue(property));
                    }
                });
            } finally {
                host.remove();
            }
        }

        async function downloadImage(options = {}) {
            const doc = getDocument();
            const canvas = getElements().canvas;
            const stage = canvas?.querySelector?.('.mk-canvas-stage');
            if (!stage) {
                notify('Keine Messskizze zum Herunterladen vorhanden.', 'warning');
                return false;
            }

            const connectorLayer = stage.querySelector('.mk-connector-layer');
            const viewBox = String(connectorLayer?.getAttribute?.('viewBox') || '')
                .trim().split(/\s+/).map(Number);
            const topologyWidth = Number.parseFloat(connectorLayer?.getAttribute?.('width') || '')
                || (viewBox.length === 4 && Number.isFinite(viewBox[2]) ? viewBox[2] : stage.scrollWidth || stage.offsetWidth || 1);
            const topologyHeight = Number.parseFloat(connectorLayer?.getAttribute?.('height') || '')
                || (viewBox.length === 4 && Number.isFinite(viewBox[3]) ? viewBox[3] : stage.scrollHeight || stage.offsetHeight || 1);
            // Leere, nur aktivierte Infoboxen sind kein sichtbarer Exportinhalt.
            // Sie bleiben im Editor verfügbar, dürfen aber weder den Ausschnitt
            // vergrößern noch eine leere Karte in die PNG-Datei bringen.
            const liveAnnotationCards = [...(stage.querySelectorAll?.('.mk-meter-annotation-card') || [])];
            const annotationContentFlags = liveAnnotationCards.map(hasAnnotationContent);
            const measured = collectVisualBounds(stage, topologyWidth, topologyHeight, {
                includeAnnotationCard: hasAnnotationContent,
                annotationShapeFilter: (_shape, index) => annotationContentFlags[index] !== false
            });
            const bounds = [measured.topology, measured.annotations].filter(item => item?.hasContent);
            const hasContent = bounds.length > 0;
            const padding = 24;
            const minX = hasContent ? Math.min(...bounds.map(item => item.minX)) - padding : 0;
            const minY = hasContent ? Math.min(...bounds.map(item => item.minY)) - padding : 0;
            const maxX = hasContent ? Math.max(...bounds.map(item => item.maxX)) + padding : topologyWidth;
            const maxY = hasContent ? Math.max(...bounds.map(item => item.maxY)) + padding : topologyHeight;
            const width = Math.max(1, Math.ceil(maxX - minX));
            const height = Math.max(1, Math.ceil(maxY - minY));
            const annotationTextMarkup = renderNativeAnnotationText(
                stage,
                liveAnnotationCards,
                annotationContentFlags,
                minX,
                minY
            );

            const clone = stage.cloneNode(true);
            const clonedAnnotationCards = [...(clone.querySelectorAll?.('.mk-meter-annotation-card') || [])];
            const clonedAnnotationFlags = clonedAnnotationCards.map(hasAnnotationContent);
            clonedAnnotationCards.forEach((card, index) => {
                if (clonedAnnotationFlags[index] === false) card.remove();
            });
            // Die Pfade werden von annotations.js in derselben Reihenfolge wie
            // die Karten erzeugt. Leere Karten und ihre Bezugslinien werden
            // deshalb gemeinsam aus der Exportkopie entfernt.
            const clonedAnnotationPaths = [...(clone.querySelectorAll?.('.mk-meter-annotation-connectors .mk-meter-annotation-connector') || [])];
            if (clonedAnnotationPaths.length === clonedAnnotationFlags.length) {
                clonedAnnotationPaths.forEach((path, index) => {
                    if (clonedAnnotationFlags[index] === false) path.remove();
                });
            }
            // Alte HTML/CSS-Anker sind für die Bedienung nötig, würden im PNG
            // aber zusätzlich zu den nativen SVG-Leitungen gezeichnet. Das
            // erzeugt die sichtbaren Doppel- und Versatzlinien.
            clone.querySelectorAll?.([
                '.mk-connection-line',
                '.mk-rail-meter-link',
                '.mk-zone-wrap-strand',
                '.mk-rail-junction-anchor'
            ].join(',')).forEach(element => element.remove());
            const win = getWindow();
            const prepareSvgMarkup = (element, fallbackWidth, fallbackHeight) => {
                if (!element) return '';
                element.style.setProperty('position', 'static');
                element.style.setProperty('display', 'block');
                element.style.setProperty('width', `${Math.ceil(fallbackWidth)}px`);
                element.style.setProperty('height', `${Math.ceil(fallbackHeight)}px`);
                element.style.setProperty('overflow', 'visible');
                inlineComputedStyles(element, win);
                return element.innerHTML;
            };
            const connectorClone = clone.querySelector('.mk-connector-layer');
            const connectorMarkup = prepareSvgMarkup(connectorClone, topologyWidth, topologyHeight);
            connectorClone?.remove();
            const annotationConnectorClone = clone.querySelector('.mk-meter-annotation-connectors');
            const annotationConnectorMarkup = prepareSvgMarkup(annotationConnectorClone, width, height);
            annotationConnectorClone?.remove();

            // SVG-Icons müssen auch innerhalb der XHTML-Fremdebene ihre
            // ursprüngliche Namespace-Zuordnung behalten. Das ist besonders
            // wichtig für das Wallbox-Symbol mit Kabel und Stecker.
            clone.querySelectorAll?.('svg').forEach(svg => {
                svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            });


            // Infoboxen mit Inhalt bleiben im Bildexport erhalten. Leere,
            // nur aktivierte Karten wurden zuvor aus der Kopie entfernt. Die
            // Bezugslinien werden separat als native SVG-Ebene gerendert.
            clone.classList.add('mk-image-export-stage');
            clone.style.setProperty('width', `${width}px`);
            clone.style.setProperty('height', `${height}px`);
            clone.style.setProperty('min-width', `${width}px`);
            clone.style.setProperty('min-height', `${height}px`);
            clone.style.setProperty('overflow', 'visible');
            clone.style.setProperty('transform', `translate(${-minX}px, ${-minY}px)`);
            clone.style.setProperty('transform-origin', 'top left');
            clone.style.setProperty('zoom', '1');
            // Editor-Gutters gehören nur zur Bedienfläche. In der Exportkopie
            // würden sie die HTML-Objekte gegenüber den nativen Leitungen
            // verschieben und genau die sichtbaren Lücken erzeugen.
            clone.style.setProperty('margin', '0');
            clone.style.setProperty('padding', '0');
            clone.style.setProperty('--mk-annotation-gutter-left', '0px');
            clone.style.setProperty('--mk-annotation-gutter-right', '0px');
            clone.style.setProperty('--mk-annotation-gutter-top', '0px');
            clone.style.setProperty('--mk-annotation-gutter-bottom', '0px');
            clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
            inlineComputedStyles(clone, win);
            // Bedienknöpfe gehören zur Editorsteuerung, nicht zur Skizze.
            clone.querySelectorAll?.('.mk-annotation-dismiss, .mk-annotation-resize-handle, .mk-remove-asset, .mk-remove-meter, [data-mk-remove-asset], [data-mk-remove-meter]').forEach(element => element.remove());
            // Eine manuell vergrößerte Editor-Infobox soll im PNG nicht als
            // leerer Raum erscheinen. Die Breite bleibt erhalten, die Höhe
            // richtet sich im Bildexport wieder nach dem tatsächlichen Inhalt.
            clone.querySelectorAll?.('.mk-meter-annotation-card').forEach(card => {
                card.style.setProperty('height', 'auto', 'important');
                card.style.setProperty('min-height', '0', 'important');
                card.style.setProperty('max-height', 'none', 'important');
            });
            // Die Stilkopie kann die Editorfarbe erneut setzen. Die finalen
            // Exportfarben werden deshalb erst danach mit !important gesetzt.
            clone.querySelectorAll?.('.mk-meter-annotation-card, .mk-meter-annotation-value').forEach(element => {
                element.style.setProperty('color', '#0f172a', 'important');
                element.style.setProperty('opacity', '1', 'important');
            });
            // Browser unterscheiden sich bei Text in SVG-foreignObject. Die
            // Karten bleiben als Rahmen in der HTML-Ebene, der eigentliche
            // Inhalt wird zusätzlich als native SVG-Schrift ausgegeben. Die
            // HTML-Texte werden nur ausgeblendet, damit kein Doppeltext
            // entsteht und die Kartenhöhe für die Geometrie erhalten bleibt.
            clone.querySelectorAll?.('.mk-meter-annotation-values').forEach(element => {
                // Die Textzeile wird bereits als natives SVG gerendert. Auch in
                // foreignObject-fähigen Browsern darf die HTML-Kopie nicht
                // ein zweites, leicht versetztes Schriftbild erzeugen.
                element.style.setProperty('visibility', 'hidden', 'important');
                element.style.setProperty('opacity', '0', 'important');
                element.style.setProperty('color', 'transparent', 'important');
                element.style.setProperty('text-shadow', 'none', 'important');
            });
            clone.querySelectorAll?.('.mk-ownership-label').forEach(label => {
                label.style.setProperty('background', 'transparent', 'important');
                label.style.setProperty('color', '#0f172a', 'important');
                label.style.setProperty('box-shadow', 'none', 'important');
                label.style.setProperty('text-shadow', '0 1px 0 #f8fafc', 'important');
            });

            // Styles werden aus dem bereits geladenen Dokument übernommen.
            // Es gibt keinen zusätzlichen Netzwerkzugriff und damit keine
            // externe Datenübertragung beim lokalen Bildexport.
            const css = getInlineStyles(doc);
            const safeCss = css.replace(/<\/style/gi, '<\\/style');
            const background = '<rect class="mk-export-background" x="0" y="0" width="100%" height="100%" fill="#f8fafc" />';
            const connectorStyle = '<style>.mk-export-connectors .mk-dynamic-wire{fill:none;stroke:#0f6f97;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.mk-export-connectors .mk-dynamic-node{stroke:#f8fafc;stroke-width:2}.mk-export-annotation-connectors .mk-meter-annotation-connector{fill:none;stroke:#64748b;stroke-width:1.4;stroke-linecap:round;stroke-dasharray:4 4}.mk-export-annotation-text{fill:#0f172a;font-family:Arial,sans-serif;font-size:11px}</style>';
            const nativeConnectors = connectorMarkup
                ? `<g class="mk-export-connectors" transform="translate(${-minX} ${-minY})">${connectorMarkup}</g>`
                : '';
            const nativeAnnotationConnectors = annotationConnectorMarkup
                ? `<g class="mk-export-annotation-connectors" transform="translate(${-minX} ${-minY})">${annotationConnectorMarkup}</g>`
                : '';
            const nativeHakMeterWire = renderNativeHakMeterWire(stage, minX, minY);
            const nativeOwnershipMarker = renderNativeOwnershipMarker(stage, minX, minY, win);
            const nativeCards = renderNativeCards(stage, width, height, minX, minY, win);
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <style>${safeCss}</style>
                ${background}
                ${connectorStyle}
                ${nativeConnectors}
                ${nativeAnnotationConnectors}
                ${annotationTextMarkup}
                <foreignObject x="0" y="0" width="${width}" height="${height}">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:visible;background:transparent;">${clone.outerHTML}</div>
                </foreignObject>
                <text x="${Math.max(8, width - 8)}" y="${Math.max(12, height - 8)}" text-anchor="end" font-family="Arial, sans-serif" font-size="8" fill="#64748b">Wattspur.de</text>
            </svg>`;
            // Reiner SVG-Fallback für lokale Edge-Seiten. Er enthält keine
            // Fremdobjekte und kann deshalb auch dann in Canvas gezeichnet
            // werden, wenn Edge foreignObject im file://-Modus blockiert.
            const nativeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                ${background}
                ${connectorStyle}
                ${nativeConnectors}
                ${nativeAnnotationConnectors}
                ${nativeHakMeterWire}
                ${nativeOwnershipMarker}
                ${nativeCards}
                ${annotationTextMarkup}
                <text x="${Math.max(8, width - 8)}" y="${Math.max(12, height - 8)}" text-anchor="end" font-family="Arial, sans-serif" font-size="8" fill="#64748b">Wattspur.de</text>
            </svg>`;
            // Edge kann SVG-Blobs mit foreignObject je nach Dokumentmodus ablehnen.
            // Deshalb stehen zwei lokale Bildquellen bereit: Blob-URL und Data-URL.
            // Beide bleiben vollständig lokal und senden keine Daten an einen Server.
            const urlApi = win?.URL || global.URL;
            if (!urlApi?.createObjectURL) throw new Error('Der Browser stellt keine lokale Bild-URL bereit.');
            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = urlApi.createObjectURL(svgBlob);
            // Edge blockiert im file://-Modus teilweise eingebettete CSS-Regeln im
            // foreignObject. Die Inline-Stile der Klone bleiben erhalten, daher
            // versuchen wir zusätzlich eine CSS-freie lokale SVG-Data-URL.
            const inlineOnlySvg = svg.replace('<style>' + safeCss + '</style>', '');
            const nativeSource = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(nativeSvg);
            const nativeSvgBlob = new Blob([nativeSvg], { type: 'image/svg+xml;charset=utf-8' });
            const nativeSvgUrl = urlApi.createObjectURL(nativeSvgBlob);
            const svgSources = [
                nativeSvgUrl,
                nativeSource,
                svgUrl,
                'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
                'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(inlineOnlySvg)
            ];
            const loadImage = source => new Promise((resolve, reject) => {
                const image = doc.createElement('img');
                image.decoding = 'async';
                let settled = false;
                const finish = (callback, value) => {
                    if (settled) return;
                    settled = true;
                    win.clearTimeout?.(timeout);
                    callback(value);
                };
                const timeout = win.setTimeout?.(
                    () => finish(reject, new Error('Die Bildquelle hat nicht rechtzeitig geladen.')),
                    4000
                );
                image.onload = () => finish(resolve, image);
                image.onerror = () => finish(reject, new Error('Die Skizze konnte nicht als Bild gerendert werden.'));
                image.src = source;
            });
            const canvasToDataUrlBlob = canvasElement => {
                const dataUrl = canvasElement.toDataURL('image/png');
                const encoded = dataUrl.split(',')[1] || '';
                const decode = global.atob || win?.atob;
                if (!decode) throw new Error('Base64-Dekodierung ist nicht verfügbar.');
                const binary = decode(encoded);
                const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
                return new Blob([bytes], { type: 'image/png' });
            };
            const canvasToPngBlob = canvasElement => new Promise((resolve, reject) => {
                let settled = false;
                let timeoutId = null;
                const finish = (callback, value) => {
                    if (settled) return;
                    settled = true;
                    if (timeoutId !== null) win.clearTimeout?.(timeoutId);
                    callback(value);
                };
                const fallback = () => {
                    try {
                        finish(resolve, canvasToDataUrlBlob(canvasElement));
                    } catch (error) {
                        finish(reject, error);
                    }
                };
                // Edge kann bei einer blockierten oder verunreinigten Canvas
                // den toBlob-Callback auslassen. Ohne Timeout würde der
                // gesamte Bildexport dann dauerhaft hängen.
                timeoutId = win.setTimeout?.(fallback, 2500) ?? null;
                if (typeof canvasElement.toBlob === 'function') {
                    try {
                        canvasElement.toBlob(blob => {
                            if (blob) finish(resolve, blob);
                            else fallback();
                        }, 'image/png');
                        return;
                    } catch (error) {
                        console.warn('Canvas.toBlob nicht verfügbar, verwende Data-URL-Fallback.', error);
                    }
                }
                fallback();
            });
            try {
                const pixelRatio = Math.min(2, Math.max(1, Number(options.pixelRatio) || 2));
                const canvasWidth = Math.max(1, Math.round(width * pixelRatio));
                const canvasHeight = Math.max(1, Math.round(height * pixelRatio));
                let pngBlob = null;
                let lastError = null;
                for (const source of svgSources) {
                    try {
                        const image = await loadImage(source);
                        // Eine Canvas bleibt nach einem SecurityError dauerhaft
                        // verunreinigt. Jeder SVG-Versuch bekommt deshalb eine
                        // frische Canvas, damit ein foreignObject-Fehlschlag
                        // den nativen Fallback nicht ebenfalls blockiert.
                        const imageCanvas = doc.createElement('canvas');
                        imageCanvas.width = canvasWidth;
                        imageCanvas.height = canvasHeight;
                        const context = imageCanvas.getContext('2d');
                        if (!context) throw new Error('Der Browser stellt keine Canvas-Ausgabe bereit.');
                        context.setTransform?.(1, 0, 0, 1, 0, 0);
                        context.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
                        context.scale(pixelRatio, pixelRatio);
                        context.drawImage(image, 0, 0, width, height);
                        pngBlob = await canvasToPngBlob(imageCanvas);
                        if (pngBlob) break;
                    } catch (error) {
                        lastError = error;
                    }
                }
                if (!pngBlob) throw lastError || new Error('Die PNG-Datei konnte nicht erzeugt werden.');
                const fileName = getSuggestedFileName() + '-skizze.png';
                const link = doc.createElement('a');
                const pngUrl = urlApi.createObjectURL(pngBlob);
                link.href = pngUrl;
                link.download = fileName;
                link.style.display = 'none';
                doc.body.appendChild(link);
                link.click();
                link.remove();
                win.setTimeout(() => urlApi.revokeObjectURL(pngUrl), 1000);
                notify('Messskizze als PNG heruntergeladen.', 'info');
                return true;
            } catch (error) {
                console.error('PNG-Export fehlgeschlagen', error);
                notify('Die Messskizze konnte in diesem Browser nicht als PNG erzeugt werden.', 'error');
                return false;
            } finally {
                urlApi.revokeObjectURL(svgUrl);
                urlApi.revokeObjectURL(nativeSvgUrl);
            }
        }

        function downloadPdf(options = {}) {
            const doc = getDocument();
            const win = getWindow();
            const stand = getExportStand();
            const wrapper = doc.createElement('div');
            wrapper.innerHTML = renderPrintSheet(stand);
            const printSheet = wrapper.firstElementChild;
            doc.body.appendChild(printSheet);
            const previousTitle = doc.title;
            // Browser verwenden den Dokumenttitel beim nativen Druckdialog in
            // der Regel als vorgeschlagenen PDF-Dateinamen.
            doc.title = getSuggestedFileName();
            const cleanup = () => {
                printSheet.remove();
                doc.title = previousTitle;
                doc.body.classList.remove('mk-printing');
            };
            win.addEventListener('afterprint', cleanup, { once: true });
            doc.body.classList.add('mk-printing');
            win.setTimeout(() => {
                win.print();
                win.setTimeout(() => {
                    if (doc.body.contains(printSheet)) cleanup();
                }, 250);
            }, 40);
            notify('PDF-Export geöffnet. Wähle dort „Als PDF speichern“.', 'info');
        }

        return Object.freeze({
            getExportStand,
            getSuggestedFileName,
            renderNotes,
            renderProjectDetails,
            renderExportNotice,
            renderExportDetails,
            getTopologyMarkup,
            renderPrintSheet,
            downloadPdf,
            downloadImage
        });
    }

    global.WattspurMesskonzeptExport = Object.freeze({ createExporter });
}(window));
