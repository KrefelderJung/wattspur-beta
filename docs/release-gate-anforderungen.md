# Release-Gate für Wattspur

## Zweck

Vor jedem öffentlichen Push müssen technische, fachliche und browserbasierte
Prüfungen reproduzierbar ausgeführt werden. Ein grüner Einzeltest reicht nicht
als Freigabe.

## Verbindliche Prüfungen

1. Alle JavaScript-Dateien bestehen die Syntaxprüfung.
2. Alle browserfreien Regel-, Modell-, Architektur- und Exporttests sind grün.
3. Der lokale Link-Check ist grün. Externe Fachlinks werden in einem separaten
   Release-Lauf geprüft und bei nicht erreichbaren Quellen dokumentiert.
4. Ein Browser-Smoke-Test öffnet Startseite und beide Werkzeuge, lädt mindestens
   eine Vorlage beziehungsweise Demo, prüft Navigation, Objektbearbeitung und
   Export.
5. Die wichtigsten Tablet-Bedienabläufe werden mindestens in einer schmalen
   und einer breiten Touch-Viewport-Größe geprüft.
6. Der Service-Worker-Assetbestand entspricht den tatsächlich eingebundenen
   Dateien.
7. Arbeitsbaum, Commit und veröffentlichter Stand werden vor dem Push
   abgeglichen. Ungeprüfte lokale Änderungen dürfen nicht veröffentlicht werden.

## Abnahmekriterium

Eine Veröffentlichung gilt erst dann als freigegeben, wenn alle Prüfungen
erfolgreich waren und die Änderungen in einem nachvollziehbaren Commit mit
kurzer Änderungsbeschreibung enthalten sind.

## Bewusste Grenze

Diese Gates ersetzen keine fachliche oder rechtliche Prüfung. Aussagen zu
Messkonzepten, Netzregeln und Förderbedingungen benötigen weiterhin eine
regelmäßige Prüfung an den offiziellen Quellen.
