# Fehlerbehebung: Edge-Infobox-Drag und Mittelspannungs-PNG

## Ziel

Infoboxen sollen sich in Edge und anderen Pointer-fähigen Browsern ohne
sichtbaren Versatz bewegen lassen. Zusätzlich muss der als Transformator
dargestellte HAK im PNG-Fallback erscheinen, wenn die Spannungsebene
„Mittelspannung“ gewählt ist.

## Akzeptanzkriterien

- Die Infobox bleibt beim Ziehen am ursprünglichen Griffpunkt des Cursors.
- Eine Erweiterung oder ein Scrollen der Arbeitsfläche an einem Rand erzeugt
  keinen zusätzlichen Versatz und kein „Zurückbleiben“ der Box.
- Pointer-Capture bleibt bis `pointerup` oder `pointercancel` aktiv; ein
  Kontextmenü unterbricht einen begonnenen Rechtsklick-Drag nicht.
- Niederspannungs-HAK und bestehende Infobox-/Resize-Funktionen bleiben
  unverändert nutzbar.
- Der native, CSS-freie PNG-Fallback zeichnet den Mittelspannungs-HAK als zwei
  überlappende Ringe mit Anschlussstiften.
- Der Transformator wird in der normalen SVG-/PNG-Quelle und im Edge-
  Fallback an derselben Position wie im Editor ausgegeben.
- Node-, Syntax-, Link- und Release-Gates bleiben grün.

## Technischer Plan

1. Drag-Kandidaten aus dem aktuellen `stageRect` und dem Pointer-Offset in der
   Karte berechnen; nach einer Arbeitsflächenerweiterung neu berechnen.
2. Kontextmenü während eines aktiven Infobox-Drags unterdrücken.
3. Transformator-Symbol im nativen SVG-Renderer als explizite SVG-Geometrie
   ergänzen.
4. Statische Regressionstests und den vollständigen Test-Gate ausführen.
