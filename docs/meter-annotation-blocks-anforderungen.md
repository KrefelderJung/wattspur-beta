# Zählerangaben als verschiebbare Infokarten

## Ziel

Ausgefüllte Zählerangaben sollen direkt in der Messskizze sichtbar sein,
ohne die Skizze mit wiederholten Feldüberschriften zu überladen. Die Angaben
werden in einer kleinen Infokarte zusammengefasst und bleiben über eine
gestrichelte Bezugslinie dem jeweiligen Zähler zugeordnet.

## Umfang der ersten Umsetzung

- Berücksichtigt werden Basiszähler und zusätzlich angelegte Zähler.
- Eine Infokarte erscheint nur, wenn mindestens ein Zählerfeld ausgefüllt ist.
- Sichtbar sind nur die eingegebenen Werte in einer festen Reihenfolge:
  Marktlokation Bezug, Marktlokation Lieferung, Messlokation, Zählernummer,
  Einbaudatum und optional die Bemerkung.
- Die Karten erhalten keine sichtbaren Feldüberschriften und wiederholen den
  Zählernamen nicht. Die Verbindungslinie liefert den Kontext; der Name bleibt
  für Barrierefreiheit im ARIA-Label erhalten.
- Der Karteninhalt bleibt transparent, damit darunterliegende Objekte und
  Leitungen sichtbar bleiben.
- Die Kartenbreite passt sich dem Inhalt an. Sehr lange Werte werden innerhalb
  einer begrenzten Maximalbreite umgebrochen.
- Karten können mit Maus, Touch oder Stift verschoben werden.
- Der freie Kartenbereich dient zum Verschieben. Die Textwerte selbst bleiben
  für Doppelklick, Tastatur und Textauswahl reserviert und starten keinen Drag.
- Ein Doppelklick auf einen eingetragenen Wert öffnet dort direkt die passende
  Eingabe. Ein Doppelklick auf den freien Kartenbereich öffnet kein Fenster;
  das Objektfenster bleibt dem Klick auf das Objekt vorbehalten.
- Eingabefelder können mit Enter beziehungsweise Strg/Cmd+Enter bei einer
  mehrzeiligen Bemerkung gespeichert und mit Escape verworfen werden.
- Zähler und andere Objekte können im Detaildialog eine optionale Bemerkung
  mit bis zu 240 Zeichen erhalten. Die Bemerkung wird in der Karte automatisch
  umgebrochen und in der Objektübersicht berücksichtigt.
- Die Position wird relativ zur Skizzenbühne im Modell gespeichert und bleibt
  bei einem erneuten Renderlauf erhalten.
- Beim ersten Erscheinen startet eine Infokarte mit Abstand bevorzugt leicht
  oberhalb und rechts vom Zähler. Wenn am oberen Rand kein Platz ist, wird sie
  unterhalb platziert. Nach einer manuellen Verschiebung bleibt die Position
  des Nutzers maßgeblich.
- Eine gestrichelte, flexible SVG-Linie verbindet die Karte mit dem
  Mittelpunkt des zugehörigen Zählers.
- Die Karten werden im PDF-Export mit ausgegeben.

## Akzeptanzkriterien

1. Nach Eingabe eines beliebigen Zählerfeldes erscheint genau eine Karte für
   den zugehörigen Zähler.
2. Werden alle Werte eines Zählers gelöscht, verschwindet dessen Karte.
3. Basiszähler und zusätzliche Zähler werden eindeutig unterschieden und
   zeigen keine Daten eines anderen Zählers.
4. Verschieben mit Pointer-Ereignissen verändert nur die Kartenposition und
   nicht die Messlogik, Anlagenreihenfolge oder Leitungsgeometrie.
5. Die Bezugslinie folgt der Karte während des Verschiebens und endet am
   richtigen Zähler.
6. Ein PDF enthält die Karten und Bezugslinien; leere Zähler erzeugen keine
   leere Karte.
7. Karten bleiben innerhalb der sichtbaren Skizzenbühne und überdecken den
   Zähler nicht automatisch. Ihr transparenter Inhalt verdeckt darunterliegende
   Objekte nicht vollständig.
8. Nur ein Doppelklick auf einen Wert startet die direkte Bearbeitung; der
   freie Kartenbereich öffnet kein Objektfenster.
9. Enter beziehungsweise Strg/Cmd+Enter speichern und Escape verwirft die
   direkte Bearbeitung.
10. Tastaturfokus und ein verständlicher ARIA-Name bleiben vorhanden.

## Bewusste Grenzen

Die Erweiterung bleibt ein Darstellungs- und Exportbaustein. Sie verändert
keine fachlichen Zählerregeln. Die Bemerkung ist eine technische Dokumentation
des Objekts und löst keine automatische fachliche Bewertung aus.
