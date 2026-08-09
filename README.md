# ⚡ Lastgang Analyse Tool

> Professionelles Analyse-Werkzeug für Energielastgänge — direkt im Browser, ohne Installation.

---

## 🎯 Was ist das?

Ein browserbasiertes Tool zur **Analyse und Optimierung von Energielastgängen**. Es richtet sich an Energieberater, Facility Manager und technische Betriebsleiter, die ihre Stromverbräuche visuell auswerten, Spitzenlasten identifizieren und Netzentgelte optimieren wollen.

**Kein Server, keine Registrierung, keine Cloud** — alle Daten bleiben lokal im Browser.

---

## ✨ Features

### 📊 Basis-Analyse
- **CSV-Import** mit Drag & Drop (Viertelstunden-Lastgänge, Multi-Kanal-Erkennung)
- **Interaktive Zeitreihe** mit Zoom-Presets (1T / 1W / 1M / 3M / 1J / Max)
- **Intelligente Aggregation**: 15 min → 1h → 1d → 1W → 1M (automatisch & manuell)
- **Feiertags- & Wochenend-Schattierung** für alle 16 Bundesländer
- **KPI-Dashboard**: Min, Max, Ø, Gesamtenergie, Lastfaktor, HT/NT/ST-Aufteilung
- **Top-50 Spitzenlasten** mit Klick-Zoom in die Zeitreihe
- **3 Tagesprofil-Modi**: Überlagerung, Mittelwert ± σ, Heatmap

### ⚙️ Kapazitätsbestellung — experimentelle Beta-Szenariorechnung
- **Mathematisches Kapazitätsszenario** (K_opt) mit frei prüfbaren Preisparametern
- **Jahresdauerlinie** mit Kapazitätsgrenzen und AP 1 / AP 2-Bereichen
- **Mehrjahres-Analyse**: Mittelwert- und Worst-Case-Kurven über 3–5 Jahre
- **Risiko-Matrix**: Jahresweise Aufschlüsselung der Netzkosten
- **Szenarien-Vergleich**: Min / Robust / Max nebeneinander
- **Zweistufiger Sweep-Optimierer** für maximale Rechengenauigkeit

> **Wichtig:** Dieses Modul ist kein verbindliches AgNes-, BNetzA- oder Abrechnungsmodell. Es dient ausschließlich als unverbindliche Szenariorechnung auf Basis veränderbarer Annahmen.

### Datenschutz bei Testdateien

Die Anwendung verarbeitet importierte Dateien lokal im Browser und sendet sie nicht an einen Anwendungsserver. Für eine Weitergabe an andere Personen müssen trotzdem Zählpunkt-/Marktlokationsnummern, Standort- und Firmennamen, Dateinamen sowie sonstige Kopfzeilen entfernt werden. Auch Zeitraum und Verlauf eines Lastgangs können Rückschlüsse auf einen Betrieb zulassen. Bei MSCONS-Dateien können Identifikatoren aus dem Nachrichteninhalt als Datenreihenname sichtbar bleiben; Originaldateien sollten daher nicht ungeprüft weitergegeben werden.

### 🛡️ Qualität & Sicherheit
- **Datenqualitäts-Gate**: Automatische Filterung von Duplikaten, Lücken, Extremwerten
- **83 automatisierte Tests** (Parser, Aggregation, Kapazitätsszenarien, Feiertage, Beta-Kommunikation, rechtliche Seiten)
- **XSS-Schutz** für alle nutzergenerierten Inhalte
- **PWA / Offline-fähig** — als App installierbar

### 📤 Export
- PNG-Charts, CSV-Datenexport, PDF-Bericht (via Druckdialog)

---

## 🚀 Schnellstart

1. **Starte das Tool über einen lokalen HTTP-Server** und öffne `index.html` (Chrome/Edge empfohlen). Das ist für Web Worker, Service Worker und Offline-Cache erforderlich; ein direktes `file://`-Öffnen ist nicht zuverlässig.
2. **Ziehe eine CSV-Datei** in den Upload-Bereich (oder klicke zum Auswählen)
3. Fertig — die Analyse startet automatisch

> **CSV-Format:** Semikolon-getrennt mit den Spalten `Datum;Uhrzeit;Wert` (deutsches Zahlenformat). Viertelstunden-Intervalle (96 Werte/Tag).

---

## 🏗️ Tech-Stack & Architektur

| Komponente | Technologie |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (Modulare Architektur Etappe C) |
| Charts | [ECharts 5.5.0](https://echarts.apache.org/) |
| CSV-Parser | [PapaParse 5.4.1](https://www.papaparse.com/) |
| Architektur-Doku | Die komplette Modul- & Dateiübersicht befindet sich in [`docs/dateien_uebersicht.md`](docs/dateien_uebersicht.md) |
| Worker | Web Worker für nicht-blockierendes Parsing |
| Offline | Service Worker + Cache API (PWA) |
| Backend | Keines — 100% Client-Side |

---

## 📁 Projektstruktur

```
├── index.html          Hauptseite (UI + Modals)
├── styles.css          Design-System (Dark Mode, Responsive)
├── app.js              Kernlogik (Kapazitätsszenarien, KPIs, UI-Steuerung)
├── charts.js           ECharts-Konfiguration & Rendering
├── parser.js           CSV-Parser (Worker + Fallback)
├── utils.js            Hilfsfunktionen (Feiertage, Formatierung)
├── state.js            Globaler Anwendungszustand
├── service-worker.js   PWA-Caching
├── tests.html          Automatisierte Testsuite
├── manifest.json       PWA-Manifest
├── lib/                Externe Bibliotheken (ECharts, PapaParse)
└── Backup/             Sicherungskopien & Testdaten
```

---

## 🧪 Tests

Öffne `tests.html` im Browser — alle **83 Tests** laufen automatisch durch:

- CSV-Parser (Viertelstundenwerte, Multi-Kanal, Zeitumstellung)
- Aggregation (Stunde, Tag, Woche, Monat)
- Kapazitätsszenarien (Einzel- & Mehrjahr)
- Feiertagsberechnung (Ostern, Bundesland-spezifisch)
- Datenqualitäts-Filterung

---

## 📝 Lizenz

Proprietär — Alle Rechte vorbehalten.
