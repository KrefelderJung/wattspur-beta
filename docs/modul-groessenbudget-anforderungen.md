# Modulgrößen und Architektur-Wachstum

## Ziel

Die Messkonzept-Architektur soll nicht wieder in wenige unübersichtliche
Dateien zurückwachsen. Ein Größenbudget dient als Frühwarnung. Es erzwingt
keine künstliche Aufteilung, wenn eine Funktion fachlich zusammengehört.

## Aktuelle Budgets

| Modul | Warnschwelle |
| --- | ---: |
| `export.js` | 90.000 Bytes |
| `annotations.js` | 65.000 Bytes |
| `layout.js` | 45.000 Bytes |
| `rules.js` | 45.000 Bytes |
| `drag-drop.js` | 45.000 Bytes |
| `canvas-renderer.js` | 45.000 Bytes |
| `model.js` | 35.000 Bytes |

Die Schwellen liegen bewusst etwas über dem aktuellen Stand. Ein Überschreiten
ist kein automatischer Fehler, sondern verlangt eine bewusste Entscheidung:
Aufteilung, begründete Ausnahme oder Entfernung toten Codes.

## Abnahmekriterien

- Der Größen-Test läuft im normalen Node-Testlauf.
- Jede Überschreitung nennt Datei, aktuelle Größe und Budget.
- Die Prüfung verändert keine Dateien und benötigt keinen Browser.
- Eine Aufteilung darf keine direkte globale Zustandsabhängigkeit neu einführen.
- Vor einer Aufteilung müssen fachliche Grenze, Regressionstest und Backup
  dokumentiert sein.

