# Anforderungen: Zeichenfläche und Infobox-Arbeitsraum

## Ziel

Die Messskizze soll auf Desktop-Geräten direkt mit gedrückter linker
Maustaste auf einem freien Bereich verschiebbar sein. Der HAK bleibt ein
reines Auswahlobjekt und öffnet bei Klick sein Objektfenster.

Infoboxen und Info-Textfelder erhalten unabhängig davon einen eigenen,
dynamischen Arbeitsraum. Sie dürfen nach links, rechts, oben und unten
verschoben werden. Dieser Arbeitsraum gehört nur zur Darstellung und darf
weder den HAK noch die Topologie, Leitungen oder PDF-Geometrie bewegen.

## Akzeptanzkriterien

- Ziehen mit der linken Maustaste auf einem leeren Bereich der Zeichenfläche
  verschiebt die Skizze horizontal und vertikal.
- Bereits platzierte Anlagen, Zähler, der HAK und Entfernen-Schaltflächen
  behalten ihre Auswahl- und Drag-and-Drop-Funktion.
- Ein Klick auf den HAK öffnet weiterhin dessen Objektfenster.
- Der HAK kann nicht als Pan-Griff verwendet werden und aktiviert dabei keine
  zusätzliche horizontale oder vertikale Arbeitsfläche.
- Die Leertaste plus linke Maustaste und die mittlere Maustaste bleiben als
  kompatible Alternativen erhalten.
- Während des Verschiebens werden Textauswahl und unbeabsichtigte Klicks
  verhindert; beim Loslassen oder Abbrechen wird der Zustand vollständig
  zurückgesetzt.
- Auf der freien Zeichenfläche bleibt der Mauszeiger im Ruhezustand ein
  normaler Pfeil. Eine Infobox zeigt beim Darüberfahren die offene Hand und
  während des Ziehens die geschlossene Hand. Größenanfasser behalten den
  diagonalen Größen-Cursor; editierbare Textwerte behalten den Text-Cursor.
- Der HAK bleibt als anklickbares Objekt mit dem normalen Zeiger erkennbar und
  wird nicht als Ansichts-Griff dargestellt.
- Die bestehende Pointer-Geste für Android- und iOS-Tablets bleibt unverändert.
- Ein automatisierter Regressionstest prüft die neue Modusentscheidung.
- Die Geste verändert weder Messkonzept, Zählerhierarchie, Leitungen noch die
  PDF-Geometrie.
- Die Zeichenfläche bleibt ein eigener Arbeitsbereich mit horizontaler und
  vertikaler Scrollmöglichkeit. Ein größerer Infobox-Arbeitsraum vergrößert
  nicht unkontrolliert die gesamte Seite.
- Für Infoboxen wird der Arbeitsraum an allen vier Rändern dynamisch erweitert,
  wenn eine gespeicherte Position die ursprüngliche Topologiefläche verlässt.
- Beim Zurücksetzen oder Entfernen der Infobox wird dieser zusätzliche
  Arbeitsraum wieder entfernt.
