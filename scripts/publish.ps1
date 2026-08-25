[CmdletBinding()]
param(
    [string]$Branch = 'main',
    [switch]$Push
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Invoke-Checked {
    param(
        [string]$Executable,
        [string[]]$Arguments,
        [string]$Description
    )

    Write-Host "`n> $Description" -ForegroundColor Cyan
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Abbruch: $Description ist fehlgeschlagen (Exit-Code $LASTEXITCODE)."
    }
}

function Get-GitDirectory {
    $raw = (& git rev-parse --git-dir 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) {
        throw 'Dieser Ordner ist kein Git-Repository.'
    }
    if ([IO.Path]::IsPathRooted($raw)) {
        return (Resolve-Path $raw).Path
    }
    return (Resolve-Path (Join-Path $repoRoot $raw)).Path
}

$gitDir = Get-GitDirectory
$currentBranch = (& git branch --show-current).Trim()
if ($currentBranch -ne $Branch) {
    throw "Falscher Branch: '$currentBranch'. Erwartet wird '$Branch'."
}

$operationMarkers = @(
    (Join-Path $gitDir 'MERGE_HEAD'),
    (Join-Path $gitDir 'CHERRY_PICK_HEAD'),
    (Join-Path $gitDir 'REVERT_HEAD'),
    (Join-Path $gitDir 'rebase-merge'),
    (Join-Path $gitDir 'rebase-apply'),
    (Join-Path $gitDir 'index.lock')
)
$activeMarker = $operationMarkers | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($activeMarker) {
    throw "Git ist gerade in einem laufenden Vorgang ($activeMarker). Erst diesen Vorgang sauber abschließen oder abbrechen; es wird nichts gepusht."
}

$status = @(& git status --porcelain=v1)
if ($status.Count -gt 0) {
    throw "Der Arbeitsbaum ist nicht sauber. Bitte Änderungen prüfen, committen oder bewusst separat sichern; es wird nichts automatisch gestaged oder committed."
}

$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runDir = Join-Path $repoRoot "Backup\publish-runs\$runStamp"
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
Set-Content -LiteralPath (Join-Path $runDir 'status-before-fetch.txt') -Value ((& git status --short --branch) -join [Environment]::NewLine) -Encoding UTF8
Set-Content -LiteralPath (Join-Path $runDir 'head-before-fetch.txt') -Value ((& git log -1 --oneline --decorate) -join [Environment]::NewLine) -Encoding UTF8
Set-Content -LiteralPath (Join-Path $runDir 'remote-before-fetch.txt') -Value ((& git remote -v) -join [Environment]::NewLine) -Encoding UTF8

Invoke-Checked 'git' @('fetch', '--prune', 'origin') 'Remote-Stand aktualisieren'
$remoteRef = "refs/remotes/origin/$Branch"
& git show-ref --verify --quiet $remoteRef
if ($LASTEXITCODE -ne 0) {
    throw "Der Remote-Branch origin/$Branch wurde nicht gefunden. Kein automatischer Erst-Push."
}

$countsText = (& git rev-list --left-right --count "origin/$Branch...HEAD").Trim()
$counts = $countsText -split '\s+'
if ($counts.Count -ne 2) {
    throw "Remote-Vergleich konnte nicht sicher ausgewertet werden: '$countsText'."
}
$behind = [int]$counts[0]
$ahead = [int]$counts[1]
Set-Content -LiteralPath (Join-Path $runDir 'remote-comparison.txt') -Value "behind=$behind`nahead=$ahead`nrange=origin/$Branch...HEAD" -Encoding UTF8

if ($behind -gt 0) {
    throw "Der Remote-Branch ist $behind Commit(s) neuer. Erst 'git pull --rebase origin $Branch' ausführen, Konflikte bewusst lösen, Tests starten und dieses Skript erneut ausführen."
}
if ($ahead -eq 0) {
    Write-Host "Alles synchron: Es gibt keinen neuen lokalen Commit zum Pushen." -ForegroundColor Yellow
    exit 0
}

Invoke-Checked 'git' @('diff', '--check') 'Whitespace- und Patch-Prüfung'
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $npmCommand) {
    throw 'npm wurde nicht gefunden. Node.js/npm installieren oder den vorgesehenen Node-Laufzeitpfad aktivieren; es wird nichts gepusht.'
}
Invoke-Checked $npmCommand.Path @('run', 'test:all') 'Gesamtes Wattspur-Testpaket'

if (-not $Push) {
    Write-Host "Vorprüfung erfolgreich. $ahead lokaler Commit(s) sind bereit. Für den bewussten Push erneut mit '-Push' ausführen." -ForegroundColor Green
    exit 0
}

Invoke-Checked 'git' @('push', 'origin', $Branch) 'Nicht-erzwungener Push nach GitHub'
Invoke-Checked 'git' @('fetch', '--prune', 'origin') 'Push-Ergebnis verifizieren'
$localHead = (& git rev-parse HEAD).Trim()
$remoteHead = (& git rev-parse $remoteRef).Trim()
if ($localHead -ne $remoteHead) {
    throw "Verifikation fehlgeschlagen: lokaler Stand und origin/$Branch unterscheiden sich weiterhin."
}
Write-Host "Push erfolgreich und verifiziert: origin/$Branch zeigt auf $remoteHead" -ForegroundColor Green