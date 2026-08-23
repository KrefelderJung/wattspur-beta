# Objekteditor: Bemerkung statt editierbarer Bezeichnung

## Entscheidung

Die automatisch erzeugte Objektkennung bleibt fachlich und sichtbar erhalten,
zum Beispiel `Z1`, `PV1` oder `Wallbox 1`. Sie wird nicht als freies Eingabefeld
im Objektfenster wiederholt. Ein manuell pflegbares Feld „Bezeichnung“ entfällt.

Für eigene Zusatzinformationen gibt es ein einziges Freitextfeld „Bemerkung“.
Dieses steht bei Anlagen und Verbrauchern immer am Ende des Formulars. Bei
Zählern und dem HAK bleibt es ebenfalls das letzte Feld.

## Infoboxen

Infoboxen sind standardmäßig ausgeschaltet, damit eine neue Skizze übersichtlich
bleibt. Der Schalter steht neben der Objektüberschrift. Beim Einschalten werden
ausschließlich tatsächlich eingetragene oder bewusst ausgewählte technische
Angaben zusammengestellt. Automatische Objektarten, Standardwerte und
Platzhalter wie „Betriebsweise noch offen“ werden nicht als Infobox-Inhalt
wiederholt. Gibt es noch keine solchen Angaben, bleibt die Infobox leer und
wird nicht gerendert. Es ist keine zweite Auswahlmaske für einzelne Felder
erforderlich. Eine eingetragene Bemerkung wird automatisch sichtbar, damit sie
nicht unbemerkt bleibt.

## Akzeptanzkriterien

1. Kein Objektfenster rendert ein editierbares Feld mit der Beschriftung
   „Bezeichnung“.
2. Automatische Objektkennungen und Nummernkreise bleiben unverändert.
3. „Bemerkung“ ist in jedem Objektfenster das letzte Eingabefeld.
4. Neue Objekte starten mit ausgeschalteter Infobox.
5. Das Einschalten zeigt nur tatsächlich eingetragene oder bewusst
   ausgewählte Werte. Automatische Objektarten und offene Platzhalter werden
   nicht angezeigt; leere Infoboxen werden nicht gerendert.
6. Eine neue Bemerkung schaltet die Infobox automatisch ein; ein bewusstes
   Ausschalten ist danach weiterhin möglich.
7. Der Inhalt bleibt bei Drag-and-Drop, Undo/Redo und PDF-Export erhalten.
8. Das Bemerkungsfeld des HAK verwendet dieselbe Breite, Typografie und
   Eingabefläche wie die Bemerkungsfelder der übrigen Objekte.
