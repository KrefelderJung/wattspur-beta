# PDF-Export: vorgeschlagener Dateiname

## Ziel

Beim Öffnen des nativen Browser-Druckdialogs soll ein verständlicher
Dateiname vorgeschlagen werden. Dafür setzt der Export den Dokumenttitel
vorübergehend auf die angegebene Straße und Hausnummer.

## Anforderungen

- Der Vorschlag verwendet Straße und Hausnummer in dieser Reihenfolge.
- Problematische Dateinamenzeichen werden durch Leerzeichen ersetzt.
- Fehlt die Adresse vollständig, wird `Wattspur-Messkonzept` verwendet.
- Die Einstellung ist nur ein Vorschlag des Browsers. Der Anwender kann den
  Dateinamen im Druckdialog weiterhin ändern.
- Nach dem Druck wird der ursprüngliche Seitentitel wiederhergestellt.

## Abnahmekriterien

1. `Musterstraße` und `21` ergeben den Vorschlag `Musterstraße 21`.
2. Sonderzeichen wie `/`, `:` und `?` gelangen nicht in den Dateinamen.
3. Ohne Straße und Hausnummer wird der Fallback verwendet.
4. Der PDF-Export bleibt lokal und nutzt weiterhin den Browser-Druckdialog.
