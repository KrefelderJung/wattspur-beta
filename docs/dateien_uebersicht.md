# 🗺️ Gesamtübersicht aller Dateien & Funktionen (Modulares Lastgang-Tool)

Diese Dokumentation bietet eine präzise Übersicht über die Aufgaben und Verantwortlichkeiten aller Dateien im Projekt.

---

## 🏛️ 1. Anwendungskern & Root-Dateien

| Datei | Ordner | Hauptaufgabe & Funktion |
| :--- | :--- | :--- |
| **`index.html`** | `/` | Das visuelle HTML5-Grundgerüst der Anwendung (Struktur für Upload, Dashboard, Editor, AgNes, Modals). |
| **`lastgang-analyse.html`** | `/` | Indexierbare SEO-Einstiegsseite für die Lastganganalyse mit stabilem Hash-Einstieg in die lokale Anwendung. |
| **`messkonzept-konfigurator.html`** | `/` | Indexierbare SEO-Einstiegsseite für den Messkonzept-Konfigurator mit stabilem Hash-Einstieg in die lokale Anwendung. |
| **`lizenz.html`** | `/` | Lesbare Lizenzseite mit gemeinsamer Wattspur-Navigation und sichtbarem Rückweg zur Startseite. |
| **`styles.css`** | `/` | Modernes CSS3-Designsystem (Darkmode, Glasmorphismus, Layout-Grid, Ampel-Badges, Buttons, Tabellen). |
| **`manifest.json`** | `/` | Web App Manifest (PWA) für die Installation als eigenständige App auf Desktop und Smartphone. |
| **`robots.txt` / `sitemap.xml`** | `/` | Legen Indexierungsregeln und die öffentlichen Kernseiten für Suchmaschinen fest. |
| **`service-worker.js`** | `/` | Offline-Cache-Manager (`v2026.08.19-beta.336`). Speichert alle Modulpfade lokal im Browser für den Offlinebetrieb. |
| **`tests.html`** | `/` | Automatische Test-Engine im Browser. Führt aktuell 156 Unit-, Integrations- und Regressionstests aus. |
| **`tests/seo-test.js`** | `tests/` | Prüft stabile URLs, Meta-Daten, Canonicals, robots.txt und Sitemap. |
| **`docs/brand-header-anforderungen.md`** | `docs/` | Anforderungen und Akzeptanzkriterien für den einheitlichen Wattspur-Schriftzug über alle Seiten. |
| **`docs/public-footer-anforderungen.md`** | `docs/` | Anforderungen für direkte Links zu Impressum, Datenschutz und Kontakt in allen öffentlichen Ansichten. |
| **`docs/mieterstrom-infobox-anforderungen.md`** | `docs/` | Anforderungen, Quellen und Akzeptanzkriterien für die allgemeine Mieterstrom-Infobox. |
| **`docs/inbetriebnahmedatum-hinweis-anforderungen.md`** | `docs/` | Anforderungen und Akzeptanzkriterien für den optionalen Hinweis zum Inbetriebnahmedatum. |
| **`docs/smart-meter-steuerung-hinweis-anforderungen.md`** | `docs/` | Anforderungen, Quellen und Grenzfälle für den Hinweis zu iMSys und Steuerungseinrichtung ab mehr als 7 kW. |
| **`docs/steuve-tarif-hinweis-anforderungen.md`** | `docs/` | Anforderungen für die verständliche Trennung von §14a-Anmeldung und Energietarif bei separater Messung. |
| **`docs/kwk-bafa-hinweis-anforderungen.md`** | `docs/` | Anforderungen, Quellen und Akzeptanzkriterien für BAFA- und Messhinweise bei KWK/BHKW. |
| **`docs/nsh-steuve-gemeinsame-messung-anforderungen.md`** | `docs/` | Anforderungen und Quelle für den Hinweis bei Nachtspeicherheizung und neuer SteuVE am selben Messpunkt. |
| **`js/app.js`** | `js/` | Schlanker Anwendungsstarter (`initializeApp()`). Verbindet Controller und startet die App beim Laden. |

---

## 🛠️ 2. Modulbereich `js/shared/` (Fachlich neutrale Hilfswerkzeuge)

