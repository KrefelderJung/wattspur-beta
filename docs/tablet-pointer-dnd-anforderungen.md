# Anforderungen: Drag-and-Drop auf Android- und iOS-Tablets

## Ziel

Die bestehende Drag-and-Drop-Fachlogik soll zusätzlich mit Finger und Stift
auf Tablets bedienbar sein. Die bisherige Mausbedienung und die fachlichen
Drop-Regeln bleiben unverändert.

## Akzeptanzkriterien

- Pointer-Gesten werden nur für Touch- und Stiftgeräte ergänzt.
- Ein kurzer Halteimpuls startet die Geste; ein frühes Verschieben beendet die
  Geste ohne Änderung am Messkonzept. Außerhalb der ziehbaren Objekte bleibt
  die normale Seitenbewegung möglich.
- Während des Ziehens folgt eine rein visuelle Vorschau dem Finger oder Stift.
- Bestehende Drop-Ziele und Trefferflächen werden verwendet.
- Palette-Objekte und bereits platzierte Anlagen können auf dieselben Ziele wie
  bei der Desktop-Bedienung gezogen werden.
- Drop, Abbruch, Verlassen der Zeichenfläche und Pointer-Cancel räumen den
  aktiven Zustand vollständig auf.
- Ein erfolgreiches Ziehen öffnet nicht zusätzlich versehentlich den
  Objekt-Dialog.
- Die Tap-Alternative wird nicht eingeführt.
- HTML5-Drag-and-Drop bleibt für Desktop-Browser erhalten.
- Die neue Pointer-Datei wird im Offline-Cache berücksichtigt.
- Browserfreie Tests prüfen Modulverkabelung, Transferdaten, Aufräumen und
  die Trennung von Pointer-UI und Messlogik.

## Bewusste technische Grenze

Die Pointer-Schicht entscheidet nicht, ob ein Zähler, eine Anlage oder eine
Kaskade fachlich erlaubt ist. Sie reicht nur die erkannte Quelle und das
Drop-Ziel an `drag-drop.js` weiter. Dadurch bleibt `handleDrop` die einzige
Stelle, an der Zustände und Messbeziehungen verändert werden.
