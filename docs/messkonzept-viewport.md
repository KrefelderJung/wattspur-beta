# Viewport-Modul des Messkonzepts

Stand: 23.08.2026

`js/messkonzept/viewport.js` kapselt die Bedienung der Zeichenfläche. Es
enthält ausschließlich:

- Zoom, Zurücksetzen und „Einpassen“ über eine schwebende Symbolleiste direkt
  am Editor
- Zentrierung der Parallelansicht
- Größenbeobachtung nach Layoutänderungen
- Verschieben mit linker Maustaste auf freier Fläche, Leertaste + linker
  Maustaste oder mittlerer Maustaste
- Der HAK bleibt ein reines Auswahlobjekt. Ein Klick öffnet sein Objektfenster;
  er wird nicht als besonderer Pan-Griff verwendet.
- Der dynamische Arbeitsraum für verschiebbare Infoboxen gehört zum
  Annotationsmodul. Er kann bei Bedarf an allen vier Rändern wachsen, ohne die
  Topologie oder Leitungsgeometrie zu verändern.

Das Modul kennt keine Zähler, Anlagen oder fachlichen Regeln. Es erhält über
`createViewportController(...)` nur den aktuellen Zustand, die Canvas-Elemente
und einen Callback, der die Leitungsgeometrie neu berechnet. Dadurch kann eine
Änderung an Zoom oder Pan keine Messzähler-Hierarchie verändern.

`messkonzept.js` verwendet aus Kompatibilitätsgründen weiterhin die bisherigen
Funktionsnamen (`mkChangeCanvasZoom`, `mkObserveConnectorGeometry` usw.). Diese
Funktionen sind jetzt nur noch kleine Delegations-Wrapper. Neue Viewport-Logik
gehört ab jetzt ausschließlich in dieses Modul.