| Datei | Funktion |
| :--- | :--- |
| **`identifiers.js`** | Erzeugt kryptografisch sichere **UUIDv4-IDs** für Berechnungs- und Datensatz-IDs (`generateUUID`). |
| **`numbers.js`** | **`NumberParser`** (robuste Zahlenkonvertierung für de-DE/en-US) sowie Währungs- und Zahlenformatierung. |
| **`dates.js`** | Datumsformatierung, ISO-Verarbeitung, **Schaltjahr-Prüfung** und **NRW-Feiertagsberechnung** (Ostern, Pfingsten etc.). |
| **`html.js`** | **HTML-Escaping** (`escapeHtml`) zum sicheren Schutz vor XSS-Angriffen in dynamischen Ansichten. |
| **`download.js`** | Client-seitiger Datei-Download (`triggerDownload`) zur Erzeugung von CSV- und JSON-Dateien ohne Server. |

---

## 🧮 3. Modulbereich `js/domain/` (Fachliche Kernberechnungen – DOM-frei)

| Datei | Funktion |
| :--- | :--- |
| **`measurement-model.js`** | Erzeugt das kanonische **15-Minuten-Messwertobjekt** (`createCanonicalMeasurement`) für alle Importe. |
| **`energy-calculation.js`** | Zentrale Rechtecksummation ($E_i = P_i \cdot \Delta t$) und Energiemengen-Summation (`calculateDomainEnergy`). |
| **`data-quality.js`** | **Qualitätsbewertung** (`evaluateDataQuality`): Berechnet Abdeckung %, Lücken, Duplikate und Qualitätsampel. |
| **`tariff-calculation.js`** | **HT/NT-Zeitscheiben-Zuordnung** (`calculateTariffEnergy`) für Werktage, Wochenenden und Feiertage. |
| **`profile-calculation.js`** | Berechnet **96-Slot-Tagesprofile** (`null` bei Lücken) sowie sortierte **Dauerlinien**. |
| **`aggregation.js`** | Verdichtet Messwerte datengetrieben auf **Stunden-, Tages- und Monats-Ebene**. |

---

## ⚡ 4. Modulbereich `js/agnes/` (Netzentgelt-Optimierungsengine – DOM-frei)

| Datei | Funktion |
| :--- | :--- |
| **`agnes-input.js`** | Validiert und strukturiert die AgNes-Eingabeparameter (`createAgnesInput`). |
| **`agnes-cost-model.js`** | Reine Kostenfunktion $C(K) = \text{Kapazitätspreis} \cdot K + \text{AP1} \cdot E_{\text{innerhalb}} + \text{AP2} \cdot E_{\text{überschreitung}}$. |
| **`agnes-optimizer.js`** | **Einzeljahres-Optimierung** (`optimizeAgnesSingleYear`): Knickpunkt-Sweep, 150-Schritte-Grid & Kostenminimum. |
| **`agnes-multi-year.js`** | **Mehrjahres-Synthese** (`optimizeAgnesMultiYear`): 10%-Mindestgrenzen, Flexibilitätsprämie & Risikostrategien. |
| **`agnes-validation.js`** | Invarianten-Prüfung (`validateAgnesResult`): Überprüft $E_{\text{AP1}} + E_{\text{AP2}} = E_{\text{Gesamt}}$ und Kostenkonsistenz. |
| **`agnes-result.js`** | Standardisiertes **AgNes-Ergebnisobjekt** (`createCanonicalAgnesResult`) für Ansichten und Exporte. |

---

## 📥 5. Modulbereich `js/import/` (Dateilesen & Parsen – DOM-frei)

| Datei | Funktion |
| :--- | :--- |
| **`file-import.js`** | High-Level Orchestrierer (`processFileImport`): Dateileser, FileReader und automatische Format-Erkennung. |
| **`csv-parser.js`** | Reiner, robuster **CSV-Parser** (`parseCsvText`) für Trennzeichen-basierte Dateien. |
| **`mscons-parser.js`** | Reiner **EDIFACT/MSCONS 2.4c Parser** (`parseMsconsText`) für Strom-Messwertnachrichten. |
| **`import-validator.js`** | Erzeugt ein **auditierbares Import-Protokoll** (`validateImportResult`) mit gelesenen, verworfenen & gültigen Zeilen. |

---

## 💾 6. Modulbereich `js/state/` (Zustandsverwaltung)

| Datei | Funktion |
| :--- | :--- |
| **`app-state.js`** | **Zentraler State Store (`AppState`)**: Pub/Sub Zustandsverwaltung, kapselt Datensätze, aktive Filter und Cache-Invalidierung. |

