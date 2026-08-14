# Architekturplan Messkonzept-Konfigurator

Stand: 14.08.2026 · nur lokale Architekturarbeit

## Kurzentscheidung

Ja, JavaScript sollte weiter ausgelagert werden. Wir sollten aber nicht zuerst
beliebige Funktionen nach Dateigröße verschieben. Die erste echte Auslagerung
soll die fachliche Zustands- und Änderungslogik sein. Danach folgen Rendering,
Leitungsrouting und Benutzerinteraktion als getrennte Schichten.

Die bereits ausgelagerten Dateien `messkonzept-geometry.js` und
`messkonzept-topology.js` bleiben die Grundlage. Sie werden zunächst nicht
erneut umgebaut, sondern über Tests stabilisiert.

## Bestandsaufnahme

| Bereich | Aktueller Ort | Befund |
| --- | --- | --- |
| Fachlicher Zustand, Anlagen und Zusatz-Zähler | `messkonzept.js` | Mit Historie, Moduswechseln und UI-Aktionen vermischt |
| Zählerbaum | `messkonzept-topology.js` | Bereits sinnvoll DOM-frei ausgelagert |
| Koordinaten- und SVG-Grundlagen | `messkonzept-geometry.js` | Bereits sinnvoll ausgelagert |
| HTML-Rendering | `messkonzept.js` | Viele `mkRender...`-Funktionen in derselben Datei |
| Sammelschienen- und Unterzähler-Routing | `js/messkonzept/connections.js` | Eigene, injizierte Leitungs-API; der Einstiegspunkt delegiert nur noch |
| Drag & Drop, Modals, Zoom, Pan | `messkonzept.js` | Direkter Zugriff auf globalen Zustand und DOM |
| PDF-/Druckexport | `js/messkonzept/export.js` | Druckbares HTML und Browser-PDF über injizierte API |
| Lastgang-App | `app.js`, `charts.js`, `ui/`, `energy/`, `export/` | Eigener großer Bereich; nicht mit Messkonzept vermischen |

## Zielstruktur ohne Framework

GitHub Pages kann weiterhin statische Dateien ausliefern. Deshalb empfehle ich
vorerst keine neue Build- oder Bundler-Infrastruktur, sondern kleine IIFE- oder
ES-Modul-Dateien mit klaren öffentlichen Schnittstellen:

```text
js/
├─ messkonzept/
│  ├─ model.js          # Zustand und fachliche Befehle
│  ├─ rules.js          # DOM-freie fachliche Prüfregeln
│  ├─ topology.js       # Zählerbaum; Nachfolger von messkonzept-topology.js
│  ├─ geometry.js       # Koordinaten; Nachfolger von messkonzept-geometry.js
│  ├─ render.js         # HTML für Schienen, Zähler und Anlagenkarten
│  ├─ connections.js    # SVG-Leitungen und Knotenpunkte
│  ├─ validation.js     # Prüfstatus und Messlogik-Zusammenfassung
│  ├─ interaction.js    # Drag & Drop, Auswahl, Modal, Zoom und Pan
│  ├─ export.js         # Druck-/PDF-Ausgabe
│  └─ bootstrap.js      # DOM-Verkabelung und Render-Zyklus
└─ ...                  # bestehende Lastgang-Module unverändert
```

`messkonzept.js` wird am Ende nur noch der Einstiegspunkt sein. Keine andere
Datei soll direkt auf interne Variablen einer anderen Schicht zugreifen.

## Empfohlene Reihenfolge

### Phase 0 – Sicherung und Messlatte

- Sicherungspunkt: `Backup/2026-08-14-architecture-rules-before/`
- Bestehende UI-Tests unverändert grün halten.
- Zusätzlich eine kleine fachliche Testmatrix führen:
  - Einzähler und Parallelmessung
  - 1 bis 4 Messstufen
  - eine Anlage, mehrere Anlagen und verschachtelte Zusatz-Zähler
  - einfache Ansicht, Detailansicht und Zoom 40/100/120 %

### Phase 1 – `model.js` zuerst

Aus `messkonzept.js` werden nur fachliche Zustandsänderungen herausgezogen:

