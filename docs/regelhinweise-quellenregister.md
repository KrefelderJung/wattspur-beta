# Wattspur – Quellenregister für fachliche Regelhinweise

**Stand der Quellenprüfung:** `2026-08-26`  
**Geltungsbereich:** öffentliche Beta, Orientierung und Prüfhinweise  
**Verbindlichkeit:** keine technische, rechtliche oder abrechnungsseitige Freigabe

Dieses Register verbindet fachlich kritische Prüfhinweise mit den offiziellen
Quellen, die bei der Formulierung berücksichtigt wurden. Die Links sind eine
Nachschlagemöglichkeit für Nutzer und Entwickler. Sie ersetzen keine Prüfung
des konkreten Netzanschlusses, Förderwegs, Messkonzepts oder Liefervertrags.

## Prüfkriterien

- Quellen stammen für Rechts- und Netzregeln aus offiziellen Stellen oder dem
  amtlichen Gesetzesportal.
- Aussagen im Prüfstatus bleiben vorsichtig: „prüfen“, „kann“ und „mit dem
  Netzbetreiber abstimmen“ sind beabsichtigt.
- Ein Quellenlink ist kein Beleg dafür, dass ein konkreter Anspruch erfüllt ist.
- Die Anwendung prüft nicht automatisch, ob sich eine Rechtslage geändert hat.
  Das Prüfdatum dient als Anlass für eine erneute fachliche Durchsicht.

## Quellenmatrix

<!-- source-register:start -->
| Regel-ID | Themenbereich | Offizielle Quelle | Zweck der Quelle |
| --- | --- | --- | --- |
| `MK-ASSET-002` | §14a EnWG, 4,2-kW-Schwelle und Heizstab | [BNetzA: betroffene Anlagen und Dimm-Regelungen](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/BetroffeneAnlagen_table.html) | Einordnung steuerbarer Verbrauchseinrichtungen und Gesamtleistung einschließlich Zusatz-/Notheizung |
| `MK-ASSET-004` | Bestandsanlagen vor 01.01.2024 | [BNetzA: Integration steuerbarer Verbrauchseinrichtungen](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500) | Übergangs- und Bestandsregeln; keine automatische Zuordnung durch Wattspur |
| `MK-ASSET-005` | Stecker-PV, Wechselrichtergrenze | [BNetzA: Solaranlagen und Steckersolargeräte](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/Solaranlagen/Balkon_table.html) | 800 VA Wechselrichterleistung und Zusammenrechnung hinter einer Entnahmestelle |
| `MK-ASSET-006` | Vermarktungsform größerer Erzeugungsanlagen | [BNetzA: EEG-Förderung](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/EEG_Foerderung/start.html) und [EEG §21](https://www.gesetze-im-internet.de/eeg_2014/__21.html) | Orientierung zu Einspeisevergütung, Ausfallvergütung und Vermarktungsprüfung |
| `MK-ASSET-008` | iMSys und Steuerung ab mehr als 7 kW | [BNetzA: Mess- und Zählwesen](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/NetzzugangMesswesen/Mess-undZaehlwesen/start.html) und [MsbG §30](https://www.gesetze-im-internet.de/messbg/__30.html) | Rollout- und Preisobergrenzen; konkrete Ausstattung entscheidet der Messstellenbetreiber |
| `MK-ASSET-009` | Marktstammdatenregister bei Stecker-PV | [BNetzA: Solaranlagen und Steckersolargeräte](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/Solaranlagen/Balkon_table.html) | Registrierungspflicht und vereinfachte Meldung innerhalb der Leistungsgrenzen |
| `MK-STEUVE-001` | §14a-Anmeldung und Energietarif | [BNetzA: §14a-EnWG-Informationen](https://www.bundesnetzagentur.de/enwg14a) | Trennung von Netzsteuerung/Netzentgelt und Lieferantentarif |
| `MK-KWK-001` | KWK-Zulassung und mögliche Vergütung | [BAFA: Merkblatt KWK-Anlagen](https://www.bafa.de/SharedDocs/Downloads/DE/Energie/kwk_anlagen_mb_zulassung.pdf?__blob=publicationFile&v=4) und [BAFA: elektronisches Anzeigeverfahren](https://www.bafa.de/SharedDocs/Downloads/DE/Energie/kwk_anlagen_50kw_mb_elektronisches_anzeigeverfahren.pdf?__blob=publicationFile&v=2) | Zulassungsvoraussetzung und vereinfachtes Verfahren bis 50 kWel |
| `MK-KWK-002` | KWK-Erzeugungs- und Einspeisemessung | [KWKG §4](https://www.gesetze-im-internet.de/kwkg_2016/__4.html) und [BAFA: Merkblatt KWK-Anlagen](https://www.bafa.de/SharedDocs/Downloads/DE/Energie/kwk_anlagen_mb_zulassung.pdf?__blob=publicationFile&v=4) | Messbarkeit und Vermarktungsweg nur als Prüfhinweis, nicht als automatische Zähleranforderung |
| `MK-NSH-001` | Nachtspeicherheizung und neue SteuVE | [BNetzA: Bestandsanlagen und §14a EnWG](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500) | Fortgeltung alter Regelungen und Abstimmungsbedarf bei gemischter Messung |
| `MK-MISC-ENFG-022` | Wärmepumpenprivilegierung | [EnFG §22](https://www.gesetze-im-internet.de/enfg/__22.html) | Eigener Zählpunkt als gesetzliche Voraussetzung für die Umlageverringerung |
<!-- source-register:end -->

## Pflegeprozess

Vor jeder Veröffentlichung mit Änderungen an Regeltexten oder Regel-URLs:

1. Quelle öffnen und prüfen, ob sie erreichbar ist und noch den genannten
   Sachverhalt beschreibt.
2. Quellenstand und Formulierung im Regelwerk aktualisieren.
3. Den automatisierten Quellenregister-Test und den Gesamttest ausführen.
4. Erst danach veröffentlichen. Bei einer nicht erreichbaren Quelle bleibt die
   Regel zwar technisch aktiv, wird aber als fachlich prüfbedürftig behandelt.

