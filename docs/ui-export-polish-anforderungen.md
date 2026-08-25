# UI- und Export-Politur

## Ziel

Infoboxen sollen auch in Microsoft Edge flüssig verschiebbar und bei allen
Objekttypen direkt bearbeitbar sein. Exporte sollen die Skizze und die
Projektangaben platzsparend und nachvollziehbar ausgeben.

## Abnahmekriterien

1. Eine Infobox folgt dem Pointer höchstens um einen sichtbaren Frame verzögert
   und bleibt auch bei Edge-Pointerbewegungen bedienbar.
2. Doppelklick auf ein sichtbares Infobox-Feld öffnet dessen bearbeitbaren Wert.
   Das gilt für HAK, Zähler und alle Anlagenobjekte. Ein Klick außerhalb
   beendet die Eingabe und übernimmt den Wert. Bei mehrzeiligen Bemerkungen
   öffnet sich die Karte während der Bearbeitung vorübergehend vollständig,
   sodass kein internes Scrollen nötig ist.
3. Die Verbindungslinie endet an der sichtbaren Außenkante des Ursprungsobjekts.
4. Ein Bildexport enthält ausschließlich die Skizze und einen dezenten,
   kleinen Wattspur-Hinweis im unteren rechten Bereich.
5. Der PDF-Hinweis erscheint nicht als großer Block über der Skizze, sondern in
   einer zurückhaltenden Fußzeile.
6. Projektangaben nutzen eine kompakte zweizeilige Anordnung. Straße und
   Hausnummer werden als gemeinsame Standortangabe geführt.
7. Bestehende Messlogik, Zählerhierarchie und PDF-Leitungsgeometrie bleiben
   unverändert.

## Bewusste technische Grenze

Ein Firmenbrowser kann durch Richtlinien, Energiesparmodus oder deaktivierte
Grafikbeschleunigung langsamer reagieren. Der Code darf deshalb keine
Netzwerkverbindung voraussetzen. Pointer-Ereignisse werden lokal und per
`requestAnimationFrame` gebündelt; eine Firewall ist für dieses Verhalten nicht
erforderlich.
