# Speicher: §14a-Modulabfrage

## Ziel

Bei einem Batteriespeicher soll die maximale Ladeleistung als mögliche
steuerbare Verbrauchsleistung berücksichtigt werden.

## Akzeptanzkriterien

- Bei einer Ladeleistung von mehr als 4,2 kW erscheint im Speicher-Dialog die
  Auswahl `§14a-Modul`.
- Die Auswahl enthält dieselben Moduloptionen wie bei anderen steuerbaren
  Verbrauchseinrichtungen.
- Die eingetragene Ladeleistung wird im Prüfstatus der zugehörigen Messgruppe
  berücksichtigt.
- Bei genau 4,2 kW oder darunter erscheint keine Schwellenabfrage.
- Fehlt die Ladeleistung, wird keine automatische Einstufung vorgenommen.
- Die Anzeige bleibt ein fachlicher Hinweis und ersetzt keine Abstimmung mit
  Netzbetreiber oder Messstellenbetreiber.

## Annahme zur Eingabe

Die Formulierung `0,2 kW` wurde als Tippfehler verstanden. Für die §14a-
Schwellenprüfung ist hier `4,2 kW` gemeint. Falls tatsächlich 0,2 kW gemeint
waren, wird die Schwelle nicht erreicht.
