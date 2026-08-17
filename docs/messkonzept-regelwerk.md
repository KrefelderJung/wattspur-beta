# Wattspur – Regelwerk für Messkonzept-Hinweise

**Regelwerksstand:** `2026-08-17-beta.4`
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
| `MK-ASSET-002` | Eine SteuVE hat eine eingetragene Leistung über `4,2 kW`. | `warning` | §14a-EnWG-Einordnung, Anmeldung und passendes Modul prüfen. |
| `MK-ASSET-003` | Mindestens eine Nachtspeicherheizung ist vorhanden. | `warning` | Bei unbekanntem Datum oder Inbetriebnahme vor 2024 historische Tarif-/Messbedingungen berücksichtigen; ab 2024 nicht automatisch als aktuelle SteuVE behandeln. |
| `MK-SINGLE-001` | Im Modus „Gemeinsame Messung“ liegen SteuVE und weitere Verbraucher gemeinsam im Messbereich. | `warning` | Tarif- und Messabgrenzung fachlich prüfen. |

## Bewusst entfernte Prüf- und Komfortmeldungen

Mit Regelwerksstand `2026-08-17-beta.4` erscheinen diese sieben Meldungen
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

Erst wenn diese sieben Punkte geklärt sind, wird die Regel in
`js/messkonzept/rules.js` ergänzt.
