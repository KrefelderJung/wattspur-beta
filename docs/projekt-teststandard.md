# Wattspur – verständlicher Teststandard

Dieses Dokument ist der Spickzettel für die technische Qualitätssicherung. Ein Test ist keine Garantie für eine fachliche Genehmigung; er verhindert vor allem, dass eine Änderung unbemerkt eine andere Funktion beschädigt.

## Die fünf Testebenen

1. **Regel- und Rechentests (Unit-Tests)**

   Prüfen eine einzelne Funktion mit bekannten Eingaben und erwarteten Ergebnissen. Beispiele: Leistungsgrenze 4,2 kW, Energie aus 15-Minuten-Werten, Datenqualitätsquote und aktive Prüfregel-IDs.

2. **Zustands- und Topologietests**

   Prüfen, ob Zähler, Anlagen, Elternbeziehungen und leere Sammelschienen fachlich erhalten bleiben. Besonders wichtig sind Z1 → Z2 → Z3, ein Einzelzähler mit nur einer Anlage, das Hinzufügen einer zweiten Anlage und das Löschen der letzten Anlage.

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

   Prüfen die Architektur: Modell, Regeln, Layout, Leitungen, Drag-and-drop, Export, Historie und Interaktion kommunizieren nur über ihre vorgesehenen Schnittstellen. Der `Architektur-Smoke-Test` und die Tests in `tests.html` sichern das ab.

4. **Browser- und Bedienungstests**

   Prüfen das, was ein Anwender sieht und bedient: Startvorlagen, beide PDF-Druckansichten (kompakte Skizze und Gesamtexport), Tastatur-/Maus-Navigation, Zoom, mobile Darstellung, Dialoge, sichtbare Drop-Ziele und die drei Planstatus-Schaltflächen.

5. **Release- und Sicherheits-Gates**

   Prüfen vor einer Veröffentlichung, ob alle Dateien vorhanden sind, Scripts syntaktisch geladen werden, rechtliche Seiten erreichbar sind, der Offline-Cache aktuell ist und der Messkonzept-Kern keine versteckten Netzwerkzugriffe enthält. Dafür gibt es zusätzlich:

   ```text
   node tests/architecture-smoke-test.js
   node tests/preset-loader-test.js
   node tests/messlogic-invariants-test.js
   node tests/meter-rail-spacing-test.js
   node tests/project-quality-test.js
   node tests/link-check-test.js
   node tests/pdf-export-variants-test.js
   ```

   Der Link-Check prüft lokale Verweise bei jedem Lauf. Externe Quellen werden
   bewusst separat geprüft:

   ```text
   node tests/link-check-test.js --external
   ```

   Ein HTTP-Status beweist nicht, dass eine Rechts- oder Fachquelle inhaltlich
   noch aktuell ist. Wichtige Quellen müssen deshalb zusätzlich regelmäßig
   manuell geprüft werden.

   Der Messlogik-Invarianten-Test prüft die fachlichen Grundregeln über eine
   komplette Änderungsfolge: Zähler anlegen, Sammelschiene erweitern, erste
   Anlage löschen, anschließend erneut prüfen. Zusätzlich werden doppelte
   Darstellung, falsche Messbereiche und Zählerzyklen erkannt. So wird nicht
   nur getestet, ob eine einzelne Funktion läuft, sondern ob der Zählerbaum
   nach mehreren Änderungen weiterhin konsistent ist.

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
5. alle drei Node-Tests und die relevante Suite in `tests.html` erfolgreich sind.

Bei einer fachlichen Regel wird außerdem die Regelwerksversion in `docs/messkonzept-regelwerk.md` angepasst.
