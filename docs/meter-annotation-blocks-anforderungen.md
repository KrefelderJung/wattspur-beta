# Zählerangaben als verschiebbare Infokarten

## Ziel

Ausgefüllte Zählerangaben sollen direkt in der Messskizze sichtbar sein,
ohne die Skizze mit wiederholten Feldüberschriften zu überladen. Die Angaben
werden in einer kleinen Infokarte zusammengefasst und bleiben über eine
gestrichelte Bezugslinie dem jeweiligen Zähler zugeordnet.

## Umfang der ersten Umsetzung

- Berücksichtigt werden Basiszähler und zusätzlich angelegte Zähler.
- Eine Infokarte erscheint nur, wenn sie eingeschaltet ist. Bei eingeschalteter
  Infobox wird mindestens eine kurze Zählerinformation angezeigt; ausgefüllte
  Zählerfelder werden ergänzt.
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
- Eine dezente Größensteuerung unten rechts erlaubt, Breite und Höhe der Karte
  mit Maus, Touch oder Stift anzupassen. Der Inhalt bricht innerhalb der
  gewählten Breite automatisch um.
- Der freie Kartenbereich dient zum Verschieben. Die Textwerte selbst bleiben
  für Doppelklick, Tastatur und Textauswahl reserviert und starten keinen Drag.
- Ein Doppelklick auf einen eingetragenen Wert öffnet dort direkt die passende
  Eingabe. Ein Doppelklick auf den freien Kartenbereich öffnet kein Fenster;
  das Objektfenster bleibt dem Klick auf das Objekt vorbehalten.
- Eingabefelder speichern beim Klick außerhalb automatisch. Enter beziehungsweise
  Strg/Cmd+Enter bei einer mehrzeiligen Bemerkung speichert ebenfalls; Escape
  verwirft die Änderung.
- Zähler und andere Objekte können im Detaildialog eine optionale Bemerkung
  mit bis zu 240 Zeichen erhalten. Die Bemerkung wird in der Karte automatisch
  umgebrochen und in der Objektübersicht berücksichtigt.
- Die Position wird relativ zur Skizzenbühne im Modell gespeichert und bleibt
  bei einem erneuten Renderlauf erhalten.
- Der Infobox-Arbeitsraum reicht mindestens bis zum unteren sichtbaren
  Editorbereich. Wird eine Karte weiter nach unten gezogen, wächst nur die
  Zeichenfläche dynamisch mit.
- Der Arbeitsraum ist in alle vier Richtungen scrollbar. Wird eine Karte nach
  links oder oben verschoben, entsteht ebenfalls eine echte Scrollfläche und
  die aktuelle Ansicht bleibt beim Erweitern stabil.
- Beim ersten Erscheinen startet eine Infokarte mit Abstand bevorzugt leicht
  oberhalb und rechts vom Zähler. Wenn am oberen Rand kein Platz ist, wird sie
  unterhalb platziert. Nach einer manuellen Verschiebung bleibt die Position
  des Nutzers maßgeblich.
- Eine gestrichelte, flexible SVG-Linie verbindet die Karte mit dem
  Mittelpunkt des zugehörigen Zählers.
- Die Karten werden im PDF-Export mit ausgegeben. Der Export berücksichtigt
  dafür die gemeinsame Inhaltsgrenze von Topologie, Leitungen und Infoboxen.
  Karten links oder oberhalb der Skizze werden nicht abgeschnitten, sondern
  die gesamte Ausgabe wird passend verschoben und zentriert.
- Die Leitungs-SVG behält im PDF ihre ursprüngliche Topologiegröße. Zusätzlicher
  Infobox-Raum darf die Leitungen weder strecken noch von den Objekten lösen.
  Topologie, Leitungen und Infoboxen erhalten denselben Export-Offset.
- Der PDF-Rahmen wird auf die sichtbaren SVG-Leitungen, Objekte und Infoboxen
  zugeschnitten. Ein kleiner Sicherheitsrand bleibt erhalten; ungenutzter
  Editor-Arbeitsraum wird nicht mit skaliert und macht die Skizze nicht unnötig
  klein.

## Akzeptanzkriterien

1. Nach Eingabe eines beliebigen Zählerfeldes erscheint genau eine Karte für
   den zugehörigen Zähler.
2. Wird die Infobox ausgeschaltet, verschwindet dessen Karte. Ohne eingegebene
   Zählerwerte erscheint bei eingeschalteter Infobox nur die kurze neutrale
   Zählerinformation.
3. Basiszähler und zusätzliche Zähler werden eindeutig unterschieden und
   zeigen keine Daten eines anderen Zählers.
4. Verschieben mit Pointer-Ereignissen verändert nur die Kartenposition und
   nicht die Messlogik, Anlagenreihenfolge oder Leitungsgeometrie.
5. Die Bezugslinie folgt der Karte während des Verschiebens und endet am
   richtigen Zähler.
6. Ein PDF enthält die Karten und Bezugslinien; leere Zähler erzeugen keine
   leere Karte.
   Die Leitungen bleiben dabei an ihren zugehörigen Objekten ausgerichtet,
   auch wenn eine Karte links oder rechts zusätzlichen Raum beansprucht.
7. Karten bleiben innerhalb der tatsächlichen Zeichenfläche. Der Arbeitsraum
   wächst bei Bedarf in alle vier Richtungen, sodass die Karte nicht am
   letzten Objekt hängen bleibt. Ihr transparenter Inhalt verdeckt
   darunterliegende Objekte nicht vollständig.
   Der Export verwendet davon nur den tatsächlich belegten Inhaltsrahmen plus
   Sicherheitsrand.
8. Die Kartengröße kann über den Griff unten rechts verändert werden, ohne
   die Position des zugehörigen Objekts oder die Leitungsgeometrie zu ändern.
9. Nur ein Doppelklick auf einen Wert startet die direkte Bearbeitung; der
   freie Kartenbereich öffnet kein Objektfenster.
10. Ein Klick außerhalb speichert die direkte Bearbeitung. Enter beziehungsweise
   Strg/Cmd+Enter speichern und Escape verwirft die Änderung.
11. Tastaturfokus und verständliche ARIA-Namen bleiben vorhanden. Der
    Größen-Griff kann mit den Pfeiltasten angepasst werden.

## Bewusste Grenzen

Die Erweiterung bleibt ein Darstellungs- und Exportbaustein. Sie verändert
keine fachlichen Zählerregeln. Die Bemerkung ist eine technische Dokumentation
des Objekts und löst keine automatische fachliche Bewertung aus. Der zusätzliche
Editor-Arbeitsraum wird nicht als Leerraum in den PDF-Export übernommen. Der
Export wird auf die gemeinsame tatsächliche Skizzen- und Infobox-Fläche
zugeschnitten, einschließlich negativer linker und oberer Koordinaten.
