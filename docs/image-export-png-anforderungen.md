# PNG-Bildexport der Messskizze

## Ziel

Der Button für den Bildexport soll eine normale PNG-Datei herunterladen. Die
Datei enthält ausschließlich die Messskizze mit einem kleinen Hinweis auf `Wattspur.de`.

## Abnahmekriterien

1. Der Export verwendet den Dateityp `image/png` und schlägt einen Dateinamen mit
   der Endung `.png` vor.
2. Die Skizze wird lokal im Browser über Canvas erzeugt. Es werden keine externen
   Daten übertragen.
3. Infoboxen werden nur exportiert, wenn mindestens ein Feld einen Wert enthält. Leere
   Infoboxen und ihre Bezugslinien bleiben aus dem Bildexport ausgeschlossen.
4. Wenn der Browser die Bildumwandlung nicht durchführen kann, erscheint eine
   verständliche Fehlermeldung statt eines scheinbar erfolgreichen Downloads.

## Zusätzliche Rendering-Anforderung
Der PNG-Export muss die sichtbaren HTML-Objekte, ihre Positionen und Farben lokal in die Exportkopie übernehmen. Eine SVG-Zwischenstufe darf nicht dazu führen, dass die Skizze im fertigen PNG fast leer bleibt.

## Leitungs- und Hintergrunddarstellung
Der PNG-Export verwendet einen hellen, undurchsichtigen Hintergrund. Sammelschienen, Leitungswege und Knoten werden als eigene native SVG-Ebene in die PNG-Zwischenstufe übernommen, damit die Verbindungen auch außerhalb der HTML-Darstellung sichtbar bleiben.

## Infoboxen und sichtbarer Rahmen
Infoboxen mit eingetragenen Werten werden zusammen mit den Objekten exportiert. Leere, nur aktivierte Infoboxen werden aus der Exportkopie entfernt. Ihr sichtbarer Rahmen und ihre Verbindungslinien erweitern den Bildausschnitt nur dort, wo tatsächlich Inhalt vorhanden ist. Eine im Editor manuell vergrößerte Infobox wird im PNG auf die tatsächlich benötigte Texthöhe zurückgeführt, damit kein leerer Raum entsteht. Die Editor-Steuerknöpfe zum Ausblenden und Vergrößern der Infoboxen sowie die Löschschaltflächen der Objekte werden nicht mit ausgegeben.

SVG-Icons werden mit ihrem Namespace exportiert. Infobox-Texte werden zusätzlich als native SVG-Schrift ausgegeben, damit sie auch in Browsern sichtbar bleiben, die Text in foreignObject unzuverlässig rendern. Sie erhalten im hellen PNG-Hintergrund einen eigenen dunklen Kontrast, ohne die Editorfarben zu verändern. Die native SVG-Schrift ist dabei die einzige sichtbare Textquelle; die HTML-Textkopie bleibt für die Kartenhöhe erhalten, wird aber vollständig transparent dargestellt. Die Beschriftung der Eigentumsgrenze wird im hellen Export transparent mit dunkler Schrift dargestellt, während die gestrichelte Grenze erhalten bleibt.
## Browser-Kompatibilität

Der Bildexport verwendet auf normalen Webseiten eine lokale SVG-Blob-URL. Wenn Edge
diese Quelle wegen `foreignObject` nicht rendert, wird eine lokale SVG-Data-URL versucht.
Auf `file://`-Seiten wird zuerst eine reine native SVG-Kopie ohne `foreignObject`
verwendet. Dadurch bleibt der Export auch bei lokal geöffneten Dateien möglich.
Für die PNG-Erzeugung steht zusätzlich ein `canvas.toDataURL("image/png")`-Fallback
bereit, falls `canvas.toBlob` fehlt oder keine Datei zurückliefert. Alle Wege bleiben
lokal im Browser und übertragen keine Skizzen- oder Projektdaten.
