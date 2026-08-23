# Gemeinsame Download-Komponente

## Ziel

Lastgang-Tool und Messkonzept-Konfigurator verwenden für Datei- und PDF-Downloads
dieselbe verständliche Button-Grundform. Die eigentliche Exportfunktion bleibt
jeweils im Werkzeug; gemeinsam sind Symbol, Beschriftung, Tooltip und die
responsive Darstellung.

## Akzeptanzkriterien

- Ein Downloadbutton zeigt einen Pfeil nach unten mit Ablage und eine kurze
  sichtbare Beschriftung.
- Der Messkonzept-Button trägt sichtbar `PDF` und den Tooltip
  „Messkonzept als PDF herunterladen“.
- Lastgang-Exporte für Bild und CSV verwenden dieselbe Komponente.
- Auf kleinen Bildschirmen darf nur das Symbol sichtbar bleiben. Der Tooltip
  und der zugängliche Name bleiben erhalten.
- Die Touchfläche bleibt auch bei ausgeblendeter Beschriftung mindestens
  44 CSS-Pixel hoch.
- Die Komponente verändert keine Exportlogik und überträgt keine Daten an
  externe Dienste.
