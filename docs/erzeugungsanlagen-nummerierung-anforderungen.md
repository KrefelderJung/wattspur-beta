# Nummerierung von Erzeugungsanlagen

## Ziel

Die sichtbare Kennung soll die Anlagenart verständlich machen. Jede fachliche
Anlagenart erhält deshalb einen eigenen Nummernkreis. Steckersolar bleibt für
Endkunden als PV erkennbar und teilt den PV-Nummernkreis.

## Regeln

| Interner Typ | Sichtbare Kennung | Nummernkreis |
| --- | --- | --- |
| `PV` | `PV1`, `PV2` | PV |
| `Balkonkraftwerk` | `PV1`, `PV2` | gemeinsam mit PV |
| `KWK` | `BHKW1`, `BHKW2` | BHKW |
| `Wind` | `WE1`, `WE2` | Windenergieanlage |

Beim Wechsel der Anlagenart wird eine automatisch vergebene Kennung in den
neuen Nummernkreis übertragen. Eine PV1, die zu einem BHKW geändert wird, wird
also zu BHKW1 oder zur nächsten freien BHKW-Nummer. Manuell eingetragene
Bezeichnungen werden nicht ungefragt überschrieben.

## Akzeptanzkriterien

1. PV und Steckersolar werden gemeinsam fortlaufend nummeriert.
2. Ein BHKW beginnt unabhängig von vorhandenen PV-Anlagen mit BHKW1.
3. Eine Windenergieanlage beginnt unabhängig mit WE1.
4. Beim Umschalten eines automatisch benannten Objekts entsteht keine
   doppelte Kennung.
5. Die Kennung bleibt in Editor, Skizze, Detailansicht und PDF konsistent.
6. Die Nummerierungslogik bleibt frei von DOM- und Geometriecode.

Der Regressionstest liegt in `tests/erzeugungsanlagen-nummerierung-test.js`.