- `createInitialState()`
- `createAsset()`
- `addAsset()`
- `removeAsset()`
- `moveAsset()` und `moveMeterSubtree()`
- `changeMode()` und `changeCascadeLevels()`
- `captureHistoryState()`, `undo()` und `redo()`

Diese Funktionen dürfen weder `document`, CSS-Klassen noch SVG kennen. Sie
erhalten Eingaben und geben einen neuen Zustand oder ein Ergebnis zurück.
Das verhindert, dass eine Geometriekorrektur nebenbei die Zählerhierarchie
ändert.

### Phase 2 – `render.js`

Danach werden die `mkRender...`-Funktionen verschoben. Rendering erhält Zustand
und Topologie als Eingabe und erzeugt HTML. Es verändert den Zustand nicht.

Wichtiges Ziel: Jede Anlage und jeder Zähler wird genau einmal aus dem
Zählerbaum gerendert. Die Schachtelung der Rails bleibt damit nachvollziehbar.

### Phase 3 – `connections.js`

Die SVG-Leitungen werden als eigene Schicht auf den gerenderten DOM gelegt.
Diese Schicht arbeitet nur mit benannten Ankern:

- `HK` – HAK-Abgangsknoten
- `SK` / `SK-Z` – Sammelschienenknoten
- `AK` – Anlagenknoten
- `ZK` – Zählerknoten der Sammelschiene
- `MK` – Messknoten am unteren Zähleranschluss

Die Leitungsfunktion erhält eine Liste solcher Knoten und verbindet sie. Sie
liest keine fachlichen Beziehungen aus zufälliger DOM-Reihenfolge.

### Phase 4 – `validation.js` und `export.js`

Prüfstatus, Messlogik-Zusammenfassung und PDF-/Druckexport werden anschließend
aus dem Hauptmodul entfernt. Beide Schichten dürfen nur lesend auf den Zustand
zugreifen.

### Phase 5 – `interaction.js` und dünner Einstiegspunkt

Zum Schluss werden Event-Listener, Drag & Drop, Modals, Zoom und Pan gebündelt.
`bootstrap.js` verbindet die Schichten und stößt nach einer Zustandsänderung
einen einzigen Render-Zyklus an.

## Was wir ausdrücklich nicht zuerst tun sollten

- Nicht alle Funktionen nur nach Dateigröße auf mehrere Dateien verteilen.
- Nicht gleichzeitig CSS, Datenmodell und Routing umbenennen.
- Nicht auf ein Framework oder einen Bundler wechseln, solange die Beta als
  statische GitHub-Pages-Seite laufen soll.
- Nicht die bewährte Topologie- und Geometrie-API ändern, bevor die erste
  Modellebene getestet ist.

## Abnahmekriterien pro Auslagerung

Eine Phase gilt erst als abgeschlossen, wenn:

1. die bestehende Funktion im Browser unverändert bedienbar bleibt,
2. die UI-Tests weiterhin vollständig bestehen,
3. mindestens ein gezielter Regressionstest für die neue Grenze existiert,
4. keine neue globale Variable außer einer dokumentierten Wattspur-API entsteht,
5. die Rückkehr zum Sicherungspunkt ohne Datenmigration möglich bleibt.

## Status nach den ersten Auslagerungen

`js/messkonzept/model.js` ist als erste Schicht aktiv eingebunden. Es enthält
Zustand, Anlagenanlage, Moduswechsel, Zählerdetails, Historie und die fachliche
Zonenlogik. `messkonzept.js` ruft diese Funktionen nur noch über die
`WattspurMesskonzeptModel`-Schnittstelle auf; DOM, CSS und SVG bleiben aus dem
Modul heraus.

Die Abnahmemesslatte ist erreicht: Der HTTP-Testlauf umfasst 109 Tests und ist
vollständig grün. Zusätzlich prüfen eigene Modell- und Architekturtests die
Zählerzuordnung, einen DOM-freien Historien-Snapshot und die fachlichen Regeln
ohne Browser-Abhängigkeit.

