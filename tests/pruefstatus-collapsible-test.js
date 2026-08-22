'use strict';

/* Regressionstest für aufklappbare Prüfhinweise und sicheren Textumbruch. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/messkonzept/validation-status.js'), 'utf8');
const validation = { innerHTML: '' };
const context = {
    console,
    window: {
        WattspurMesskonzeptRules: {
            evaluate: () => [
                { ruleId: 'MK-1', ruleKey: 'FIRST', title: 'Inbetriebnahmedatum prüfen', level: 'info', text: 'Ein langer Hinweistext mit https://beispiel.invalid/und-einem-sehr-langen-abschnitt muss innerhalb der Karte umbrechen.', links: [{ label: 'Quelle', href: 'https://beispiel.invalid' }], assetIds: ['asset-1'] },
                { ruleId: 'MK-2', ruleKey: 'SECOND', title: 'Zweite Prüfung', level: 'warning', text: 'Weitere Information.' }
            ]
        }
    }
};
vm.createContext(context);
vm.runInContext(source, context);

const controller = context.window.WattspurMesskonzeptValidationStatus.createValidationStatusController({
    getState: () => ({ assets: [{ id: 'asset-1', name: 'PV2', type: 'generation', energyCarrier: 'PV' }] }),
    getElements: () => ({ validation }),
    escapeHtml: value => String(value ?? '')
});
controller.renderValidation();

if ((validation.innerHTML.match(/<details /g) || []).length !== 2) throw new Error('Jeder Prüfhinweis muss ein eigenes details-Element erhalten');
if (!validation.innerHTML.includes('Inbetriebnahmedatum prüfen') || !validation.innerHTML.includes('Zweite Prüfung')) throw new Error('Die Überschriften müssen im geöffneten Inhalt sichtbar sein');
if ((validation.innerHTML.match(/mk-validation-status-marker/g) || []).length !== 2) throw new Error('Jede Prüfkarte muss ihren neutralen Status-Marker anzeigen');
if (!validation.innerHTML.includes('Info 1') || !validation.innerHTML.includes('Hinweis 1')) throw new Error('Info- und Hinweis-Tags müssen je Kategorie nummeriert werden');
if (!validation.innerHTML.includes('mk-validation-asset-tag') || !validation.innerHTML.includes('PV2')) throw new Error('Bekannte Anlagen sollen optional als Tag zugeordnet werden');
if (!validation.innerHTML.includes('mk-validation-asset-tag--generation')) throw new Error('Anlagen-Tags müssen die semantische Objektfarbe verwenden');
if (!validation.innerHTML.includes('mk-validation-status-marker info') || !validation.innerHTML.includes('mk-validation-status-marker warning')) throw new Error('Info und Hinweis müssen als eigene Status-Marker und nicht als Objekt-Tags gerendert werden');
if (!validation.innerHTML.includes('mk-validation-summary-main') || !validation.innerHTML.includes('mk-validation-summary-assets')) throw new Error('Status-Marker und Anlagen-Tags müssen in getrennten Zeilen strukturiert werden');
if (validation.innerHTML.includes('mk-validation-severity-dot') || validation.innerHTML.includes('mk-validation-summary-title')) throw new Error('Zusätzliche Bulletpoints und doppelte Summary-Titel dürfen nicht gerendert werden');
const summaries = [...validation.innerHTML.matchAll(/<summary[\s\S]*?<\/summary>/g)].map(match => match[0]);
const visibleSummaries = summaries.map(summary => summary.replace(/aria-label="[^"]*"/g, ''));
if (visibleSummaries.some(summary => summary.includes('Inbetriebnahmedatum prüfen') || summary.includes('Zweite Prüfung'))) throw new Error('Regelüberschriften dürfen nicht zusätzlich in der geschlossenen Zeile stehen');
if (!validation.innerHTML.includes('mk-validation-body') || !validation.innerHTML.includes('mk-validation-links')) throw new Error('Ausführlicher Hinweistext und Quellenlinks müssen im geöffneten Bereich liegen');

console.log('Prüfstatus-Aufklapp-Test: OK');
