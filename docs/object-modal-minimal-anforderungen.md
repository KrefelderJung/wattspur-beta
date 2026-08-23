# Anforderungen: Kompakte Objektangaben

## Ziel

Der Objekt-Dialog soll Installateuren und technisch weniger erfahrenen Nutzern
die wichtigsten Eingaben ruhig und eindeutig zeigen, ohne wiederholte
Objektkarten oder technische Nebeninformationen.

## Akzeptanzkriterien

- Die Kopfzeile enthält nur den eindeutigen Kontext, zum Beispiel `Z1 · Zähler`,
  `Hausanschlusskasten` oder `PV1 · Erzeugungsanlage`, sowie zwei klar getrennte
  Aktionen: `✓ Fertig` und `×`.
- `✓ Fertig` schließt den Dialog. Die Eingaben werden bereits während der
  Bearbeitung gespeichert; die Aktion ist deshalb keine nachträgliche
  Transaktionsbestätigung.
- `✓ Fertig` und `×` haben als gleichrangige Kopfzeilenaktionen dieselbe runde
  Grundform. Farbe und Symbol unterscheiden die Funktionen.
- `×`, `Esc` und ein Klick außerhalb schließen den Dialog ebenfalls. Keine dieser
  Aktionen verwirft bereits eingegebene Werte.
- Die zusätzliche Kennzeichnung `OBJEKTANGABEN` und die wiederholte Objektkarte
  im Dialog entfallen.
- Der technische Hinweis zur lokalen Speicherung sowie der untere
  `Schließen`-Button entfallen aus dem Objekt-Dialog.
- Der Dialog lässt sich weiterhin über `×`, `Esc` und Klick auf den freien
  Außenbereich schließen.
- Hinweise werden nur im fachlich passenden Fall gerendert. Der HAK-Hinweis
  zur Transformator-Darstellung erscheint ausschließlich bei Mittelspannung.
- Das Feld `Zählernummer` verwendet eine Zahlen-Tastatur und begrenzt die
  Eingabe auf höchstens elf Stellen.
- Im Zählerdialog stehen `Marktlokation Bezug` und `Marktlokation Lieferung`
  in einer gemeinsamen Reihe.
- `Messlokation` bleibt als eigene breite Angabe lesbar. `Zählernummer` und
  `Einbaudatum` stehen in einer gemeinsamen Reihe.
- Das Freitextfeld `Bemerkung` bleibt als letzte, breite Zeile erhalten.
- Auf Smartphone- und Tabletbreite fallen die zweispaltigen Reihen auf eine
  Spalte zurück.
- Die bestehende Objekt- und Messlogik sowie die Leitungsgeometrie bleiben
  unverändert.

## Technische Leitplanken

- Formulare bleiben in den bestehenden Renderer-Modulen.
- Die Modal-Schließlogik bleibt zentral in `interaction.js`.
- Palette- und andere Hilfsdialoge behalten ihren eigenen Footer, sofern sie
  ihn weiterhin benötigen.