---

## 🎨 7. Modulbereich `js/ui/` (Entkoppelte Benutzeroberfläche & Controller)

| Datei | Funktion |
| :--- | :--- |
| **`navigation-controller.js`** | Steuert Tab-Wechsel und aktive Ansichten (`NavigationController.switchTab`). |
| **`dashboard-controller.js`** | Steuerungslogik für das Haupt-Dashboard, fordert Berechnungen an. |
| **`dashboard-view.js`** | Rendert die KPI-Karten (Gesamtenergie, Pmax, HT/NT-Aufteilung). |
| **`editor-controller.js`** | Steuerung des Tabelleneditors mit `structuredClone`-Deep-Backup für Abbrechen/Wiederherstellen. |
| **`editor-view.js`** | Rendert die interaktive Messwert-Tabelle im Editor. |
| **`agnes-controller.js`** | Steuert die AgNes-Optimierungsanalyse und speichert Ergebnisse im State. |
| **`agnes-view.js`** | Rendert AgNes-Karten, optimales K, Netzentgelte und Vergleichsmatrizen. |
| **`chart-view.js`** | Visualisierungskonstruktor für **ECharts** (Lastgang-Verlauf & Sweep-Kurven). |
| **`quality-view.js`** | Rendert Datenqualitäts-Ampeln (GREEN, YELLOW, RED) und Lückenprotokolle. |
| **`modal-view.js`** | UI-Komponente für Toast-Benachrichtigungen und Dialog-Modals. |

---

## 📤 8. Modulbereich `js/export/` (Export-Engine)

| Datei | Funktion |
| :--- | :--- |
| **`csv-export.js`** | Erzeugt **Lastgang- & Aggregations-CSV** aus fertigen Ergebnisobjekten (ohne Neuberechnung). |
| **`agnes-export.js`** | Erzeugt das **AgNes-Berechnungsprotokoll als CSV** inkl. Sweep-Verlauf. |
| **`report-export.js`** | Bereitet den Druckbericht vor und löst den Browser-Druckdialog aus. |
| **`project-export.js`** | Revisionsnahes Speichern & Laden von **`.lastgang`-Projektdateien** (JSON). |

---

## 🧾 8a. Modulbereich `js/lastgang/` (Dateneditor)

| Datei | Funktion |
| :--- | :--- |
| **`data-editor.js`** | Kapselt den Tabellen- und Massendateneditor: Seitenwechsel, Zelländerungen, Zwischenablage, Import und Bearbeitungssperre. Die Oberfläche wird weiterhin vom bestehenden Lastgang-Einstieg orchestriert; der Editor veröffentlicht dafür nur `WattspurLastgangDataEditor`. |

Der Dateneditor bleibt bewusst eine kleine Übergangsschicht. Er verwendet die
bestehenden Lastgang-State- und Dashboard-Funktionen, verändert aber keine
Messkonzept- oder PDF-Logik. Der isolierte
`tests/data-editor-module-test.js` prüft die Schnittstelle ohne Browser-DOM.

---

## 🧩 9. Modulbereich `js/messkonzept/` (Messkonzept-Konfigurator)

