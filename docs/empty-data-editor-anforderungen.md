# Anforderungen: Leerer Start im Dateneditor

## Ziel

Der Start über „Dateneditor“ soll einen wirklich leeren Lastgang öffnen. Das
Eingaberaster darf weiterhin leere Viertelstundenzeilen anbieten, diese Zeilen
sind aber keine Messwerte.

## Akzeptanzkriterien

- Der Startdatensatz enthält `data: []`, `totalRowsCount: 0` und
  `invalidRowsCount: 0`.
- Statistik und Datenqualität zählen leere Eingabezeilen nicht als Messpunkte.
- Bei leerem Start zeigt die Statistik keine scheinbare Datenqualität von
  100 %, sondern „Noch keine Messwerte“.
- Sommer-/Winterzeit und der 29. Februar werden erst bei echten Zeitstempeln
  bewertet. Der Referenztag des leeren Editors ist kein Messpunkt.
- Das Eingaberaster bleibt für Copy-and-Paste und manuelle Eingaben verfügbar.

## Nicht-Ziel

Die fachliche Behandlung echter Zeitreihen, insbesondere Zeitumstellungen und
Schaltjahre, wird durch diese Änderung nicht verändert.
