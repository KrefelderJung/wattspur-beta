# Feste einfache Ansicht und gemeinsame Messkonzept-Toolbar

## Ziel

Der Messkonzept-Konfigurator soll ohne unnötige Darstellungsentscheidung starten. Die
Skizze wird immer in der einfachen, gut lesbaren Ansicht angezeigt. Die bisherige
Umschaltung zwischen „Einfach“ und „Detailansicht“ entfällt.

## Bedienkonzept

- Die Auswahl „Darstellung“ und der Button „Detailansicht“ werden aus der sichtbaren
  Oberfläche entfernt.
- Messkonzept und Änderungsaktionen (Startseite, Rückgängig, Wiederholen,
  Zurücksetzen und PDF) bilden die Kopfzeile. Die Zoom- und Einpassfunktionen liegen als
  kompakte, schwebende Symbolleiste direkt in der Zeichenfläche.
- Auf Desktop-Breiten stehen die Gruppen in einer Zeile. Auf kleinen Bildschirmen darf
  die Toolbar umbrechen, damit Buttons erreichbar und lesbar bleiben.
- Die interne Zustandskompatibilität mit `viewMode: 'simple'` bleibt erhalten, damit
  gespeicherte Zustände und bestehende Render-Tests nicht unnötig migriert werden.

## Akzeptanzkriterien

1. Im Konfigurator existieren weder `[data-mk-view]` noch ein sichtbarer Bereich mit
   „Darstellung“, „Einfach“ oder „Detailansicht“.
2. Jeder neue Konfiguratorstart rendert die einfache Skizzenansicht.
3. Messkonzept und Historien-/Startaktionen bilden auf Desktop eine gemeinsame
   Toolbar-Zeile ohne Überlappung oder horizontalen Überlauf. Die drei kompakten
   Zoomsymbole für Verkleinern, Einpassen und Vergrößern bleiben direkt am Editor
   erreichbar. Der aktuelle Zoomwert wird nur als verständlicher Tooltip geführt.
4. Der Downloadbutton steht unabhängig von den Hinweisen in derselben
   Aktionsgruppe. Er zeigt das gemeinsame Downloadsymbol mit „PDF“; der
   vollständige Zweck bleibt über den Tooltip „Messkonzept als PDF herunterladen“
   und den zugänglichen Namen erkennbar. Auf Smartphone-Breiten bleibt die
   Touchfläche ausreichend groß.
5. Die Toolbar bleibt per Tastatur, Maus, Touch und auf Smartphone-Breiten nutzbar.
6. Export, Vorlagen, Undo/Redo und Messmodus-Auswahl funktionieren unverändert.
7. Automatisierte Tests prüfen das Fehlen der alten Umschaltung, die kompakte
   Parallel-Auswahl ohne Leerplatz für einen fünften Zähler und die neue Overlay-
   Struktur sowie den sichtbaren PDF-Export; ein Browser-Smoke-Test prüft sichtbare
   und erreichbare Controls.
