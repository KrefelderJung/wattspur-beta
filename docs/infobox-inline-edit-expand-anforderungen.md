# Temporär erweiterte Infobox-Bearbeitung

## Ziel

Eine längere Bemerkung soll beim Bearbeiten vollständig lesbar und editierbar
sein. Die normale, platzsparende Infobox bleibt dabei unverändert.

## Abnahmekriterien

1. Doppelklick auf einen Textwert öffnet weiterhin die direkte Bearbeitung.
2. Während der Bearbeitung wächst die betroffene Infobox vorübergehend in der
   Höhe und bei Bedarf in der Breite. Mehrzeilige Bemerkungen werden vollständig
   angezeigt und benötigen keine interne Scrollleiste.
3. Klick außerhalb, Enter beziehungsweise Strg+Enter bei Textareas oder Escape
   beendet die Bearbeitung. Danach wird die zuvor gespeicherte Größe der Infobox
   exakt wiederhergestellt.
4. Position, Verbindungslinie, Messlogik, Objekt-Hierarchie und PDF-Geometrie
   werden durch die temporäre Aufweitung nicht verändert.
5. Die Funktion gilt einheitlich für Zähler, HAK und Anlagenobjekte sowie für
   Maus, Touch und Stift über die vorhandene Pointer-Ereignis-Schicht.

## Technische Leitplanke

Die Aufweitung ist ausschließlich ein transienter DOM-Zustand. Es werden keine
neuen Breiten oder Höhen im Projektmodell gespeichert. Dadurch bleibt die
manuell eingestellte Infobox-Größe nach dem Schließen erhalten und der Export
verwendet weiterhin die normale gespeicherte Geometrie.