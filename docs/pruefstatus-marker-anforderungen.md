# Prüfstatus: neutrale Info- und Hinweis-Marker

## Ziel

„Info“ und „Hinweis“ sind Statusangaben. Sie sollen deshalb nicht wie fachliche
Messobjekte aussehen. Anlagen-Tags bleiben semantisch farbig und zeigen, welche
Objekte betroffen sind.

## Gestaltungsentscheidung

- Statusangaben erscheinen als kompakte Marker aus Symbol und Text, nicht als
  pillenförmige Objekt-Tags.
- Die Statusbezeichnung bleibt nummeriert, zum Beispiel „Info 1“ oder „Hinweis 2“.
- Die Beschriftung ist im Nachtmodus hell und im Tagmodus dunkel lesbar.
- Nur das Statussymbol trägt eine dezente semantische Akzentfarbe. Die Objekt-Tags
  behalten ihre bisherigen Farben, Formen und Zuordnungen.
- Pfeil, Aufklappfunktion, betroffene Anlagen-Tags und Inhalt der Prüfkarte bleiben
  unverändert.

## Akzeptanzkriterien

1. Die Prüfstatus-Zusammenfassung rendert keine `mk-validation-tag`-Status-Pills mehr.
2. Info und Hinweis verwenden eine eigene Klasse `mk-validation-status-marker` mit
   Symbol und Nummerierung.
3. Betroffene Anlagen verwenden weiterhin `mk-validation-asset-tag` und die zentrale
   semantische Objektfarbpalette.
4. Marker und Inhalte bleiben auf Desktop, Smartphone, Tastatur und im Tagmodus lesbar.
5. Fachregeln, Nummerierung und Auf-/Zuklappen der Prüfstatuskarten ändern sich nicht.
