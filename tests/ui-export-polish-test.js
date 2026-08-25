'use strict';

/* Regression checks for the UI/export polishing pass. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const annotations = read('js/messkonzept/annotations.js');
const exportSource = read('js/messkonzept/export.js');
const interaction = read('js/messkonzept/interaction.js');
const bootstrap = read('messkonzept.js');
const html = read('index.html');
const projectMeta = read('js/messkonzept/project-meta.js');
const styles = read('styles.css');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(annotations.includes('updateAssetField') && annotations.includes('updateHakField'), 'Infobox-Editor braucht Setter für Anlagen und HAK');
assert(annotations.includes('requestAnimationFrame') && annotations.includes('schedulePointerUpdate'), 'Infobox-Bewegung muss Pointer-Events per Animation-Frame bündeln');
assert(annotations.includes('getTargetEdgePoint'), 'Infobox-Verbindung muss einen Randanker berechnen');
assert(!annotations.includes("if (record?.kind !== 'meter') return;"), 'Infobox-Doppelklick darf nicht auf Zähler beschränkt bleiben');
assert(annotations.includes('is-inline-editing') && annotations.includes('scrollHeight'), 'Mehrzeilige Infobox-Bemerkungen müssen sich beim Bearbeiten vorübergehend vollständig öffnen');
assert(bootstrap.includes('downloadImage'), 'Bildexport muss in den Konfigurator verkabelt sein');
assert(interaction.includes("bindClick('btn-mk-export-image'"), 'Bildexport-Button muss eine Interaktion besitzen');
assert(html.includes('id="btn-mk-export-image"'), 'Bildexport-Button fehlt im Editor');
assert(html.includes('data-download-label="PNG"'), 'Bildexport muss als PNG beschriftet sein');
assert(exportSource.includes('async function downloadImage'), 'Bildexport muss als eigener Exportpfad vorhanden sein');
assert(exportSource.includes('image/png') && exportSource.includes('toBlob'), 'Bildexport muss eine echte PNG-Datei erzeugen');assert(exportSource.includes('>Wattspur.de</text>'), 'PNG-Bildexport muss unten rechts auf Wattspur.de verweisen');
assert(exportSource.includes('inlineComputedStyles') && exportSource.includes('xmlns', 'http://www.w3.org/1999/xhtml'), 'PNG-Export muss die sichtbaren HTML-Stile lokal in die Exportkopie übernehmen');assert(exportSource.includes('renderNativeAnnotationText') && exportSource.includes('mk-export-annotation-text') && exportSource.includes('visibility', 'hidden', 'important') && exportSource.includes('opacity', '0', 'important'), 'PNG-Export muss Infobox-Texte als native SVG-Schrift sichtbar halten');assert(exportSource.includes('mk-export-background') && exportSource.includes('#f8fafc'), 'PNG-Export braucht einen hellen, nicht transparenten Hintergrund');
assert(exportSource.includes('mk-export-connectors') && exportSource.includes('connectorMarkup'), 'PNG-Export muss die Sammelschienen und dynamischen Leitungen als native SVG-Ebene übernehmen');assert(exportSource.includes('annotationConnectorMarkup') && exportSource.includes('mk-export-annotation-connectors'), 'PNG-Export muss Infoboxen und ihre Bezugslinien berücksichtigen');assert(!exportSource.includes("clone.querySelector('.mk-meter-annotation-layer')?.remove()"), 'PNG-Export darf aktive Infoboxen nicht pauschal entfernen');assert(exportSource.includes("setAttribute('xmlns', 'http://www.w3.org/2000/svg')") && exportSource.includes("mk-meter-annotation-card, .mk-meter-annotation-value"), 'PNG-Export muss SVG-Icons und Infobox-Texte im hellen Bildhintergrund sichtbar halten');
assert(exportSource.includes('measured.annotations') && exportSource.includes('const bounds ='), 'PNG-Export muss den sichtbaren Rahmen aus Skizze und Infoboxen gemeinsam bestimmen');assert(exportSource.includes('hasAnnotationContent') && exportSource.includes('annotationContentFlags') && exportSource.includes('includeAnnotationCard'), 'Leere Infoboxen dürfen den PNG-Ausschnitt nicht vergrößern');
assert(exportSource.includes('clonedAnnotationCards') && exportSource.includes('clonedAnnotationPaths'), 'Leere Infoboxen und ihre Bezugslinien müssen gemeinsam aus der PNG-Kopie entfernt werden');
const imageExportStart = exportSource.indexOf('async function downloadImage');
const topologyExportStart = exportSource.indexOf('function getTopologyMarkup');
assert(imageExportStart > topologyExportStart && exportSource.indexOf('clonedAnnotationCards') > imageExportStart, 'Der Leerkartenfilter darf nur den PNG-Export und nicht den PDF-Export verändern');
assert(exportSource.includes('.mk-ownership-label') && exportSource.includes("background', 'transparent'") && exportSource.includes("text-shadow', '0 1px 0 #f8fafc'"), 'Die Eigentumsgrenze braucht im hellen PNG eine transparente, lesbare Beschriftung');assert(exportSource.includes('.mk-annotation-dismiss, .mk-annotation-resize-handle, .mk-remove-asset, .mk-remove-meter, [data-mk-remove-asset], [data-mk-remove-meter]') && exportSource.includes("margin', '0'") && exportSource.includes("height', 'auto', 'important'"), 'PNG-Export darf Infobox-Steuerknöpfe nicht anzeigen und muss Editor-Gutters neutralisieren');assert(exportSource.includes('.mk-connection-line') && exportSource.includes('.mk-rail-meter-link') && exportSource.includes(".mk-zone-wrap-strand"), 'PNG-Export darf alte HTML/CSS-Leitungen nicht doppelt zur SVG-Ebene zeichnen');
const printSheet = exportSource.slice(exportSource.indexOf('function renderPrintSheet'));
assert(printSheet.indexOf('${renderExportNotice()}') > printSheet.indexOf('<footer class="mk-print-footer"'), 'PDF-Hinweis muss in der Fußzeile stehen');
assert(html.includes('data-mk-project-field="streetAddress"') && !html.includes('data-mk-project-field="houseNumber"'), 'Straße und Hausnummer sollen ein gemeinsames Eingabefeld bilden');
assert(projectMeta.includes('streetAddress') && projectMeta.includes('houseNumber'), 'Projektcontroller muss die kombinierte Standortangabe in bestehende Felder aufteilen');
assert(styles.includes('mk-print-footer .mk-print-notice'), 'PDF-Fußzeile braucht eine eigene Hinweisdarstellung');
assert(styles.includes('.mk-meter-annotation-card.is-inline-editing') && styles.includes('overflow: visible'), 'Die temporär geöffnete Infobox darf beim Bearbeiten nicht intern scrollen');
assert(styles.includes('body.mk-printing .mk-meter-annotation-values span') && styles.includes('overflow-wrap: normal') && styles.includes('min-width: min-content'), 'PDF-Infoboxen dürfen einzelne Wörter nicht zeichenweise umbrechen');

console.log('UI-/Export-Politur-Test: OK');
