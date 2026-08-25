# Anforderungen: Browserübergreifender PDF-Export

## Ziel

Der PDF-Button muss in Firefox und Edge den nativen Druckdialog erreichen. Die
PNG-Ausgabe bleibt ein eigener Exportpfad und darf durch die PDF-Reparatur nicht
verändert werden.

## Akzeptanzkriterien

- Der PDF-Aufruf erzeugt keinen JavaScript-Fehler.
- `window.print()` wird aufgerufen.
- Die Druckseite wird vor dem Druck in das Dokument eingesetzt.
- PNG- und PDF-Logik verwenden keine nicht gemeinsam definierten Variablen.
- Der Regressionstest läuft im browserfreien Testpaket.

## Technische Ursache des behobenen Fehlers

Die PDF-Funktion hatte versehentlich auf `clone` aus dem PNG-Export zugegriffen.
Diese Variable existiert nur in `downloadImage()`. Dadurch wurde der PDF-Aufruf
vor `window.print()` mit `ReferenceError: clone is not defined` abgebrochen.