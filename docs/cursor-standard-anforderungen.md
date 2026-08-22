# Anforderungen: Cursor-Standard im Messkonzept-Editor

## Ziel

Klickbare Objekte und Infoboxen sollen unabhängig vom Objekttyp sofort als
interaktiv erkennbar sein. Das Ziehen von Anlagen und Zählern darf dabei nicht
verloren gehen.

## Akzeptanzkriterien

- HAK, Zähler und Anlagen zeigen im Ruhezustand den Cursor `pointer`.
- Infoboxen und aufklappbare Hinweise zeigen ebenfalls den Cursor `pointer`.
- Während eines tatsächlichen Ziehvorgangs wechselt der Cursor zu `grabbing`.
- Die Palette bleibt als Ziehquelle mit `grab` erkennbar.
- Verschiebbare Zählerangaben behalten ebenfalls `grab` und `grabbing`.
- Die Fachlogik, Drop-Ziele und Leitungsgeometrie bleiben unverändert.

## Bedienentscheidung

Ein dauerhafter Greif-Cursor bei jedem Objekt würde die Auswahl mit der
Verschiebung vermischen. Deshalb zeigt der Ruhezustand zunächst den Zeiger;
der Greifcursor erscheint erst beim Drücken beziehungsweise Ziehen.
