# Anforderung: Unaufdringlicher Hinweis zum Inbetriebnahmedatum

## Zweck

Das Inbetriebnahmedatum kann fachliche Folgehinweise und Bestandsregeln genauer
einordnen. Es soll deshalb sichtbar angeboten werden, ohne Nutzer zu einer
Angabe zu zwingen, die sie für eine reine Skizze nicht benötigen.

## Geltungsbereich

Die zentrale Info kann sich auf folgende Objekte beziehen:

- Erzeugungsanlagen
- steuerbaren Verbrauchseinrichtungen
- Nachtspeicherheizungen

Bei steuerbaren Verbrauchseinrichtungen steht das Datum zusätzlich als
Eingabefeld zur Verfügung, weil die bestehende Prüfregel zwischen Anlagen vor
und ab dem 01.01.2024 unterscheiden kann.

## Darstellung

Der Hinweis erscheint ausschließlich im zentralen Prüfstatus. Im Objekteditor
bleibt nur das optionale Datumsfeld sichtbar. Dadurch bleiben alle fachlichen
Meldungen an einer Stelle und die Objektkarten übersichtlich.

## Akzeptanzkriterien

1. Bei leerem Datum erscheint genau ein kleiner, neutral formulierter Hinweis
   im Prüfstatus.
2. Der Hinweis blockiert weder das Speichern noch den freien Aufbau einer Skizze.
3. Sobald ein gültiges Datum eingetragen ist, verschwindet der Hinweis sofort
   aus dem Prüfstatus.
4. Die Meldung erscheint nicht als Fehler und verändert den Prüfstatus nicht.
5. Die bestehende NSH-Prüfregel zu historischen Tarif- und Messbedingungen
   bleibt im zentralen Prüfstatus erhalten.
6. Datum und Hinweis funktionieren in Einfach- und Detailansicht sowie per
   Tastaturbedienung.

## Nicht-Ziele

- Keine automatische rechtliche Bewertung allein aus einem fehlenden Datum.
- Keine Pflichtangabe für eine PDF-Skizze.
- Keine Änderung der Topologie oder Leitungsgeometrie.
