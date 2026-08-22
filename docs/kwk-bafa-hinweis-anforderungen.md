# Anforderungen: KWK/BHKW-Hinweise im Prüfstatus

**Stand:** 2026-08-19  
**Regelwerk:** `2026-08-22-beta.16`

## Ziel

Wenn eine KWK-Anlage beziehungsweise ein BHKW im Messkonzept erfasst ist,
soll der zentrale Prüfstatus verständlich auf zwei Punkte hinweisen:

1. Eine mögliche Vergütung nach dem Kraft-Wärme-Kopplungsgesetz (KWKG) setzt
   grundsätzlich eine Zulassung beziehungsweise Anzeige beim BAFA voraus.
2. Für die Abrechnung der erzeugten und eingespeisten KWK-Arbeit sowie der
   förderfähigen Vollbenutzungsstunden kann eine getrennte Erzeugungs- und
   Einspeisemessung relevant sein. Die konkrete Zähleranordnung ist mit
   Netzbetreiber, Messstellenbetreiber und Fachbetrieb abzustimmen.

Die Hinweise sind keine automatische Förderzusage und keine verbindliche
Festlegung eines Messkonzepts. Förderzeitraum, Inbetriebnahme, Anlagengröße,
Betriebsweise und weitere Voraussetzungen können Ausnahmen begründen.

## Regelkennungen

| ID | Auslöser | Stufe | Zweck |
| --- | --- | --- | --- |
| `MK-KWK-001` | Mindestens eine Erzeugungsanlage mit `energyCarrier: KWK` | `info` | BAFA-Zulassung beziehungsweise Anzeige für eine mögliche KWKG-Vergütung prüfen; offizieller BAFA-Link wird angezeigt. |
| `MK-KWK-002` | KWK-Anlage ohne aktivierten eigenen Erzeugungszähler (`generationMeter !== true`) | `info` | Erzeugungs- und Einspeisemessung sowie Zählerzuordnung für mögliche KWKG-Abrechnung prüfen. |

## Akzeptanzkriterien

- Eine KWK-Anlage löst `MK-KWK-001` genau einmal aus, auch wenn mehrere
  KWK-Anlagen vorhanden sind.
- `MK-KWK-001` enthält einen offiziellen BAFA-Link zum Merkblatt zur
  Zulassung von KWK-Anlagen.
- Eine KWK-Anlage ohne Erzeugungszähler löst zusätzlich `MK-KWK-002` aus.
- Eine KWK-Anlage mit `generationMeter: true` löst `MK-KWK-002` nicht aus.
- PV, Wind, Verbraucher, SteuVE und Speicher lösen diese KWK-Regeln nicht aus.
- Der Wortlaut verwendet „prüfen“ und vermeidet eine automatische Aussage,
  dass jede Anlage zwingend eine Förderung erhält oder jede konkrete
  Zähleranordnung gesetzlich vorgeschrieben ist.
- Die Hinweise erscheinen ausschließlich im zentralen Prüfstatus und werden
  nicht zusätzlich im Objekteditor ausgegeben.

## Fachliche Quellen

- [BAFA: Merkblatt KWK-Anlagen, Zulassung und Stromvergütung](https://www.bafa.de/SharedDocs/Downloads/DE/Energie/kwk_anlagen_mb_zulassung.pdf?__blob=publicationFile&v=3)
- [BAFA: elektronisches Anzeigeverfahren für neue KWK-Anlagen bis 50 kWel](https://www.bafa.de/SharedDocs/Downloads/DE/Energie/kwk_anlagen_50kw_mb_elektronisches_anzeigeverfahren.html?nn=1465576)
- [KWKG 2025, Gesetze im Internet](https://www.gesetze-im-internet.de/kwkg_2016/BJNR249810015.html)

Das KWKG definiert unter anderem Vollbenutzungsstunden und verlangt für
bestimmte Abrechnungsangaben die Mengen des erzeugten KWK-Stroms sowie die
nicht in das Netz der allgemeinen Versorgung eingespeisten Mengen. Daraus
folgt für Wattspur nur ein Prüfhinweis zur Messbarkeit. Die konkrete
Abrechnung und Messanordnung bleibt eine fachliche Abstimmung.
