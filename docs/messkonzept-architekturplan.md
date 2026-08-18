# Architekturplan Messkonzept-Konfigurator

Stand: 17.08.2026 · nur lokale Architekturarbeit

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
│  ├─ validation-status.js # Prüfstatus-Anzeige auf Basis des Regelkatalogs
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

### Phase 4 – `validation-status.js` und `export.js`

Prüfstatus und PDF-/Druckexport werden aus dem Hauptmodul entfernt. Beide
Schichten dürfen nur lesend auf den Zustand zugreifen. Eine separate
Messlogik-Zusammenfassung wird nicht mehr als UI- oder PDF-Bereich geführt,
weil sie neben der Skizze keinen zusätzlichen Prüfwert liefert.

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

`js/messkonzept/rules.js` führt mit `2026-08-17-beta.7` einen versionierten
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

Der Cache wurde auf `2026.08.18-beta.323` angehoben und enthält das neue
Verbindungsmodul sowie die überarbeitete Trafo-Darstellung. Der HTTP-Testlauf umfasst jetzt 110 Tests und ist vollständig
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

Der PDF-Export bietet nun zwei bewusst getrennte Ausgaben über dieselbe
Export-API. Der **Skizzenexport** enthält Logo, Exportstand, Projektangaben,
Orientierungshinweis, Prüfstatus und Kommentar, lässt aber die ausführlichen
Objektdetails weg. Der **Gesamtexport** enthält zusätzlich diese Details. Beide
Varianten verwenden dieselbe eingefrorene Editor-Bühne, sodass Leitungen und
Karten geometrisch identisch bleiben. Die Auswahl wird nur als `scope:
'sketch'` oder `scope: 'full'` an `export.js` übergeben; es gibt kein zweites,
abweichendes PDF-Layout.

## Aktualisierter Architekturstatus (14.08.2026)

`js/messkonzept/layout.js` ist jetzt als sechste aktive Schicht eingebunden. Das
Modul kapselt die berechenbare Layoutlogik für Sammelschienen und Parallelzweige:
Breiten, Zeilenaufteilung, reservierte Messplätze, Einzel-Rails,
Kollisionsverschiebungen und die dynamische Parallelbusbreite. Es greift nicht
auf `mkConfiguratorState` oder `mkElements` zu, sondern erhält Zustand, DOM-
Anker, Topologie und Geometriekonstanten über eine injizierte API.

`messkonzept.js` enthält dafür nur noch kleine Kompatibilitätsadapter. Die
Darstellung und die fachliche Zählerbaumlogik bleiben unverändert; die
Zuständigkeit ist nun klar getrennt: `render.js` erzeugt Markup, `layout.js`
misst und positioniert, `connections.js` zeichnet die Leitungen. Für jede
Sammelschiene prüft `layout.js` zusätzlich den realen Abstand zwischen dem
senkrechten Messstrang und der ersten Anlagenkarte. Bei einer Kaskade wird nur
der notwendige Versatz gesetzt; die Unter-Rails werden erst danach an die neue
Kartenposition ausgerichtet. So bleibt die Regel in gemeinsamer Messung und
Parallelmessung identisch und wächst mit der tatsächlichen Skizzenbreite.

Der Cache wurde auf `2026.08.14-beta.176` angehoben. Die Browser-Test-Suite
umfasst jetzt 119 Tests und ist vollständig grün. Der neue Regressionstest
prüft zusätzlich den einheitlichen Zählerkarten- und Anschlussstandard in
gemeinsamer Messung und Parallelmessung. Der Architekturtest prüft nun auch
die gekapselte Bootstrap-/DOM-Verkabelung: statische DOM-Anker, DOM-Ready,
Resize-Debounce sowie die Lade- und Cache-Reihenfolge liegen in
`js/messkonzept/bootstrap.js`. `messkonzept.js` erhält die gesammelten
Elemente nur noch über diese Schnittstelle und enthält keine eigene statische
DOM-Suche oder DOM-Ready-Verkabelung mehr.

