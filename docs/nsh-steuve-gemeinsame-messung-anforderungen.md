# Anforderungen: Nachtspeicherheizung und neue SteuVE am selben Messpunkt

**Stand:** 2026-08-19  
**Regel:** `MK-NSH-001`

## Ziel

Wenn eine Nachtspeicherheizung und eine neuere steuerbare
Verbrauchseinrichtung, zum Beispiel eine Wärmepumpe oder Wallbox, am selben
Zähler liegen, soll der Prüfstatus kurz auf die unterschiedliche zeitliche
Einordnung hinweisen.

Die Bundesnetzagentur erklärt, dass für Nachtspeicherheizungen die bisherigen
Regelungen fortgelten. Neue steuerbare Verbrauchseinrichtungen ab dem
01.01.2024 werden dagegen nach den aktuellen §14a-Regeln behandelt. Daraus
folgt für Wattspur kein automatisches Verbot, aber ein begründeter Hinweis,
die gemeinsame Messung nicht ungeprüft zu übernehmen.

## Auslöser

- Mindestens ein Objekt `type: nsh` und mindestens ein Objekt `type: steuve`
  liegen am selben Messpunkt.
- Die SteuVE hat ein Inbetriebnahmedatum ab dem 01.01.2024 oder noch kein
  auswertbares Datum. Bei einem fehlenden Datum wird die zeitliche Einordnung
  ausdrücklich als offen bezeichnet.
- Die Zuordnung verwendet denselben Zähler- oder Zonenbezug wie die übrigen
  Prüfregeln.

## Hinweistext und Stufe

Der Hinweis erscheint als `info`, nicht als technische Sperre:

> Eine Nachtspeicherheizung und eine neue steuerbare Verbrauchseinrichtung
> werden am selben Messpunkt erfasst. Für Nachtspeicherheizungen gelten
> bisherige Bestandsregelungen fort, während für neue SteuVE ab dem 01.01.2024
> die aktuellen §14a-Regeln gelten. Diese gemeinsame Messung kann
> unterschiedliche Netzentgeltregelungen vermischen und sollte deshalb vorab
> mit Netzbetreiber und Messstellenbetreiber abgestimmt werden.

Damit wird nicht behauptet, dass jede gemeinsame Messung unzulässig ist. Der
Hinweis soll nur verhindern, dass eine alte Nachtspeicherregelung unbemerkt
auf eine neue SteuVE übertragen wird.

## Akzeptanzkriterien

- NSH plus neue SteuVE am gleichen Zähler oder in derselben Basiszone löst
  `MK-NSH-001` genau einmal aus.
- NSH plus SteuVE mit Datum vor dem 01.01.2024 löst diese neue Regel nicht
  aus. Die vorhandene Bestandsregel bleibt davon unberührt.
- Fehlt das Datum der SteuVE, erscheint der Hinweis mit dem Zusatz, dass die
  zeitliche Einordnung offen ist.
- NSH und SteuVE an unterschiedlichen Messpunkten lösen die Regel nicht aus.
- Der Hinweis erscheint ausschließlich im zentralen Prüfstatus.

## Quelle

[Bundesnetzagentur: Integration steuerbarer Verbrauchseinrichtungen,
Bestandsanlagen und Nachtspeicherheizungen](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500)

Die Quelle bestätigt, dass Nachtspeicherheizungen dauerhaft unter den bisher
geltenden Regelungen bleiben, während neue steuerbare Verbrauchseinrichtungen
ab dem 01.01.2024 den neuen Vorgaben unterliegen. Die konkrete Zähler- und
Abrechnungsvariante muss weiterhin mit den zuständigen Stellen abgestimmt
werden.
