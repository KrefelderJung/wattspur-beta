# Wattspur – verständlicher Teststandard

Dieses Dokument ist der Spickzettel für die technische Qualitätssicherung. Ein Test ist keine Garantie für eine fachliche Genehmigung; er verhindert vor allem, dass eine Änderung unbemerkt eine andere Funktion beschädigt.

## Die sechs Testebenen

1. **Regel- und Rechentests (Unit-Tests)**

   Prüfen eine einzelne Funktion mit bekannten Eingaben und erwarteten Ergebnissen. Beispiele: Leistungsgrenze 4,2 kW, Energie aus 15-Minuten-Werten, Datenqualitätsquote und aktive Prüfregel-IDs.

2. **Zustands- und Topologietests**

   Prüfen, ob Zähler, Anlagen, Elternbeziehungen und leere Sammelschienen fachlich erhalten bleiben. Besonders wichtig sind Z1 → Z2 → Z3, ein Einzelzähler mit nur einer Anlage, das Hinzufügen einer zweiten Anlage und das Löschen der letzten Anlage. Ein belegter Zähler darf nicht gelöscht werden. Erst wenn alle zugeordneten Anlagen entfernt sind, darf der leere anlagenbezogene Messpunkt bewusst entfernt werden.

   Für jeden Drop auf einen sichtbaren Zusatz-Zähler gilt zusätzlich: Der
   allgemeine Zähler-Anker und der Gruppen-Anker müssen zum gleichen Messpunkt
   führen. Fehlt beim Browser-Treffer der Gruppen-Anker, darf eine neue Anlage
   deshalb nicht in die Root-Schiene fallen. Der Test dafür verwendet bewusst
   nur die Zähler-ID als Drop-Ziel und prüft die gespeicherte `meterId`.

   **Z4-Drop als End-to-End-Regel:** Ein Drop auf den sichtbaren Anlagenast
   eines Zusatz-Zählers muss auch dann am richtigen Messpunkt ankommen, wenn
   der Browser nicht das innere Zähler-Symbol, sondern den Kartenast oder den
   transparenten Trefferbereich meldet. Der Regressionstest simuliert genau
   diesen Ereignispfad. Nach dem zweiten Objekt müssen beide Anlagen dieselbe
   `meterId` behalten, in einer eigenen Unter-Sammelschiene erscheinen und
   dürfen nicht zusätzlich in der Root-Sammelschiene gerendert werden. Damit
   wird nicht nur die Datenzuordnung, sondern auch die sichtbare Topologie
   gegen den ursprünglichen Z4-Fehler abgesichert.

3. **Modultests**

   Prüfen die Architektur: Modell, Regeln, Layout, Leitungen, Drop-Zonen,
   Drag-and-drop, Export, Historie und Interaktion kommunizieren nur über ihre
   vorgesehenen Schnittstellen. Der `Architektur-Smoke-Test` und die Tests in
   `tests.html` sichern das ab. Der Geometrie-Nachlauf und die
   Messbereich-Komposition werden dabei als eigene Laufzeit- und Rendergrenzen
   auf Ladeposition, DOM-Freiheit und stabile Reihenfolge geprüft.

4. **Browser- und Bedienungstests**

   Prüfen das, was ein Anwender sieht und bedient: Startvorlagen, beide PDF-Druckansichten (kompakte Skizze und Gesamtexport), Tastatur-/Maus-Navigation, Zoom, mobile Darstellung, Dialoge, sichtbare Drop-Ziele und die drei Planstatus-Schaltflächen.

5. **Release- und Sicherheits-Gates**

   Prüfen vor einer Veröffentlichung, ob alle Dateien vorhanden sind, Scripts syntaktisch geladen werden, rechtliche Seiten erreichbar sind, der Offline-Cache aktuell ist und der Messkonzept-Kern keine versteckten Netzwerkzugriffe enthält. Dafür gibt es zusätzlich:

   ```text
   node tests/architecture-smoke-test.js
   node tests/preset-loader-test.js
   node tests/messlogic-invariants-test.js
   node tests/messlogic-replay-test.js
   node tests/meter-hierarchy-regression-test.js
   node tests/architecture-boundaries-test.js
   node tests/data-editor-module-test.js
   node tests/hak-voltage-test.js
   node tests/steuve-total-power-test.js
   node tests/stecker-pv-limit-test.js
   node tests/meter-rail-spacing-test.js
   node tests/project-quality-test.js
   node tests/link-check-test.js
   node tests/seo-test.js
   node tests/pdf-export-variants-test.js
   ```

   Der SteuVE-Test deckt dabei drei fachliche Fälle ab: eine einzelne
   Wärmepumpe mit Gesamtleistung einschließlich Heizstab, die Summierung
   mehrerer SteuVE hinter demselben Zähler und eine Bestandsanlage mit
   Inbetriebnahme vor dem 01.01.2024. Ein Datum ab dem Stichtag darf den
   Bestandsanlagenhinweis nicht auslösen.

   Der Stecker-PV-Test prüft die Grenze von 800 VA, die Umrechnung älterer
   Eingaben in kVA, die Summierung mehrerer Geräte am selben Messpunkt und den
   Hinweis bei fehlender Wechselrichterleistung.

   Der Link-Check prüft lokale Verweise bei jedem Lauf. Externe Quellen werden
   bewusst separat geprüft:

   ```text
   node tests/link-check-test.js --external
   ```

   Ein HTTP-Status beweist nicht, dass eine Rechts- oder Fachquelle inhaltlich
   noch aktuell ist. Wichtige Quellen müssen deshalb zusätzlich regelmäßig
   manuell geprüft werden.

   Der SEO-Test prüft die stabilen Einstiegsseiten, eindeutige Meta-Titel und
   Beschreibungen, Canonical-Links, robots.txt, Sitemap und die Abwesenheit
   öffentlicher Query-Parameter für die Lastganganalyse.

   Der Messlogik-Invarianten-Test prüft die fachlichen Grundregeln über eine
   komplette Änderungsfolge: Zähler anlegen, Sammelschiene erweitern, erste
   Anlage löschen, anschließend erneut prüfen. Zusätzlich werden doppelte
   Darstellung, falsche Messbereiche und Zählerzyklen erkannt. So wird nicht
   nur getestet, ob eine einzelne Funktion läuft, sondern ob der Zählerbaum
   nach mehreren Änderungen weiterhin konsistent ist.

   Der Zähler-Hierarchie-Regressionstest prüft zusätzlich den kritischen
   Einzelanschluss eines Unterzählers, die Erweiterung zur zweiten Anlage,
   erhaltene leere Sammelschienen und denselben Ablauf im Parallelzweig.
   Der Architektur-Grenzen-Test verhindert, dass Layoutformeln wieder als
   zweiter Fallback im DOM-Modul dupliziert werden.

   Der Dateneditor-Modultest lädt `js/lastgang/data-editor.js` ohne Browser-
   Oberfläche. Er prüft, dass ein leerer 15-Minuten-Tagesbereich erzeugt wird,
   dass eine Zelländerung Leistung, Energie, Qualitätsstatus und Zählerstände
   konsistent aktualisiert und dass die öffentliche Editor-Schnittstelle
   vorhanden bleibt.

   Der HAK-Spannungsebenen-Test prüft, dass ein Konzept standardmäßig mit
   Niederspannung startet, die Auswahl Mittelspannung historienfähig speichert,
   beim Zurücksetzen wieder zum HAK zurückkehrt und unbekannte Werte sicher
   abfängt.

