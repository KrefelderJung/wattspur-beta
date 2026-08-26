# Browser-Smoke-Test und Tablet-Prüfung

## Zweck

Dieser Test prüft die wichtigsten Wege aus Sicht eines Anwenders. Er ergänzt
die automatisierten JavaScript- und Architekturtests, ersetzt aber keinen
echten Test auf einem physischen Android- oder iOS-Tablet.

## Akzeptanzkriterien

- Die Startseite öffnet beide Werkzeuge über funktionierende Links.
- Der Messkonzept-Konfigurator öffnet den freien Konfigurator und mindestens
  eine Vorlage.
- HAK und Zähler lassen sich auswählen und das Objektfenster öffnet sich.
- Die PNG-Aktion meldet einen erfolgreichen Download. Die PDF-Aktion bleibt
  erreichbar und darf keine unverständliche Fehlermeldung anzeigen.
- Der Lastgangbereich öffnet den Dateneditor ohne Importfehler und lädt beide
  Demo-Profile.
- Die Rücknavigation über das Wattspur-Logo führt aus beiden Werkzeugen zurück
  zur Werkzeugauswahl.
- Kontakt, Impressum, Datenschutz und Lizenz sind aus beiden Werkzeugen
  erreichbar.
- Die Oberfläche bleibt bei einer breiten Tablet-Ansicht mit 1024 x 768 Pixeln
  und einer schmalen Ansicht mit 768 x 1024 Pixeln bedienbar. Die Seitenbreite
  erzeugt keinen unerwarteten horizontalen Seiten-Scroll.
- Die Testansicht wird nach einer Größenprüfung wieder auf die Standardgröße
  zurückgesetzt.

## Bewusste Grenzen

Eine simulierte Fenstergröße prüft die responsive Anordnung, aber nicht die
vollständige Touch- und Pointer-Implementierung eines echten Geräts. Für die
Freigabe auf Tablets bleibt deshalb ein kurzer manueller Test mit mindestens
einem Android- und einem iPad-Gerät erforderlich. Der echte Microsoft-Edge-
Browser kann in dieser Umgebung nicht direkt automatisiert werden; dort wird
derselbe Ablauf manuell wiederholt.

## Durchführungsreihenfolge

1. Startseite öffnen und beide Werkzeuglinks prüfen.
2. Im Messkonzept-Konfigurator den freien Konfigurator öffnen, HAK auswählen,
   Projektangaben öffnen und PNG auslösen.
3. Im Lastgang-Tool Dateneditor, Hausverbrauch-Demo und Industrie-Demo öffnen.
4. Aus beiden Werkzeugen über das Logo zurückkehren.
5. Den Ablauf in 1024 x 768 und 768 x 1024 wiederholen.
6. Den Ablauf auf einem echten Android-Tablet und einem iPad wiederholen.

