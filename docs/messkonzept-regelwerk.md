# Wattspur – Regelwerk für Messkonzept-Hinweise

**Regelwerksstand:** `2026-08-22-beta.16`
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
| `info` | Eine optionale Angabe fehlt. Sie verbessert die spätere Einordnung, blockiert aber keine Skizze. |

## Sichtbare Kennungen für Erzeugungsanlagen

Die sichtbare Kurzkennung hilft auch ungeübten Nutzern, Anlagen im Schema
schnell zu unterscheiden. Die interne Auswahl bleibt davon getrennt, damit
Regeln und gespeicherte Konzepte stabil bleiben:

| Interner Typ | Sichtbare Art | Beispielkennung |
| --- | --- | --- |
| `PV` | PV | `PV1` |
| `KWK` | BHKW | `BHKW1` |
| `Wind` | Windenergieanlage | `WE1` |
| `Balkonkraftwerk` | PV | nächster freier `PV…`-Wert |

Bei der letzten Zeile bleibt die technische Unterscheidung im Detailhinweis
„Balkonkraftwerk / Steckersolargerät“ erhalten. PV und Steckersolar teilen sich
einen Nummernkreis. BHKW und Windenergieanlagen beginnen dagegen jeweils mit
der eigenen Nummer 1.

### Eigene Nummernfolge für Mieterstromzähler

Mieterstromzähler werden sichtbar mit `ZN1`, `ZN2`, `ZN3` usw. bezeichnet.
Diese Folge beginnt unabhängig von den aktiven Netz- und Zusatz-Zählern. Ein
Mieterstromzähler erhöht deshalb nicht die nächste reguläre Kennung `Z…`.
Die internen Objekt-IDs und Detaildaten bleiben davon getrennt, damit bereits
gespeicherte Skizzen kompatibel bleiben. Die Kennung wird zentral in
`js/messkonzept/identifiers.js` erzeugt und von Skizze, Editor und PDF genutzt.

## Aktive Regeln