6. **Browser-Ablauftest**

   Öffnet die Anwendung über HTTP in einem isolierten Browserfenster und führt
   einen realistischen Bedienablauf aus: Messkonzept öffnen, freien
   Konfigurator starten, eine Erzeugungsanlage per Drag-and-Drop auf Z1 ziehen,
   zwischen gemeinsamer Messung und Parallelmessung wechseln und die Anlage
   wieder entfernen. Ein zweiter Ablauf baut einen Zusatzzaehler auf, fuegt eine
   zweite Anlage an diesen Messpunkt an und prueft, dass beide Karten in der
   richtigen Unter-Sammelschiene bleiben. Der Löschablauf prüft zusätzlich, dass
   ein belegter Zähler mit einer verständlichen Warnung geschützt wird, dass die
   Ersatzanlage nach dem Entfernen des ersten Zielobjekts am Messpunkt bleibt
   und dass die leere Unter-Sammelschiene bis zur bewussten Zählerlöschung
   sichtbar bleibt. Dieser Test ergänzt Quelltext- und DOM-freie Prüfungen um
   die tatsächliche Verkabelung und Bedienung der Oberfläche. Die acht
   Startvorlagen werden außerdem einzeln geöffnet. Dabei werden Messmodus,
   Objektanzahl, eindeutige Karten und die erwartete Kaskaden-Sammelschiene
   kontrolliert. Beide PDF-Ausgaben werden ebenfalls im Browser ausgelöst:
   Der Skizzenexport enthält Kopf, Projektangaben, Skizze und Prüfstatus, der
   Gesamtexport zusätzlich die vollständigen Objektdetails. Beide Varianten
   müssen den Browser-Druckaufruf erreichen und anschließend sauber aufräumen.
   Ein zusätzlicher Lauf simuliert eine Smartphone-Breite von 390 Pixeln.
   Dabei müssen Einstieg, Bausteinleiste, Messmodus, Darstellung und beide
   Exportbuttons erreichbar bleiben. Eine breite Skizze darf innerhalb des
   Zeichenbereichs horizontal verschiebbar sein, darf aber keinen horizontalen
   Überlauf der gesamten Seite erzeugen.

## Was diese Tests nicht beweisen

- Sie ersetzen keine Prüfung durch Elektrofachbetrieb, Messstellenbetreiber oder Verteilnetzbetreiber.
- Sie beweisen nicht, dass ein reales Messkonzept rechtlich, tariflich oder technisch genehmigungsfähig ist.
- Ein synthetischer Lastgang ist kein geeichter Messwert.
- Ein Lauf mit 4.000 Profilen ist zunächst ein Belastungs- und Speicherproblem, kein fachlicher Beweis für die Kapazitätsbestellung. Für echte Großmengen braucht es einen gesonderten Performance-Test mit definiertem Browser, Speicherlimit und Abbruchkriterium.

## Akzeptanzkriterium für neue Änderungen

Eine Änderung gilt erst als abgeschlossen, wenn:

1. der normale Anwendungsfall funktioniert,
2. mindestens ein Fehler- oder Leerfall getestet ist,
3. die betroffene Modulgrenze und der Offline-Cache aktualisiert sind,
4. die Browser-/Mobilbedienung geprüft ist,
5. alle Node-Tests und die relevante Suite in `tests.html` erfolgreich sind,
6. der Browser-Ablauftest erfolgreich ist. Ein grüner Quelltexttest allein
   beweist nicht, dass die sichtbare Bedienung funktioniert.

Bei einer fachlichen Regel wird außerdem die Regelwerksversion in `docs/messkonzept-regelwerk.md` angepasst.
