'use strict';

/*
 * Regressionstest für die kompakte PDF-One-Pager-Struktur.
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
const topologyPosition = exportSource.indexOf('<section class="mk-print-topology"');
const notesPosition = exportSource.indexOf('${renderNotes()}');

assert(exportSource.includes('function renderExportNotice()'), 'PDF muss einen zentralen Hinweisbaustein besitzen');
assert(noticePosition >= 0 && topologyPosition > noticePosition, 'PDF-Reihenfolge: Hinweis muss vor der Messskizze stehen');
assert(topologyPosition > 0 && projectPosition > topologyPosition, 'PDF-Reihenfolge: Projektangaben müssen unter der Messskizze stehen');
assert(notesPosition > projectPosition && exportSource.includes('mk-print-sheet--one-page') && !exportSource.includes('renderExportDetails()}'), 'Kommentar muss nach den Projektangaben folgen; Prüfstatus und Objektdetails bleiben draußen');
assert(exportSource.includes('mk-print-project-row') && exportSource.includes('Messkonzept'), 'Projektangaben müssen in kompakte Zeilen mit Messkonzept aufgeteilt werden');

const topologyRule = stylesSource.indexOf('body.mk-printing .mk-print-topology {');
assert(topologyRule >= 0, 'PDF-CSS muss eine eigene Messskizzenregel besitzen');
assert(!stylesSource.includes('page-break-before: always;') && !stylesSource.includes('break-before: page;'), 'PDF-One-Pager darf die Messskizze nicht auf eine zweite Seite zwingen');
assert(stylesSource.includes('body.mk-printing .mk-print-status,') && stylesSource.includes('display: none !important;'), 'Prüfstatus und Objektdetails müssen im One-Pager ausgeblendet bleiben');
assert(stylesSource.includes('body.mk-printing .mk-print-header') && stylesSource.includes('position: static;'), 'PDF-Kopfzeile muss im normalen Dokumentfluss bleiben und Inhalte nicht überdecken');
assert(requirementsSource.includes('One-Pager') && requirementsSource.includes('Kommentar') && requirementsSource.includes('Akzeptanzkriterien'), 'PDF-Layout-Anforderungen müssen Reihenfolge und Kommentar dokumentieren');

console.log('PDF-Status-Layout-Test: OK');
