# SEO- und URL-Anforderungen

Stand: 17.08.2026

## Ziel

Wattspur soll über verständliche, stabile Einstiegsseiten gefunden werden. Die
eigentliche Anwendung darf intern weiterhin aus einer gemeinsamen HTML-Datei
bestehen. Suchmaschinen und Menschen erhalten davor aber klare Seiten für die
Startseite, die Lastganganalyse und den Messkonzept-Konfigurator.

## Festgelegte URLs

| Zweck | Stabile URL | Funktion |
| --- | --- | --- |
| Werkzeugauswahl | `/` | Dachmarke und Auswahl der beiden Werkzeuge |
| Lastganganalyse | `/lastgang-analyse.html` | Indexierbare Kurzseite mit Einstieg in `index.html#lastgang` |
| Messkonzept | `/messkonzept-konfigurator.html` | Indexierbare Kurzseite mit Einstieg in `index.html#messkonzept` |
| Kontakt | `/kontakt.html` | Kontaktmöglichkeit |
| Impressum | `/impressum.html` | Betreiberangaben |
| Datenschutz | `/datenschutz.html` | Datenschutzhinweise |

Query-Parameter wie `?tool=lastgang` werden nicht mehr als öffentlicher
Einstieg verwendet. Alte Links werden aus Kompatibilitätsgründen beim Laden
auf den Hash-Einstieg `#lastgang` bereinigt.

## SEO-Mindeststandard pro indexierbarer Seite

Jede Kernseite benötigt:

1. einen eindeutigen `<title>`;
2. eine kurze, verständliche Meta-Beschreibung;
3. `robots` mit `index,follow`, sofern die Seite gefunden werden soll;
4. einen absoluten Canonical-Link unter `https://wattspur.de/`;
5. mindestens einen sichtbaren Einstiegstext mit der Suchintention;
6. eine interne Verlinkung zur Werkzeugauswahl oder zum passenden Werkzeug.

Tests und interne Dokumentation werden nicht indexiert. `robots.txt` verweist
auf `sitemap.xml` und schließt Test-, Backup- und Dokumentationsbereiche aus.

## Akzeptanzkriterien

- Die Startseite verlinkt Lastganganalyse und Messkonzept als echte lokale
  HTML-Links.
- Kein öffentlicher Kernlink verwendet den Query-Parameter `tool=lastgang`.
- Die sechs indexierbaren Seiten besitzen Titel, Beschreibung, Robots-Angabe
  und Canonical-Link.
- Sitemap und robots.txt enthalten nur die gewünschten öffentlichen Seiten.
- `tests/seo-test.js` prüft diese Regeln statisch.
- `tests/link-check-test.js` prüft weiterhin, dass lokale Ziele tatsächlich
  vorhanden sind.
- Der Offline-Cache enthält die beiden SEO-Einstiegsseiten und wird bei jeder
  Änderung an diesen Regeln hochgezählt.

## Grenzen

Die Tests prüfen die technische Voraussetzung für Auffindbarkeit. Sie können
nicht garantieren, dass Google oder andere Suchmaschinen eine Seite tatsächlich
aufnehmen oder auf einer bestimmten Position anzeigen. Dafür sind zusätzlich
eine veröffentlichte Domain, eine aktuelle Sitemap und später eine Prüfung in
den jeweiligen Webmaster-Werkzeugen erforderlich.
