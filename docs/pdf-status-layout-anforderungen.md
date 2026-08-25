# PDF-Layout: kompakter One-Pager

## Ziel

Der PDF-Export soll als kompakter One-Pager funktionieren. Er enthält die
Messskizze, die Projektangaben und einen optionalen Freitext-Kommentar. Der
einheitliche Hinweis steht platzsparend in der Fußzeile. Prüfstatus, zusätzliche Hinweise und Objektdetails bleiben
außerhalb des reduzierten Exports. Ein sehr langer Kommentar darf auf eine
zweite Druckseite umbrechen.

## Struktur

1. Schlanke Kopfzeile mit Wattspur und Werkzeugbezeichnung
2. Messskizze
3. Projektangaben in zwei kompakten Zeilen
4. Optionaler Kommentar/Freitext
5. Kleiner Exportvermerk mit Orientierungshinweis


## Akzeptanzkriterien

- Der Konfigurator bietet genau einen PDF-Export an.
- Warnhinweis, Messskizze und Projektangaben sind enthalten.
- Ein eingegebener Kommentar/Freitext wird nach den Projektangaben ausgegeben.
- Prüfstatus, zusätzliche Hinweise und Objektdetails sind im reduzierten Export nicht enthalten.
- Die Projektangaben werden in zwei Zeilen dargestellt. Projektname, Referenz und Messkonzept stehen in der ersten Zeile. Straße und Hausnummer stehen gemeinsam mit PLZ und Ort in der zweiten Zeile.
- Die Kopfzeile bleibt im normalen Dokumentfluss. Sie darf die Projektangaben oder die Skizze nicht überdecken.
- Eine zu breite oder zu hohe Messskizze wird in der isolierten PDF-Kopie proportional auf eine sichere Druckbreite und Druckhöhe verkleinert. Die Editor-Bühne und ihre Leitungsgeometrie bleiben unverändert.
- Die technische CSS-Klasse `mk-print-status` bleibt für die UI-Kompatibilität erhalten, wird im One-Pager aber ausgeblendet.
- Der Export verwendet keine zusätzliche externe PDF-Bibliothek. Der Browserdruck erstellt weiterhin die PDF-Datei.

## Regressionstest

`tests/pdf-status-layout-test.js` prüft die Reihenfolge der Exportbausteine, den kompakten Export, die Projektzeilen, den Kommentar und die statische Kopfzeile.

`tests/pdf-object-tables-test.js` prüft, dass keine Objekttabellen in den reduzierten PDF-Export zurückkehren.