## Erledigter Auslagerungsplan

Die ursprünglich geplante Editor-/Bootstrap-Grenze ist umgesetzt. `interaction.js`,
`drag-drop.js`, `viewport.js`, `history.js`, `canvas-renderer.js`, `editor.js`
und `start-flow.js` werden über benannte APIs verkabelt. `messkonzept.js` bleibt
als Orchestrator zurück und enthält weiterhin die fachlichen Kompatibilitäts-
adapter.

## Nächster konkreter Schritt

Als nächstes sollte der zentrale Render-Zyklus aus `messkonzept.js` in ein
kleines UI-Orchestrierungsmodul ausgelagert werden. Dabei dürfen weder
Messlogik noch Geometrie verschoben werden. Ziel ist eine feste, testbare
Reihenfolge für Projektfelder, Schalter, Canvas, Leitungsbeobachtung, Zoom,
Prüfstatus und Verlauf.

## Aktualisierter Architekturstatus – Canvas-Komposition (14.08.2026)

`js/messkonzept/canvas-renderer.js` ist als siebte aktive Schicht eingebunden.
Das Modul komponiert die sichtbare Messskizze, HAK-/Zählerstruktur,
Parallelzweige und das Objekt-Modal. Es kennt weder die globalen
Konfiguratorvariablen noch SVG-Geometrie oder direkte DOM-Messungen. Zustand,
fachliche Hilfsfunktionen und bestehende Karten-/Dropzone-Renderer werden über
eine injizierte Factory-Schnittstelle bereitgestellt.

`messkonzept.js` enthält für diese Funktionen nur noch Kompatibilitätsadapter.
Damit ist die Grenze künftig eindeutig: `render.js` erzeugt einzelne Karten und
Rails, `canvas-renderer.js` setzt diese zu einer Oberfläche zusammen,
`layout.js` berechnet Maße und `connections.js` zeichnet die Leitungen. Ein
Regressionstest prüft die Modul-Isolation, die Lade-/Cache-Reihenfolge und eine
einfache Canvas-Komposition ohne globale Konfiguratorvariablen. Der Cache steht
auf `2026.08.14-beta.193`; die Änderungen bleiben lokal und wurden nicht
veröffentlicht.

## Aktualisierter Architekturstatus – Browserfreier Smoke-Test (16.08.2026)

Mit `tests/architecture-smoke-test.js` gibt es jetzt einen kleinen, von einem
Browser unabhängigen Vorabtest. Er prüft vor jedem UI-Test, ob alle aktiven
Messkonzept-Dateien vorhanden sind, in `index.html` in der vereinbarten Reihenfolge
geladen werden und ihre öffentlichen Modulverträge bereitstellen. Außerdem
verhindert er DOM-Zugriffe in den fachlichen Kernmodulen, veraltete Prüfregel-IDs
im UI-Code und fehlende Einträge im Offline-Cache.

Der Test wird mit der vorhandenen Node-Laufzeit gestartet:

```text
node tests/architecture-smoke-test.js
```

Der aktuelle Lauf endet mit `Architektur-Smoke-Test: OK`. Die Browser-Testseite
prüft zusätzlich, dass Testdatei und Dokumentation vorhanden sind. Damit gibt es
vor künftigen Auslagerungen eine schnelle technische Leitplanke, ohne die
fachliche Prüfung oder den visuellen Test zu ersetzen.

## Aktualisierter Architekturstatus – dynamische Startvorlagen (16.08.2026)

Die neue Startauswahl arbeitet mit drei getrennten Schichten: `presets.js`
enthält nur den verständlichen Katalog, `preset-loader.js` baut daraus normale
Modellobjekte und `messkonzept.js` schaltet lediglich zwischen Startauswahl und
Konfigurator um. Vorlagen verwenden deshalb denselben Renderer, dieselbe
Topologie und dieselben Leitungsregeln wie ein freier Entwurf.

