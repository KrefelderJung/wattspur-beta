# Infobox-Sichtbarkeit für Messobjekte

## Ziel

Jedes Messobjekt kann eine ergänzende Infobox anzeigen. Die Infobox ist eine
reine Darstellungshilfe und darf weder Objekt, Zuordnung noch Leitungsgeometrie
verändern.

## Akzeptanzkriterien

- Jede Infobox besitzt oben rechts eine kleine `×`-Schaltfläche.
- `×` blendet ausschließlich die betreffende Infobox aus. Das Objekt bleibt
  unverändert; die `×`-Schaltfläche am Objekt löscht weiterhin das Objekt.
- Im Objektfenster gibt es für jedes Objekt und den HAK den Schalter
  `Infobox anzeigen`.
- Der Schalter steht kompakt neben der Objektüberschrift in der Kopfzeile.
- Das Einschalten stellt nur tatsächlich eingetragene oder bewusst
  ausgewählte technische Angaben wieder her. Automatische Objektarten,
  Standardwerte und offene Platzhalter werden nicht wiederholt. Gibt es keine
  solchen Angaben, wird keine leere Karte gerendert.
- Neue Objekte starten mit ausgeschalteter Infobox. Eine eingetragene Bemerkung
  schaltet die Karte automatisch ein, damit der Text nicht unbemerkt bleibt.
- Freitext und alle übrigen Objektangaben bleiben beim Ausblenden erhalten.
- Die Sichtbarkeit wird im laufenden Projektzustand, in Undo/Redo und im PDF-Export
  berücksichtigt. Eine dauerhafte Speicherung über einen Browser-Neustart hinweg
  ist nicht Teil dieser Funktion.
- Der PDF-Export übernimmt ausschließlich sichtbare Infoboxen.
- Die Regel gilt einheitlich für Zähler, Erzeugungsanlagen, Speicher,
  Wallbox, Wärmepumpe, Verbraucher, Mieterstromobjekte und HAK.
- Die Steuerung funktioniert per Maus, Touch/Stift und Tastatur und besitzt
  eine verständliche Beschriftung für Screenreader.
- Bei der direkten Bearbeitung eines Infoboxwerts beendet ein Klick außerhalb
  des Feldes die Bearbeitung und übernimmt den Inhalt. Enter bestätigt
  weiterhin, Escape verwirft die Änderung.
- Das Aktivieren oder Deaktivieren einer Infobox darf die Positionen der
  Messobjekte und Leitungen nicht verändern.
- Die Zeichenfläche darf durch wiederholte Infobox-Aktualisierungen nicht
  wachsen. Zusätzlicher Arbeitsraum wird nur erzeugt, wenn eine Infobox
  bewusst außerhalb der bisherigen Topologie verschoben oder vergrößert wird.
- Das wiederholte Umschalten einer Infobox muss höhenstabil und idempotent sein.

## Nicht-Ziele

- Das Ausblenden einer Infobox löscht keine Eingaben.
- Das Ausblenden einer Infobox verschiebt keine Objekte und ändert keine
  Leitungen.
- Die Funktion ersetzt nicht die fachliche Prüfstatus-Logik.
