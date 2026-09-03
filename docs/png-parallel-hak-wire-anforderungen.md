# PNG-Export der Parallelmessung: HAK-Zuleitung

## Ziel

Die native, fremdobjektfreie PNG-Ausgabe muss die sichtbare Zuleitung vom HAK
über den Parallel-Feed bis zu allen Parallelzweigen enthalten. Sie darf dabei
nicht von CSS-Pseudoelementen abhängen, weil diese im Edge-Fallback fehlen
können.

## Abnahmekriterien

- Im Parallelmodus verbindet ein durchgehender SVG-Leitungszug den HAK mit dem
  gemeinsamen Feed, dem Bus und jedem sichtbaren Basiszähler.
- Die Leitungskoordinaten werden aus den aktuell gerenderten DOM-Ankern und
  derselben Bühnen-Skalierung wie Karten und Infoboxen berechnet.
- Im gemeinsamen Messmodus bleibt die vorhandene HAK-Zähler-Zuleitung erhalten;
  es entstehen keine doppelten Leitungen.
- Die Korrektur betrifft nur den PNG-Fallback. PDF-Ausgabe und Editorzustand
  bleiben unverändert.
- Ein automatisierter Regressionstest schützt Funktion, Einbau in die native
  SVG-Quelle und die Edge-kompatiblen Parallel-Selektoren.
