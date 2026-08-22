# Anforderung: Zähler in Kaskaden anklickbar

## Ziel

Jeder sichtbare Zusatz- und Kaskadenzähler muss im Editor anklickbar sein und
seinen eigenen Objekteditor öffnen. Das gilt auch für Inline-Zähler vor einer
einzelnen Anlage sowie für Zähler aus einer Kaskaden-Vorlage.

## Akzeptanzkriterien

- Die Auswahl wird intern über die stabile Zähler-ID aufgelöst, nicht über die
  sichtbare oder berechnete Nummer.
- Basiszähler und Zusatz-Zähler öffnen weiterhin denselben Editor wie bisher.
- Eine Änderung an einem Zähler darf keinen anderen Zähler öffnen.
- Tastaturauswahl mit Enter beziehungsweise Leertaste bleibt möglich.
- Die sichtbare Beschriftung Z1, Z2, Z3 bleibt unverändert.
- Die Hintergrundbewegung der Zeichenfläche darf Klicks auf Zähler nicht
  übernehmen; die linke Maustaste öffnet dort den Objekteditor.
- Ein Regressionstest deckt Sammelschienen-, Inline- und Basiszähler ab.

## Architekturentscheidung

Die DOM-Renderer schreiben neben der sichtbaren Nummer die stabile
`data-mk-meter-id`-Kennung. Die Ereignisschicht reicht diese ID an den
Objekteditor weiter. Der bestehende Detailindex bleibt als Rückwärtskompatible
Reserve für alte Markups erhalten, ist aber nicht mehr der primäre Schlüssel.
