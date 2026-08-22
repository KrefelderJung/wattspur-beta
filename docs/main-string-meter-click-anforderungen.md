# Hauptstrang-Zähler: Klickbarkeit

## Ziel

Jeder sichtbare zusätzliche Zähler muss unabhängig davon, ob er auf einer Anlage,
an einer Sammelschiene oder direkt im Hauptstrang liegt, sein Objektfenster öffnen.
Der Basiszähler bleibt weiterhin klickbar.

## Akzeptanzkriterien

- Ein zusätzlicher Zähler auf dem Hauptstrang öffnet per Linksklick sein
  Zählerfenster.
- Ein zusätzlicher Zähler auf einer Sammelschiene öffnet dasselbe Fenster.
- Ein zusätzlicher Zähler an einer Anlage bleibt klickbar.
- Die Klickfläche umfasst das sichtbare Zählerobjekt einschließlich seiner
  zugänglichen Beschriftung, nicht die benachbarte Leitung oder Anlage.
- Enter und Leertaste lösen dieselbe Auswahl aus.
- Das stabile `data-mk-meter-id` wird an jedem zusätzlichen Zähler gerendert.
- Die bestehende Topologie, Geometrie und Drag-and-Drop-Logik werden durch die
  Korrektur nicht verändert.

## Regressionstest

Der Test erzeugt einen zusätzlichen Zähler mit `meterScope: "base"` als Kind des
Hauptstrangs und prüft, dass sein gerendertes DOM-Element einen stabilen Zähler-
Identifier, eine Tastaturrolle und die erwartete Ereignisbrücke besitzt.
