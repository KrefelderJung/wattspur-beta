# Synthetischer Lastgang eines energieintensiven Produktionsbetriebs

`synthetischer-energieintensiver-produktionsbetrieb-2021-15min.csv` ist ein eigenständig erzeugter Demo-Lastgang für Kapazitäts- und Spitzenlasttests in Wattspur.

## Profil

Die Simulation bildet einen produzierenden Betrieb mit ab:

- hoher werktäglicher Produktionslast im Drei-Schicht-Betrieb,
- einer dauerhaft vorhandenen Grundlast außerhalb der Schichten,
- Kälte-, Druckluft- und Pumpenverbrauch,
- geplanten Lastwechseln zum Schichtbeginn,
- seltenen, deutlich höheren Prozessspitzen,
- reduziertem Verbrauch während einer kurzen Wartungsperiode.

Die Datei enthält 35.040 Viertelstundenwerte für 2021. Alle Werte sind mittlere Leistungen in **kW**.

## Spalten

- `Produktion Grundlast (kW)` – laufende Produktionslast ohne zusätzliche Einzelspitzen
- `Kälte Druckluft Pumpen (kW)` – technische Nebenaggregate
- `Prozessspitzen (kW)` – seltene, kurzzeitige Zusatzlasten
- `Gesamtlast Produktionsbetrieb (kW)` – Summe der drei vorgenannten Spalten

Die Prozessspitzen sind absichtlich nicht geglättet. Dadurch kann das Verhalten einer Kapazitätsgrenze, eines Quantils oder einer Jahresdauerlinie anschaulich getestet werden.

## Grenzen

Dieser Datensatz ist eine **synthetische Funktionsdemo**. Er stellt keinen bestimmten realen Betrieb dar und darf nicht für Netzanschluss, Abrechnung, Dimensionierung oder betriebliche Entscheidungen verwendet werden.
