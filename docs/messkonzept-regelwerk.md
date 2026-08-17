# Wattspur – Regelwerk für Messkonzept-Hinweise

**Regelwerksstand:** `2026-08-17-beta.7`
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
| `error` | Ein Grenzwert oder unvollständiger Zustand muss vor der weiteren fachlichen Nutzung geprüft werden. Die Beta bleibt dabei editierbar und blockiert keine Eingabe technisch. |

## Sichtbare Kennungen für Erzeugungsanlagen

Die sichtbare Kurzkennung hilft auch ungeübten Nutzern, Anlagen im Schema
schnell zu unterscheiden. Die interne Auswahl bleibt davon getrennt, damit
Regeln und gespeicherte Konzepte stabil bleiben:

| Interner Typ | Sichtbare Art | Beispielkennung |
| --- | --- | --- |
| `PV` | PV | `PV1` |
| `KWK` | BHKW | `BHKW2` |
| `Wind` | Windenergieanlage | `WE3` |
| `Balkonkraftwerk` | PV | `PV4` |

Bei der letzten Zeile bleibt die technische Unterscheidung im Detailhinweis
„Balkonkraftwerk / Steckersolargerät“ erhalten. So bleibt die Oberfläche kurz,
ohne die fachlich relevante Einordnung zu verlieren.

## Aktive Regeln

| ID | Auslöser | Stufe | Aktueller Hinweis / Zweck |
| --- | --- | --- | --- |
| `MK-ASSET-001` | Mindestens ein Speicher ist vorhanden. | `warning` | Betriebsrolle, Netzeinspeisung, Netzbezug zum Laden, MaStR, mögliche §14a-Relevanz und Abstimmung mit dem Netzbetreiber prüfen. |
| `MK-ASSET-002` | Eine SteuVE hat eine Netzanschlussleistung über `4,2 kW`. Bei einer Wärmepumpe wird die elektrische Leistung einschließlich Zusatz- oder Notheizvorrichtung wie Heizstab betrachtet. | `warning` | §14a-EnWG-Einordnung, Anmeldung und passendes Modul prüfen. |
| `MK-ASSET-003` | Mindestens eine Nachtspeicherheizung ist vorhanden. | `warning` | Bei unbekanntem Datum oder Inbetriebnahme vor 2024 historische Tarif-/Messbedingungen berücksichtigen; ab 2024 nicht automatisch als aktuelle SteuVE behandeln. |
| `MK-ASSET-004` | Eine SteuVE hat ein Inbetriebnahmedatum vor dem `01.01.2024`. | `warning` | Die Anwendung ordnet sie nicht automatisch dem neuen §14a-Regime zu. Ein Wechsel kann nach technischer Vorbereitung durch einen konzessionierten Elektrofachbetrieb und Bestätigung der Voraussetzungen durch den Netzbetreiber möglich sein. |
| `MK-ASSET-005` | Eine Stecker-PV überschreitet am selben Netzanschlusspunkt zusammen mit weiteren Stecker-PV-Anlagen 800 VA Wechselrichterleistung. | `error` | Die vereinfachte Stecker-PV-Behandlung ist mit dieser Leistung nicht automatisch anwendbar. Wechselrichterleistung, Zuordnung und technische Anschlussbedingungen prüfen. Bei fehlender Angabe erscheint zunächst ein `warning`. |
| `MK-SINGLE-001` | Im Modus „Gemeinsame Messung“ liegen SteuVE und weitere Verbraucher gemeinsam im Messbereich. | `warning` | Tarif- und Messabgrenzung fachlich prüfen. |

**Quelle für `MK-ASSET-005`:** Die [Bundesnetzagentur nennt 800 VA als maximale Wechselrichterleistung](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/Solaranlagen/Balkon_table.html)
für die Sonderregelungen von Steckersolargeräten und weist darauf hin, dass
mehrere Geräte hinter derselben Entnahmestelle zusammengerechnet werden. Die
Anwendung verwendet deshalb VA, nicht kVA. Das ist ein Orientierungshinweis
und keine automatische Anschluss- oder EEG-Entscheidung.

**Quelle für `MK-ASSET-002`:** Die [Bundesnetzagentur beschreibt Wärmepumpen ausdrücklich einschließlich Zusatz- oder Notheizvorrichtungen wie Heizstäben](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/BetroffeneAnlagen_table.html). Für die §14a-Einordnung ist dort eine Netzanschlussleistung von mehr als 4,2 kW genannt. Die Anwendung übernimmt diese Information als Orientierung und ersetzt keine Prüfung durch Netzbetreiber oder Fachbetrieb.

**Quelle für `MK-ASSET-004`:** Die [Bundesnetzagentur erläutert die Übergangsregeln für vor dem 01.01.2024 in Betrieb genommene Bestandsanlagen und den möglichen freiwilligen Wechsel in die netzorientierte Steuerung](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500). Wattspur macht daraus keine automatische Rechtsentscheidung, sondern einen Prüfhinweis.

### Zuordnung zu einem Zähler und Summierung

