# PDF-Infoboxen: lesbarer Wortumbruch

## Ziel
Text in einer PDF-Infobox soll nicht zeichenweise umbrechen. Ein einzelnes Wort bleibt zusammen; Umbrüche erfolgen nur an Leerzeichen oder ausdrücklich gesetzten Zeilenwechseln.

## Akzeptanzkriterien
- Ein einzelnes Wort wird in der PDF nebeneinander dargestellt, sofern es in die maximale Kartenbreite passt.
- Eine vom Nutzer gesetzte Infoboxbreite bleibt erhalten; nur eine zu kleine Breite darf für ein unteilbares Wort auf dessen Mindestbreite anwachsen.
- Editoransicht, Leitungsgeometrie und der bereits akzeptierte Hinweis in der PDF-Fußzeile bleiben unverändert.