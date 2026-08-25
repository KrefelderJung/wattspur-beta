'use strict';

/* Regressionstest für die Infobox-Höhenrückkopplung.
 *
 * Die Zeichenfläche ist ein automatisch mitwachsender Layoutbereich. Ihre
 * aktuelle Höhe darf deshalb nicht erneut als Mindesthöhe in die Bühne
 * geschrieben werden. Sonst vergrößert jeder ResizeObserver-Lauf die Seite.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const annotations = fs.readFileSync(path.join(ROOT, 'js/messkonzept/annotations.js'), 'utf8');
const requirements = fs.readFileSync(path.join(ROOT, 'docs/object-annotation-visibility-anforderungen.md'), 'utf8');
const positionRequirements = fs.readFileSync(path.join(ROOT, 'docs/meter-annotation-blocks-anforderungen.md'), 'utf8');
const failures = [];
const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

assert(annotations.includes('getTopologyContentHeight(stage)'),
    'Infobox-Arbeitsraum muss von der Topologiehöhe ausgehen');
assert(!annotations.includes('canvas.clientHeight / Math.max(0.01, scale)'),
    'Die aktuelle Canvas-Höhe darf nicht als rückgekoppelte Mindesthöhe verwendet werden');
assert(annotations.includes("stage.style.removeProperty('min-height')"),
    'Nicht mehr benötigter Arbeitsraum muss wieder entfernt werden können');
assert(annotations.includes('baseHeight + next.top + next.bottom'),
    'Oberer Infobox-Arbeitsraum muss in die vertikale Scrollfläche eingehen');
assert(annotations.includes('Linker und oberer Arbeitsraum liegen vor dem Bühnenursprung'),
    'Die Rückkopplungsschutz-Dokumentation im Code fehlt');
assert(annotations.includes('mk-annotation-gutter-left')
    && annotations.includes('mk-annotation-gutter-right')
    && annotations.includes('mk-annotation-gutter-top')
    && annotations.includes('mk-annotation-gutter-bottom'),
    'Infobox-Arbeitsraum muss alle vier Verschieberichtungen unterstützen');
assert(annotations.includes('getWorkspaceRequirements') && annotations.includes('metrics.minX') && annotations.includes('metrics.minY'),
    'Infobox-Positionen müssen dynamisch über die Topologiegrenzen hinaus abgesichert werden');
assert(annotations.includes("connector.style.setProperty('left'")
    && annotations.includes("connector.style.setProperty('top'"),
    'Die Bezugslinien müssen bei negativem Infobox-Arbeitsraum am gleichen Koordinatensystem ausgerichtet bleiben');
assert(/nicht\s+wachsen/.test(requirements) && requirements.includes('höhenstabil'),
    'Akzeptanzkriterien für stabiles Infobox-Layout fehlen');
assert(annotations.includes('const gap = 48')
    && annotations.includes('targetPoint.x - cardWidth - gap')
    && annotations.includes('targetPoint.y + gap'),
    'Automatische Infoboxen müssen mit vergrößertem Abstand unten links starten');
assert(annotations.includes('getAutomaticCandidates')
    && annotations.includes('getPreferredAutomaticCandidate')
    && annotations.includes('candidate.x >= 6')
    && annotations.includes('workspaceRequirements = getWorkspaceRequirements')
    && annotations.includes('const initialMetrics = getStageMetrics(stage)'),
    'Der Arbeitsraum muss die automatische Startposition vor dem Begrenzen berücksichtigen');
assert(positionRequirements.includes('unterhalb und links')
    && /deutlich\s+vergrößertem\s+Abstand/.test(positionRequirements),
    'Die neue Initialposition unten links muss dokumentiert sein');

if (failures.length) {
    console.error('Infobox-Layout-Regressionstest: FEHLER (' + failures.length + ')');
    failures.forEach(failure => console.error('- ' + failure));
    process.exitCode = 1;
} else {
    console.log('Infobox-Layout-Regressionstest: OK');
}