Die Regelprüfung verwendet dieselbe Zuordnung wie die Messskizze. Eine Anlage
mit `meterId` gehört zu diesem Zusatz-Zähler. Anlagen ohne Zusatz-Zähler werden
dem Basiszähler ihres Messbereichs zugeordnet. SteuVE, die hinter demselben
Zähler liegen, werden zu einer Messgruppe zusammengefasst. Ihre eingetragenen
Leistungen werden addiert. So werden beispielsweise eine Wärmepumpe mit 2,6 kW
und eine Raumkühlung mit 2,6 kW gemeinsam mit 5,2 kW bewertet. Sobald die Summe
über 4,2 kW liegt, erscheint ein Hinweis zur Einordnung nach §14a EnWG.

Fehlt bei einer Anlage die Leistung, wird sie nicht stillschweigend als 0 kW
gerechnet. Die Prüfgruppe bleibt trotzdem sichtbar und kann dadurch später um
den fehlenden Wert ergänzt werden. Die Zuordnung und Summierung ist in
`getSteuveMeasurementGroups()` gekapselt und wird durch den Regressionstest
`tests/steuve-total-power-test.js` abgesichert.

### Bestandsanlagen vor 2024

Bei einer SteuVE mit Inbetriebnahme vor dem 01.01.2024 erscheint ein eigener
Hinweis. Wattspur behauptet nicht, dass die Anlage automatisch dem neuen
§14a-Regime unterliegt. Es weist darauf hin, dass ein Wechsel möglich sein
kann, wenn ein konzessionierter Elektrofachbetrieb die technische Vorbereitung
auf Steuerbarkeit ausführt und der zuständige Netzbetreiber die Voraussetzungen
bestätigt. Das Datum `01.01.2024` ist eine Prüfschwelle für die Orientierung und
keine automatische Genehmigungsentscheidung.

## Bewusst entfernte Prüf- und Komfortmeldungen

Mit Regelwerksstand `2026-08-17-beta.7` erscheinen diese sieben Meldungen
nicht mehr im Prüfstatus:

- `MK-DATA-001`: leerer Messbereich
- `MK-DATA-002`: Anzahl der Bausteine im Schema
- `MK-TOPO-001`: zusätzliche Zähler
- `MK-PARALLEL-001`: vorbereitete Parallelmessung
- `MK-PARALLEL-002`: noch leerer Parallelzweig
- `MK-SINGLE-002`: eigene Erzeugungsmessung
- `MK-SINGLE-003`: mehrere Erzeugungsanlagen ohne Erzeugungszähler

Diese Informationen bleiben aus der aktiven Prüfliste entfernt, weil sie keine
für den Nutzer notwendige Handlungsempfehlung liefern. Die fachliche Prüfung
erfolgt weiterhin über die verbleibenden, konkreten Warnhinweise.

## Hinweise außerhalb der globalen Prüfliste

Einige Hinweise erscheinen absichtlich direkt am Objekt oder im Detailfenster:

- Balkonkraftwerk / Steckersolargerät: Registrierung im MaStR und die
  Voraussetzungen der vereinfachten Behandlung prüfen.
- SteuVE bis einschließlich `4,2 kW`: Die Leistung löst keinen globalen
  Warnhinweis aus; im Detailfenster bleibt aber der Hinweis bestehen, dass
  daraus nicht automatisch eine rechtliche Einordnung folgt.
- Wärmepumpe: Das Detailfenster erfasst eine elektrische Gesamtleistung
  einschließlich Heizstab oder Zusatzheizung. Dieser Gesamtwert wird für die
  Orientierung nach §14a EnWG gegen 4,2 kW geprüft.
- Nachtspeicherheizung: Das erkannte Regime wird zusätzlich am Objekt
  angezeigt.
- Speicher: Der ausführliche MaStR-/§14a-Hinweis wird im Detailmodus als
  Info-Element angezeigt.
- Speicher: Die Auswahl „Netzeinspeisung“ und „Netzbezug zum Laden“ wird im
  Detailfenster getrennt erfasst. Bei „Nein“ und „Nein“ wird die Betriebsweise
  als reiner PV-Überschussbetrieb bezeichnet. Das setzt voraus, dass tatsächlich
  ausschließlich erneuerbarer Strom geladen wird.

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

Für Speicher ist insbesondere die Unterscheidung zwischen reinem EE-Betrieb
und Mischbetrieb wichtig. Die Anwendung ersetzt keine Prüfung der aktuellen
Vermarktungs- und Messregeln. Als fachliche Ausgangspunkte dienen die
[Clearingstelle zur Graustrombeladung](https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/181),
die [Bundesnetzagentur zu Speichern und EEG-Förderung](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/Solaranlagen/Nutzung_table.html)
und die [Bundesnetzagentur zur Marktintegration von Speichern und Ladepunkten](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/EEG_Aufsicht/MiSpeL/artikel.html).

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

Für die §14a-Leistungsgrenze existieren ein positiver Fall mit 4,3 kW
elektrischer Gesamtleistung einschließlich Heizstab sowie ein negativer
Grenzfall mit genau 4,2 kW. Die Anwendung liefert daraus nur einen
Orientierungshinweis.

Erst wenn diese sieben Punkte geklärt sind, wird die Regel in
`js/messkonzept/rules.js` ergänzt.
