# Logo-Navigation zur Werkzeugauswahl

## Ziel

Ein Klick auf den Wattspur-Schriftzug oder das Wattspur-Logo führt aus allen
Werkzeugansichten zuverlässig zurück zur Werkzeugauswahl.

## Akzeptanzkriterien

- Der Rückweg funktioniert im Lastgangbereich und im Messkonzeptbereich.
- Der Rückweg funktioniert auch bei lokalen `file://`-Aufrufen, bei denen sich
  nur der URL-Hash ändert.
- Nach dem Wechsel ist die Werkzeugauswahl sichtbar und die Werkzeugansicht
  ausgeblendet.
- Die Fach- und Dateidaten des geöffneten Werkzeugs werden dabei nicht
  verändert.
- Eine Regression wird im URL-Routing-Test geprüft.
