# Mieterstromkonzept D1: Mieterstromgemeinschaft

**Status:** Prototyp für die Startvorlagen
**Stand:** 18.08.2026

## Ziel

Die Startseite bietet neben gemeinsamer Messung, Parallelmessung und
Kaskadenmessung eine vierte Kategorie: **Mieterstromkonzept**. Der erste Fall
ist die einfache D1-Variante einer Mieterstromgemeinschaft. Alle dargestellten
Anschlussnutzer werden in der Vorlage von der Erzeugungsanlage versorgt.

Die Kategorie ist keine neue Messlogik und kein eigener Betriebsmodus. Sie lädt
einen normalen, bearbeitbaren Zustand im Modus „Gemeinsame Messung“.

## Fachliche Modellannahme

Die Mieterstromzähler bleiben sichtbar, damit die Zuordnung der Nutzer und eine
spätere Rückkehr in eine reguläre Versorgung nachvollziehbar bleiben. Für die
D1-Vorlage werden sie technisch als nicht aktive Marktlokationen modelliert.
Das ist eine Darstellungshilfe und keine automatische rechtliche oder
abrechnungsseitige Entscheidung. Betreiber, Messstellenbetreiber,
Netzbetreiber und Lieferanten müssen die konkrete Umsetzung abstimmen.

## Vorlage

- eine PV-Erzeugungsanlage;
- ein eigener Erzeugungszähler als sichtbarer technischer Zähler;
- vier Mieterstromnutzer `N1` bis `N4`;
- vier zugeordnete Mieterstromzähler `ZN1` bis `ZN4`;
- alle Nutzer und Zähler bleiben nach dem Laden frei bearbeitbar und löschbar.

## Gestaltung

- eigene Startseiten-Kategorie „Mieterstromkonzept“;
- Bordeaux-Farbakzent aus der bestehenden Wallbox-Farbfamilie;
- eigenes Linien-Icon für eine Erzeugungsanlage mit mehreren Nutzern;
- eine kompakte Info-Schaltfläche mit Zielgruppe, Modellannahme und
  Abstimmungshinweis;
- keine internen Zählernummern in den Startkarten.

## Akzeptanzkriterien

1. Die vier Kategorien sind auf Desktop, Tablet und Smartphone ohne
   horizontales Überlaufen erreichbar.
2. Ein Klick auf „Mieterstromgemeinschaft“ lädt direkt die D1-Skizze.
3. Nach dem Laden ist der Zustand im Modus „Gemeinsame Messung“ und nutzt nur
   vorhandene Standardobjekte.
4. Die Erzeugungsanlage und die Nutzer sind sichtbar; jeder Nutzer hat genau
   einen `ZN…`-Zähler.
5. Mieterstromzähler verwenden weiterhin die eigene Folge `ZN1`, `ZN2`, … und
   erhöhen nicht die reguläre Folge `Z…`.
6. Die Info erklärt ausdrücklich, dass die Deaktivierung der Marktlokation eine
   technische Modellannahme ist.
7. Startvorlagen-, Modell-, Architektur- und Qualitätsprüfungen bleiben grün.
8. Die Vorlage erzeugt keine rechtliche Freigabe und behauptet keine
   automatische Teilnahmeberechtigung.
