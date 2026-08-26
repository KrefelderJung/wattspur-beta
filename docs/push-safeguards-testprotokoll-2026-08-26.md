# Testprotokoll: Push-Schutz

## Szenario

- Remote enthält einen Commit, den der lokale Branch noch nicht kennt.
- Lokal existiert gleichzeitig ein eigener neuer Commit.
- Der Veröffentlichungsablauf wird ohne `-Push` gestartet.

## Erwartung

Der Ablauf bricht vor Tests und Veröffentlichung ab. Er empfiehlt einen
bewussten Rebase. Der Remote-Stand darf nicht überschrieben werden.

## Ergebnis

Bestanden. Das Skript meldete `Der Remote-Branch ist 1 Commit(s) neuer` und
beendete den Lauf mit Exit-Code 1. Es gab keinen Push und keinen Force-Push.
Die Prüfung lief ausschließlich in einem temporären lokalen Repository.

