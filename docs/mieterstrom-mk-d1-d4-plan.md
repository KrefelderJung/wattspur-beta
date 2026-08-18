# Planung: Mieterstrom und Selbstversorgergemeinschaften MK D1 bis D4

**Status:** Historischer Beratungsentwurf. Im aktuellen MVP gibt es bewusst
keinen eigenen Mieterstrommodus. Stattdessen stehen zwei optionale
Mieterstromobjekte in der bestehenden Palette bereit: „Nutzer“ und
„Mieterstromzähler“. Der Zähler wird als teilnehmender technischer
Modellbaustein mit transparenter, gestrichelter Darstellung geführt. Die
technische Messlogik bleibt unverändert.
**Quellenstand:** VBEW-Auswahlblatt, Stand 24.09.2024; die konkrete Zulässigkeit
ist immer mit Netzbetreiber, Messstellenbetreiber und Fachbetrieb abzustimmen.

## Fachliche Einordnung

MK D1 bis D4 sind Messkonzepte für Selbstversorgergemeinschaften. Sie
beschreiben nicht nur Leitungen, sondern zusätzlich:

- welche Nutzer von der Erzeugungsanlage versorgt werden,
- welche Nutzer aus dem öffentlichen Netz oder von einem Drittlieferanten
  versorgt werden,
- welche Zähler für den Netzbetreiber relevant sind,
- ob die Abrechnung physisch oder rechnerisch erfolgt.

Die vier Konzepte sind deshalb keine vier weiteren Zeichenmodi. Für den MVP
wird die fachliche Einordnung zunächst über Projektname, Objektangaben und die
beiden neutralen Mieterstromobjekte dokumentiert. Eine spätere fachliche Ebene
kann darauf aufbauen, ohne die Leitungsgeometrie zu duplizieren.

## D1 bis D4 als Datenmodell

| Konzept | Kurzbeschreibung | Netzrelevante Zähler | Interne Teilnehmerzähler |
| --- | --- | --- | --- |
| D1 | Alle Anschlussnutzer werden durch die Erzeugungsanlage versorgt. | Z1 Bezug/Lieferung, Z2 Lieferung | ZN1 bis ZNn |
| D2 | Hardwarelösung mit zwei Sammelschienen. Ein Teil der Nutzer kann aus dem Netz versorgt werden. | Z1 Bezug/Lieferung, Z2 Lieferung, Z3 Bezug | ZN1 bis ZNn |
| D3 | Softwarelösung für aus dem Netz versorgte Anschlussnutzer. Die Energiemengen werden für die Abrechnung rechnerisch ermittelt. | Z1 Bezug/Lieferung, Z2 Lieferung, Z3 Bezug | ausgewählte ZN-Zähler |
| D4 | Softwarelösung mit virtuellem Summenzähler. Alle Zähler sind für den Netzbetreiber relevant; intelligente Messsysteme und weitere Voraussetzungen sind erforderlich. | ZE Bezug/Lieferung, Zn Bezug | keine pauschale interne Ausnahmekategorie |

Die Bezeichnungen und Voraussetzungen müssen bei einer späteren Umsetzung an
den jeweils gültigen VBEW-Stand angepasst werden. D4 darf nicht wie eine reine
Zeichenvariante behandelt werden, weil Messsysteme und Abrechnungssysteme Teil
des Konzepts sind.

## Empfehlung zur Architektur

### Kein neuer Geometriemodus

Der bestehende Modus `single` oder `parallel` beschreibt heute vor allem die
räumliche Darstellung. Ein zusätzlicher Modus `d1`, `d2`, `d3`, `d4` würde die
Leitungslogik duplizieren und die bekannten Geometriefehler wahrscheinlicher
machen.

Stattdessen sollte der Zustand eine zweite Ebene erhalten:

```text
state.mode = bestehende Zeichenlogik
state.scenarioFamily = "mieterstrom"
state.mieterstrom.model = "D1" | "D2" | "D3" | "D4"
state.mieterstrom.participantGroups = [...]
```

Die bestehende Topologie bleibt damit für Leitungen zuständig. Die neue Ebene
entscheidet über Teilnehmer, Zählerrollen, Relevanz und Abrechnungshinweise.

### Nutzer statt Verbraucher

Der interne Objekttyp `consumer` sollte erhalten bleiben, damit bestehende
Konzepte und Regeln nicht brechen. Im Mieterstrom-Kontext wird derselbe Typ
sichtbar als **Nutzer** bezeichnet. Ein zusätzliches Objekt „Nutzer“ ist zunächst
nicht nötig.

Ein Nutzer benötigt zunächst diese Eigenschaften:

```text
participantRole: "self-supplied" | "grid-supplied" | "third-party-supplied"
meterRelevance: "network-relevant" | "internal"
participates: true | false
participantGroupId: optional
```