`js/messkonzept/rules.js` ist jetzt als zweite fachliche Schicht aktiv. Das
Modul bewertet Einzähler- und Parallelfälle ohne Zugriff auf
`document`, CSS oder SVG. `messkonzept.js` liefert weiterhin die unveränderte
UI-Ausgabe, delegiert die fachliche Bewertung aber über die kleine API
`WattspurMesskonzeptRules.evaluate(...)`. Dadurch kann eine Regel künftig
getestet oder erweitert werden, ohne nebenbei die Zeichnung zu verändern.

`js/messkonzept/render.js` ist als dritte Schicht aktiv. Es erzeugt die
Markup-Strukturen für Anlagenkarten, Zusatz-Zählerrails, reservierte
Anschlussplätze und HTML-Knotenpunkte über `WattspurMesskonzeptRender`. Das
Modul greift nicht auf `document`, CSS-Messungen oder SVG zu. Der Einstiegspunkt
reicht ihm nur die fachlichen Hilfsfunktionen und bleibt damit kompatibel zur
bestehenden Topologie.

`js/messkonzept/rules.js` führt mit `2026-08-14-beta.1` einen versionierten
Regelkatalog ein. Jede aktive Prüfung liefert neben Stufe und Text eine stabile
Regel-ID, die im [Regelwerk](messkonzept-regelwerk.md), in der UI und in den
Regressionstests wiederverwendet wird. Das Regelwerk dokumentiert bewusst auch
die Grenzen der Beta: Hinweise sind keine Genehmigung und harte Blockaden
werden erst nach fachlicher Freigabe eingeführt.

`js/messkonzept/connections.js` ist jetzt als vierte Schicht aktiv. Die
Leitungsorchestrierung erhält Zustand, DOM-Anker, Maßstab und die kleinen
Geometriebausteine über eine injizierte Schnittstelle. Dadurch kennt das
Verbindungsmodul weder `mkConfiguratorState` noch `mkElements` und kann nicht
mehr versehentlich fachliche Zustände verändern. Die bisherige Geometrie bleibt
bewusst unverändert; lediglich die Zuständigkeit ist verschoben.

Der Cache wurde auf `2026.08.14-beta.163` angehoben und enthält das neue
Verbindungsmodul. Der HTTP-Testlauf umfasst jetzt 110 Tests und ist vollständig
grün. Zusätzlich prüft ein Architekturtest, dass die Leitungslogik nicht in
`messkonzept.js` zurückwandert, das Modul offline gecacht wird und keine globalen
Zustandsvariablen verwendet. Die Arbeit bleibt lokal; eine Veröffentlichung auf
GitHub Pages ist damit ausdrücklich noch nicht erfolgt.

`js/messkonzept/export.js` ist jetzt als fünfte Schicht aktiv. Es erzeugt aus
dem aktuellen Zustand und der bereits gerenderten Skizze ein druckbares
HTML-Dokument und öffnet den Browserdruckdialog. Die Ausgabe wird nicht als
zweites, parallel gepflegtes PDF-Layout nachgebaut. Dadurch bleiben die
Ergebnisse nachvollziehbar, während spätere PDF-Optimierungen gezielt in diesem
Modul und den Druck-CSS-Regeln vorgenommen werden können. Der Export greift
nicht direkt auf `mkConfiguratorState`, `mkElements` oder einzelne UI-Handler
zu; alle benötigten Daten werden über eine kleine injizierte API übergeben.

Der Cache wurde auf `2026.08.14-beta.164` angehoben. Der HTTP-Testlauf umfasst
jetzt 111 Tests und ist vollständig grün; zusätzlich wurde der PDF-Export im
Browser mit einem simulierten Druckdialog auf Aufbau und Bereinigung geprüft.
Die Arbeit bleibt lokal; eine Veröffentlichung auf GitHub Pages ist damit
ausdrücklich noch nicht erfolgt.

## Nächster konkreter Schritt

Als nächstes sollte die Interaktionsschicht (`interaction.js`) folgen. Sie soll
Drag & Drop, Modals, Zoom, Pan und Undo/Redo bündeln, ohne selbst Rails oder
PDF-Markup zu erzeugen. Danach bleibt `messkonzept.js` als dünner Bootstrap-
Einstiegspunkt übrig.
