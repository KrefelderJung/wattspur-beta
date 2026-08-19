# Anforderungen: Hinweis zu intelligentem Messsystem und Steuerung

**Stand:** 19.08.2026  
**Geltungsbereich:** zentrale Prüfstatus-Hinweise im Messkonzept-Konfigurator  
**Verbindlichkeit:** Orientierung, keine Anschluss- oder Rechtsentscheidung

## Ziel

Wattspur soll verständlich darauf hinweisen, wenn bei einer Anlage die
Ausstattung der Messstelle mit einem intelligenten Messsystem und einer
Steuerungseinrichtung geprüft werden muss. Der Hinweis erscheint ausschließlich
im zentralen Prüfstatus. Objektkarten und PDF-Detailfelder werden dadurch nicht
mit langen Rechtshinweisen überladen.

## Fachliche Abgrenzung

1. **Steuerbare Verbrauchseinrichtungen nach § 14a EnWG**
   Neue steuerbare Verbrauchseinrichtungen mit mehr als 4,2 kW
   Netzanschlussleistung, die ab dem 01.01.2024 in Betrieb gehen, müssen für
   die netzorientierte Steuerung technisch geeignet sein. Bei Wärmepumpen wird
   die elektrische Gesamtleistung einschließlich Heizstab betrachtet. Die
   konkrete Mess- und Steuertechnik wird mit Messstellenbetreiber und
   Netzbetreiber abgestimmt.
2. **Erzeugungsanlagen über 7 kW**
   Für EEG- und KWKG-Anlagen mit mehr als 7 kW installierter Leistung sieht das
   Messstellenbetriebsgesetz grundsätzlich ein intelligentes Messsystem vor.
   Am Netzanschlusspunkt kann zusätzlich eine Steuerungseinrichtung erforderlich
   sein. Der Messstellenbetreiber klärt den Einbau und den konkreten Ablauf.
   Die 7-kW-Grenze ist nicht dasselbe wie die 4,2-kW-Grenze nach § 14a EnWG.
3. **Begriffe**
   „NIS“ ist für diesen Zusammenhang nicht die übliche Bezeichnung. Gemeint
   ist in der Regel ein **intelligentes Messsystem (iMSys)**. Es besteht aus
   einer modernen Messeinrichtung und einem Smart-Meter-Gateway. Die
   **Steuerungseinrichtung beziehungsweise Steuerbox** ist eine zusätzliche
   Komponente und nicht mit dem iMSys gleichzusetzen.

## Akzeptanzkriterien

- Eine Erzeugungsanlage mit genau 7 kW beziehungsweise 7 kWp löst keinen
  7-kW-Hinweis aus.
- Eine Erzeugungsanlage mit mehr als 7 kW beziehungsweise 7 kWp löst genau
  einen zentralen Info-Hinweis `MK-ASSET-008` aus.
- PV, Windenergie und KWK/BHKW werden geprüft. Eine Verbraucheranlage oder ein
  Speicher löst diesen Erzeugungshinweis nicht aus.
- Der Text verwendet „grundsätzlich vorgesehen“ beziehungsweise „kann
  erforderlich sein“ und behauptet keine automatische Einbaupflicht durch den
  Anlagenbetreiber.
- Ein Hinweis zu neuen SteuVE ab dem 01.01.2024 bleibt von der 7-kW-Regel
  getrennt und erscheint nur im Kontext der §14a-Prüfung.
- Der Prüfstatus bleibt die einzige Darstellung fachlicher Hinweise. Es gibt
  keine parallele Warnung in Objekteditor, Kartenansicht oder Auswahlleiste.
- Die Grenzfälle 7,0 und 7,01 sowie PV, Wind, KWK, Verbraucher und Speicher
  werden automatisiert getestet.

## Quellenstand

- [§ 29 Messstellenbetriebsgesetz](https://www.gesetze-im-internet.de/messbg/__29.html)
- [§ 30 Messstellenbetriebsgesetz mit Preisobergrenzen](https://www.gesetze-im-internet.de/messbg/__30.html)
- [Bundesnetzagentur: Mess- und Zählwesen](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/NetzzugangMesswesen/Mess-undZaehlwesen/start.html)
- [Bundesnetzagentur: Steuerbare Verbrauchseinrichtungen nach § 14a EnWG](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500)

Die Quellen und Schwellenwerte müssen bei Änderungen von Gesetz, Verordnung
oder Festlegungen erneut geprüft werden. Ein iMSys kann höhere laufende
Preisobergrenzen als eine moderne Messeinrichtung haben. Einbau, Messentgelt
und eine zusätzliche Steuerungseinrichtung sind jedoch getrennt zu betrachten;
einmalige Umbaukosten können lokal und fallbezogen entstehen.
