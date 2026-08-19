# Anforderungen: §14a-Anmeldung und Energietarif

**Stand:** 19.08.2026  
**Regel-ID:** `MK-STEUVE-001`  
**Darstellung:** zentraler Prüfstatus, Hinweisstufe `info`

## Ziel

Nutzer sollen auf einen Blick verstehen, dass zwei verschiedene Dinge
nebeneinander bestehen können:

1. Die Einordnung und Anmeldung einer steuerbaren Verbrauchseinrichtung nach
   § 14a EnWG beim Netzbetreiber.
2. Die Anfrage eines Wärmepumpen- oder Wallbox-Tarifs beim gewählten
   Energieversorger beziehungsweise Stromlieferanten.

Der Text bleibt kurz und behauptet keinen automatischen Tarifvorteil.

## Auslöser

Der Hinweis erscheint, wenn eine Wärmepumpe oder Wallbox in einem eigenen
Messpunkt liegt. Das ist im Modell an einem `meterId` oder an einem separaten
Parallelzweig erkennbar. Eine gemeinsam gemessene Anlage löst diesen Hinweis
nicht aus.

## Akzeptanzkriterien

- Separat gemessene Wärmepumpe: Hinweis enthält § 14a, Netzbetreiber,
  Energieversorger und die Trennung von Netzentgelt und Energietarif.
- Separat gemessene Wallbox: Hinweis nennt ausdrücklich den Wallbox-Tarif.
- Gemeinsame Wärmepumpe ohne eigenen Messpunkt: kein separater Tarif-Hinweis.
- Der Hinweis erscheint nur im Prüfstatus und nicht doppelt im Objekteditor.

## Fachliche Quelle

Die [Bundesnetzagentur erläutert § 14a EnWG und die getrennte Bestellung der
Module beziehungsweise Abrechnung](https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500).
Besondere Stromtarife können weiterhin vom Lieferanten angeboten werden. Ob ein
Tarif verfügbar ist, hängt vom Liefervertrag und Anbieter ab.
