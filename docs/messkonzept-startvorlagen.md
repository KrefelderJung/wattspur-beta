# Startvorlagen für den Messkonzept-Konfigurator

Stand: 16.08.2026 · öffentliche Beta

## Ziel

Der Konfigurator startet mit einer kleinen Auswahl häufig vorkommender Fälle.
Die Vorlagen sind keine Bilder und keine starren Muster: Beim Anklicken wird
ein normaler Messkonzept-Zustand erzeugt. Jede Karte kann anschließend wie ein
freier Entwurf verändert oder zurückgesetzt werden.

## Akzeptanzkriterien

- Der freie Konfigurator ist als eigene, gut sichtbare Aktion verfügbar.
- Die Fälle sind in vier Gruppen verständlich geordnet: gemeinsame Messung,
  Parallelmessung, Kaskadenmessung und Mieterstromkonzept.
- Eine Vorlage öffnet direkt den passenden Modus und enthält bereits die
  richtigen Objekte und Zählerbeziehungen.
- „Haushalt“ ist nur die sichtbare Bezeichnung; der interne Modelltyp bleibt
  `consumer`/„Verbraucher“.
- Die Parallelvorlagen zeigen genau diesen kurzen Hinweis:
  „Eine Wallbox/Wärmepumpe kann ohne zusätzliche Mess- und Steuertechnik in der
  Parallelmessung nicht gezielt mit PV-Strom versorgt werden.“
- Kaskaden erzeugen eine obere Steueranlage und einen senkrechten Basiszähler Z2
  hinter Z1. Haushalt, PV und Speicher liegen gemeinsam hinter Z2. PV oder
  Speicher können danach über das vorhandene X entfernt werden.
- Technisch wird Z2 als Basiszähler (`meterScope: base`,
  `parentBaseMeterIndex: 0`) modelliert. Dadurch nutzt die Vorlage dieselbe
  Geometrie wie ein manuell aufgebauter Kaskadenstrang und nicht die Inline-
  Darstellung eines Zählers vor einer einzelnen Anlage.
- Die Vorlagen nutzen dieselben Renderer-, Topologie- und Geometrieregeln wie
  der freie Konfigurator. Es gibt keine Vorlage-Sonderkoordinaten.
- Die Oberfläche bleibt auf Smartphone-Breite bedienbar; Karten werden bei
  kleinen Breiten untereinander angeordnet.
- Jede der vier Gruppen besitzt einen auffälligen, aber standardmäßig
  geschlossenen Info-Button. Dort stehen Vorteile, mögliche Nachteile und
  neutrale Prüfhinweise. So bleibt die Startauswahl übersichtlich, ohne die
  fachlich wichtigen Unterschiede zu verstecken.
- Die Info-Texte versprechen weder einen Tarif noch eine Genehmigung. Sie
  verweisen auf die Bundesnetzagentur, § 22 EnFG und die
  Konzessionsabgabenverordnung (KAV). Die örtliche Prüfung durch Lieferant,
  Messstellenbetreiber, Netzbetreiber und Fachbetrieb bleibt erforderlich.

Die Gruppenbeschreibung beginnt jeweils mit einer verständlichen Zielgruppe:

- Gemeinsame Messung: Haushalt und Anlagen sollen gemeinsam über einen Zähler
  gemessen werden.
- Parallelmessung: Wärmepumpe oder Wallbox sollen getrennt vom Haushaltsstrom
  gemessen werden.
- Kaskadenmessung: Wärmepumpe oder Wallbox sollen separat gemessen, aber
  weiterhin durch PV-Strom mitversorgt werden.
- Mieterstromkonzept: Eine Mieterstromgemeinschaft möchte alle
  Anschlussnutzer in einer gemeinsamen, bearbeitbaren Skizze abbilden.

## Mieterstrom D1

Die erste Mieterstromvorlage heißt „MK D1: Mieterstromgemeinschaft“. Sie lädt eine
PV-Anlage, einen sichtbaren Erzeugungszähler sowie vier Mieterstromnutzer mit
je einem `ZN…`-Zähler. Die Nutzerzähler sind im Modell als technische
Modellannahme mit nicht aktiver Marktlokation markiert. Sie bleiben sichtbar,
damit spätere Änderungen der Versorgung nachvollziehbar bleiben.

