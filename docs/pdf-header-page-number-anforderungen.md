# PDF-Export: kompakte Kopfzeile

## Ziel

Die kompakte PDF hat eine stabile, ruhige Kopfzeile mit Wattspur und der
Werkzeugbezeichnung. Exportstand und Seitenzahl werden nicht ausgegeben. Die
Kopfzeile bleibt im normalen Dokumentfluss und kann deshalb keinen Inhalt
überdecken.

## Anforderungen

1. Die Kopfzeile mit Wattspur-Logo und Werkzeugbezeichnung steht vor dem Inhalt.
2. Exportstand und Seitenzahl werden nicht als zusätzliche Kopfzeilenfelder ausgegeben.
3. Der Inhalt beginnt unterhalb der Kopfzeile und darf sie nicht überdecken.
4. Der Export bleibt lokal und nutzt weiterhin den vorhandenen Browser-Druckdialog.
5. Ein kompakter Export darf durch die Kopfzeile nicht unnötig umbrochen werden.

## Abnahmekriterien

- Der gerenderte Export enthält genau eine gemeinsame Header-Struktur ohne Exportstand- und Seitenzahl-Marker.
- Die Druck-CSS hält die Kopfzeile statisch im Dokumentfluss.
- Der Export besitzt nur noch einen PDF-Button und eine One-Pager-Struktur.
- Syntax-, Export- und Gesamttests bleiben grün.
