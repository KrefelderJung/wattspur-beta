# Kennziffern für Objektkarten

## Ziel

Objekte sollen im Editor auch bei mehreren gleichartigen Objekten eindeutig unterscheidbar sein. Die Kennung folgt dabei der visuellen Sprache des Objekts.

## Akzeptanzkriterien

1. Textkarten tragen die Nummer direkt in der sichtbaren Kennung: Z1/Z2 bei Zählern, PV1/BHKW1/WE1 bei Erzeugungsanlagen, V1 bei Verbrauchern, NSH1 bei Nachtspeicherheizungen und N1 bei Mieterstromnutzern.
2. Reine Symbolkarten, derzeit Batteriespeicher, Wallboxen, Wärmepumpen und Klimaanlagen, zeigen eine kleine separate Kennziffer am unteren rechten Kartenrand.
3. Die Kennziffer liegt außerhalb des Symbols und innerhalb keiner Leitungs- oder Kartenzeile. Sie darf die Kartenabmessungen und damit die Leitungsgeometrie nicht verändern.
4. Die bestehende Entfernen-Schaltfläche bleibt oben rechts unverändert und darf nicht mit der Kennziffer kollidieren.
5. Nummern werden je fachlichem Objekttyp vergeben. Wallboxen und Wärmepumpen beginnen daher jeweils bei 1; Batteriespeicher und Klimaanlagen erhalten ebenfalls eigene Folgen. PV und Stecker-PV teilen den PV-Nummernkreis, BHKW und Wind bleiben getrennt.
6. Es gibt keine Doppelnummerierung: Eine Textkarte erhält kein zusätzliches Badge.
7. Die Palette links bleibt unverändert. Die Kennziffer erscheint nur auf platzierten Karten im Editor.
8. Die Kennziffer ist für assistive Technologien über eine zugängliche Beschriftung verfügbar.
9. Die feste einfache Ansicht funktioniert auch bei kleinen Bildschirmbreiten.

## Bewusste Abgrenzung

Die Kennziffer ist eine sichtbare Darstellungsnummer, keine neue fachliche ID. Die bestehende interne ID bleibt unverändert und wird weiterhin für Drag-and-Drop, Löschung, Historie und Leitungsgeometrie verwendet.
