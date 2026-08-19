# Kennziffern für reine Symbolkarten

## Ziel

Icon-basierte Messobjekte wie Batteriespeicher, Wallboxen, Wärmepumpen und Raumkühlungen sollen im Editor auch bei mehreren gleichartigen Objekten eindeutig unterscheidbar sein.

## Akzeptanzkriterien

1. Reine Symbolkarten zeigen eine kleine, separate Kennziffer am unteren rechten Kartenrand.
2. Die Kennziffer liegt außerhalb des Symbols und innerhalb keiner Leitungs- oder Kartenzeile. Sie darf die Kartenabmessungen und damit die Leitungsgeometrie nicht verändern.
3. Die bestehende Entfernen-Schaltfläche bleibt oben rechts unverändert und darf nicht mit der Kennziffer kollidieren.
4. Nummern werden je fachlichem Objekttyp vergeben. Wallboxen und Wärmepumpen beginnen daher jeweils bei 1; Batteriespeicher erhalten ebenfalls eine eigene Folge. Bei Erzeugungsanlagen folgen optionale Kennziffern demselben Nummernkreis wie die sichtbare Kennung: PV und Stecker-PV gemeinsam, BHKW und Wind getrennt.
5. Die sichtbare Textkennung, etwa PV1, V1 oder NSH, bleibt die fachliche Hauptkennung. Ein zusätzliches Badge darf sie nur ergänzen und nicht ersetzen.
6. Die Palette links bleibt unverändert. Die Kennziffer erscheint nur auf platzierten Karten im Editor.
7. Die Kennziffer ist für assistive Technologien über eine zugängliche Beschriftung verfügbar.
8. Die Darstellung funktioniert in einfacher und detaillierter Ansicht sowie bei kleinen Bildschirmbreiten.

## Bewusste Abgrenzung

Die Kennziffer ist eine sichtbare Darstellungsnummer, keine neue fachliche ID. Die bestehende interne ID bleibt unverändert und wird weiterhin für Drag-and-Drop, Löschung, Historie und Leitungsgeometrie verwendet.
