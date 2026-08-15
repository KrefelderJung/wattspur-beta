# Wattspur – Regelwerk für Messkonzept-Hinweise

**Regelwerksstand:** `2026-08-14-beta.1`  
**Geltungsbereich:** öffentliche Beta, lokale Orientierungsskizze  
**Verbindlichkeit:** keine technische, rechtliche oder abrechnungsseitige Freigabe

Dieses Dokument beschreibt, wann Wattspur einen Prüfhinweis anzeigt. Die
Regel-IDs werden in der Anwendung, in den Tests und künftig auch im PDF-
Export verwendet. So lässt sich eine neue Regel ergänzen, ohne bestehende
Hinweise nur anhand ihres Textes suchen zu müssen.

## Hinweisstufen

| Stufe | Bedeutung in der Beta |
| --- | --- |
| `neutral` | Es liegt noch kein auswertbarer Zustand vor. |
| `ok` | Der Zustand ist formal erfasst; daraus folgt keine fachliche Freigabe. |
| `warning` | Eine fachliche Prüfung oder Abstimmung ist erforderlich. |
| `error` | Wird derzeit bewusst nicht automatisch verwendet. Ein Fehler darf erst nach fachlicher Freigabe als harte Blockade eingeführt werden. |

## Aktive Regeln

| ID | Auslöser | Stufe | Aktueller Hinweis / Zweck |
| --- | --- | --- | --- |
| `MK-DATA-001` | Das Schema enthält noch keinen Baustein. | `neutral` | Startzustand anzeigen. |
| `MK-DATA-002` | Mindestens ein Baustein ist vorhanden. | `ok` | Anzahl der erfassten Bausteine anzeigen. |
| `MK-TOPO-001` | Mindestens ein zusätzlicher Zähler ist im Zustand vorhanden. | `warning` | Zuordnung zu Anlage, Unterzähler und Messbereich prüfen. |
| `MK-ASSET-001` | Mindestens ein Speicher ist vorhanden. | `warning` | Betriebsrolle, MaStR, mögliche §14a-Relevanz und Abstimmung mit dem Netzbetreiber prüfen. |
| `MK-ASSET-002` | Eine SteuVE hat eine eingetragene Leistung über `4,2 kW`. | `warning` | §14a-EnWG-Einordnung, Anmeldung und passendes Modul prüfen. |
| `MK-ASSET-003` | Mindestens eine Nachtspeicherheizung ist vorhanden. | `warning` | Bei unbekanntem Datum oder Inbetriebnahme vor 2024 historische Tarif-/Messbedingungen berücksichtigen; ab 2024 nicht automatisch als aktuelle SteuVE behandeln. |
| `MK-SINGLE-001` | Im Modus „Gemeinsame Messung“ liegen SteuVE und weitere Verbraucher gemeinsam im Messbereich. | `warning` | Tarif- und Messabgrenzung fachlich prüfen. |
| `MK-SINGLE-002` | Mindestens eine Erzeugungsanlage ist mit eigener Erzeugungsmessung markiert. | `ok` | Kennzeichnung im Prüfstatus bestätigen. |
| `MK-SINGLE-003` | Mehr als eine Erzeugungsanlage vorhanden und keine besitzt einen eigenen Erzeugungszähler. | `warning` | Energieträger, Vergütung und Zusammenfassung prüfen. |
| `MK-PARALLEL-001` | Der Parallelmodus ist aktiv. | `ok` | Anzahl der vorbereiteten, direkt verzweigten Zähler anzeigen. |
| `MK-PARALLEL-002` | Ein vorbereiteter Parallelzweig enthält noch keinen Baustein. | `warning` | Dem betreffenden Zähler ist noch kein Messbereich zugeordnet. |

## Hinweise außerhalb der globalen Prüfliste

Einige Hinweise erscheinen absichtlich direkt am Objekt oder im Detailfenster:

- Balkonkraftwerk / Steckersolargerät: Registrierung im MaStR und die
  Voraussetzungen der vereinfachten Behandlung prüfen.
- SteuVE bis einschließlich `4,2 kW`: Die Leistung löst keinen globalen
  Warnhinweis aus; im Detailfenster bleibt aber der Hinweis bestehen, dass
  daraus nicht automatisch eine rechtliche Einordnung folgt.
- Nachtspeicherheizung: Das erkannte Regime wird zusätzlich am Objekt
  angezeigt.
- Speicher: Der ausführliche MaStR-/§14a-Hinweis wird im Detailmodus als
  Info-Element angezeigt.

Diese Objekttexte sind keine zusätzlichen Regeln. Sie erklären eine bereits
erfasste Anlage und müssen bei Änderungen der globalen Regel gemeinsam mit
diesem Dokument geprüft werden.

## Bewusste Grenzen des aktuellen Regelwerks

Noch nicht als automatische Regel umgesetzt sind insbesondere:

1. eine vollständige Prüfung von EEG-/EnFG-/EnWG-Ausnahmen,
2. die 12-Monats-Zusammenfassung von Erzeugungsanlagen,
3. verbindliche Schwellenwerte für alle Steuerbarkeits- und Tarifmodelle,
4. die rechtliche Bewertung einer konkreten Kaskade,
5. eine harte Blockade gegen fachlich unzulässige Kombinationen.

Wattspur darf in der Beta keine Genehmigung simulieren. Neue Regeln sollten
zunächst als `warning` eingeführt und erst nach fachlicher Abstimmung zu einer
anderen Stufe angehoben werden.

## Vorgehen für eine neue Regel

Für jede neue Regel werden vor der Implementierung festgehalten:

1. **Regel-ID und Kurzname**
2. **genauer Auslöser** (Felder, Werte, Modus und zeitlicher Bezug)
3. **Ausnahmen und Gegenbedingungen**
4. **Hinweisstufe**
5. **verständlicher UI-Text**
6. **fachliche Quelle und Gültigkeitsstand**
7. **mindestens ein positiver und ein negativer Testfall**

Erst wenn diese sieben Punkte geklärt sind, wird die Regel in
`js/messkonzept/rules.js` ergänzt.
