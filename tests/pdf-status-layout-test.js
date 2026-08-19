'use strict';

/*
 * Regressionstest für die PDF-Struktur.
 *
 * Die Prüfung bleibt bewusst DOM-frei: Sie stellt sicher, dass ein späteres
 * Export-Refactoring die Textseite nicht wieder in eine enge Statusspalte
 * und eine vorgezogene Messskizze aufteilt.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const exportSource = fs.readFileSync(path.join(ROOT, 'js/messkonzept/export.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const requirementsSource = fs.readFileSync(path.join(ROOT, 'docs/pdf-status-layout-anforderungen.md'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const noticePosition = exportSource.indexOf('${renderExportNotice()}');
const projectPosition = exportSource.indexOf('${renderProjectDetails()}');
const statusPosition = exportSource.indexOf('class="mk-print-status"');
const notesPosition = exportSource.indexOf('${renderNotes()}');
const topologyPosition = exportSource.indexOf('class="mk-print-topology"');

assert(exportSource.includes('function renderExportNotice()'), 'PDF muss einen zentralen Hinweisbaustein besitzen');
assert(exportSource.includes('Prüfstatus und Hinweise'), 'PDF muss die verständliche Überschrift „Prüfstatus und Hinweise“ verwenden');
assert(noticePosition >= 0 && projectPosition > noticePosition, 'PDF-Reihenfolge: Hinweis muss vor den Projektangaben stehen');
assert(statusPosition > projectPosition && (notesPosition < 0 || notesPosition > statusPosition), 'PDF-Reihenfolge: Prüfstatus muss direkt nach Projektangaben stehen');
assert(topologyPosition > statusPosition && (notesPosition < 0 || topologyPosition > notesPosition), 'PDF-Reihenfolge: Messskizze muss nach Prüfstatus und Notizen stehen');

const topologyRule = stylesSource.indexOf('body.mk-printing .mk-print-topology {');
assert(topologyRule >= 0, 'PDF-CSS muss eine eigene Messskizzenregel besitzen');
assert(stylesSource.includes('page-break-before: always;') && stylesSource.includes('break-before: page;'), 'PDF-Messskizze muss auf einer neuen Seite beginnen');
const statusRule = stylesSource.indexOf('body.mk-printing .mk-print-status {');
const statusListRule = stylesSource.indexOf('body.mk-printing .mk-print-status ul {');
assert(statusRule >= 0 && statusListRule > statusRule, 'PDF-CSS muss Statuscontainer und Statusliste getrennt gestalten');
assert(stylesSource.includes('display: block;\n        width: 100%;') && stylesSource.includes('list-style: none;') && stylesSource.includes('.mk-print-status-label'), 'PDF-Prüfstatus muss einspaltig und druckneutral gestaltet sein');
assert(exportSource.includes('statusCounters') && exportSource.includes('mk-print-status-label'), 'PDF-Prüfstatus muss nummerierte, neutrale Statuslabels ausgeben');
assert(requirementsSource.includes('Prüfstatus und Hinweise') && requirementsSource.includes('Akzeptanzkriterien'), 'PDF-Layout-Anforderungen müssen dokumentiert sein');

console.log('PDF-Status-Layout-Test: OK');
