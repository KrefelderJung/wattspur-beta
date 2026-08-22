# Anforderungen: Zeichenfläche mit linker Maustaste verschieben

## Ziel

Die Messskizze soll auf Desktop-Geräten direkt mit gedrückter linker
Maustaste verschiebbar sein. Die sichtbare Scrollbar bleibt als Fallback
erhalten, darf aber nicht mehr der einzige Weg sein.

## Akzeptanzkriterien

- Ziehen mit der linken Maustaste auf einem leeren Bereich der Zeichenfläche
  verschiebt die Skizze horizontal und vertikal.
- Bereits platzierte Anlagen, Zähler, der HAK und Entfernen-Schaltflächen
  behalten ihre Auswahl- und Drag-and-Drop-Funktion.
- Die Leertaste plus linke Maustaste und die mittlere Maustaste bleiben als
  kompatible Alternativen erhalten.
- Während des Verschiebens werden Textauswahl und unbeabsichtigte Klicks
  verhindert; beim Loslassen oder Abbrechen wird der Zustand vollständig
  zurückgesetzt.
- Die bestehende Pointer-Geste für Android- und iOS-Tablets bleibt unverändert.
- Ein automatisierter Regressionstest prüft die neue Modusentscheidung.
