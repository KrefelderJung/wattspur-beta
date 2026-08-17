# Technische Anlagenfelder

## Ziel

Die technischen Zusatzfelder ergänzen die Messskizze um Angaben, die ein
Installateur oder Sachbearbeiter für die technische Abstimmung brauchen kann.
Sie verändern keine Messlogik und ersetzen keine Prüfung durch Fachbetrieb,
Netzbetreiber oder Lieferant.

## Felder

### PV, Steckersolar und Wind

- Nennleistung: vorhandenes Leistungsfeld, je nach Anlage in kWp oder kW.
- Wechselrichterleistung: optionale zugeordnete Gesamtleistung. Bei normaler
  PV und Wind in kVA, bei Stecker-PV in VA.
- Inbetriebnahme: vorhandenes Datumsfeld.

Mehrere Wechselrichter werden zunächst als gemeinsame Gesamtleistung erfasst.
Eine eigene Wechselrichterliste wäre erst bei echtem Bedarf sinnvoll.

Für Stecker-PV gilt als sichtbare Prüfgrenze 800 VA Wechselrichterleistung.
Mehrere Geräte am selben Netzanschlusspunkt werden für diese Orientierung
zusammengerechnet. Genau 800 VA sind zulässig; bei höheren oder fehlenden
Angaben erscheint ein Prüfhinweis. Die Regel orientiert sich an der
[Bundesnetzagentur-Information zu Balkon-Solaranlagen](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/Solaranlagen/Balkon_table.html)
und ersetzt keine technische oder rechtliche Prüfung.

### Batteriespeicher

- Speicherkapazität in kWh.
- Maximale Ladeleistung in kW.
- Maximale Entladeleistung in kW.
- Wechselrichterleistung in kVA.
- Netzbetriebsweise: Einspeisung und Netzbezug zum Laden bleiben getrennte
  Auswahlfelder.

## Bewusste Grenzen

Die Angaben lösen keine automatische Entscheidung zu EEG, § 14a EnWG,
Wärmepumpenprivilegierung oder Messkonzept aus. Unklare, leere oder gemischte
Einheiten werden nicht stillschweigend umgerechnet. Das verhindert, dass eine
Dokumentationsangabe versehentlich als fachliche Freigabe verstanden wird.

## Abnahmekriterien

1. Neue PV-, Wind- und Speicherobjekte erhalten die Felder leer und optional.
2. Die Felder sind im Objekteditor änderbar und in der Detailansicht sichtbar.
3. Bestehende gespeicherte Konzepte ohne die Felder bleiben lesbar.
4. Ein Regressionstest prüft Modell, Editor-Markup und Speicherfelder.
