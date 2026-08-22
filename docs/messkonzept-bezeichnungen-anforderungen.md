# Anforderungen: Messkonzeptbezeichnungen an Startvorlagen

## Ziel

Die häufigsten Startvorlagen zeigen eine standardisierte Messkonzeptzeile mit
Code und fachlicher Bezeichnung sowie eine kurze Erklärung. Die Darstellung soll
Orientierung geben, ohne die bestehende Vorlage oder ihre Messlogik zu verändern.

## Abnahmekriterien

- Jede Vorlage mit bestätigter Zuordnung zeigt „Code: Bezeichnung“. Eine
  zusätzliche Kurzbeschreibung wird nur bei MK D1 angezeigt, weil dort die
  Erklärung für Einsteiger einen konkreten Mehrwert bietet.
- Code und Bezeichnung bleiben in den Katalogdaten zentral gespeichert.
- Karten ohne bestätigte Bezeichnung erhalten keine erfundene Bezeichnung.
- Die Bezeichnung ist auch im zugänglichen Namen der Schaltfläche enthalten.
- Lange Bezeichnungen umbrechen sauber und erzeugen keine horizontale
  Überlappung auf kleinen Bildschirmen.
- Das Laden und Bearbeiten der Vorlage bleibt unverändert.
- Die Zuordnung wird durch einen browserfreien Regressionstest abgesichert.
- Objekt-Tags bleiben die einzige visuelle Aufzählung der enthaltenen Objekte;
  der frühere doppelte große Objekttitel wird nicht erneut eingebaut.

## Bestätigte Zuordnungen

| Vorlage | Bezeichnung |
| --- | --- |
| Haushalt + PV | **MK A2: Überschusseinspeisung** |
| Haushalt + PV + Speicher | **MK C1: Überschusseinspeisung mit gemeinsamer Messung** |
| Haushalt + PV + Speicher + Wallbox | **MK C1: Überschusseinspeisung mit gemeinsamer Messung** |
| Haushalt + PV + Speicher + Wärmepumpe | **MK C1: Überschusseinspeisung mit gemeinsamer Messung** |
| Separater Wärmepumpenzähler | **MK Z1b: Steuerbare Verbrauchseinrichtung ohne weitere Verbraucher** |
| Separater Wallboxzähler | **MK Z1b: Steuerbare Verbrauchseinrichtung ohne weitere Verbraucher** |
| Wärmepumpen-Kaskade | **MK C3: Überschusseinspeisung mit Kaskadenmessung** |
| Wallbox-Kaskade | **MK C3: Überschusseinspeisung mit Kaskadenmessung** |
| Mieterstromgemeinschaft | **MK D1: Selbstversorgergemeinschaft** |

Die beiden gemeinsamen Messungen mit Wallbox beziehungsweise Wärmepumpe sind
als MK C1 eingeordnet. Die beiden Kaskaden-Vorlagen sind als MK C3 eingeordnet.
