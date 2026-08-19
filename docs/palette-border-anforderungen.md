# Anforderungen: Einheitlicher Rand der Bausteinleiste

## Ziel

Alle ziehbaren Messobjekte in der linken Bausteinleiste sollen dieselbe
dezente blaue Außenkante verwenden. Die Objektfarben bleiben für die
semantische Unterscheidung der Bausteine erhalten.

## Akzeptanzkriterien

- Reguläre Messobjekte und Mieterstromobjekte verwenden denselben Randstil.
- Der Rand ist im Nacht- und Tagmodus sichtbar, ohne die farbigen Symbole zu
  überdecken.
- Hover-, Fokus- und Drag-Zustände dürfen den gemeinsamen Grundrand deutlich
  hervorheben, aber nicht durch unterschiedliche Grundregeln auseinanderlaufen.
- Die Änderung betrifft nur die Bausteinleiste. Karten im Editor behalten ihre
  eigenen Objekt- und Auswahlränder.
- Alle Palette-Buttons bleiben per Maus, Tastatur und Touch erreichbar.

## Regressionstest

`tests/palette-border-standard-test.js` prüft die gemeinsame CSS-Grundregel
und stellt sicher, dass die Mieterstromobjekte keine abweichende
Grundrandregel mehr benötigen.
