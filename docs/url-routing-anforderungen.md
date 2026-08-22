# Anforderungen: Stabile Tool-URLs

## Ziel

Wattspur soll für die beiden Kernwerkzeuge dauerhaft teilbare Einstiegsadressen
anbieten. Ein weitergegebener Link soll direkt das gewünschte Werkzeug öffnen,
ohne dass der Nutzer zuerst die Startseite durchsuchen muss.

## Festgelegte Adressen

- `https://wattspur.de/messkonzeptkonfigurator/`
- `https://wattspur.de/lastganganalyse/`

Die bestehenden `.html`-Seiten bleiben als erklärende, indexierbare Einstiegsseiten erhalten. Die neuen Pfade öffnen direkt die jeweilige Anwendung.

Die bisher verwendeten Hash-Einstiege (`index.html#messkonzept` und
`index.html#lastgang`) bleiben als Rückfallebene erhalten.

## Akzeptanzkriterien

1. Beide neuen Adressen öffnen direkt das passende Werkzeug.
2. Ein Browser-Refresh auf beiden Adressen führt nicht zu einem 404-Fehler.
3. Die Browser-Zurück- und Vorwärtsnavigation bleibt funktionsfähig.
4. Die Startseite verlinkt auf die stabilen Werkzeug-Adressen.
5. Die alten `.html`-Einstiegsseiten bleiben erreichbar und verlinken auf die
   stabilen Adressen.
6. Sitemap, Canonical-URLs und Open-Graph-URLs der direkten Werkzeugrouten verwenden die stabilen Adressen. Die erklärenden `.html`-Seiten behalten ihre eigenen Canonicals.
7. Die URL enthält keine Projektangaben, Adressen oder Messkonzeptdaten.
8. Beim direkten Aufruf ohne vorhandene Daten startet der Lastgangbereich mit
   seiner Import-/Demo-Auswahl und der Messkonzeptbereich mit seiner Startauswahl.
9. Offline-Fallback und Service-Worker-Cache berücksichtigen die neuen Pfade.

## Technische Leitplanken

- Die Lösung bleibt mit statischem Hosting und GitHub Pages kompatibel.
- Der vorhandene Hash-Einstieg wird nicht entfernt, damit bestehende Links
  nicht brechen.
- Eine spätere serverseitige Weiterleitung kann die Alias-Seiten ersetzen,
  ohne die interne Routinglogik erneut zu ändern.
