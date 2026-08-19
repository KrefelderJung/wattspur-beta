# PDF-Layout: Prüfstatus und Hinweise

## Ziel

Der PDF-Export soll die wichtigsten Informationen vor der Messskizze lesbar und aufgeräumt zeigen. Die Skizze erhält danach eine eigene Seite mit möglichst viel nutzbarer Breite.

## Begriffe

Die sichtbare Überschrift lautet **Prüfstatus und Hinweise**. Sie ist für Endkunden verständlicher als der alleinstehende Begriff „Prüfstatus“. Die technische CSS-Klasse `mk-print-status` und die Export-API bleiben aus Kompatibilitätsgründen unverändert.

## Reihenfolge im Export

1. Kopfzeile mit Wattspur und Exportstand
2. Ein einheitlicher wichtiger Hinweis
3. Projektangaben
4. Prüfstatus und Hinweise über die verfügbare Breite
5. Abstimmungsnotizen, falls vorhanden
6. Messskizze auf einer neuen PDF-Seite
7. Ausführliche Objektdetails nur im Gesamtexport

## Akzeptanzkriterien

- Der erste PDF-Abschnitt nutzt die verfügbare Seitenbreite. Die Überschrift des Prüfstatus steht nicht mehr in einer schmalen linken Spalte neben einem isolierten Textblock.
- Prüfhinweise werden in einer gut lesbaren Spalte dargestellt. So bleiben Reihenfolge und Zusammenhang auch bei Schwarz-Weiß-Ausdrucken eindeutig.
- Die farbige Statusdarstellung aus dem Editor wird im PDF nicht vorausgesetzt. Jeder Eintrag erhält stattdessen ein neutrales Statuslabel wie „Hinweis 1“ oder „Info 1“.
- Die Messskizze beginnt im Drucklayout mit einem Seitenumbruch und wird nicht zwischen Projektangaben und Prüfstatus eingeschoben.
- Eine zu breite Messskizze wird in der isolierten PDF-Kopie proportional auf die sichere Druckinnenbreite (650 CSS-Pixel bei A4-Hochformat) verkleinert. Die Editor-Bühne und ihre Leitungsgeometrie bleiben unverändert.
- Skizzenexport und Gesamtexport behalten dieselbe Reihenfolge. Der Gesamtexport ergänzt seine Objektdetails nach der Skizze.
- Warnhinweis, Projektangaben, Prüfstatus und Notizen bleiben in beiden Exportvarianten erhalten.
- Die vorhandenen Exportmarker und die technische Klasse `mk-print-status` bleiben erhalten, damit bestehende Tests und Integrationen nicht brechen.
- Der Export verwendet keine zusätzliche externe PDF-Bibliothek. Der Browserdruck erstellt weiterhin die PDF-Datei.
- Objektdetails werden nach Kategorie in kompakten Tabellen dargestellt. Zähler teilen sich eine Tabelle, gleichartige Anlagen ebenfalls.
- Leere Angaben bleiben als leere Zellen sichtbar, erzeugen aber keinen eigenen Block und keine zusätzliche Überschrift.
- Die Zählertabelle enthält ausschließlich weitergaberelevante Stammdaten: Marktlokation Bezug, Marktlokation Lieferung, Messlokation, Zählernummer und Einbaudatum.
- Interne Strukturangaben wie Zählerfunktion, Messbereich und „Zähler vor“ bleiben für die Fachlogik und die Detailansicht erhalten, werden aber nicht als PDF-Tabellenspalten ausgegeben.
- Basiszähler und nachträglich eingefügte Zähler verwenden dieselbe Stammdatenquelle und dieselben Spalten.

## Regressionstest

`tests/pdf-status-layout-test.js` prüft die Reihenfolge der Exportbausteine, die sichtbare Überschrift, den Seitenumbruch der Messskizze und die breit gesetzte Statusliste.

`tests/pdf-object-tables-test.js` prüft zusätzlich die festen Zähler-Stammdatenspalten, die Ausblendung interner Strukturspalten und die Ausgabe von Stammdaten für Zusatz-Zähler.