| Datei | Funktion |
| :--- | :--- |
| **`model.js`** | DOM-freies Zustandsmodell für Messobjekte, Projektangaben, Spannungsebene des Netzanschlusses, Historie und Moduswechsel. |
| **`rules.js`** | Versionierter, DOM-freier Regelkatalog für Zähler, Anlagen, Speicher, NSH und Parallelmessung. |
| **`validation-status.js`** | Verbindet den versionierten Regelkatalog mit der kompakten Anzeige „Infos und Hinweise“, neutralen nummerierten Status-Markern und semantisch gefärbten Anlagen-Tags. |
| **`identifiers.js`** | Vergibt getrennte Zählerfolgen (`Z…` für Netz-Zähler, `ZN…` für Mieterstromzähler) sowie getrennte Erzeugungsnummernkreise für PV/Steckersolar, BHKW und Wind ohne DOM- oder Renderlogik. |
| **`meter-policy.js`** | Kapselt die fachlichen Regeln für Kaskadenstufen, Einzelzähler und Drop-Ziele. |
| **`asset-display.js`** | Kapselt Labels, fachliche Objekt-Hinweise und die Icons des Messkonzept-Editors. |
| **`render.js`** | Erzeugt Karten-, Rail- und Objekt-Markup ohne DOM-Messungen. |
| **`zone-renderer.js`** | Komponiert Drop-Zonen, Sammelschienenknoten und Rail-Markup ohne globale Zustände oder DOM-Messungen. |
| **`layout-calculations.js`** | Reine, DOM-freie Berechnungen für Reihenbreiten, Rail-Tiefe und Paralleltracks. |
| **`layout.js`** | Berechnet Rail-Breiten, Abstände, Kollisionen und Parallelzweig-Layout. |
| **`connections.js`** | Zeichnet dynamische Leitungen und Knoten aus semantischen DOM-Ankern. |
| **`geometry-runtime.js`** | Orchestriert den zeitlich stabilen Geometrie-Nachlauf aus Root-Rails, Unter-Rails, Parallelbus, Leitungsverbindungen und Viewport-Zentrierung. |
| **`viewport.js`** | Kapselt Zoom, Pan, ResizeObserver und die Topografie-Bedienung. |
| **`history.js`** | Kapselt Undo/Redo und die dazugehörige Schaltflächen-Synchronisation. |
| **`commands.js`** | Bündelt Zustandsänderungen wie Reset, Moduswechsel, Kaskadenstufen, Anlagenanlage und Verschieben. |
| **`project-meta.js`** | Synchronisiert Projektname, Referenz, Messkonzept, Standort und den festen Kommentarabschnitt der Projektangaben mit dem Zustand. |
| **`canvas-renderer.js`** | Komponiert Canvas, klickbaren HAK bzw. Trafo, Zählerstruktur und Objekt-Modal aus injizierten Render- und Zustandsfunktionen. |
| **`annotations.js`** | Rendert ausgefüllte Zählerangaben als verschiebbare Karten mit gestrichelter Bezugslinie, bearbeitet Werte direkt per Doppelklick und übernimmt die Karten in die PDF-Kopie. |
| **`editor.js`** | Verarbeitet Eingaben im Objekt-Dialog und meldet Asset- sowie Zählerdetailänderungen über injizierte Callbacks. |
| **`start-flow.js`** | Kapselt Werkzeugwechsel, Startauswahl, freie Skizze und Laden der Messkonzept-Vorlagen. |
| **`render-cycle.js`** | Orchestriert einen vollständigen UI-Renderlauf über injizierte Adapter, ohne Messlogik oder DOM-Suche zu kennen. |
| **`drag-drop.js`** | Fachliche Drag-and-Drop- und Löschlogik über injizierte Befehls-Callbacks. |
| **`pointer-drag.js`** | Ergänzt Finger- und Stiftgesten auf Tablets und übergibt sie an die bestehende Drop-Logik. |
| **`interaction.js`** | DOM-Verkabelung für Dialoge, Felder, Buttons und Tastaturinteraktion. |
| **`bootstrap.js`** | Sammelt statische DOM-Anker und verbindet Resize-/Lebenszyklus-Ereignisse mit dem Einstiegspunkt. |
| **`export.js`** | Erzeugt die verständliche PDF-/Druckansicht aus dem aktuellen Zustand. |

### Qualitätssicherung

