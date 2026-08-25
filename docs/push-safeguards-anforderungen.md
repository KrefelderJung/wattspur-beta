# Anforderungen: Sicherer GitHub-Push

## Ziel

Veröffentlichungen sollen nicht mehr an einem veralteten Remote-Stand, einem
unvollständigen Merge oder ungeprüften lokalen Dateien scheitern. Der Ablauf
muss für einen Nicht-ITler nachvollziehbar bleiben und darf niemals still
Dateien überschreiben.

## Verbindliche Anforderungen

1. Vor jedem Push wird der aktuelle Stand von `origin/main` abgerufen.
2. Ist GitHub weiter als der lokale Rechner, wird der Ablauf mit einer klaren
   Handlungsanweisung beendet. Ein automatischer Konfliktentscheid findet nicht
   statt.
3. Ein nicht sauberer Arbeitsbaum, ein laufender Merge, Rebase, Cherry-Pick
   oder eine Git-Sperrdatei blockiert den Push.
4. Vor dem Push laufen die vollständigen Wattspur-Tests über
   `npm run test:all`.
5. Es gibt keinen Force-Push und kein automatisches Staging oder Committen.
6. Der Push muss ausdrücklich mit `-Push` gestartet werden. Ohne diesen Schalter
   findet nur eine Vorprüfung statt.
7. Vor jedem Lauf werden Git-Status, Commit und Remote-Informationen unter
   `Backup/publish-runs/` protokolliert.
8. Nach dem Push wird geprüft, ob der lokale Commit tatsächlich auf
   `origin/main` angekommen ist.
9. Der Schutz selbst wird durch einen automatischen Test überwacht.

## Abnahmekriterien

- `node tests/publish-safeguard-test.js` ist grün.
- `npm run test:all` bleibt grün.
- Ein veralteter Remote-Stand führt zu einem kontrollierten Abbruch.
- Ein Push ohne `-Push` verändert GitHub nicht.
- Ein erfolgreicher Push wird durch einen identischen lokalen und entfernten
  Commit bestätigt.