Die neun Vorlagen decken die abgestimmten häufigen Fälle ab: vier gemeinsame
Messungen, zwei parallele Zweitzähler, zwei Kaskaden und eine
Mieterstrom-D1-Vorlage. Der browserfreie
`tests/preset-loader-test.js` prüft insbesondere, dass „Haushalt“ intern ein
`consumer` bleibt und dass PV sowie Speicher in der Kaskade tatsächlich hinter
dem erzeugten Z2 hängen. Der Cache steht auf `2026.08.18-beta.323`.

## Aktualisierter Architekturstatus – Objekteditor (17.08.2026)

Die Eingaben im Objekt-Dialog sind nun in `js/messkonzept/editor.js`
gekapselt. Das Modul verarbeitet Asset- und Zählerdetailfelder, aktualisiert
keine Leitungsgeometrie und kennt keine globalen Konfiguratorvariablen. Es
erhält Zustand, Historie, Rendering und fachliche Hilfsfunktionen über
injizierte Callbacks.

`interaction.js` bleibt damit auf Bedienereignisse wie Öffnen, Schließen,
Tastatur und Drag-and-drop beschränkt. `messkonzept.js` verkabelt die Module
über `MK_EDITOR` und bleibt fachlicher Orchestrator. Ein Browser-Regressionstest
prüft die Start- und Cache-Reihenfolge, die Modul-Isolation und eine echte
Asset-Feldänderung im ausgelagerten Editor.

## Aktualisierter Architekturstatus – Startfluss (17.08.2026)

Der Weg von der Werkzeugauswahl in die Messkonzept-Vorlagen oder in die freie
Skizze liegt jetzt in `js/messkonzept/start-flow.js`. Die Schicht baut die
Vorlagenkarten, öffnet und schließt den Konfigurator und blendet den Editor ein
oder aus. Reset, Vorlagenladung, Historie und Rendern werden über Callbacks
angefordert. Dadurch bleiben die fachlichen Zähler- und Leitungsregeln im
Modell beziehungsweise in den Befehls- und Layoutmodulen.

Der Browser-Test prüft zusätzlich die Reihenfolge von Reset, Verlaufslöschung
und Rendern beim freien Einstieg. So wird verhindert, dass die Startauswahl
später wieder direkt mit fachlicher Messlogik vermischt wird.

## Aktualisierter Architekturstatus – Kennungen und Nummerierung (17.08.2026)

Die fortlaufende Vergabe von Zusatz-Zählern und Erzeugungskennungen liegt jetzt
in `js/messkonzept/identifiers.js`. Das Modul erhält Zustand und Topologie über
Adapter und kennt weder DOM noch Kartenmarkup. Dadurch greifen Editor, einfache
Ansicht, Detailansicht und PDF auf dieselbe Nummernquelle zurück. Mieterstrom-
zähler bilden dabei bewusst eine eigene sichtbare Folge `ZN1`, `ZN2`, … und
erhöhen nicht die reguläre Netz-Zählerfolge `Z1`, `Z2`, …. Ein Browser-
Regressionstest prüft Parallel-Grundzähler, beide Zusatz-Zählerfolgen und die
PV-Kennung in einem gemeinsamen Szenario.

## Aktualisierter Architekturstatus – Prüfstatus-Verkabelung (17.08.2026)

Der Prüfstatus bleibt in `rules.js` und `validation-status.js` gekapselt. Der
Einstiegspunkt verwendet die Controller-API jetzt direkt für Bewertung und
Aktualisierung. Die früheren `mkValidation`-, `mkRenderValidation`- und
`mkRefreshInlineStatus`-Zwischenadapter wurden entfernt. Dadurch gibt es nur
noch eine sichtbare Grenze zwischen fachlichen Regeln, Statusdarstellung und
der übrigen UI-Verkabelung.

## Aktualisierter Architekturstatus – Render-Zyklus (17.08.2026)

