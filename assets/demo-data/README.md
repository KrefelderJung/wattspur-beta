# Demo-Datensatz: KIT + SINTEF

`kit-sintef-jahresvergleich-2021-15min.csv` ist eine transparente Vergleichsdatei für Wattspur. Sie enthält zwei getrennte Lastgänge auf einer gemeinsamen 15‑Minuten-Zeitachse:

- **KIT ESHL Wohnbereich (kW):** gemessener Gesamtverbrauch des Wohnbereichs aus dem KIT-Energy-Smart-Home-Lab.
- **SINTEF COFACTOR Haus 6730 (kW):** stündlicher Strombezug eines realen norwegischen Einfamilienhauses, für die Darstellung auf 15 Minuten vervierfacht.

## Wichtige Einordnung

Der KIT-Datensatz ist **kein Jahresdatensatz**. Er umfasst ungefähr drei Monate (03.03.–31.05.2020) mit 15‑Minuten-Mittelwerten und enthält kurze Lücken. In der Vergleichsdatei wurden die KIT-Zeitstempel deshalb nur für die Vergleichsansicht auf das Kalenderjahr 2021 übertragen; die übrigen Monate bleiben leer. Das ist eine Kalenderprojektion, keine künstliche Ergänzung zu einem gemessenen KIT-Jahr.

Der SINTEF-Datensatz enthält für Haus 6730 ein vollständiges Jahr 2021 mit 8.760 Stunden. Jeder gültige Stundenwert `ElImp` (Wh/h) wurde als mittlere Leistung interpretiert und in kW umgerechnet (`Wh/h ÷ 1000`). Anschließend wurde derselbe Stundenwert für die vier zugehörigen 15‑Minuten-Intervalle verwendet. 25 fehlende Stunden bleiben als leere Werte erhalten.

## Einheiten und Zeit

- Alle Werte in der CSV sind **kW**.
- Die Zeitachse ist eine eindeutige, lokale 15‑Minuten-Kalenderachse für 2021 ohne doppelte oder ungültige Sommerzeitstunde. Dadurch kann Wattspur die Datei mit seinem aktuellen Datum/Uhrzeit-Import zuverlässig einlesen.
- Die Originaldaten wurden mit ihren Zeitinformationen ausgewertet: KIT liefert Zeitstempel mit wechselndem UTC‑Offset (+01:00/+02:00); SINTEF dokumentiert lokale CET-Zeit (+01:00). Die für die Vergleichsansicht vorgenommene Kalenderprojektion ist hier bewusst dokumentiert.

## Quellen und Rechte

1. KIT, *Electrical consumption data from a three months living lab experiment in the Energy Smart Home Lab*, DOI **10.35097/898**, CC BY 4.0:  
   https://radar.kit.edu/radar/de/dataset/fKAxkDGPEOVNoLBW
2. SINTEF, *COFACTOR Residential Dataset 3* und Beschreibung:  
   https://www.sintef.no/en/publications/publication/10343281/  
   https://data.sintef.no/product/dp-b750d103-a434-45c2-ba5e-1af13f0a866f

Die CSV ist eine abgeleitete Demonstrationsdatei. Die Originalquellen, ihre Lizenzen und die oben beschriebene Transformation müssen bei einer Weitergabe zusammen mit der Datei genannt werden. Die Datei liegt lokal im Wattspur-Projekt; wegen der Projektregel `*.csv` wird sie nicht automatisch in Git eingecheckt.