| Datei | Funktion |
| :--- | :--- |
| **`tests/architecture-smoke-test.js`** | Browserfreier Architekturtest für Dateistruktur, Ladereihenfolge, Modulverträge, DOM-Grenzen, Prüfregelwerk und Offline-Cache. |
| **`docs/architecture-smoke-test.md`** | Verständliche Beschreibung des Smoke-Tests, Aufruf und Akzeptanzkriterium. |
| **`js/messkonzept/presets.js`** | DOM-freier Katalog der häufigsten Messkonzept-Startvorlagen. |
| **`js/messkonzept/preset-loader.js`** | Übersetzt eine Vorlage in normale, bearbeitbare Modellobjekte und Zählerbeziehungen. |
| **`js/messkonzept/decision-calculator.js`** | Reine Orientierungsrechnung für Umbaukosten, Messentgelt, Tarifdifferenz, Modul 1, Modul 2 und Wärmepumpenprivileg mit Sensitivitätsspanne und Verlaufsgrafik. |
| **`docs/messkonzept-startvorlagen.md`** | Spezifikation, Akzeptanzkriterien und technische Trennung der Startauswahl. |
| **`tests/project-quality-test.js`** | Browserfreier projektweiter Qualitäts-Gate-Test für Pflichtdateien, Syntax, lokale Verarbeitung und Release-Schutz. |
| **`tests/mieterstrom-objects-test.js`** | Prüft die beiden optionalen Mieterstromobjekte, die eigenen `ZN…`-Kennungen und ihre neutralen technischen Statusfelder. |
| **`tests/link-check-test.js`** | Prüft lokale `href`-/`src`-Verweise; externe Links können mit `--external` als separates Release-Gate geprüft werden. |
| **`tests/storage-operation-test.js`** | Prüft die Speicher-Betriebsweisen für Netzeinspeisung, Netzbezug zum Laden und reinen PV-Überschussbetrieb. |
| **`tests/stecker-pv-limit-test.js`** | Prüft die 800-VA-Wechselrichtergrenze von Stecker-PV, Einheitenumrechnung und Summierung am selben Messpunkt. |
| **`tests/direct-marketing-test.js`** | Prüft den Hinweis zur Vermarktungsform bei Erzeugungsanlagen über 100 kW/kWp und die getrennte KWK-Formulierung. |
| **`tests/smart-meter-control-test.js`** | Prüft die 7-kW-Grenze für den iMSys-/Steuerungshinweis bei PV, Wind und KWK sowie die zentralisierte Darstellung. |
| **`tests/stecker-pv-mastr-test.js`** | Prüft den zentralen Hinweis zur MaStR-Registrierung und zur vereinfachten Meldung bei Steckersolargeräten. |
| **`tests/steuve-tariff-separation-test.js`** | Prüft die getrennte Information zu §14a-Anmeldung und Wärmepumpen-/Wallbox-Tarif. |
| **`tests/kwk-bafa-hinweis-test.js`** | Prüft BAFA-Link, vorsichtigen KWKG-Hinweis und Messhinweis bei fehlender Erzeugungsmessung. |
| **`tests/nsh-steuve-gemeinsame-messung-test.js`** | Prüft die zeitliche Einordnung von Nachtspeicherheizung und neuer SteuVE je Messpunkt. |
| **`tests/wallbox-icon-test.js`** | Sichert das sichtbare Wallbox-Kabel mit Steckergehäuse und Kontaktstiften in Palette und Messskizze ab. |
| **`tests/icon-object-number-badges-test.js`** | Prüft die getrennten Kennziffern-Badges für reine Symbolkarten sowie die Textnummern und den Verzicht auf Doppelnummern bei Textkarten. |
| **`tests/meter-click-target-test.js`** | Prüft stabile ID-Klickziele für Basis-, Sammelschienen- und Inline-Zähler. |
| **`docs/main-string-meter-click-anforderungen.md`** | Akzeptanzkriterien für klickbare Zusatz-Zähler auf dem Hauptstrang und in verschachtelten Schienen. |
| **`docs/objektnummern-standard-anforderungen.md`** | Verbindlicher Standard für Textnummern, Symbolkarten-Badges und getrennte fachliche Nummernkreise. |
| **`docs/klimaanlage-bezeichnung-anforderungen.md`** | Einheitliche, kurze Bezeichnung „Klimaanlage“ für Palette, Editor, Tags, Vorlagen und Export. |
| **`docs/projektangaben-editorbreite-anforderungen.md`** | Anforderungen für die symmetrische Breite und Position der Projektangaben unter dem Skizzeneditor. |
| **`docs/drop-ziel-trefferflaechen-anforderungen.md`** | Anforderungen für einheitliche, geometrieneutrale Drop-Ziel-Trefferflächen beim Ziehen. |
| **`docs/toolbar-responsive-anforderungen.md`** | Anforderungen für eine überlappungsfreie, responsive Messkonzept-Bedienleiste. |
| **`docs/export-button-kontrast-anforderungen.md`** | Anforderungen für lesbare PDF-Exportbuttons mit sichtbarer Kontur in beiden Themen. |
| **`docs/messkonzept-info-panel-anforderungen.md`** | Anforderungen für mittige, lesbare Infoboxen der typischen Messkonzepte. |
| **`docs/messkonzept-bezeichnungen-anforderungen.md`** | Anforderungen und bestätigte Zuordnungen für fachliche Messkonzeptbezeichnungen an Startvorlagen. |
| **`tests/erzeugungsanlagen-nummerierung-test.js`** | Prüft getrennte Nummernkreise für PV/Steckersolar, BHKW und Wind sowie die Umnummerierung beim Anlagenartwechsel. |
| **`tests/palette-border-standard-test.js`** | Prüft den gemeinsamen Randstil der regulären und der Mieterstrom-Bausteine. |
| **`tests/pdf-status-layout-test.js`** | Prüft die Reihenfolge der PDF-Textseite, den Seitenumbruch vor der Messskizze und die breit gesetzte Prüfstatusliste. |
| **`tests/pdf-object-tables-test.js`** | Prüft gemeinsame Zähler- und Anlagentabellen, leere Zellen und den Verzicht auf wiederholte Einzelkarten im PDF. |
| **`docs/pdf-objektbezeichnung-anforderungen.md`** | Legt fest, dass feste Anlagenarten vor der frei vergebenen Objektbezeichnung stehen. |
| **`tests/pdf-wire-geometry-test.js`** | Prüft die maßstabsgetreue PDF-Bühne und verhindert doppelte Leitungen aus HTML/CSS und SVG. |
| **`tests/project-meta-toggle-test.js`** | Prüft den sichtbaren, barrierearmen Aufklappbereich für Projektangaben. |
| **`tests/drop-target-hitbox-test.js`** | Prüft einheitliche, nur beim Ziehen aktive Drop-Trefferflächen für Zähler und Anlagen. |
| **`tests/toolbar-responsive-test.js`** | Prüft das kontrollierte Umbrechen der Messkonzept-Bediengruppen bei schmalen Spalten. |
| **`tests/export-button-contrast-test.js`** | Prüft Kontrast und Kontur der beiden PDF-Exportbuttons. |
| **`tests/messkonzept-info-panel-test.js`** | Prüft Positionierung, Viewport-Sicherheit und visuelle Gliederung der Messkonzept-Infoboxen. |
| **`tests/messkonzept-bezeichnungen-test.js`** | Prüft die sechs bestätigten Messkonzeptbezeichnungen und ihre Darstellung auf den Vorlagekarten. |
| **`tests/pointer-drag-test.js`** | Prüft die Tablet-Pointer-Gesten, Adapterverkabelung, Abbruchbereinigung und den Offline-Cache. |
| **`tests/pruefstatus-collapsible-test.js`** | Prüft nummerierte, aufklappbare Prüfhinweise und den Textumbruch. |
| **`tests/z5-second-asset-test.js`** | Regressionstest für einen zweiten Anschluss an einem verschachtelten Anlagenzähler. Prüft, dass der Unter-Rail erhalten bleibt und die Layout-Routine ihren Root-Anker kennt. |
| **`docs/projekt-teststandard.md`** | Verständlicher Spickzettel für die fünf Testebenen und die Abnahmekriterien neuer Änderungen. |
| **`docs/mieterstrom-d1-anforderungen.md`** | Anforderungen und Abnahmekriterien für die erste Mieterstromvorlage „MK D1: Mieterstromgemeinschaft“. |
| **`docs/pdf-status-layout-anforderungen.md`** | Dokumentiert die Akzeptanzkriterien für PDF-Hinweis, Messskizze, Projektangaben und optionalen Kommentar. |
| **`docs/pdf-dateiname-anforderungen.md`** | Dokumentiert den vorgeschlagenen PDF-Dateinamen aus Straße und Hausnummer. |
| **`docs/pdf-wire-single-source-anforderungen.md`** | Dokumentiert die eindeutige SVG-Leitungsquelle und den Schutz vor doppelten PDF-Leitungen. |
| **`docs/palette-border-anforderungen.md`** | Anforderungen für den einheitlichen blauen Rand aller Bausteine in der Auswahlleiste. |
| **`docs/tablet-pointer-dnd-anforderungen.md`** | Anforderungen für Finger- und Stift-Drag-and-Drop auf Android- und iOS-Tablets. |
| **`docs/startkarten-ueberschriften-anforderungen.md`** | Anforderungen für eine einmalige Messkonzeptüberschrift ohne doppelte Objektzeile auf Vorlagekarten. |

Der Einstiegspunkt [`messkonzept.js`](../messkonzept.js) orchestriert diese Module weiterhin. Zustandsänderungen werden über `commands.js` geführt; weitere Auslagerungen sollten diese Grenze beibehalten und nicht erneut DOM-, Geometrie- und Fachlogik vermischen.
