'use strict';

/*
 * Wattspur – projektweiter Qualitäts-Gate-Test
 *
 * Dieser Test ersetzt keine Browser- oder Fachtests. Er prüft die Dinge, die
 * häufig erst bei einer Veröffentlichung auffallen: fehlende Dateien,
 * Syntaxfehler, versehentlich externe Skripte und nicht dokumentierte
 * Test-/Release-Artefakte.
 *
 * Aufruf:
 *   node tests/project-quality-test.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function absolute(relativePath) {
    return path.join(ROOT, relativePath);
}

function read(relativePath) {
    try {
        return fs.readFileSync(absolute(relativePath), 'utf8');
    } catch (error) {
        failures.push(`${relativePath}: konnte nicht gelesen werden (${error.code || error.message})`);
        return '';
    }
}

function assert(condition, message) {
    if (!condition) failures.push(message);
}

function collectJavaScriptFiles(relativeDirectory) {
    const directory = absolute(relativeDirectory);
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
        .map(entry => path.join(relativeDirectory, entry.name).replaceAll(path.sep, '/'));
}

function normalizeScriptPath(source) {
    return source.replace(/^\.\//, '').split('?')[0];
}

const requiredFiles = [
    'index.html',
    'lastgang-analyse.html',
    'messkonzept-konfigurator.html',
    'robots.txt',
    'sitemap.xml',
    'impressum.html',
    'datenschutz.html',
    'kontakt.html',
    'lizenz.html',
    'LICENSE.md',
    'COPYRIGHT.md',
    'THIRD-PARTY-NOTICES.md',
    'service-worker.js',
    'tests.html',
    'docs/lizenz-navigation-anforderungen.md',
    'tests/architecture-smoke-test.js',
    'tests/preset-loader-test.js',
    'tests/meter-delete-guard-test.js',
    'tests/z5-second-asset-test.js',
    'tests/rail-anchor-delete-test.js',
    'tests/messlogic-invariants-test.js',
    'tests/messlogic-replay-test.js',
    'tests/meter-hierarchy-regression-test.js',
    'tests/architecture-boundaries-test.js',
    'tests/data-editor-module-test.js',
    'tests/hak-voltage-test.js',
    'tests/steuve-total-power-test.js',
    'tests/direct-marketing-test.js',
    'tests/smart-meter-control-test.js',
    'tests/stecker-pv-mastr-test.js',
    'tests/steuve-tariff-separation-test.js',
    'tests/kwk-bafa-hinweis-test.js',
    'tests/nsh-steuve-gemeinsame-messung-test.js',
    'tests/commissioning-date-hint-test.js',
    'tests/stecker-pv-limit-test.js',
    'tests/technical-fields-test.js',
    'tests/mieterstrom-objects-test.js',
    'tests/seo-test.js',
    'tests/meter-rail-spacing-test.js',
    'tests/wallbox-icon-test.js',
    'tests/icon-object-number-badges-test.js',
    'tests/palette-border-standard-test.js',
    'tests/link-check-test.js',
    'tests/pdf-export-variants-test.js',
    'tests/pdf-export-filename-test.js',
    'tests/pdf-status-layout-test.js',
    'tests/pdf-object-tables-test.js',
    'tests/project-meta-toggle-test.js',
    'tests/drop-target-hitbox-test.js',
    'tests/toolbar-responsive-test.js',
    'tests/export-button-contrast-test.js',
    'tests/messkonzept-info-panel-test.js',
    'tests/messkonzept-bezeichnungen-test.js',
    'tests/meter-click-target-test.js',
    'tests/pointer-drag-test.js',
    'tests/pruefstatus-collapsible-test.js',
    'tests/meter-annotation-blocks-test.js',
    'tests/object-annotation-visibility-test.js',
    'tests/object-editor-fields-test.js',
    'tests/download-button-test.js',
    'tests/lastgang-start-info-test.js',
    'tests/empty-data-editor-test.js',
    'tests/xlsx-import-test.js',
    'tests/xlsx-import-runtime-test.js',
    'docs/architecture-smoke-test.md',
    'docs/messkonzept-regelwerk.md',
    'docs/messkonzept-startvorlagen.md',
    'docs/projekt-teststandard.md',
    'docs/pruefstatus-marker-anforderungen.md',
    'docs/darstellung-einfache-toolbar-anforderungen.md',
    'docs/technische-anlagenfelder.md',
    'docs/inbetriebnahmedatum-hinweis-anforderungen.md',
    'docs/smart-meter-steuerung-hinweis-anforderungen.md',
    'docs/steuve-tarif-hinweis-anforderungen.md',
    'docs/kwk-bafa-hinweis-anforderungen.md',
    'docs/nsh-steuve-gemeinsame-messung-anforderungen.md',
    'docs/seo-anforderungen.md',
    'docs/icon-object-number-badges-anforderungen.md',
    'docs/objektnummern-standard-anforderungen.md',
    'docs/klimaanlage-bezeichnung-anforderungen.md',
    'docs/projektangaben-editorbreite-anforderungen.md',
    'docs/drop-ziel-trefferflaechen-anforderungen.md',
    'docs/toolbar-responsive-anforderungen.md',
    'docs/export-button-kontrast-anforderungen.md',
    'docs/messkonzept-info-panel-anforderungen.md',
    'docs/messkonzept-bezeichnungen-anforderungen.md',
    'docs/pdf-objektbezeichnung-anforderungen.md',
    'docs/pdf-status-layout-anforderungen.md',
    'docs/pdf-dateiname-anforderungen.md',
    'docs/palette-border-anforderungen.md',
    'docs/pruefstatus-und-objektnummern-anforderungen.md',
    'docs/meter-click-selection-anforderungen.md',
    'docs/meter-annotation-blocks-anforderungen.md',
    'docs/object-annotation-visibility-anforderungen.md',
    'docs/object-editor-fields-anforderungen.md',
    'docs/download-button-anforderungen.md',
    'docs/lastgang-start-info-anforderungen.md',
    'docs/lastgang-importformat-footer-anforderungen.md',
    'docs/empty-data-editor-anforderungen.md',
    'docs/logo-navigation-anforderungen.md'
];
requiredFiles.forEach(relativePath => assert(fs.existsSync(absolute(relativePath)), `${relativePath}: erwartete Qualitätsdatei fehlt`));

const indexText = read('index.html');
const messkonzeptText = read('messkonzept.js');
const testText = read('tests.html');
const stylesText = read('styles.css');
const serviceWorkerText = read('service-worker.js');
const documentationText = read('docs/projekt-teststandard.md');
const licenseNavigationText = read('docs/lizenz-navigation-anforderungen.md');
const copyrightText = read('COPYRIGHT.md');
const presetText = read('js/messkonzept/presets.js');
const modelText = read('js/messkonzept/model.js');
const canvasRendererText = read('js/messkonzept/canvas-renderer.js');
const renderText = read('js/messkonzept/render.js');
const assetDisplayText = read('js/messkonzept/asset-display.js');
const identifiersText = read('js/messkonzept/identifiers.js');
const editorText = read('js/messkonzept/editor.js');
const technicalFieldsText = read('tests/technical-fields-test.js');
const rulesText = read('js/messkonzept/rules.js');
const dragDropText = read('js/messkonzept/drag-drop.js');
const interactionText = read('js/messkonzept/interaction.js');
const exportText = read('js/messkonzept/export.js');
const validationStatusText = read('js/messkonzept/validation-status.js');
const annotationText = read('js/messkonzept/annotations.js');
const xlsxParserText = read('js/import/xlsx-parser.js');

// Veröffentlichung darf keine externen Script-/Stylesheet-Abhängigkeiten
// erzwingen. Fachliche Referenzlinks (z. B. VBEW) sind davon ausgenommen.
const remoteScriptOrStyle = [...indexText.matchAll(/<script\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>|<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["'](https?:\/\/[^"']+)["'][^>]*>/gi)]
    .map(match => match[1] || match[2]);
assert(remoteScriptOrStyle.length === 0, `index.html: externe Script-/Stylesheet-Abhängigkeit gefunden (${remoteScriptOrStyle.join(', ')})`);
const localScripts = [...indexText.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map(match => normalizeScriptPath(match[1]))
    .filter(source => !/^https?:\/\//i.test(source));
localScripts.forEach(relativePath => {
    assert(fs.existsSync(absolute(relativePath)), `index.html: eingebundenes Script fehlt (${relativePath})`);
});

// Der Messkonzept-Kern verarbeitet Zustand und Regeln lokal. Netzwerkzugriffe
// gehören in das Browser-Test-Frontend bzw. in den Service Worker, nicht in
// Fach-, Render- oder Interaktionsmodule.
const localCoreFiles = [
    'messkonzept.js',
    'messkonzept-geometry.js',
    'messkonzept-topology.js',
    'js/lastgang/data-editor.js',
    ...collectJavaScriptFiles('js/messkonzept')
];
const networkApiPattern = /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/;
localCoreFiles.forEach(relativePath => {
    const source = read(relativePath);
    assert(!networkApiPattern.test(source), `${relativePath}: Netzwerk-API gehört nicht in den lokalen Messkonzept-Kern`);
});
assert(serviceWorkerText.includes('event.request.mode === \'navigate\''), 'service-worker.js: Offline-/Navigationsstrategie fehlt');
assert(serviceWorkerText.includes('js/messkonzept/model.js') && !serviceWorkerText.includes('js/messkonzept/mieterstrom.js') && serviceWorkerText.includes("'lizenz.html'") && /beta\.373/.test(serviceWorkerText), 'service-worker.js: vereinfachter Modellstand muss im neuen Offline-Cache enthalten sein');

// Der Netzanschluss ist ein eigenes, bearbeitbares Objekt. Diese Prüfungen
// verhindern, dass ein späteres Refactoring den HAK nur visuell anklickbar
// macht, aber Modell, Modal, Tastaturpfad oder Export vergisst.
assert(modelText.includes("hak: { voltageLevel: 'low'") && modelText.includes('setHakVoltageLevel') && modelText.includes('hak: clone'), 'model.js: Spannungsebene des HAK muss modelliert und historienfähig sein');
assert(canvasRendererText.includes('data-mk-select-hak') && canvasRendererText.includes('renderHakEditorFields') && canvasRendererText.includes('mk-transformer-symbol'), 'canvas-renderer.js: HAK-Auswahl und Trafo-Ringe müssen gerendert werden');
assert(editorText.includes('mkHakField') && editorText.includes('updateHakField'), 'editor.js: Spannungsebenenfeld muss über den Objekteditor aktualisiert werden');
assert(dragDropText.includes('[data-mk-select-hak]') && interactionText.includes('[data-mk-select-hak]'), 'Interaktion: HAK muss per Maus und Tastatur auswählbar sein');
assert(exportText.includes('state.hak?.voltageLevel') && exportText.includes('Spannungsebene'), 'export.js: gewählte HAK-Spannungsebene muss im Gesamtexport erscheinen');
assert(exportText.includes('renderExportNotice') && exportText.includes('mk-print-sheet--one-page') && exportText.includes('mk-print-topology') && !exportText.includes('renderExportDetails()}'), 'export.js: PDF muss als kompakter One-Pager mit Hinweis, Projektangaben und Skizze aufgebaut sein');
assert(read('tests/pdf-status-layout-test.js').includes('PDF-Status-Layout-Test: OK'), 'Regressionstest für die PDF-Textseite fehlt');
assert(read('tests/pdf-object-tables-test.js').includes('PDF-Objekttabellen-Test: OK'), 'Regressionstest für die PDF-Objekttabellen fehlt');
assert(read('tests/pdf-object-tables-test.js').includes('keine Objekttabellen'), 'Regressionstest für den reduzierten PDF-Export fehlt');
assert(read('tests/project-meta-toggle-test.js').includes('Projektangaben-Aufklapp-Test: OK'), 'Regressionstest für den sichtbaren Projektangaben-Aufklappbereich fehlt');
assert(read('tests/drop-target-hitbox-test.js').includes('Drop-Ziel-Trefferflächen-Test: OK'), 'Regressionstest für einheitliche Drop-Trefferflächen fehlt');
assert(read('tests/toolbar-responsive-test.js').includes('Responsive-Toolbar-Test: OK'), 'Regressionstest für die responsive Bedienleiste fehlt');
assert(read('tests/export-button-contrast-test.js').includes('Exportbutton-Kontrast-Test: OK'), 'Regressionstest für lesbare PDF-Exportbuttons fehlt');
assert(read('tests/messkonzept-info-panel-test.js').includes('Messkonzept-Infopanel-Test: OK'), 'Regressionstest für die Messkonzept-Infoboxen fehlt');
assert(read('tests/messkonzept-bezeichnungen-test.js').includes('Messkonzept-Bezeichnungen-Test: OK'), 'Regressionstest für die Messkonzeptbezeichnungen fehlt');
assert(read('tests/meter-click-target-test.js').includes('stabile Modell-ID') && read('tests/meter-click-target-test.js').includes('Zähler-Klickziel-Test: OK'), 'Regressionstest für stabile Zähler-Klickziele fehlt');
assert(read('tests/pointer-drag-test.js').includes('Pointer-DnD-Test: OK'), 'Regressionstest für Tablet-Pointer-DnD fehlt');
assert(read('tests/project-field-standard-test.js').includes('Projektfelder-Standard-Test: OK'), 'Regressionstest für die standardisierten Projektfelder fehlt');
assert(read('tests/pruefstatus-collapsible-test.js').includes('Prüfstatus-Aufklapp-Test: OK'), 'Regressionstest für den aufklappbaren Prüfstatus fehlt');
assert(annotationText.includes('mk-meter-annotation-card') && annotationText.includes('pointerdown') && stylesText.includes('mk-meter-annotation-connector') && stylesText.includes('stroke-dasharray'), 'Zählerangaben: verschiebbare Karten und Bezugslinien fehlen');
assert(xlsxParserText.includes('parseXlsxArrayBuffer') && read('tests/xlsx-import-test.js').includes('XLSX-Import-Test: OK'), 'Regressionstest für den lokalen XLSX-Import fehlt');
assert(read('tests/xlsx-import-runtime-test.js').includes('XLSX-Import-Laufzeittest: OK'), 'Laufzeittest für den XLSX-Import fehlt');
assert(read('tests/meter-annotation-blocks-test.js').includes('Zähler-Infokarten-Test: OK'), 'Regressionstest für verschiebbare Zählerangaben fehlt');
assert(read('tests/object-annotation-visibility-test.js').includes('Objekt-Infobox-Sichtbarkeit-Test: OK'), 'Regressionstest für Infobox-Sichtbarkeit fehlt');
assert(validationStatusText.includes('mk-validation-item') && validationStatusText.includes('<details') && validationStatusText.includes('statusCounters') && validationStatusText.includes('mk-validation-asset-tag') && validationStatusText.includes('mk-validation-summary-main') && validationStatusText.includes('mk-validation-summary-assets'), 'validation-status.js: kompakte, nummerierte Prüfstatus-Tags müssen als aufklappbare Details gerendert werden');
assert(stylesText.includes('.mk-validation-item > summary::before') && stylesText.includes('overflow-wrap: anywhere'), 'styles.css: Prüfstatus braucht sichtbare Aufklappmarker und sicheren Textumbruch');
assert(stylesText.includes('.mk-validation-status-marker') && stylesText.includes('.mk-validation-item.info .mk-validation-status-icon') && stylesText.includes('.mk-validation-asset-tag--heatpump') && !stylesText.includes('.mk-validation-item.info .mk-validation-tag'), 'styles.css: Status-Marker und Objekt-Tags müssen getrennt gestaltet werden');
assert(!indexText.includes('id="mk-status-badge"') && !stylesText.includes('.mk-validation-severity-dot'), 'Prüfstatus: globaler Tag und zusätzliche Bulletpoints sollen entfallen');
assert(indexText.includes('id="mk-summary-title">Infos und Hinweise</span>'), 'Prüfstatus-Panel muss für Endanwender verständlich als Infos und Hinweise beschriftet sein');
assert(assetDisplayText.includes("const badgeAssetTypes = new Set(['storage', 'steuve'])") && assetDisplayText.includes('getNshAssetNumber') && !stylesText.includes('.mk-icon-object-sequence.generation') && !stylesText.includes('.mk-icon-object-sequence.nsh'), 'Objektnummern: Textkarten müssen ihre Kennung im Text tragen, reine Symbolkarten erhalten Badges');

// §14a: Bei Wärmepumpen wird ein einziges Leistungsfeld inklusive Heizstab
// gegen 4,2 kW geprüft. Ein separates Heizstabfeld darf nicht zurückkehren.
assert(rulesText.includes('getSteuveEffectivePower') && rulesText.includes('getSteuveMeasurementGroups') && rulesText.includes('STEUVE_LEGACY_REGIME') && rulesText.includes('einschließlich Heizstab') && !rulesText.includes('heatingRodPower'), 'rules.js: SteuVE müssen zählerbezogen summiert und zeitlich eingeordnet werden');
assert(rulesText.includes('STECKER_PV_MAX_INVERTER_VA') && rulesText.includes('getSteckerPvMeasurementGroups') && rulesText.includes('800 VA'), 'rules.js: Stecker-PV muss die Wechselrichtergrenze und die Messbereichssummierung prüfen');
assert(rulesText.includes('DIRECT_MARKETING_THRESHOLD_KW') && rulesText.includes('MK-ASSET-006') && rulesText.includes('getGenerationDirectMarketingAssessment'), 'rules.js: Direktvermarktungsschwelle und DOM-freie Bewertung fehlen');
assert(rulesText.includes('SMART_METER_CONTROL_THRESHOLD_KW') && rulesText.includes('MK-ASSET-008') && rulesText.includes('getSmartMeterControlAssessment'), 'rules.js: iMSys-/Steuerungsschwelle und DOM-freie Bewertung fehlen');
assert(rulesText.includes('STECKER_PV_MASTR') && rulesText.includes('MK-ASSET-009') && rulesText.includes('Marktstammdatenregister'), 'rules.js: Stecker-PV-MaStR-Hinweis fehlt');
assert(rulesText.includes('STEUVE_TARIFF_SEPARATION') && rulesText.includes('MK-STEUVE-001') && rulesText.includes('Energieversorger'), 'rules.js: Trennung von §14a-Anmeldung und Energietarif fehlt');
assert(rulesText.includes('KWK_BAFA') && rulesText.includes('MK-KWK-001') && rulesText.includes('KWK_MEASUREMENT') && rulesText.includes('MK-KWK-002') && rulesText.includes('bafa.de'), 'rules.js: KWK-/BAFA- und Messhinweise fehlen');
assert(rulesText.includes('NSH_STEUVE_MIXED') && rulesText.includes('MK-NSH-001') && rulesText.includes('Bestandsregelungen'), 'rules.js: Mischhinweis für Nachtspeicherheizung und neue SteuVE fehlt');
assert(!canvasRendererText.includes('data-mk-generation-notice') && !canvasRendererText.includes('renderGenerationNotice') && !editorText.includes('renderGenerationNotice') && rulesText.includes('DIRECT_MARKETING'), 'Messkonzept-Editor: Fachhinweise müssen zentral im Prüfstatus statt doppelt im Objekt erscheinen');
assert(rulesText.includes("makeCheck('COMMISSIONING_DATE_MISSING', 'info'") && canvasRendererText.includes('data-mk-field="commissioningDate"'), 'Prüfstatus: fehlende optionale Inbetriebnahmedaten müssen zentral und nicht blockierend geprüft werden');
assert(read('tests/direct-marketing-test.js').includes('direct-marketing-test: OK'), 'Direktvermarktungs-Regressionstest fehlt');
assert(read('tests/smart-meter-control-test.js').includes('smart-meter-control-test: OK'), 'Regressionstest für iMSys-/Steuerungshinweis fehlt');
assert(read('tests/stecker-pv-mastr-test.js').includes('stecker-pv-mastr-test: OK'), 'Regressionstest für den Stecker-PV-MaStR-Hinweis fehlt');
assert(read('tests/steuve-tariff-separation-test.js').includes('steuve-tariff-separation-test: OK'), 'Regressionstest für die Trennung von §14a-Anmeldung und Energietarif fehlt');
assert(read('tests/kwk-bafa-hinweis-test.js').includes('kwk-bafa-hinweis-test: OK'), 'Regressionstest für KWK-/BAFA- und Messhinweise fehlt');
assert(read('tests/nsh-steuve-gemeinsame-messung-test.js').includes('nsh-steuve-gemeinsame-messung-test: OK'), 'Regressionstest für NSH-/SteuVE-Mischmessung fehlt');
assert(read('tests/commissioning-date-hint-test.js').includes('commissioning-date-hint-test: OK'), 'Regressionstest für den optionalen Inbetriebnahmedatum-Hinweis fehlt');
assert(!modelText.includes('heatingRodPower') && canvasRendererText.includes('Elektrische Gesamtleistung inkl. Heizstab') && !canvasRendererText.includes('data-mk-field="heatingRodPower"') && !editorText.includes('heatingRodPower'), 'Messkonzept-Editor: separate Heizstababfrage darf nicht zurückkehren');

// Optionale technische Stammdaten für PV/Wind und Speicher bleiben von der
// Messlogik getrennt. Das Qualitäts-Gate stellt sicher, dass Modell, Editor
// und Regressionstest gemeinsam erweitert werden.
assert(modelText.includes('inverterPower') && modelText.includes('storageInverterPower'), 'model.js: technische Wechselrichterfelder fehlen');
assert(canvasRendererText.includes('data-mk-field="inverterPower"') && canvasRendererText.includes('data-mk-field="storageCapacity"'), 'canvas-renderer.js: technische Felder fehlen');
assert(technicalFieldsText.includes('technical-fields-test: OK'), 'technische Feldprüfung fehlt');
assert(read('tests/stecker-pv-limit-test.js').includes('Stecker-PV-Grenztest: OK'), 'Stecker-PV-Grenztest fehlt');

// Die Objektfarben bleiben semantisch zentral definiert. So verhindert der
// Test, dass eine spätere UI-Anpassung Verbraucher, Wallbox oder Messgerät
// wieder unabsichtlich gleich einfärbt.
const objectColorTokens = [
    '--mk-meter-fg', '--mk-meter-bg',
    '--mk-meter-border',
    '--mk-generation-fg', '--mk-generation-bg',
    '--mk-generation-border',
    '--mk-consumer-fg', '--mk-consumer-bg',
    '--mk-consumer-border',
    '--mk-storage-fg', '--mk-storage-bg',
    '--mk-storage-border',
    '--mk-wallbox-fg', '--mk-wallbox-bg',
    '--mk-wallbox-border',
    '--mk-heatpump-fg', '--mk-heatpump-bg',
    '--mk-heatpump-border',
    '--mk-climate-fg', '--mk-climate-bg',
    '--mk-climate-border',
    '--mk-nsh-fg', '--mk-nsh-bg',
    '--mk-nsh-border',
    '--mk-hak-fg', '--mk-hak-bg', '--mk-hak-border', '--mk-hak-accent'
];
objectColorTokens.forEach(token => assert(stylesText.includes(`${token}:`), `styles.css: semantische Farbvariable fehlt (${token})`));
assert(stylesText.includes('color: var(--mk-consumer-fg)'), 'styles.css: Verbraucherfarbe ist nicht an die semantische Variable gebunden');
assert(stylesText.includes('background: var(--mk-wallbox-bg)'), 'styles.css: Wallboxfarbe ist nicht an die semantische Variable gebunden');
assert(stylesText.includes('background: var(--mk-hak-bg)'), 'styles.css: HAK-Farbe ist nicht an die semantische Variable gebunden');
assert(stylesText.includes('--mk-wallbox-bg: #f3b2c2') && stylesText.includes('--mk-heatpump-bg: #86efac') && stylesText.includes('--mk-wallbox-fg: #831843') && stylesText.includes('--mk-heatpump-fg: #166534'), 'styles.css: Wallbox und Wärmepumpe müssen klar unterscheidbare Bordeaux- und Grüntöne verwenden');
assert(stylesText.includes('box-sizing: border-box') && stylesText.includes('inset 0 0 0 1px var(--mk-object-border'), 'styles.css: Objekt-Ränder müssen als geometrieneutraler Inset-Rand umgesetzt sein');
assert(indexText.includes('Mieterstromobjekte') && indexText.includes('data-mk-mieterstrom-object="user"') && indexText.includes('data-mk-mieterstrom-object="external-meter"') && !indexText.includes('mk-palette-section-note') && !indexText.includes('<small>Optional</small>') && modelText.includes('marketLocationStatus') && dragDropText.includes('mieterstromObject') && !messkonzeptText.includes('MK_MIETERSTROM'), 'Mieterstrom: einfache Palette-Objekte ohne Zusatzhinweis oder Optional-Badge');
assert(indexText.includes('Mieterstromzähler') && indexText.includes('mk-mieterstrom-participating-meter'), 'Mieterstrom: Palette muss den teilnehmenden Zähler verständlich benennen und markieren');
assert(identifiersText.includes('getConsumerAssetNumber') && identifiersText.includes('getMieterstromMeterNumber') && identifiersText.includes('getMeterLabel') && identifiersText.includes('ZN${number}') && assetDisplayText.includes('`N${number}`') && assetDisplayText.includes('`V${number}`'), 'Mieterstrom: Nutzer, Verbraucher und Mieterstromzähler brauchen getrennte, stabile Kennungen');
assert(renderText.includes('getMeterLabel') && renderText.includes('mk-mieterstrom-participating-meter') && canvasRendererText.includes('getMeterLabel') && canvasRendererText.includes('Teilnehmender Mieterstromzähler') && exportText.includes('getMeterLabel'), 'Mieterstrom: eigene Zählerkennung muss in Skizze, Editor und PDF verwendet werden');
assert(stylesText.includes('background: transparent') && stylesText.includes('border: 1px dashed var(--primary-color)'), 'Mieterstrom: teilnehmender Zähler braucht transparente Fläche und gestrichelten Rand');
assert(renderText.includes('mk-mieterstrom-user') && stylesText.includes('.mk-asset-card.mk-mieterstrom-user') && stylesText.includes('.mk-palette-icon.mk-mieterstrom-user') && stylesText.includes('border: 1px dashed var(--mk-consumer-bg)') && stylesText.includes('border-radius: var(--radius-md)') && stylesText.includes('.mk-asset-icon.consumer'), 'Mieterstrom: Nutzerobjekt braucht transparente Fläche, graue Kennung und gestrichelten, abgerundeten Rand');
assert(stylesText.includes('.mk-palette-item {') && stylesText.includes('border: 1px solid color-mix(in srgb, var(--primary-color) 45%, var(--border-color))'), 'Palette: alle Messobjekte brauchen den dezenten blauen Standardrahmen');

// Syntax-Gate für alle ausgelagerten Messkonzept-Module. Ein solcher Fehler
// würde sonst erst beim Öffnen eines seltenen Modus sichtbar.
localCoreFiles.forEach(relativePath => {
    const source = read(relativePath);
    try {
        new Function(source);
    } catch (error) {
        failures.push(`${relativePath}: JavaScript-Syntaxfehler (${error.message})`);
    }
});

// Die Teststrecke selbst muss die drei Ebenen ausführen können.
assert(testText.includes('tests/architecture-smoke-test.js'), 'tests.html: Architektur-Smoke-Test ist nicht verlinkt');
assert(testText.includes('Messkonzept-Startvorlagen als bearbeitbare Zustände'), 'tests.html: Startvorlagen-Regressionstest fehlt');
assert(testText.includes('Stecker-PV-Wechselrichtergrenze'), 'tests.html: Stecker-PV-Grenztest fehlt');
assert(testText.includes('Export-Modul bleibt gekapselt'), 'tests.html: Export-Modultest fehlt');
assert(testText.includes('Standardisierte Kartenbewegung'), 'tests.html: Bedien-/Pan-Test fehlt');
assert(documentationText.includes('Unit-') && documentationText.includes('Browser') && documentationText.includes('Release'), 'docs/projekt-teststandard.md: Testebenen müssen verständlich dokumentiert sein');
assert(documentationText.includes('tests/link-check-test.js'), 'docs/projekt-teststandard.md: Link-Check fehlt');
assert(documentationText.includes('tests/seo-test.js'), 'docs/projekt-teststandard.md: SEO-Test fehlt');
assert(documentationText.includes('tests/messlogic-invariants-test.js'), 'docs/projekt-teststandard.md: Messlogik-Invarianten-Test fehlt');
assert(documentationText.includes('tests/meter-rail-spacing-test.js'), 'docs/projekt-teststandard.md: Rail-Abstandstest fehlt');
assert(documentationText.includes('tests/smart-meter-control-test.js'), 'docs/projekt-teststandard.md: iMSys-/Steuerungstest fehlt');
assert(licenseNavigationText.includes('Zur Startseite') && licenseNavigationText.includes('lizenz.html'), 'Lizenznavigation: Anforderungen und sichtbarer Rückweg fehlen');
assert((indexText.match(/class="mk-fachhinweis"/g) || []).length === 1, 'index.html: Der fachliche Hinweis soll als eine gemeinsame Hinweisbox erscheinen');
assert(indexText.includes('VBEW-Referenz &amp; Lizenzhinweise'), 'index.html: Der VBEW-Referenzlink fehlt in der gemeinsamen Hinweisbox');
assert(indexText.includes('class="mk-start-home-icon"'), 'index.html: Der Startauswahl-Schalter benötigt ein klares Häuschen-Symbol');
assert(stylesText.includes('.mk-start-home-icon'), 'styles.css: Häuschen-Symbol der Startauswahl ist nicht gestaltet');
assert(indexText.includes('class="mk-start-free"') && indexText.includes('>Typische Messkonzepte<'), 'index.html: Freier Konfigurator und typische Messkonzepte müssen als klar getrennte Einstiegsschritte sichtbar sein');
assert(stylesText.includes('.mk-start-free-button') && stylesText.includes('width: 100%'), 'styles.css: Der freie Konfigurator muss als breite erste Aktion gestaltet sein');
assert(copyrightText.includes('Salvatore Napolitano') && copyrightText.includes('LICENSE.md'), 'COPYRIGHT.md: Rechteinhaber und verbindlicher Lizenzverweis fehlen');
assert(read('README.md').includes('öffentliche Beta') && read('README.md').includes('THIRD-PARTY-NOTICES.md'), 'README.md: knapper Beta-Hinweis oder Drittanbieter-Verweis fehlt');
assert(messkonzeptText.includes('mkGetPresetFlowChipClass') && stylesText.includes('.mk-start-flow-chip--generation') && stylesText.includes('.mk-start-flow-chip--storage'), 'Startvorlagen: semantische Farben für die wichtigsten Objekt-Chips fehlen');
assert(indexText.includes('mk-start-group--mieterstrom') && indexText.includes('Mieterstromkonzept') && presetText.includes('mieterstrom-d1') && presetText.includes("group: 'mieterstrom'") && stylesText.includes('.mk-start-flow-chip--mieterstrom-user'), 'Mieterstrom: D1-Kategorie, Nutzerchip und Startkarte fehlen');
assert(presetText.includes("modelCode: 'MK D1'") && presetText.includes("modelName: 'Selbstversorgergemeinschaft'") && presetText.includes("flow: ['PV', 'Mieterstromnutzer']") && messkonzeptText.includes("kinds.push('mieterstrom-user')") && stylesText.includes('--mk-chip-bg: transparent'), 'Mieterstrom: D1-Bezeichnung und semantischer Nutzerchip fehlen');
assert(indexText.includes('mk-start-free-button-icon') && stylesText.includes('.mk-start-free-button:active') && stylesText.includes('[data-theme="light"] .mk-start-free-button') && stylesText.includes('color: #ffffff;'), 'Startaktion: Symbol, fühlbarer Druckzustand und ausreichender Tagmodus-Kontrast fehlen');
assert(presetText.includes("flow: ['Wärmepumpe', 'Haushalt', 'PV', 'Speicher']") && presetText.includes("flow: ['Wallbox', 'Haushalt', 'PV', 'Speicher']"), 'Startvorlagen: Kaskaden-Objektchips müssen ohne interne Zählernummern verständlich bleiben');
assert(presetText.includes("flow: ['Haushalt', 'Wärmepumpe']") && presetText.includes("flow: ['Haushalt', 'Wallbox']"), 'Startvorlagen: Parallelchips sollen ebenfalls ohne interne Zählernummern auskommen');
assert(stylesText.includes('white-space: nowrap') && stylesText.includes('flex: 0 0 auto'), 'Startvorlagen: Objektchips dürfen nicht zusammenschrumpfen oder ineinanderlaufen');
assert(indexText.includes('mk-start-group-icon') && !indexText.includes('>Häufige Fälle</span>') && !indexText.includes('>Getrennte Messung</span>'), 'Startvorlagen: Kategorien sollen mit einem klaren Linien-Symbol statt Zusatzlabels erklärt werden');
assert(presetText.includes('showSummary: true') && stylesText.includes('.mk-start-card-summary'), 'Startvorlagen: MK D1 muss die optionale Kurzbeschreibung gezielt anzeigen können');
assert(indexText.includes('mk-start-group--shared') && indexText.includes('mk-start-group--parallel') && indexText.includes('mk-start-group--cascade') && stylesText.includes('.mk-start-group--cascade'), 'Startvorlagen: Topologiegruppen brauchen getrennte visuelle Zustände');
assert(indexText.includes('data-mk-preset-group="mieterstrom"') && stylesText.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'), 'Startvorlagen: die vierte Mieterstromkategorie muss im responsiven Gruppengitter berücksichtigt werden');
assert(!indexText.includes('btn-mk-decision-calculator') && !indexText.includes('mk-decision-calculator')
    && !indexText.includes('decision-calculator.js') && !stylesText.includes('.mk-decision-callout')
    && !stylesText.includes('.mk-decision-form'), 'Der variable Wirtschaftlichkeitsrechner muss aus der Anwendung entfernt bleiben');
assert(stylesText.includes('width: 2.5rem') && stylesText.includes('flex: 0 0 2.5rem') && stylesText.includes('stroke-width: 2.05;'), 'Startvorlagen: Kategorie-Icons müssen ausreichend groß und klar gezeichnet sein');
assert(stylesText.includes('[data-theme="light"] .mk-topology-btn.active') && stylesText.includes('color: #ffffff;'), 'Tag-Modus: aktive Messkonzept-Schaltflächen brauchen helle Schrift auf dunkler Fläche');
assert(stylesText.includes('[data-theme="light"] .mk-start-group--shared') && stylesText.includes('--mk-group-icon-fg: #047857;') && stylesText.includes('--mk-group-icon-fg: #6d28d9;'), 'Tag-Modus: Messkonzept-Icons brauchen gesättigte Linienfarben auf hellen Flächen');
assert(stylesText.includes('.module-card-context') && stylesText.includes('font-size: 0.98rem') && stylesText.includes('font-weight: 500'), 'Startseite: Werkzeugbeschreibungen müssen ausreichend groß und kräftig lesbar sein');
assert(indexText.includes('Wattspur · öffentliche Beta') && indexText.includes('Lokal verarbeitet · unverbindliche Ergebnisse') && !indexText.includes('Wattspur · Energiewerkzeuge · öffentliche Beta') && stylesText.includes('font-size: 0.84rem'), 'Fußzeile: kurze, gut lesbare Statuszeilen statt doppelter Produktbeschreibung');
assert(/class="mk-brand mk-brand-link(?: wattspur-brand)?"/.test(indexText) && indexText.includes('id="btn-mk-back" href="index.html#top"') && stylesText.includes('.mk-brand-link:focus-visible'), 'Messkonzept-Navigation: das Logo muss als zugänglicher Rückweg statt als separater Button dienen');
assert(indexText.includes('<a class="module-logo module-logo-link" href="index.html#top"') && stylesText.includes('.module-logo-link:focus-visible'), 'Lastgang-Navigation: Das Seitenleisten-Logo muss ebenfalls als zugänglicher Rückweg zur Werkzeugauswahl dienen');
assert(!indexText.includes('Vorlage auswählen und direkt starten.') && !stylesText.includes('.mk-start-cases-heading p'), 'Startvorlagen: der kleine doppelte Anleitungstext soll entfallen');
assert(!indexText.includes('Skizze selbst aufbauen') && !stylesText.includes('.mk-start-free-button-copy small'), 'Startaktion: der zu kleine Untertitel soll entfallen');
assert(!indexText.includes('class="mk-start-note"') && !stylesText.includes('.mk-start-note'), 'Startvorlagen: der Parallelhinweis soll nicht zusätzlich als sichtbare Doppelung im Slide stehen');
assert(presetText.includes('kein Umbau für einen zweiten Zähler') && presetText.includes('Produkt des gewählten Energieversorgers') && presetText.includes('Modul 1 und optional Modul 3') && presetText.includes('Modul 2 setzt einen separaten Zählpunkt voraus') && presetText.includes('Wärmepumpenprivilegierung nach § 22 EnFG') && presetText.includes('Der Hausanschluss muss die Gesamtleistung trotzdem aufnehmen können'), 'Startvorlagen: gemeinsame Messung muss Umbau-, Tarif-, Rechts- und Hausanschlussgrenzen verständlich und neutral benennen');
assert(presetText.includes('Ein separater Zählpunkt schafft die Voraussetzung, Modul 2 nach § 14a EnWG zu wählen.') && !presetText.includes('Modul 3 ist nur zusammen mit Modul 1 möglich') && !presetText.includes('Modul 2 setzt ihn voraus') && presetText.includes('Preisvorteil ist nicht automatisch garantiert'), 'Startvorlagen: Parallelmessung muss die Voraussetzung für Modul 2 verständlich und ohne unnötige Wiederholung erklären');
assert(presetText.includes('Eine separate Messung kann die Voraussetzungen für eine günstigere Konzessionsabgabe schaffen') && presetText.includes('Die konkrete Konzessionsabgabe hängt von Liefervertrag, Messung und Ort ab') && presetText.includes("label: 'Wärmepumpenprivilegierung nach § 22 EnFG'"), 'Startvorlagen: mögliche Konzessionsabgabe und Wärmepumpen-Umlageprivileg müssen als Chance mit klarer Einschränkung und Quelle erklärt werden');
assert(presetText.includes('Geeignet, wenn Haushalt und Anlagen gemeinsam über einen Zähler gemessen werden sollen') && presetText.includes('Geeignet, wenn Wärmepumpe oder Wallbox getrennt vom Haushaltsstrom gemessen werden sollen') && presetText.includes('Geeignet, wenn Wärmepumpe oder Wallbox separat gemessen, aber weiterhin durch PV-Strom mitversorgt werden sollen') && presetText.includes('Differenzbildung: Bezug an Z1 minus Bezug an Z2'), 'Startvorlagen: jede Gruppe muss Zielgruppe und Kaskadenprinzip verständlich beschreiben');
assert(presetText.includes('Mieterstrom beschreibt die Versorgung von Bewohnern') && presetText.includes('Netzentgelte, netzseitige Umlagen, Stromsteuer und Konzessionsabgabe') && presetText.includes('Mieterstromzuschlag') && presetText.includes('Markt- und Messlokationsführung') && presetText.includes("label: 'BNetzA: Mieterstrom'"), 'Startvorlagen: Mieterstrominfo muss allgemeine Vorteile, Abstimmungshinweise und belastbare Quellen enthalten');
assert(stylesText.includes('.mk-start-info-panel') && stylesText.includes('transform: translate(-50%, -50%)') && stylesText.includes('max-height: min(82vh, 44rem)'), 'Startvorlagen: Infoboxen müssen mittig im sichtbaren Bereich erscheinen und ohne Seiten-Scrollen auskommen');

if (failures.length > 0) {
    console.error(`Projekt-Qualitäts-Gate: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log(`Projekt-Qualitäts-Gate: OK (${requiredFiles.length} Pflichtdateien, ${localCoreFiles.length} Kernmodule, ${localScripts.length} lokale Scripts)`);
}
