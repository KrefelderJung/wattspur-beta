# Wattspur

Browserbasiertes Energie-Werkzeug – öffentliche Beta.

Wattspur bietet eine lokale Übersicht über Lastgänge und einen visuellen
Messkonzept-Konfigurator. Die Anwendung läuft ohne Benutzerkonto und ohne
Backend; importierte Dateien werden im Browser verarbeitet.

## Nutzung

Die Anwendung ist für unverbindliche Tests und interne Evaluierung gedacht.
Sie ersetzt keine fachliche Prüfung, Genehmigung oder Abstimmung mit einem
zugelassenen Elektrofachbetrieb und dem zuständigen Netzbetreiber.

Die Auswertungen und Messskizzen sind nicht als Abrechnungs-, Netzbetreiber-
oder Genehmigungsunterlage gedacht. Für Testdateien sind Zählpunkt-, Standort-
und sonstige personenbezogene Angaben vorher zu anonymisieren.

## Rechte und Lizenzen

Copyright © 2026 Salvatore Napolitano. Die Wattspur-eigenen Bestandteile sind
nicht zur freien Nutzung freigegeben. Für die begrenzte Beta-Evaluierung gilt
die [Wattspur Beta-Evaluierungslizenz](LICENSE.md).

Das öffentliche GitHub-Repository kann im Rahmen der GitHub-Plattform
einsehbar oder forkbar sein. Das ist keine allgemeine Erlaubnis zur Nutzung,
Veröffentlichung oder kommerziellen Verwertung des Quellcodes.

Drittanbieter-Bibliotheken und ihre Lizenzbedingungen sind in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) dokumentiert. Diese Hinweise
dürfen bei Kopien oder Weitergaben nicht entfernt werden.

KI-unterstützte Grafiken und Logos sind als solche nicht als exklusiv oder in
einem bestimmten Umfang urheberrechtlich geschützt zugesichert.

## Sicher veröffentlichen

Vor einem Push wird der Remote-Stand geprüft und der vollständige Testbestand
muss grün sein. Der sichere Ablauf verändert keine Dateien automatisch:

```text
npm run release:check   # nur prüfen
npm run release:push    # prüfen und bewusst pushen
```

Wenn GitHub inzwischen neuer ist, beendet Wattspur den Ablauf kontrolliert.
Dann zuerst die Änderungen mit `git pull --rebase origin main` zusammenführen,
Konflikte prüfen, die Tests erneut ausführen und den Ablauf wiederholen. Ein
Force-Push ist absichtlich nicht vorgesehen.

## Lokaler Start

Für Service Worker, Web Worker und Offline-Cache sollte Wattspur über einen
lokalen HTTP-Server geöffnet werden. Ein direktes Öffnen per `file://` ist
nicht zuverlässig.

Die Browser-Version ist bewusst ohne Server- oder Kontozwang aufgebaut.
