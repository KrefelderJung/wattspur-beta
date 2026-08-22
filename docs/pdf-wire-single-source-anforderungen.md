# PDF-Leitungen: eine eindeutige Darstellungsquelle

## Ziel

Die Messskizze im PDF soll jede lange Leitung genau einmal darstellen. Die
bereits berechneten SVG-Pfade aus der Connector-Ebene sind dafür die führende
Quelle. HTML- und CSS-Hilfselemente dürfen im Druckklon keine zweite Leitung
über denselben Weg zeichnen.

## Abnahmekriterien

- Die isolierte PDF-Bühne trägt die Kennzeichnung `mk-print-geometry-svg-only`.
- Veraltete HTML-Leitungselemente werden nur im PDF-Klon entfernt oder
  ausgeblendet. Die Editoransicht und das Drag-and-Drop bleiben unverändert.
- HAK- und Parallelstrukturleitungen bleiben erhalten, weil sie keine doppelten
  Anlagenwege sind.
- Exakt gleiche SVG-Leitungspfade werden vor dem Einsetzen in die Connector-
  Ebene nur einmal ausgegeben.
- Eine breite Skizze bleibt vollständig im Druckrahmen und wird proportional
  verkleinert.
- Der Regressionstest `tests/pdf-wire-geometry-test.js` prüft die Regeln.

## Technische Grenze

Die PDF-Erzeugung erfolgt weiterhin über den Browser-Druckdialog. Eine echte
visuelle Prüfung braucht deshalb zusätzlich einen Browserlauf. Der statische
Regressionstest schützt die Leitungsquelle und die Druck-CSS-Regeln, ersetzt
aber keine fachliche Prüfung des Messkonzepts.
