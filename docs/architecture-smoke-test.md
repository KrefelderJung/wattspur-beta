# Architektur-Smoke-Test

Der Smoke-Test prüft die technische Grundstruktur des Messkonzept-Konfigurators,
bevor ein Browser-Test oder eine optische Prüfung beginnt. Er ist kein Ersatz
für die fachliche Prüfung der Messkonzepte. Er soll lediglich verhindern, dass
beim Auslagern eines Moduls versehentlich eine Datei, eine Schnittstelle oder
die Ladereihenfolge beschädigt wird.

## Aufruf

Im Projektordner `Wattspur`:

```text
node tests/architecture-smoke-test.js
```

Der Test braucht keine zusätzlichen Pakete und verändert keine Projektdateien.

## Was geprüft wird

- Alle aktiven Messkonzept-Module sind vorhanden.
- `index.html` lädt die Module in der vorgesehenen Reihenfolge.
- Jedes Modul stellt seine vereinbarte öffentliche Schnittstelle bereit.
- Fachliche Kernmodule bleiben frei von direkten DOM-Messungen.
- Das bereinigte Prüfregelwerk enthält nur aktive Regel-IDs; entfernte Hinweise
  tauchen nicht wieder im UI- oder Regelcode auf.
- Die Version des Regelwerks ist in der Regelwerksdokumentation nachvollziehbar.
- Alle aktiven Konfigurator-Module sind im Service-Worker für den Offline-Betrieb
  registriert und an eine gemeinsame Cache-Version gebunden.
- Die geprüften JavaScript-Dateien sind syntaktisch gültig.

## Akzeptanzkriterium

Der Befehl muss mit Exit-Code `0` und der Meldung
`Architektur-Smoke-Test: OK` enden. Bei einem Fehler wird jede verletzte
Leitplanke einzeln ausgegeben. Dadurch ist er auch für eine spätere CI-Prüfung
oder einen Release-Check geeignet.
