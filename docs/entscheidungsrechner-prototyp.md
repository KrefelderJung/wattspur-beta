# Wirtschaftlichkeits-Check für Messkonzepte

## Zweck

Der Wirtschaftlichkeits-Check ist ein freiwilliger Beta-Prototyp. Er vergleicht
eine mögliche separate Messung mit frei eingegebenen Kosten und Vorteilen. Er
ist keine Tarifzusage, keine Genehmigung und keine Investitionsentscheidung.

## Eingaben

- einmalige Gesamtkosten für Umbau und zusätzlichen Zähler
- jährliches Messentgelt
- Jahresverbrauch der Wärmepumpe oder Wallbox
- Arbeitspreis des gemeinsamen Zählers in Cent je Kilowattstunde
- Arbeitspreis des Wärmepumpen- oder Wallboxtarifs in Cent je Kilowattstunde
- Modul 1 als frei eingetragene pauschale Reduzierung pro Jahr
- Modul 2 als Netzentgelt-Arbeitspreis in Cent je Kilowattstunde
- Auswahl, ob Modul 1, Modul 2 oder beide Varianten verglichen werden
- optionale Wärmepumpenprivilegierung nach § 22 EnFG

## Berechnung

Die einmaligen Gesamtkosten werden als ein Betrag eingegeben. Die gemeinsame
Messung wird mit dem Arbeitspreis des gemeinsamen Zählers und Modul 1
gerechnet. Die separate Messung wird mit dem eingetragenen Wärmepumpen- oder
Wallboxtarif, dem jährlichen Messentgelt und dem gewählten 14a-Modul
gerechnet. Dadurch ist der Tarifvorteil klar vom Netzentgeltvorteil getrennt.
Modul 2 wird mit 60 Prozent des eingetragenen Netzentgelt-Arbeitspreises
gerechnet. Der Break-even ist erreicht, sobald die kumulierten Kosten der
separaten Messung unter denen der gemeinsamen Messung liegen.

Die optionale Wärmepumpenprivilegierung verwendet für die Orientierung die
Summe aus KWKG-Umlage und Offshore-Netzumlage. Im Prototyp sind für 2026
0,446 ct/kWh KWKG und 0,941 ct/kWh Offshore, zusammen 1,387 ct/kWh,
hinterlegt. Diese Werte sind zeitabhängig und keine Zusage. Die Voraussetzung
eines eigenen Zählpunkts und die konkrete Abwicklung müssen geprüft werden.

Der Graph zeigt die kumulierten Kosten beider Varianten. Die gemeinsame
Messung startet ohne Umbaukosten. Die separate Messung startet mit den
einmaligen Kosten und berücksichtigt die jährlichen Kosten mit Modul 1 oder
Modul 2. Für die Break-even-Spanne werden die variablen Vorteile um 20 Prozent
nach unten und oben variiert.

## Bewusste Grenzen

Die voreingestellten Arbeitspreise sind grobe Demo-Näherungen. Der Prototyp
kennt keine Grundpreise, Lieferantenangebote, örtlichen Konzessionsabgaben,
Förderungen, Steuerwirkungen oder technischen Anschlusskosten. Er ist keine
Abrechnung der EEG-, KWKG-, Offshore- oder sonstigen Umlagen. Negative oder
fehlende Jahresersparnisse werden ausdrücklich als nicht amortisiert angezeigt.
Die Eingabewerte müssen mit Lieferant, Netzbetreiber und Fachbetrieb geprüft
werden. Die fachlichen Bezugspunkte sind die [BNetzA-Übersicht zu § 14a
EnWG](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/Netzentgelt_table.html),
§ [22 EnFG](https://www.gesetze-im-internet.de/enfg/__22.html), die
[BNetzA-FAQ zum EnFG](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/EnFG_AufsichtUmlagepflichten/artikel.html),
[BNetzA-Monitoringbericht 2025](https://data.bundesnetzagentur.de/Bundesnetzagentur/SharedDocs/Mediathek/Monitoringberichte/MonitoringberichtEnergie2025.pdf),
[Verivox-Wärmepumpenstrom 2026](https://www.verivox.de/heizstrom/waermepumpenstrom-preisentwicklung/),
die [KWKG-Umlage](https://www.bundesnetzagentur.de/SharedDocs/A_Z_Glossar/K/KWKG_Umlage.html?nn=689064)
und die [Offshore-Netzumlage](https://bundesnetzagentur.de/SharedDocs/A_Z_Glossar/O/Offshore-Netzumlage.html?nn=689064).
