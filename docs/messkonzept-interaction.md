# Interaktionsmodule des Messkonzepts

Stand: 14.08.2026

## Bedienereignisse

`js/messkonzept/interaction.js` verbindet DOM-Ereignisse mit benannten
Callbacks. Dazu gehoeren Projektfelder, Modus- und Ansichtsbuttons, Modal,
Tastaturbedienung sowie die Drag-and-drop-Verkabelung.

## Fachliche Befehle

`js/messkonzept/drag-drop.js` enthaelt die fachlichen Drop- und Loeschbefehle.
Das Modul greift nicht auf globale Zustandsvariablen zu, sondern bekommt
Zustand, Topologie, Historie, Benachrichtigungen und Rendering ueber injizierte
Callbacks. So bleibt die Regelentscheidung testbar und es gibt keine zweite
Regelquelle in der UI-Schicht.

Der Einstiegspunkt `messkonzept.js` orchestriert nur noch die Module und stellt
die projektspezifischen Funktionen bereit. Die Leitungsgeometrie bleibt davon
getrennt.

## Verlauf

`js/messkonzept/history.js` kapselt Rückgängig/Wiederholen, die Zwischenstände
bei Eingabefeldern und die Aktivierung der beiden Verlaufsschaltflächen. Das
Modul kennt keine Messkonzept-Regeln; es erhält Zustandssicherung,
Wiederherstellung und Benachrichtigungen über Callbacks. Dadurch werden
mehrfach gebundene Klickereignisse bei jedem Rendern vermieden.
