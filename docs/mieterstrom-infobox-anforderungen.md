# Anforderungen: allgemeine Mieterstrom-Infobox

Stand: 18.08.2026  
Geltungsbereich: Startseite des Messkonzept-Konfigurators

## Ziel

Die Infobox neben „Mieterstromkonzept“ erklärt die Grundidee für verschiedene
Mieterstromkonzepte. Sie darf nicht den konkreten Aufbau von MK D1 als Regel
für alle Varianten darstellen. Details zur Vorlage `MK D1: Mieterstromgemeinschaft`
bleiben in der Vorlage und in der D1-Dokumentation.

## Inhaltliche Leitplanken

- Mieterstrom wird als lokale Versorgung aus einer Erzeugungsanlage im Gebäude
  oder Quartier erklärt.
- Mögliche Entlastungen bei Netzentgelten, netzseitigen Umlagen, Stromsteuer und
  Konzessionsabgabe werden als Möglichkeit, nicht als Garantie, beschrieben.
- Der mögliche Mieterstromzuschlag wird an gesetzliche Voraussetzungen und
  geeignete Solaranlagen geknüpft.
- Teilnahme, Vertrag, Belieferung, Abrechnung, Messstellenbetrieb und Messkosten
  werden als Abstimmungsthemen verständlich benannt.
- Eine konkrete Markt- oder Messlokationsführung wird nicht pauschal als
  Rechtsfolge behauptet. Die Abstimmung mit Messstellenbetreiber und
  Netzbetreiber bleibt sichtbar.
- Die Infobox verwendet keine Gedankenstriche in sichtbaren Texten.
- Die Infobox verlinkt ausschließlich auf fachlich passende, offizielle Quellen.

## Darstellung und Bedienung

- Die Mieterstrom-Infobox öffnet mittig im sichtbaren Browserbereich.
- Die Box bleibt innerhalb des Viewports, besitzt bei langen Inhalten einen
  eigenen vertikalen Bildlauf und erzwingt keinen Seiten-Scroll.
- Die Darstellung bleibt auf kleinen Bildschirmen lesbar.
- MK D1 bleibt direkt als Vorlage startbar und wird nicht durch die allgemeine
  Infobox inhaltlich eingeschränkt.

## Akzeptanzkriterien

1. `getGroupInfo('mieterstrom')` enthält keine D1-exklusiven Aussagen wie „alle
   Anschlussnutzer von der Erzeugungsanlage“ oder „technische Modellannahme“.
2. Die Vorteile nennen lokale Kostenentlastungen, gebündelte Belieferung und
   den möglichen Mieterstromzuschlag.
3. Die Hinweise nennen Freiwilligkeit, Messkosten, Markt- und
   Messlokationsabstimmung sowie eine spätere Rückkehr zur regulären Belieferung.
4. Die drei offiziellen Quellen BNetzA Mieterstrom, § 21 EEG und BNetzA
   Messstellenkosten sind verlinkt.
5. Der automatisierte Preset-Test prüft Inhalt, Quellen und Gedankenstrichfreiheit.
6. Der Projektqualitätstest prüft die mittige, viewportbegrenzte Positionierung.

## Fachquellen

- [BNetzA: Mieterstrom](https://www.bundesnetzagentur.de/DE/Vportal/Energie/Vertragsarten/Mieterstrom/start.html)
- [§ 21 EEG: Mieterstromzuschlag](https://www.gesetze-im-internet.de/eeg_2014/__21.html)
- [BNetzA: Kosten des Messstellenbetriebs](https://www.bundesnetzagentur.de/DE/Vportal/Energie/Metering/_faq/Kosten_table.html?r=1)