`meterRelevance` und `participantRole` müssen getrennt bleiben. Ein Nutzer kann
aus dem Netz versorgt werden und trotzdem einen für das Konzept relevanten
Zähler besitzen. Diese beiden Sachverhalte dürfen nicht aus der Kartenposition
erraten werden.

### Zählerrolle verständlich benennen

Die gewünschte Dropdown-Auswahl ist sinnvoll, sollte aber nicht nur „nicht
relevant“ heißen. Besser sind zwei klare Begriffe:

- **Netzbetreiber-relevanter Zähler**
- **Interner Unterzähler der Selbstversorgergemeinschaft**

Die interne Kennung kann weiterhin `ZN1`, `ZN2` usw. lauten. Bei D4 darf diese
Auswahl nicht pauschal auf „interner Unterzähler“ stehen, weil dort laut
VBEW-Schema alle Zähler relevant sind.

### Teilnehmergruppen statt vieler Karten

Für große Hausanschlüsse sollte die Oberfläche eine **Teilnehmergruppe**
anlegen können:

- Anzahl der Nutzer festlegen,
- Versorgung der Gruppe wählen,
- Zählerrolle der Gruppe festlegen,
- einzelne Nutzer bei Bedarf aufklappen und bearbeiten.

Im einfachen Bild erscheint beispielsweise „Nutzer 1–12“. In der Detailansicht
können daraus einzelne Nutzerkarten werden. Dadurch bleibt das Konzept bei
vielen Hausanschlüssen lesbar und die fachliche Zuordnung bleibt trotzdem
vollständig.

## Hinweise und Prüfregeln

Die Vorlage sollte automatisch warnen, wenn:

1. D2 oder D3 gewählt wird und keine Nutzergruppe als netzversorgt markiert ist.
2. D3 gewählt wird, aber die rechnerische Differenzbildung oder die
   Abrechnungszuständigkeit nicht dokumentiert ist.
3. D4 gewählt wird, aber intelligente Messsysteme nicht bestätigt sind.
4. ein Zähler als intern markiert ist, obwohl das gewählte Konzept alle Zähler
   als netzrelevant behandelt.
5. Nutzergruppen, Zähler und Erzeugungsanlage keiner eindeutigen Rolle
   zugeordnet sind.

Diese Hinweise bleiben Warnungen. Das Tool darf keine Freigabe oder
Netzbetreiberentscheidung simulieren.

## Vorlagenumfang für einen ersten Prototyp

1. D1 mit vier Nutzern und einer PV-Anlage.
2. D2 mit drei selbstversorgten und einem netzversorgten Nutzer.
3. D3 mit derselben Nutzerverteilung, aber rechnerischer Abrechnung.
4. D4 mit virtueller Summierung und sichtbarem Hinweis auf iMSys sowie
   Abstimmungspflicht.

Jede Vorlage muss echte Modellobjekte erzeugen. Es dürfen keine statischen
   Screenshots als Vorlage verwendet werden. VBEW-Diagramme und Texte dürfen
   wegen der Lizenzlage nicht einfach kopiert werden; die Wattspur-Darstellung
   muss als eigene, vereinfachte Orientierungsskizze gezeichnet werden.

## Akzeptanzkriterien vor der Umsetzung

- Ein Nutzer kann in D1 bis D4 eindeutig als selbstversorgt, netzversorgt oder
  drittbeliefert markiert werden.
- Die Zählerrolle ist unabhängig von der Nutzerrolle sichtbar und exportierbar.
- D1 bis D4 erzeugen keine eigene duplizierte Leitungslogik.
- D4 zeigt ohne bestätigte iMSys einen deutlichen Warnhinweis.
- Eine Teilnehmergruppe mit mindestens 12 Nutzern bleibt in der einfachen Ansicht
  übersichtlich.
- Vorlagen, Bearbeitung, Löschen, Undo/Redo und PDF-Export erhalten Tests.
- Die Vorlage zeigt den verwendeten Quellenstand und bleibt ausdrücklich
  unverbindlich.

## Quellen und rechtliche Vorsicht

- [VBEW-Messkonzepte, Auswahlblatt D, Stand 24.09.2024](https://www.swm-infrastruktur.de/dam/swm-infrastruktur/dokumente/strom/netzanschluss/vbew-messkonzepte-erzeugungsanlagen)
- [VBEW-Messkonzepte und Verdrahtungsschemen, lizenzierte Ausgabe](https://shop.vbew-gmbh.de/produkt/vbew-messkonzepte-und-verdrahtungsschemen/)
- [Beispielhafte Erläuterung zu D3 und Teilnehmer-Unterzählern](https://www.swm-infrastruktur.de/einspeisung/selbstversorgergemeinschaften/mieterstrom)

Die VBEW-Unterlagen weisen selbst darauf hin, dass Messkonzepte mit dem
Netzbetreiber abzustimmen sind. Außerdem ist die gemeinschaftliche
Gebäudeversorgung nach § 42b EnWG ein eigenes Modell und sollte nicht ungeprüft
in D1 bis D4 eingeordnet werden.