| ID | Auslöser | Stufe | Aktueller Hinweis / Zweck |
| --- | --- | --- | --- |
| `MK-ASSET-001` | Mindestens ein Speicher ist vorhanden. | `warning` | Betriebsrolle, Netzeinspeisung, Netzbezug zum Laden, MaStR, mögliche §14a-Relevanz und Abstimmung mit dem Netzbetreiber prüfen. |
| `MK-ASSET-002` | Eine SteuVE oder ein Speicher hat eine maßgebliche Leistung über `4,2 kW`. Bei einer Wärmepumpe wird die elektrische Leistung einschließlich Zusatz- oder Notheizvorrichtung wie Heizstab betrachtet. Bei einem Speicher zählt die maximale Ladeleistung. | `warning` | §14a-EnWG-Einordnung, technische Eignung neuer Anlagen ab 01.01.2024, Anmeldung und passendes Modul prüfen. |
| `MK-ASSET-003` | Mindestens eine Nachtspeicherheizung ist vorhanden. | `warning` | Bei unbekanntem Datum oder Inbetriebnahme vor 2024 historische Tarif-/Messbedingungen berücksichtigen; ab 2024 nicht automatisch als aktuelle SteuVE behandeln. |
| `MK-ASSET-004` | Eine SteuVE hat ein Inbetriebnahmedatum vor dem `01.01.2024`. | `warning` | Die Anwendung ordnet sie nicht automatisch dem neuen §14a-Regime zu. Ein Wechsel kann nach technischer Vorbereitung durch einen konzessionierten Elektrofachbetrieb und Bestätigung der Voraussetzungen durch den Netzbetreiber möglich sein. |
| `MK-ASSET-005` | Eine Stecker-PV überschreitet am selben Netzanschlusspunkt zusammen mit weiteren Stecker-PV-Anlagen 800 VA Wechselrichterleistung. | `error` | Die vereinfachte Stecker-PV-Behandlung ist mit dieser Leistung nicht automatisch anwendbar. Wechselrichterleistung, Zuordnung und technische Anschlussbedingungen prüfen. Bei fehlender Angabe erscheint zunächst ein `warning`. |
| `MK-ASSET-006` | Eine Erzeugungsanlage hat mehr als 100 kW beziehungsweise 100 kWp eingetragene Nennleistung. | `warning` | Bei PV und Wind ist die Vermarktungsform für eingespeisten Strom zu prüfen; häufig wird ein Direktvermarkter benötigt. Bei KWK mit mehr als 100 kW elektrischer KWK-Leistung ist Direktvermarktung oder Eigenverbrauch erforderlich. |
| `MK-ASSET-007` | Bei einer Erzeugungsanlage, SteuVE oder Nachtspeicherheizung fehlt das optionale Inbetriebnahmedatum. | `info` | Die Angabe hilft bei späteren Bestandsregeln und fachlichen Folgehinweisen. |
| `MK-ASSET-008` | Eine Erzeugungsanlage überschreitet 7 kW beziehungsweise 7 kWp installierte Leistung. | `info` | Nach dem Messstellenbetriebsgesetz ist grundsätzlich ein intelligentes Messsystem vorgesehen. Eine zusätzliche Steuerungseinrichtung kann erforderlich sein; der Messstellenbetreiber klärt den Einbau. |
| `MK-ASSET-009` | Mindestens eine Stecker-PV-Anlage ist vorhanden. | `info` | Registrierung innerhalb eines Monats im Marktstammdatenregister. Innerhalb der vereinfachten Leistungsgrenzen entfällt die separate Meldung beim Netzbetreiber. |
| `MK-STEUVE-001` | Eine Wärmepumpe oder Wallbox liegt in einem eigenen Messpunkt. | `info` | §14a-Anmeldung beim Netzbetreiber und Energietarif beim gewählten Energieversorger getrennt prüfen. |
| `MK-KWK-001` | Mindestens eine KWK- beziehungsweise BHKW-Anlage ist vorhanden. | `info` | Für eine mögliche KWKG-Vergütung die Zulassung beziehungsweise Anzeige beim BAFA prüfen. Förderzeitraum, Inbetriebnahme, Größe und Betriebsweise können die Voraussetzungen beeinflussen. Der Prüfstatus verlinkt die offiziellen BAFA-Informationen. |
| `MK-KWK-002` | Eine KWK-Anlage hat keinen aktivierten eigenen Erzeugungszähler. | `info` | Erzeugungs- und Einspeisemessung sowie die konkrete Zählerzuordnung für eine mögliche KWKG-Abrechnung und Vollbenutzungsstunden prüfen. |
| `MK-NSH-001` | Nachtspeicherheizung und neue SteuVE ab dem 01.01.2024 liegen am selben Messpunkt. | `info` | Alte Bestandsregelungen und neue §14a-Regeln können unterschiedliche Netzentgeltregime bedeuten. Gemeinsame Messung mit Netzbetreiber und Messstellenbetreiber abstimmen. |
| `MK-SINGLE-001` | Im Modus „Gemeinsame Messung“ liegen SteuVE und weitere Verbraucher gemeinsam im Messbereich. | `warning` | Tarif- und Messabgrenzung fachlich prüfen. |

**Quelle für `MK-ASSET-005`:** Die [Bundesnetzagentur nennt 800 VA als maximale Wechselrichterleistung](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/Solaranlagen/Balkon_table.html)
für die Sonderregelungen von Steckersolargeräten und weist darauf hin, dass
mehrere Geräte hinter derselben Entnahmestelle zusammengerechnet werden. Die
Anwendung verwendet deshalb VA, nicht kVA. Das ist ein Orientierungshinweis
und keine automatische Anschluss- oder EEG-Entscheidung.

**Quelle für `MK-ASSET-002`:** Die [Bundesnetzagentur beschreibt Wärmepumpen ausdrücklich einschließlich Zusatz- oder Notheizvorrichtungen wie Heizstäben](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/BetroffeneAnlagen_table.html). Für die §14a-Einordnung ist dort eine Netzanschlussleistung von mehr als 4,2 kW genannt. Die Anwendung übernimmt diese Information als Orientierung und ersetzt keine Prüfung durch Netzbetreiber oder Fachbetrieb.

**Quelle für `MK-ASSET-004`:** Die [Bundesnetzagentur erläutert die Übergangsregeln für vor dem 01.01.2024 in Betrieb genommene Bestandsanlagen und den möglichen freiwilligen Wechsel in die netzorientierte Steuerung](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500). Wattspur macht daraus keine automatische Rechtsentscheidung, sondern einen Prüfhinweis.

