# Synthetischer Demo-Jahreslastgang

`synthetischer-haushalt-pv-wallbox-waermepumpe-2021-15min.csv` wurde vollständig für Wattspur erzeugt. Die Datei enthält **keine kopierten Originalmesswerte** und verweist bewusst nicht auf KIT, SINTEF oder andere Datensätze.

## Enthaltene Kurven

- Haushalt
- Photovoltaik
- Wallbox
- Wärmepumpe
- Gesamtlast
- Netzbezug nach PV
- Netzeinspeisung

Alle Werte sind mittlere Leistungen in **kW** auf einer durchgängigen 15‑Minuten-Achse für das Jahr 2021. Die Gesamtlast ist:

`Haushalt + Wallbox + Wärmepumpe`

Der Netzbezug nach PV und die Netzeinspeisung werden mathematisch als getrennte positive Größen berechnet:

`Netzbezug = max(0, Gesamtlast − PV)`  
`Netzeinspeisung = max(0, PV − Gesamtlast)`

Die Profile enthalten typische, bewusst vereinfachte Muster: Morgen- und Abendspitzen im Haushalt, höhere Heizlast im Winter, PV-Erzeugung am Tag mit saisonaler Schwankung und unregelmäßige Wallbox-Ladevorgänge.

## Zweck und Grenzen

Diese Datei ist für Demo, UI-Tests, Aggregation, Diagramme und Kapazitätslogik gedacht. Sie ist **kein Messdatensatz**, keine Prognose und nicht für Abrechnung, Netzplanung oder technische Dimensionierung geeignet.

Die Werte wurden mit einem festen Zufallsstartwert erzeugt. Dadurch bleiben sie bei einer erneuten Generierung reproduzierbar, ohne dass reale Kundendaten enthalten sind.