`js/messkonzept/render-cycle.js` kapselt nun den vollständigen UI-Renderlauf.
Der Controller kennt nur injizierte Adapter und hält die Reihenfolge der
Aktualisierungen stabil: Projektangaben, Modus- und Ansichtsbuttons, Canvas,
Leitungsbeobachtung, Zoom, Geometrie-Nachlauf, Prüfstatus und Verlauf.
`messkonzept.js` bleibt damit Orchestrator und Fachadapter, enthält aber keine
zweite Kopie der Schalter- oder Renderreihenfolge mehr. Ein Browser-Test prüft
den Ablauf, die Modul-Isolation, die Ladeposition und den Offline-Cache.

## Aktualisierter Architekturstatus – Zähler-Drop-Regeln (17.08.2026)

Die Regeln für zusätzliche Kaskadenstufen und eigene Anlagenzähler liegen jetzt
in `js/messkonzept/meter-policy.js`. Dadurch ist nachvollziehbar getrennt, wann
ein Basiszähler eine weitere Stufe erhalten darf, wann eine Anlage einen
Einzelzähler bekommt und welche Elternbeziehung beim Drop erhalten bleibt.
Die Schicht verändert keinen Zustand selbst. Ein Browser-Test deckt Basis-
zähler, erweiterte Sammelschienen und bereits isolierte Einzelzähler ab.

## Aktualisierter Architekturstatus – Objekt-Darstellung (17.08.2026)

`js/messkonzept/asset-display.js` bündelt die sichtbaren Labels, die fachlichen
SteuVE- und NSH-Hinweise, die Erzeugungskennungen sowie die Batterie-,
Wallbox-, Wärmepumpen- und Anlagen-Icons. Das Modul erhält seine fachlichen
Adapter über eine kleine Controller-API und kennt weder DOM noch Layout oder
Leitungsgeometrie. So können Symbol- und Textanpassungen unabhängig von der
Messlogik getestet werden. Ein Browser-Regressionstest prüft die API, die
Wallbox-Darstellung mit Kabel und Stecker, die Lade-Reihenfolge und den
Offline-Cache-Eintrag.

## Aktualisierter Architekturstatus – Drag-and-Drop-Verkabelung (17.08.2026)

`js/messkonzept/drag-drop.js` war bereits die vollständige Quelle für
Palette-Drag, Canvas-Drop, Positionswechsel und Löschen. Die letzten
Fallback-Kopien dieser Ereignislogik wurden aus `messkonzept.js` entfernt.
Der Einstiegspunkt reicht jetzt ausschließlich an diese API weiter. Ein
Browser-Test prüft ausdrücklich, dass keine zweite Fallback-Implementierung
zurückkehrt.

## Aktualisierter Architekturstatus – Geometrie-Nachlauf (17.08.2026)

`js/messkonzept/geometry-runtime.js` kapselt jetzt die zeitliche Orchestrierung
der Leitungsgeometrie. Nach einem Renderlauf werden Root-Sammelschienen,
verschachtelte Unter-Rails, Parallelbus, dynamische Verbindungen und die
Viewport-Zentrierung immer in derselben Reihenfolge ausgeführt. Das verhindert,
dass ein späterer Kollisionsversatz mit einer veralteten Kartenposition arbeitet.
Die Runtime kennt weder DOM-Suche noch Messobjekte. Sie erhält Layout-,
Verbindungs- und Viewport-Schritte ausschließlich über Callbacks. Ein
Browser-Test prüft direkten und geplanten Lauf, die Reihenfolge, die
Ladeposition und den Offline-Cache.

## Aktualisierter Architekturstatus – Messbereich-Komposition (17.08.2026)