**Quelle für `MK-ASSET-008`:** § 29 MsbG nennt für Anlagen mit einer installierten
Leistung von mehr als 7 kW sowie für §14a-Verbrauchseinrichtungen die Ausstattung
mit einem intelligenten Messsystem und einer Steuerungseinrichtung. Die
[Bundesnetzagentur erläutert den Rollout für EEG- und KWKG-Anlagen über 7 kW](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/NetzzugangMesswesen/Mess-undZaehlwesen/start.html).
Die Anwendung unterscheidet dabei zwischen moderner Messeinrichtung, iMSys und
Steuerungseinrichtung. Sie behauptet nicht, dass der Anlagenbetreiber die
Steuerbox selbst beschaffen oder montieren muss.

**Quelle für `MK-ASSET-009`:** Die [Bundesnetzagentur bestätigt die
Registrierungspflicht im Marktstammdatenregister](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/Solaranlagen/Balkon_table.html).
Für Steckersolargeräte innerhalb der gesetzlichen Leistungsgrenzen entfällt
seit dem Solarpaket die separate Meldung beim Netzbetreiber. Die Anlage muss
trotzdem im Marktstammdatenregister registriert werden. Die Anwendung trifft
damit keine Aussage über die Einhaltung der übrigen technischen
Anschlussbedingungen.

