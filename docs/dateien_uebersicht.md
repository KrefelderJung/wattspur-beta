# 🗺️ Gesamtübersicht aller Dateien & Funktionen (Modulares Lastgang-Tool)

Diese Dokumentation bietet eine präzise Übersicht über die Aufgaben und Verantwortlichkeiten aller Dateien im Projekt.

---

## 🏛️ 1. Anwendungskern & Root-Dateien

| Datei | Ordner | Hauptaufgabe & Funktion |
| :--- | :--- | :--- |
| **`index.html`** | `/` | Das visuelle HTML5-Grundgerüst der Anwendung (Struktur für Upload, Dashboard, Editor, AgNes, Modals). |
| **`styles.css`** | `/` | Modernes CSS3-Designsystem (Darkmode, Glasmorphismus, Layout-Grid, Ampel-Badges, Buttons, Tabellen). |
| **`manifest.json`** | `/` | Web App Manifest (PWA) für die Installation als eigenständige App auf Desktop und Smartphone. |
| **`service-worker.js`** | `/` | Offline-Cache-Manager (`v2026.07.24.1`). Speichert alle Modulpfade lokal im Browser für 100% Offlinebetrieb. |
| **`tests.html`** | `/` | Automatische Test-Engine im Browser. Führt 75 Unit-, Integrations- und Regressionstests aus. |
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
