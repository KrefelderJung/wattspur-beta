'use strict';

/* Prüft die kompakte Informationsführung des Lastgang-Starts. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const failures = [];

function assert(condition, message) {
    if (!condition) failures.push(message);
}

assert(index.includes('data-analysis-info="format"') && index.includes('data-analysis-info="hints"'), 'Startpanel braucht gleichwertige Schaltflächen für Importformat und Hinweise');
assert(index.includes('id="analysis-info-dialog"') && index.includes('id="analysis-info-format"') && index.includes('id="analysis-info-hints"'), 'Gemeinsamer Info-Dialog und beide Inhalte fehlen');
assert(!index.includes('<details id="format-example"') && !index.includes('<details id="transparency"'), 'Die alten uneinheitlichen Start-Slides müssen entfernt bleiben');
assert(index.includes('Ein gemeinsames Grundschema') && index.includes('Datum | Uhrzeit | Lastgang (kW)'), 'Importformat muss CSV und XLSX über ein gemeinsames Grundschema erklären');
assert(index.includes('Spalte 1: Datum') && index.includes('Ab Spalte 3: ein oder mehrere Lastgänge'), 'Importformat muss die drei wesentlichen Spaltenregeln kurz erklären');
assert(index.includes('<footer class="landing-footer">') && index.includes('href="kontakt.html"') && index.includes('href="impressum.html"') && index.includes('href="datenschutz.html"') && index.includes('href="lizenz.html"'), 'Lastgang-Einstieg braucht die vollständige rechtliche Fußzeile');
assert(!styles.includes('html[data-tool="lastgang"] .landing-footer'), 'Die Lastgang-Einstiegsseite darf ihre rechtliche Fußzeile nicht ausblenden');
assert(app.includes('openAnalysisInfo') && app.includes('closeAnalysisInfo') && app.includes('template.content.cloneNode(true)') && app.includes("event.key === 'Escape'"), 'Info-Dialog braucht Öffnen, Schließen und Tastaturbedienung');
assert(app.includes('downloadInfoActions') && app.includes('infoContent?.addEventListener'), 'Downloads im Importformat müssen auch im Dialog funktionieren');
assert(styles.includes('.analysis-info-actions') && styles.includes('.analysis-info-dialog') && styles.includes('.analysis-info-dialog-card'), 'Info-Schaltflächen und Dialog benötigen eine gemeinsame responsive Gestaltung');

if (failures.length) {
    console.error(`Lastgang-Start-Info-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('Lastgang-Start-Info-Test: OK');
}
