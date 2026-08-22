# Feste einfache Ansicht und gemeinsame Messkonzept-Toolbar

## Ziel

Der Messkonzept-Konfigurator soll ohne unnötige Darstellungsentscheidung starten. Die
Skizze wird immer in der einfachen, gut lesbaren Ansicht angezeigt. Die bisherige
Umschaltung zwischen „Einfach“ und „Detailansicht“ entfällt.

## Bedienkonzept

- Die Auswahl „Darstellung“ und der Button „Detailansicht“ werden aus der sichtbaren
  Oberfläche entfernt.
- Messkonzept, Skizzenansicht (Zoom/Einpassen) und Änderungsaktionen (Startseite,
  Rückgängig, Wiederholen, Zurücksetzen) bilden eine gemeinsame Toolbar.
- Auf Desktop-Breiten stehen die Gruppen in einer Zeile. Auf kleinen Bildschirmen darf
  die Toolbar umbrechen, damit Buttons erreichbar und lesbar bleiben.
- Die interne Zustandskompatibilität mit `viewMode: 'simple'` bleibt erhalten, damit
  gespeicherte Zustände und bestehende Render-Tests nicht unnötig migriert werden.

## Akzeptanzkriterien

1. Im Konfigurator existieren weder `[data-mk-view]` noch ein sichtbarer Bereich mit
   „Darstellung“, „Einfach“ oder „Detailansicht“.
2. Jeder neue Konfiguratorstart rendert die einfache Skizzenansicht.
3. Messkonzept, Zoom und Historien-/Startaktionen bilden auf Desktop eine gemeinsame
   Toolbar-Zeile ohne Überlappung oder horizontalen Überlauf.
4. Die Toolbar bleibt per Tastatur, Maus, Touch und auf Smartphone-Breiten nutzbar.
5. Export, Vorlagen, Undo/Redo und Messmodus-Auswahl funktionieren unverändert.
6. Automatisierte Tests prüfen das Fehlen der alten Umschaltung und die neue Toolbar-
   Struktur; ein Browser-Smoke-Test prüft sichtbare und erreichbare Controls.
