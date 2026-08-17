# Interaktionsmodule des Messkonzepts

Stand: 17.08.2026

## Bedienereignisse

`js/messkonzept/interaction.js` verbindet DOM-Ereignisse mit benannten
Callbacks. Dazu gehoeren Projektfelder, Modus- und Ansichtsbuttons, Modal,
Tastaturbedienung sowie die Drag-and-drop-Verkabelung.

`js/messkonzept/editor.js` ist die separate Editor-Schicht für die Eingaben im
Objekt-Dialog. Sie verarbeitet Asset- und Zählerdetails und meldet Änderungen
über injizierte Callbacks zurück. Die allgemeine Interaktionsschicht öffnet und
schließt den Dialog nur noch, sie verändert keine fachlichen Feldwerte selbst.

`js/messkonzept/start-flow.js` verwaltet den Einstieg in den Konfigurator. Es
schaltet zwischen Werkzeugauswahl, Startvorlagen und freier Skizze um und baut
die Vorlagenkarten. Messlogik, Topologie und Geometrie bleiben außerhalb dieses
UI-Flusses.

`js/messkonzept/render-cycle.js` ist die zentrale UI-Orchestrierung für einen
vollständigen Renderlauf. Das Modul aktualisiert Schalterzustände und ruft die
bereits vorhandenen Projekt-, Canvas-, Viewport-, Prüfstatus- und Verlauf-
Adapter in einer festen Reihenfolge auf. Es kennt weder Messobjekte noch
statische DOM-Selektoren.

`js/messkonzept/geometry-runtime.js` bildet den stabilen Nachlauf nach jedem
Rendern. Es führt Root-Sammelschienen, verschachtelte Rails, Parallelbus,
dynamische Leitungen und die Zentrierung in einer festen Reihenfolge aus. Das
Modul kennt keine Messobjekte und erhält alle Arbeitsschritte über Callbacks.
Dadurch kann die Geometrie-Reihenfolge unabhängig getestet werden, ohne die
fachliche Drop- oder Zählerlogik zu verändern.

`js/messkonzept/identifiers.js` hält die fachliche Vergabe von Zählernummern
und Anlagenkennungen zusammen. Dadurch verwenden Editor, Kartenrenderer und
PDF dieselbe Nummernquelle, während das Modul selbst weder DOM noch Layout
kennt.

`js/messkonzept/meter-policy.js` entscheidet, welche Zähler-Drops fachlich
zulässig sind. Die Schicht kennt nur Topologie-Adapter und liefert Drop-Ziele
zurück. Sie verändert keine Anlagen und enthält keine Darstellung.

`js/messkonzept/asset-display.js` bündelt die sichtbaren Bezeichnungen,
fachlichen SteuVE- und NSH-Hinweise sowie die Objekt- und Zähler-Icons. Das
Modul kennt weder DOM noch Leitungsgeometrie. Dadurch bleiben Darstellung und
Topologie getrennt testbar und ein Symbolwechsel verändert keine Messlogik.

`js/messkonzept/zone-renderer.js` komponiert die Drop-Zonen und ihre Rails aus
injizierten Topologie-, Layout- und Renderfunktionen. Es erzeugt den
strukturellen Sammelschienenknoten auch dann, wenn eine Rail leer bleibt. Die
Schicht kennt weder globale Zustände noch DOM-Messungen.

## Fachliche Befehle

`js/messkonzept/drag-drop.js` enthaelt die fachlichen Drop- und Loeschbefehle.
Das Modul greift nicht auf globale Zustandsvariablen zu, sondern bekommt
Zustand, Topologie, Historie, Benachrichtigungen und Rendering ueber injizierte
Callbacks. So bleibt die Regelentscheidung testbar und es gibt keine zweite
Regelquelle in der UI-Schicht. Der Einstiegspunkt reicht die vollständige
Ereignis-API ohne parallele Fallback-Implementierung weiter. Dadurch kann ein
seltenes Drop-Ereignis nicht je nach Aufrufweg unterschiedlich behandelt werden.

Der Einstiegspunkt `messkonzept.js` orchestriert nur noch die Module und stellt
die projektspezifischen Funktionen bereit. Die Leitungsgeometrie bleibt davon
getrennt.

## Verlauf

`js/messkonzept/history.js` kapselt Rückgängig/Wiederholen, die Zwischenstände
bei Eingabefeldern und die Aktivierung der beiden Verlaufsschaltflächen. Das
Modul kennt keine Messkonzept-Regeln; es erhält Zustandssicherung,
Wiederherstellung und Benachrichtigungen über Callbacks. Dadurch werden
mehrfach gebundene Klickereignisse bei jedem Rendern vermieden.
