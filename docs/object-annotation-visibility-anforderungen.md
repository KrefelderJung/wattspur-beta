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
- Das Einschalten stellt die Infobox wieder her, sobald für das Objekt
  anzuzeigende Angaben vorhanden sind.
- Freitext und alle übrigen Objektangaben bleiben beim Ausblenden erhalten.
- Die Sichtbarkeit wird im laufenden Projektzustand, in Undo/Redo und im PDF-Export
  berücksichtigt. Eine dauerhafte Speicherung über einen Browser-Neustart hinweg
  ist nicht Teil dieser Funktion.
- Der PDF-Export übernimmt ausschließlich sichtbare Infoboxen.
- Die Regel gilt einheitlich für Zähler, Erzeugungsanlagen, Speicher,
  Wallbox, Wärmepumpe, Verbraucher, Mieterstromobjekte und HAK.
- Die Steuerung funktioniert per Maus, Touch/Stift und Tastatur und besitzt
  eine verständliche Beschriftung für Screenreader.
- Bei der direkten Bearbeitung eines Infoboxwerts steht ein grünes
  Bestätigungshäkchen zur Verfügung. Enter bestätigt weiterhin, Escape verwirft
  die Änderung.

## Nicht-Ziele

- Das Ausblenden einer Infobox löscht keine Eingaben.
- Das Ausblenden einer Infobox verschiebt keine Objekte und ändert keine
  Leitungen.
- Die Funktion ersetzt nicht die fachliche Prüfstatus-Logik.
