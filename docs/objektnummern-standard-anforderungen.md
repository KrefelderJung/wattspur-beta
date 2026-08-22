# Standard für sichtbare Objektnummern

## Entscheidung

Die Nummerierung soll fachlich eindeutig sein, aber nicht jedes Objekt mit einem
zusätzlichen kleinen Kreis überladen. Deshalb gilt:

- Textkarten tragen ihre Nummer direkt in der Kennung. Beispiele sind `Z1`,
  `PV1`, `BHKW1`, `WE1`, `V1`, `NSH1` und `N1`.
- Reine Symbolkarten erhalten ein kleines, farblich passendes Badge unten rechts.
  Das betrifft Batteriespeicher, Wallboxen, Wärmepumpen und Klimaanlagen.
- Eine Textkarte bekommt niemals zusätzlich ein Badge. Dadurch werden Dopplungen
  wie `PV1` plus `1` vermieden.
- Die Nummer ist eine sichtbare Darstellungsnummer. Die interne Objekt-ID bleibt
  unverändert und steuert weiterhin Drag-and-Drop, Löschung, Historie und
  Leitungsgeometrie.

## Akzeptanzkriterien

1. Mehrere PV- und Stecker-PV-Anlagen teilen sich einen Nummernkreis.
2. BHKW und Windenergieanlagen haben jeweils eigene Nummernkreise.
3. Verbraucher und Mieterstromnutzer werden als `V1`, `V2` beziehungsweise `N1`,
   `N2` sichtbar nummeriert.
4. Nachtspeicherheizungen werden als `NSH1`, `NSH2` sichtbar nummeriert.
5. Speicher, Wallboxen, Wärmepumpen und Klimaanlagen zeigen ein separates Badge.
6. Zähler bleiben bei ihrer Textkennung `Z1`, `Z2` oder `ZN1` und erhalten kein
   zusätzliches Badge.
7. Badges verändern weder Kartenabmessungen noch Leitungsgeometrie.
8. Die Regel gilt in Editor, Vorlagen, mobilen Ansichten und PDF-Skizzen gleich.

## Warum diese Aufteilung?

Ein Text wie `PV1` kann direkt gelesen und gesucht werden. Bei einem Gerät, dessen
Karte nur ein Symbol zeigt, ist das Badge die kürzeste verständliche Ergänzung.
So bleibt die Skizze ruhig, ohne dass gleichartige Geräte verwechselt werden.