`js/messkonzept/zone-renderer.js` übernimmt jetzt die Komposition einer
Messbereichs-Drop-Zone. Dazu gehören der sichtbare oder strukturelle
Sammelschienenknoten, die Rail-Struktur und die Objekt-Markup-Verankerung.
Topologie, Layout, Beschriftung und der bestehende Rail-Renderer werden über
Callbacks eingespeist. Der Einstiegspunkt enthält nur noch einen dünnen
Adapter. Ein Browser-Test prüft die Markup-Anker, die Modul-Isolation, die
Ladeposition und den Offline-Cache.

## Aktualisierter Architekturstatus – Lastgang-Dateneditor (17.08.2026)

Der Tabellen- und Massendateneditor liegt jetzt in
`js/lastgang/data-editor.js`. Dort sind Seitenwechsel, Zellbearbeitung,
Zwischenablage, Massendatenimport und die Bearbeitungssperre gebündelt. `app.js`
bleibt für den Lastgang-Bereich der Orchestrator und ruft nur die dokumentierte
API `WattspurLastgangDataEditor` auf. Dadurch kann eine spätere Reparatur am
Editor nicht mehr versehentlich die Diagramm- oder Kapazitätslogik duplizieren.

Die Auslagerung ist bewusst schrittweise: Der Editor nutzt vorerst die
bestehenden State- und Dashboard-Adapter, damit sich das Nutzerverhalten nicht
ändert. Ein isolierter Node-Test prüft die API und eine echte Zelländerung ohne
Browser-DOM. Der Offline-Cache wurde auf `2026.08.18-beta.323` angehoben und
enthält die neue Datei. Als nächster sinnvoller Schritt bleibt die spätere
Injektion dieser Adapter; dafür besteht aktuell kein Änderungsdruck.

## Aktualisierter Architekturstatus – Netzanschluss als bearbeitbares Objekt (17.08.2026)

Der HAK bleibt ein fester Topologiebaustein und wird nicht als Anlage im
Zählerbaum gespeichert. Sein Zusatzstatus liegt im Modell unter
`state.hak.voltageLevel` mit den Werten `low` und `medium`. Der
Canvas-Renderer stellt `low` als HAK und `medium` als Transformator zwischen
Mittel- und Niederspannung dar. Die Auswahl ist historienfähig und wird im
Gesamtexport als Spannungsebene dokumentiert. Die Darstellung ist eine
Orientierung. Die konkrete Anschlussart richtet sich nach Netzbetreiber, TAB
und den jeweils geltenden technischen Anschlussregeln.

## Aktualisierter Architekturstatus – Technische Anlagenstammdaten (17.08.2026)

PV- und Windanlagen können neben der Nennleistung nun optional die zugeordnete
Wechselrichterleistung dokumentieren. Für Speicher stehen Kapazität, maximale
Ladeleistung, maximale Entladeleistung und die Wechselrichterleistung zur
Verfügung. Die Felder sind technische Dokumentation und werden nicht als
automatische Entscheidung für EEG, § 14a EnWG oder ein Messkonzept verwendet.
Mehrere Wechselrichter werden als gemeinsame Gesamtleistung erfasst. Die
Erfassung bleibt bewusst optional, damit einfache Nutzer nicht mit
Ingenieursdaten blockiert werden.

Bei Wärmepumpen wird die elektrische Gesamtleistung einschließlich Heizstab
oder Zusatzheizung in einem einzigen Feld erfasst. Eine separate
Heizstababfrage wurde bewusst entfernt, damit Eingabe und §14a-Prüfung immer
denselben Gesamtwert verwenden.

## Aktualisierter Architekturstatus – Trafo als Leitungsobjekt (17.08.2026)

Bei Mittelspannung wird der Netzanschluss im Canvas jetzt als zentrales
Doppelring-Symbol ohne rechteckige Zusatzbeschriftung dargestellt. Der
Leitungsanker bleibt auf derselben Mittelachse wie HAK und Zähler, sodass die
Abgänge linear in die Messskizze laufen. Die Bezeichnung „Trafo“ bleibt für
Tooltip, Barrierefreiheit und den Objekteditor erhalten.