**Quellen und Grenzen für `MK-KWK-001` und `MK-KWK-002`:** Das [BAFA-Merkblatt
zu KWK-Anlagen](https://www.bafa.de/SharedDocs/Downloads/DE/Energie/kwk_anlagen_mb_zulassung.pdf?__blob=publicationFile&v=4)
beschreibt die Zulassung als Voraussetzung für einen KWK-Zuschlag und verweist
auf das elektronische Anzeigeverfahren für neue Anlagen bis 50 kWel. Das
[KWKG 2025](https://www.gesetze-im-internet.de/kwkg_2016/BJNR249810015.html)
definiert Vollbenutzungsstunden und verlangt für bestimmte Abrechnungen Angaben
zum erzeugten sowie zum nicht in das Netz der allgemeinen Versorgung
eingespeisten KWK-Strom. Wattspur leitet daraus nur einen Prüfhinweis zur
Messbarkeit ab. Ob ein Erzeugungszähler, ein Einspeisezähler oder eine
Kaskade erforderlich ist, hängt vom konkreten Förderfall und der technischen
Abrechnung ab und muss abgestimmt werden.

### 4,2 kW, 7 kW und 01.01.2024 nicht verwechseln

Die 4,2-kW-Grenze gehört zur Einordnung steuerbarer Verbrauchseinrichtungen
nach § 14a EnWG. Für neue Anlagen ab dem 01.01.2024 muss die technische
Eignung für netzorientierte Steuerung sichergestellt werden. Bei Wärmepumpen
zählt die elektrische Gesamtleistung einschließlich Heizstab.

Die 7-kW-Grenze in `MK-ASSET-008` betrifft dagegen die Ausstattung der
Messstelle bei Erzeugungsanlagen nach dem Messstellenbetriebsgesetz. Sie ist
keine zusätzliche §14a-Grenze und auch keine pauschale Aussage, dass jede PV-
oder BHKW-Anlage selbst eine Steuerbox kaufen muss.

### Begriffe und Kosten

Eine **moderne Messeinrichtung (mME)** ist ein digitaler Zähler ohne
Kommunikationsmodul. Ein **intelligentes Messsystem (iMSys)** besteht aus der
mME und einem Smart-Meter-Gateway. Eine **Steuerungseinrichtung oder Steuerbox**
ist eine zusätzliche Komponente für die sichere Steuerung am Netzanschlusspunkt.
„NIS“ ist dafür nicht die übliche Fachabkürzung.

Die jährlichen Preisobergrenzen des MsbG sind von einmaligen Umbau- oder
Anschlusskosten zu unterscheiden. Für bestimmte Leistungsbereiche können
zusätzliche Kostenanteile für die Steuerungseinrichtung gelten. Die konkrete
Abrechnung hängt von Messstellenbetreiber, Netzanschluss und Anlage ab und wird
im Konfigurator deshalb nicht als fester Eurobetrag behauptet. Maßgeblich sind
der aktuelle [§ 30 MsbG mit den Preisobergrenzen](https://www.gesetze-im-internet.de/messbg/__30.html)
und die Auskunft des zuständigen Messstellenbetreibers.

### Zuordnung zu einem Zähler und Summierung

Die Regelprüfung verwendet dieselbe Zuordnung wie die Messskizze. Eine Anlage
mit `meterId` gehört zu diesem Zusatz-Zähler. Anlagen ohne Zusatz-Zähler werden
dem Basiszähler ihres Messbereichs zugeordnet. SteuVE, die hinter demselben
Zähler liegen, werden zu einer Messgruppe zusammengefasst. Ihre eingetragenen
Leistungen werden addiert. So werden beispielsweise eine Wärmepumpe mit 2,6 kW
und eine Klimaanlage mit 2,6 kW gemeinsam mit 5,2 kW bewertet. Sobald die Summe
über 4,2 kW liegt, erscheint ein Hinweis zur Einordnung nach §14a EnWG.

Fehlt bei einer Anlage die Leistung, wird sie nicht stillschweigend als 0 kW
gerechnet. Die Prüfgruppe bleibt trotzdem sichtbar und kann dadurch später um
den fehlenden Wert ergänzt werden. Die Zuordnung und Summierung ist in
`getSteuveMeasurementGroups()` gekapselt und wird durch den Regressionstest
`tests/steuve-total-power-test.js` abgesichert.

Bei einem Batteriespeicher wird die maximale Ladeleistung in dieselbe
Messpunktprüfung einbezogen. Liegt sie über 4,2 kW, erscheint die §14a-
Modulabfrage im Objekteditor und die Leistung wird im Prüfstatus berücksichtigt.
Die Anzeige ist ein fachlicher Prüfhinweis und ersetzt keine Abstimmung mit
Netzbetreiber oder Messstellenbetreiber.

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

## Darstellung der Hinweise

Fachliche Warnungen und Prüfhinweise erscheinen einheitlich im zentralen
Prüfstatus. Objekteditor und Detailansicht bleiben auf Eingabefelder,
Feldbeschriftungen und kurze technische Eingabehilfen beschränkt. So wird eine
Regel nicht mehrfach an verschiedenen Objekten erklärt und der Nutzer erhält
die wichtigsten Hinweise an einer Stelle.

Die technische Eingabe bleibt davon getrennt: Zum Beispiel erfasst das
Detailfenster bei einer Wärmepumpe die Gesamtleistung einschließlich Heizstab,
und beim Speicher werden Netzeinspeisung und Netzbezug zum Laden separat
ausgewählt. Die daraus entstehenden fachlichen Prüfungen laufen im
Prüfstatus.

### Vermarktungsform bei großen Erzeugungsanlagen

`MK-ASSET-006` wird erst bei einer Leistung **über** 100 kW beziehungsweise
100 kWp ausgelöst. Genau 100 kW/kWp löst keinen Grenzwert-Hinweis aus. Die
Anwendung liest dafür das Feld „Nennleistung“ und nicht die
Wechselrichterleistung. Bei PV und Wind wird vorsichtig formuliert, weil die
konkrete Vermarktungsform zusätzlich von Förderweg, Betriebsweise und weiteren
Voraussetzungen abhängt. Bei KWK gilt die elektrische KWK-Leistung als Bezug.

Die [Bundesnetzagentur beschreibt die EEG-Einspeisevergütung für Solaranlagen
bis 100 kW](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/EEG_Foerderung/start.html).
§ 21 EEG regelt die Einspeisevergütung und die begrenzte Ausfallvergütung für
größere Anlagen ([Gesetze im Internet](https://www.gesetze-im-internet.de/eeg_2014/__21.html)).
Für KWK-Anlagen mit mehr als 100 kW elektrischer KWK-Leistung nennt § 4 KWKG
Direktvermarktung oder Eigenverbrauch als zulässige Wege
([Gesetze im Internet](https://www.gesetze-im-internet.de/kwkg_2016/__4.html)).
Diese Quellen dienen der Orientierung und ersetzen keine Prüfung des konkreten
Anschlusses, Förderwegs oder Vermarktungsvertrags.

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
