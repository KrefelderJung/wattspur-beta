# Anforderungen: Importformat und Fußzeile der Lastgang-Einstiegsseite

## Ziel

Der Import-Hinweis soll für CSV und XLSX das gemeinsame Grundschema kurz und
verständlich erklären. Die Einstiegsseite des Lastgang-Tools muss außerdem
dieselben rechtlichen Direktlinks wie die übrigen öffentlichen Seiten zeigen.

## Akzeptanzkriterien

- Der Dialog erklärt einmal gemeinsam: Datum, Uhrzeit und Lastgang ab Spalte 3.
- CSV wird als Semikolon-Format oder Copy-and-Paste beschrieben.
- XLSX wird auf das erste Tabellenblatt begrenzt erklärt.
- Die Hinweise enthalten keine doppelte CSV-/Excel-Erklärung mit widersprüchlichen
  Beispielen.
- Die Einstiegsseite zeigt Kontakt, Impressum, Datenschutz und Lizenz.
- Die Links bleiben auch über den stabilen Pfad `/lastganganalyse/` erreichbar.