In der Startkarte werden nur die Tags „PV“ und „Mieterstromnutzer“ gezeigt.
Der Nutzer-Tag verwendet die umgekehrte, transparente Darstellung des
Mieterstromnutzer-Objekts mit grauer Schrift und gestrichelter Kontur.

Die Vorlage führt keinen eigenen Messmodus ein. Sie nutzt den vorhandenen Modus
„Gemeinsame Messung“ und dieselben Renderer-, Topologie- und Geometrieregeln.

Für die gemeinsame Messung gilt in der Oberfläche ausdrücklich:

- Der Aufbau benötigt keinen Umbau für einen zweiten Zähler.
- Ein Wärmepumpen- oder Wallbox-Tarif ist ein Produkt des gewählten
  Energieversorgers. Bei gemeinsamer Messung wird er selten angeboten; häufig
  verlangt der Lieferant dafür einen eigenen Zählpunkt.
- Der Hausanschluss muss die gesamte Leistung trotzdem aufnehmen können. Ein
  Umbau kann deshalb im Einzelfall weiterhin erforderlich sein.

## Technische Aufteilung

| Datei | Verantwortung |
|---|---|
| `js/messkonzept/presets.js` | DOM-freier Katalog mit Titeln, Kurztexten, Gruppen und den aufklappbaren Fachhinweisen |
| `js/messkonzept/preset-loader.js` | Erzeugt aus dem Katalog normale Modellzustände |
| `messkonzept.js` | Startauswahl anzeigen, Vorlage laden, freie Skizze öffnen |
| `js/messkonzept/bootstrap.js` / `interaction.js` | DOM-Anker und Klickverkabelung |

Die Vorlagen sind damit bewusst von CSS, SVG und Leitungsrouting getrennt.
Das ist wichtig: Eine spätere Geometrieverbesserung wirkt automatisch auch auf
alle Vorlagen.

## Fachlicher Hinweis zur Parallelmessung

Der sichtbare Hinweis bleibt bewusst kurz. Die konkrete technische Auswahl,
Steuerung und Abstimmung gehört in die Verantwortung des konzessionierten
Installateurs und des zuständigen Verteilnetzbetreibers. Die aufklappbaren
Gruppeninfos nennen deshalb nur eine verständliche Orientierung:

- Die Netzentgeltreduzierung nach § 14a EnWG kann bei gemeinsamer Messung über
  Modul 1 und optional Modul 3 geprüft werden. Modul 2 setzt einen separaten
  Zählpunkt voraus.
- Die Wärmepumpenprivilegierung nach § 22 EnFG knüpft die dort geregelte
  Umlagebefreiung an einen eigenen Zählpunkt und weitere Voraussetzungen.
- Bei einer Kaskade kann PV-Strom im gemeinsamen Stromfluss auch die Wärmepumpe
  oder Wallbox versorgen; die separate Messung bleibt erhalten. Die Abrechnung arbeitet dabei
  mit Differenzbildung: Bezug an Z1 minus Bezug an Z2 ergibt den rechnerischen
  Verbrauch des Bereichs hinter Z2.
- Eine separate Messung kann die Voraussetzungen für eine günstigere
  Konzessionsabgabe schaffen, zum Beispiel bei einer Einstufung als
  Sondervertragskunde. Die KAV unterscheidet Tarif- und Sondervertragskunden;
  eine günstigere Einstufung ist daher nicht allein durch das Verschieben eines
  Bausteins oder durch einen bestimmten Tarifnamen garantiert.

Die verlinkten Originalquellen werden in den Info-Buttons direkt geöffnet:

- [BNetzA: Steuerbare Verbrauchseinrichtungen nach § 14a EnWG](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500)
- [§ 22 EnFG im Gesetzesportal](https://www.gesetze-im-internet.de/enfg/__22.html)
- [Konzessionsabgabenverordnung (KAV)](https://www.gesetze-im-internet.de/kav/BJNR000120992.html)
