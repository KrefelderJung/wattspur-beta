# XLSX-Import für Lastgänge

## Ziel

Der Lastgangbereich unterstützt zusätzlich zu CSV, MSCONS und Copy-and-Paste
den Import einer lokalen `.xlsx`-Datei. Der Import ist bewusst auf ein
überschaubares Format begrenzt, damit Anwender keine frei gestalteten
Arbeitsblätter erraten lassen müssen.

## Unterstütztes Format

Im ersten Tabellenblatt stehen ab Zeile 1:

| Datum | Uhrzeit | Lastgang (kW) | optional weiterer Lastgang (kW) |
| --- | --- | --- | --- |
| 01.01.2026 | 00:15 | 1,25 | 0,80 |

- Die ersten beiden Spalten heißen `Datum` und `Uhrzeit`.
- Ab der dritten Spalte stehen ein oder mehrere Lastgänge.
- Die Einheit ist standardmäßig kW. Sie kann im Spaltennamen ergänzt werden.
- Excel-Datumswerte und Uhrzeiten werden unterstützt; Textwerte im Format
  `TT.MM.JJJJ` und `HH:MM` sind ebenfalls zulässig.
- Nur das erste Tabellenblatt wird gelesen.
- Formeln, verbundene Zellen und Summenzeilen gehören nicht zum Importformat.
- Copy-and-Paste bleibt als schnelle Alternative erhalten.

## Akzeptanzkriterien

- Eine gültige XLSX-Datei erzeugt mindestens einen Lastgang.
- Mehrere Lastgang-Spalten werden als getrennte Datenreihen übernommen.
- Ungültige Zeilen werden nicht stillschweigend als gültige Messwerte behandelt.
- Ein unpassendes Arbeitsblatt erzeugt eine verständliche Fehlermeldung.
- Der Import bleibt vollständig lokal und verändert keine bestehende Importlogik.
- Die Auswahl der Einheit kann weiterhin vor der Übernahme bestätigt werden.
