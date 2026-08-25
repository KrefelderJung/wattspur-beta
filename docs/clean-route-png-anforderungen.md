# Clean-URL und PNG-Export

## Ziel

Der Einstieg in den Messkonzept-Konfigurator soll eine stabile, teilbare URL
verwenden. Der PNG-Export soll auch bei veröffentlichten HTTPS-Seiten robust
funktionieren, wenn ein Browser eingebettete SVG-Fremdinhalte einschränkt.

## Akzeptanzkriterien

- Der Startkarten-Link öffnet `/messkonzeptkonfigurator/` und bleibt nicht bei
  `index.html#top` stehen.
- Die Route kann direkt aufgerufen und weitergegeben werden.
- Die Route lädt den bestehenden Konfigurator über den Route-Loader, ohne eine
  zweite Kopie der Anwendung zu pflegen.
- Der PNG-Export versucht neben der normalen SVG-Darstellung eine native,
  fremdobjektfreie SVG-Quelle über Blob-URL und Data-URL.
- Alle temporären Objekt-URLs werden nach dem Export wieder freigegeben.
- Jeder SVG-Versuch verwendet eine eigene Canvas, damit ein blockierter
  `foreignObject`-Versuch den nativen Fallback nicht unbrauchbar macht.
- Ein Browser, der den `toBlob`-Callback bei einer blockierten Canvas nicht
  ausführt, darf den Export nicht dauerhaft hängen lassen. Nach einem kurzen
  Timeout muss der Data-URL-Fallback oder die nächste lokale SVG-Quelle greifen.
- Das Verhalten bleibt lokal (`file:`), online (`https:`), in Edge und in
  Chromium-basierten Browsern testbar.

## Architekturentscheidung

Die Navigation bleibt eine normale HTML-Verlinkung. Die bisherige Klickregel
für die Startkarte darf sie deshalb nicht abfangen. Für den Export bleibt die
bestehende Darstellung bevorzugt; der native SVG-Fallback wird nur verwendet,
wenn eine Bildquelle nicht geladen oder nicht in Canvas gezeichnet werden kann.
So wird die Fachlogik nicht verändert und die PDF-Geometrie bleibt unabhängig
vom PNG-Export.
