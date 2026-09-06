# GitHub-Pages-Veröffentlichung

## Ziel

Die statische Wattspur-Website soll nach einem Push auf `main` reproduzierbar
und ohne manuelle Dateikopie auf GitHub Pages veröffentlicht werden.

## Architektur

- `.github/workflows/pages.yml` baut kein zusätzliches Framework-Bundle,
  sondern veröffentlicht den geprüften Repository-Inhalt als statische Website.
- Der Workflow setzt `pages: write` und `id-token: write` ausdrücklich. Das
  verhindert den bisherigen Deploy-Abbruch wegen fehlender OIDC-Berechtigung.
- Build und Deploy sind getrennte Jobs. Der Deploy wartet über `needs: build`
  auf das vollständig hochgeladene Pages-Artefakt.
- Die GitHub-Pages-Quelle muss im Repository einmalig auf **GitHub Actions**
  gestellt werden. Der bisherige automatische Branch-Deploy bleibt sonst als
  konkurrierender Standardworkflow aktiv.

## Akzeptanzkriterien

1. Ein Push auf `main` startet den Pages-Workflow automatisch.
2. Ein manueller Start über `workflow_dispatch` ist möglich.
3. Der Build-Job lädt den statischen Repository-Inhalt als Pages-Artefakt hoch.
4. Der Deploy-Job besitzt `pages: write` und `id-token: write`.
5. Der Deploy-Job startet erst nach erfolgreichem Build.
6. Der Pages-Workflow verwendet keinen Force-Push, keine Secrets im Quellcode
   und keine externe Datenübertragung aus der Anwendung.
7. Ein grüner Workflow-Lauf wird über die veröffentlichte URL und den Commit-
   Vergleich gegen `origin/main` verifiziert.

## Einmalige GitHub-Einstellung

Unter **Settings → Pages → Build and deployment → Source** muss
**GitHub Actions** ausgewählt werden. Danach ist `pages.yml` der einzige
verantwortliche Veröffentlichungsweg.
