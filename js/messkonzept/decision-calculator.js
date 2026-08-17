/*
 * Wattspur Messkonzept: Wirtschaftlichkeits-Check (Beta)
 *
 * Reine Orientierungsrechnung ohne Netz- oder Tarifdatenbank. Die Berechnung
 * bleibt bewusst unabhängig vom Messkonzept-Zustand und kann später durch
 * belastbare Eingaben oder einen eigenen Rechner ersetzt werden.
 */
(function exposeMesskonzeptDecisionCalculator(global) {
    'use strict';

    const MODULE_2_REDUCTION_RATE = 0.6;
    const ENFG_2026 = Object.freeze({
        kwkg: 0.446,
        offshore: 0.941,
        year: 2026
    });
    const HEAT_PUMP_PRIVILEGE_CT_PER_KWH = ENFG_2026.kwkg + ENFG_2026.offshore;

    const EXAMPLE_VALUES = Object.freeze({
        oneTimeCost: 5250,
        meterFee: 120,
        consumption: 3500,
        commonElectricityPrice: 40,
        specialTariffPrice: 22,
        module1Reduction: 150,
        module2WorkPrice: 8,
        netEntgeltModule: 'both',
        heatPumpPrivilege: true
    });

    const NUMBER_INPUT_KEYS = Object.freeze([
        'oneTimeCost',
        'meterFee',
        'consumption',
        'commonElectricityPrice',
        'specialTariffPrice',
        'module1Reduction',
        'module2WorkPrice'
    ]);

    function parseNumber(value) {
        const normalized = String(value ?? '').trim().replace(',', '.');
        if (!normalized) return null;
        const number = Number(normalized);
        return Number.isFinite(number) && number >= 0 ? number : null;
    }

    function parseBoolean(value) {
        return value === true || value === 'true' || value === 'yes' || value === 'on' || value === '1';
    }

    function calculate(values, uncertainty = 0.2) {
        const parsed = Object.fromEntries(NUMBER_INPUT_KEYS.map(key => [key, parseNumber(values?.[key])]));
        if (Object.values(parsed).some(value => value === null)) {
            return Object.freeze({ valid: false, missing: NUMBER_INPUT_KEYS.filter(key => parsed[key] === null) });
        }

        const investment = parsed.oneTimeCost;
        const commonAnnualEnergyCost = parsed.consumption * parsed.commonElectricityPrice / 100;
        const separateAnnualEnergyCost = parsed.consumption * parsed.specialTariffPrice / 100;
        const tariffSaving = commonAnnualEnergyCost - separateAnnualEnergyCost;
        const heatPumpPrivilege = parseBoolean(values?.heatPumpPrivilege);
        const privilegeSaving = heatPumpPrivilege
            ? parsed.consumption * HEAT_PUMP_PRIVILEGE_CT_PER_KWH / 100
            : 0;
        const module1Saving = parsed.module1Reduction;
        const module2Saving = parsed.consumption * parsed.module2WorkPrice * MODULE_2_REDUCTION_RATE / 100;
        const commonAnnualCost = commonAnnualEnergyCost - module1Saving;
        const separateAnnualCostByModule = Object.freeze({
            module1: separateAnnualEnergyCost + parsed.meterFee - module1Saving - privilegeSaving,
            module2: separateAnnualEnergyCost + parsed.meterFee - module2Saving - privilegeSaving
        });
        const annualNetSavingByModule = Object.freeze({
            module1: commonAnnualCost - separateAnnualCostByModule.module1,
            module2: commonAnnualCost - separateAnnualCostByModule.module2
        });
        const selectedModule = ['module1', 'module2'].includes(values?.netEntgeltModule)
            ? values.netEntgeltModule
            : 'both';
        const annualNetSaving = selectedModule === 'module2'
            ? annualNetSavingByModule.module2
            : annualNetSavingByModule.module1;
        const factor = Math.max(0, Number(uncertainty) || 0);
        const variableSavingByModule = Object.freeze({
            module1: tariffSaving + privilegeSaving,
            module2: tariffSaving + privilegeSaving + module2Saving - module1Saving
        });
        const lowAnnualSavingByModule = Object.freeze({
            module1: variableSavingByModule.module1 * (1 - factor) - parsed.meterFee,
            module2: variableSavingByModule.module2 * (1 - factor) - parsed.meterFee
        });
        const highAnnualSavingByModule = Object.freeze({
            module1: variableSavingByModule.module1 * (1 + factor) - parsed.meterFee,
            module2: variableSavingByModule.module2 * (1 + factor) - parsed.meterFee
        });
        const lowAnnualSaving = lowAnnualSavingByModule[selectedModule === 'module2' ? 'module2' : 'module1'];
        const highAnnualSaving = highAnnualSavingByModule[selectedModule === 'module2' ? 'module2' : 'module1'];

        const amortization = annualSaving => annualSaving > 0 ? investment / annualSaving : null;
        return Object.freeze({
            valid: true,
            investment,
            commonAnnualCost,
            separateAnnualCostByModule,
            commonElectricityPrice: parsed.commonElectricityPrice,
            specialTariffPrice: parsed.specialTariffPrice,
            tariffSaving,
            privilegeSaving,
            heatPumpPrivilege,
            module1Saving,
            module2Saving,
            module2ReductionRate: MODULE_2_REDUCTION_RATE,
            enfgUmlageCtPerKwh: HEAT_PUMP_PRIVILEGE_CT_PER_KWH,
            enfgUmlageValues: ENFG_2026,
            selectedModule,
            annualNetSaving,
            annualNetSavingByModule,
            annualSavingRange: Object.freeze({ low: lowAnnualSaving, high: highAnnualSaving }),
            annualSavingRangeByModule: Object.freeze({
                module1: Object.freeze({ low: lowAnnualSavingByModule.module1, high: highAnnualSavingByModule.module1 }),
                module2: Object.freeze({ low: lowAnnualSavingByModule.module2, high: highAnnualSavingByModule.module2 })
            }),
            amortization: Object.freeze({
                conservative: amortization(lowAnnualSaving),
                expected: amortization(annualNetSaving),
                optimistic: amortization(highAnnualSaving),
                byModule: Object.freeze({
                    module1: Object.freeze({
                        conservative: amortization(lowAnnualSavingByModule.module1),
                        expected: amortization(annualNetSavingByModule.module1),
                        optimistic: amortization(highAnnualSavingByModule.module1)
                    }),
                    module2: Object.freeze({
                        conservative: amortization(lowAnnualSavingByModule.module2),
                        expected: amortization(annualNetSavingByModule.module2),
                        optimistic: amortization(highAnnualSavingByModule.module2)
                    })
                })
            })
        });
    }

    function formatEuro(value, digits = 0) {
        if (value === null || !Number.isFinite(value)) return 'nicht erreichbar';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits }).format(value);
    }

    function formatYears(value) {
        if (value === null || !Number.isFinite(value)) return 'nicht amortisiert';
        return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)} Jahre`;
    }

    function formatCt(value, digits = 3) {
        return `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)} ct/kWh`;
    }

    function buildChart(result, horizon = 15) {
        const lines = [
            { key: 'common', label: 'Gemeinsame Messung · Modul 1', color: '#64748b', annualCost: result.commonAnnualCost, upfront: 0 }
        ];
        const selectedModules = result.selectedModule === 'both' ? ['module1', 'module2'] : [result.selectedModule];
        selectedModules.forEach(module => {
            lines.push({
                key: module,
                label: module === 'module1' ? 'Separate Messung · Modul 1' : 'Separate Messung · Modul 2',
                color: module === 'module1' ? '#38bdf8' : '#a78bfa',
                annualCost: result.separateAnnualCostByModule[module],
                upfront: result.investment
            });
        });

        const points = lines.flatMap(line => Array.from({ length: horizon + 1 }, (_, year) => line.upfront + line.annualCost * year));
        const minValue = Math.min(0, ...points);
        const maxValue = Math.max(0, ...points);
        const range = Math.max(1, maxValue - minValue);
        const width = 640;
        const height = 230;
        const padding = { left: 48, right: 18, top: 20, bottom: 34 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const x = year => padding.left + (year / horizon) * plotWidth;
        const y = value => padding.top + ((maxValue - value) / range) * plotHeight;
        const formatAxis = value => `${Math.round(value).toLocaleString('de-DE')} €`;
        const gridValues = [maxValue, maxValue - range / 2, minValue];
        const grid = gridValues.map(value => `
            <line x1="${padding.left}" y1="${y(value).toFixed(1)}" x2="${width - padding.right}" y2="${y(value).toFixed(1)}" class="mk-decision-chart-gridline"></line>
            <text x="${padding.left - 8}" y="${(y(value) + 4).toFixed(1)}" text-anchor="end" class="mk-decision-chart-axis-label">${formatAxis(value)}</text>
        `).join('');
        const xLabels = [0, Math.round(horizon / 2), horizon].map(year => `
            <text x="${x(year).toFixed(1)}" y="${height - 10}" text-anchor="middle" class="mk-decision-chart-axis-label">${year} J.</text>
        `).join('');
        const paths = lines.map(line => {
            const pointsString = Array.from({ length: horizon + 1 }, (_, year) => {
                const value = line.upfront + line.annualCost * year;
                return `${x(year).toFixed(1)},${y(value).toFixed(1)}`;
            }).join(' ');
            return `<polyline points="${pointsString}" class="mk-decision-chart-line" style="--mk-chart-line: ${line.color}"></polyline>`;
        }).join('');
        const legend = lines.map(line => `<span><i style="--mk-chart-line: ${line.color}"></i>${line.label}</span>`).join('');
        return `
            <div class="mk-decision-chart" role="img" aria-label="Kumulierte Kosten von gemeinsamer und separater Messung über ${horizon} Jahre">
                <div class="mk-decision-chart-heading"><strong>Kostenverlauf im Vergleich</strong><span>Die Linien zeigen die kumulierten Kosten über die Jahre.</span></div>
                <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
                    ${grid}
                    <line x1="${padding.left}" y1="${y(0).toFixed(1)}" x2="${width - padding.right}" y2="${y(0).toFixed(1)}" class="mk-decision-chart-zero"></line>
                    ${paths}
                    ${xLabels}
                </svg>
                <div class="mk-decision-chart-legend">${legend}</div>
            </div>
        `;
    }

    function createController(options = {}) {
        const getDocument = options.getDocument || (() => global.document);
        let initialized = false;
        let returnFocus = null;

        const getElements = () => {
            const documentRef = getDocument();
            return {
                overlay: documentRef?.getElementById('mk-decision-calculator'),
                trigger: documentRef?.getElementById('btn-mk-decision-calculator'),
                close: documentRef?.getElementById('btn-mk-decision-close'),
                example: documentRef?.getElementById('btn-mk-decision-example'),
                form: documentRef?.getElementById('mk-decision-form'),
                result: documentRef?.getElementById('mk-decision-result'),
                inputs: documentRef ? [...documentRef.querySelectorAll('[data-mk-decision-input]')] : []
            };
        };

        function setValues(values) {
            getElements().inputs.forEach(input => {
                const value = values[input.dataset.mkDecisionInput];
                if (input.type === 'checkbox') input.checked = Boolean(value);
                else input.value = value ?? '';
            });
        }

        function readValues(elements) {
            return Object.fromEntries(elements.inputs.map(input => [input.dataset.mkDecisionInput, input.type === 'checkbox' ? input.checked : input.value]));
        }

        function renderResult(result, elements) {
            if (!elements.result) return;
            if (!result.valid) {
                elements.result.innerHTML = '<p class="mk-decision-result-placeholder">Bitte fülle alle Felder aus. Verwende Zahlen ohne Tausenderpunkt.</p>';
                return;
            }
            const range = result.selectedModule === 'both'
                ? 'Modul 1 und Modul 2 im Vergleich'
                : `${result.selectedModule === 'module1' ? 'Modul 1' : 'Modul 2'}: ${formatYears(result.amortization.expected)}`;
            const annualCost = value => `${formatEuro(value)}/Jahr`;
            const annualSaving = value => value > 0 ? `${formatEuro(value)}/Jahr` : 'keine positive Jahresersparnis';
            const module1Range = result.amortization.byModule.module1;
            const module2Range = result.amortization.byModule.module2;
            elements.result.innerHTML = `
                <div class="mk-decision-result-heading"><span>Orientierungs-Ergebnis</span><strong>${range}</strong></div>
                <div class="mk-decision-result-grid">
                    <div><span>Einmalige Kosten</span><strong>${formatEuro(result.investment)}</strong></div>
                    <div><span>Gemeinsamer Zähler · Modul 1</span><strong>${annualCost(result.commonAnnualCost)}</strong></div>
                    <div><span>Separate Messung · Modul 1</span><strong>${annualCost(result.separateAnnualCostByModule.module1)}</strong></div>
                    <div><span>Separate Messung · Modul 2</span><strong>${annualCost(result.separateAnnualCostByModule.module2)}</strong></div>
                    <div><span>Tarifvorteil pro Jahr</span><strong>${annualSaving(result.tariffSaving)}</strong></div>
                    <div><span>Wärmepumpenprivileg</span><strong>${result.heatPumpPrivilege ? `${formatEuro(result.privilegeSaving)}/Jahr` : 'nicht berücksichtigt'}</strong></div>
                </div>
                ${buildChart(result)}
                <div class="mk-decision-module-ranges">
                    <span>Break-even Modul 1: <strong>${formatYears(module1Range.optimistic)} bis ${formatYears(module1Range.conservative)}</strong></span>
                    <span>Break-even Modul 2: <strong>${formatYears(module2Range.optimistic)} bis ${formatYears(module2Range.conservative)}</strong></span>
                </div>
                <p class="mk-decision-sensitivity">Der gemeinsame Zähler wird mit Modul 1 gerechnet. Die separate Messung berücksichtigt den eingetragenen Sondertarif, das Messentgelt und das gewählte 14a-Modul. Die Spanne verändert die variablen Vorteile um ±20 %. Die Rechnung ersetzt keine Prüfung des konkreten Angebots.</p>
            `;
        }

        function close() {
            const { overlay } = getElements();
            if (!overlay) return;
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            returnFocus?.focus?.();
            returnFocus = null;
        }

        function open() {
            const elements = getElements();
            if (!elements.overlay) return;
            returnFocus = getDocument().activeElement;
            elements.overlay.classList.remove('hidden');
            elements.overlay.setAttribute('aria-hidden', 'false');
            elements.inputs[0]?.focus();
        }

        function initialize() {
            if (initialized) return;
            const documentRef = getDocument();
            const elements = getElements();
            if (!documentRef || !elements.overlay || !elements.trigger || !elements.form) return;
            initialized = true;
            elements.trigger.addEventListener('click', open);
            elements.close?.addEventListener('click', close);
            elements.overlay.addEventListener('click', event => {
                if (event.target === elements.overlay) close();
            });
            elements.form.addEventListener('submit', event => {
                event.preventDefault();
                renderResult(calculate(readValues(getElements())), getElements());
            });
            elements.form.addEventListener('input', () => renderResult(calculate(readValues(getElements())), getElements()));
            elements.example?.addEventListener('click', () => {
                setValues(EXAMPLE_VALUES);
                renderResult(calculate(EXAMPLE_VALUES), getElements());
            });
            documentRef.addEventListener('keydown', event => {
                if (event.key === 'Escape' && !getElements().overlay.classList.contains('hidden')) close();
            });
        }

        return Object.freeze({ initialize, open, close, calculate });
    }

    global.WattspurMesskonzeptDecisionCalculator = Object.freeze({
        EXAMPLE_VALUES,
        calculate,
        buildChart,
        createController
    });
}(window));
