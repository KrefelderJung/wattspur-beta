# Architektur und Ablauf: Push-Schutz

## Grundidee

Der Veröffentlichungsablauf ist ein vorgeschaltetes Sicherheitsgate. Er trennt
vier Zustände sauber voneinander:

1. **Arbeitsstand:** Der Arbeitsbaum muss sauber sein.
2. **Synchronisation:** `origin/main` wird mit dem lokalen `main` verglichen.
3. **Qualität:** Erst danach laufen die vollständigen Tests.
4. **Veröffentlichung:** Nur der bewusste Schalter `-Push` löst einen normalen,
   nicht erzwungenen Push aus. Anschließend wird der Remote-Commit verifiziert.

Der Ablauf liegt in `scripts/publish.ps1`. Die Kurzbefehle stehen in
`package.json`:

```text
npm run release:check   # prüfen, aber nichts veröffentlichen
npm run release:push    # prüfen und nach ausdrücklicher Absicht pushen
```

## Konfliktfall

Wenn GitHub neue Commits enthält, beendet das Skript den Lauf. Der sichere
Ablauf ist dann:

```text
git fetch origin
git pull --rebase origin main
# Konflikte in den betroffenen Dateien bewusst lösen
git add <geprüfte Dateien>
git rebase --continue
npm run test:all
npm run release:check
npm run release:push
```

Ein Force-Push ist bewusst nicht vorgesehen. Dadurch kann ein lokaler Fehler
keine bereits veröffentlichten Commits überschreiben.

## Verantwortungsgrenzen

Der Schutz verhindert technische Push- und Merge-Überraschungen. Er kann nicht
entscheiden, ob ein fachlicher Text oder eine Gestaltung richtig ist. Diese
Entscheidung bleibt Teil der normalen Prüfung und des Review-Prozesses.

GitHub Actions bleibt die zweite Kontrollinstanz. Ein lokaler grüner Lauf ist
notwendig, aber die CI-Prüfung nach dem Push bleibt ebenfalls verbindlich.

## Umsetzungsplan

- [x] Backup des Ausgangsstands unter `Backup/` erstellt.
- [x] Veröffentlichungs-Skript mit Preflight und Post-Push-Verifikation ergänzt.
- [x] Automatischen Schutztest ergänzt.
- [x] Anforderungen und Wiederherstellungsablauf dokumentiert.
- [ ] Nach einer weiteren Änderung den Ablauf einmal absichtlich mit einem
      veralteten Remote-Stand testen.