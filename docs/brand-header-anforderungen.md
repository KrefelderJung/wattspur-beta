# Einheitlicher Wattspur-Schriftzug

## Ziel

Der Wattspur-Schriftzug soll auf Startseite, Werkzeug-Einstiegsseiten,
Messkonzept-Konfigurator, Lastganganalyse sowie Impressum, Datenschutz und
Kontakt gleich wirken. Besonders Icongröße, Abstand zum Text, Schriftgrad und
Unterzeile dürfen nicht vom jeweiligen Seitentyp abhängen.

## Akzeptanzkriterien

- Alle öffentlichen Kopfzeilen verwenden die gemeinsame Klasse
  `wattspur-brand` und `wattspur-brand-copy`.
- Die Varianten für „Energiewerkzeuge“, „Messkonzept-Konfigurator“ und
  „Lastganganalyse“ folgen denselben Abstands- und Schriftregeln.
- Die Beta-Markierung bleibt Bestandteil der Startseiten-Variante, verändert
  aber nicht die Position des Wattspur-Schriftzugs.
- Auf kleinen Bildschirmen werden Icon und Unterzeile proportional verkleinert,
  ohne Überlauf oder abgeschnittene Beschriftung.
- Alle Seiten laden denselben Cache-Busting-Stand von `styles.css`.
- Der Markenlink bleibt per Tastatur erreichbar und führt zur Werkzeugauswahl.

## Bewusste Abgrenzung

Das reduzierte Symbol in der mobilen Lastgang-Seitenleiste bleibt ein eigenes
Navigationssymbol. Es ist kein zweiter Schriftzug und wird deshalb nicht auf
die Breite des vollständigen Headers vergrößert.
