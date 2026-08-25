'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publishScriptPath = path.join(root, 'scripts', 'publish.ps1');
const packagePath = path.join(root, 'package.json');

assert.ok(fs.existsSync(publishScriptPath), 'Der sichere Veröffentlichungsablauf fehlt.');
const script = fs.readFileSync(publishScriptPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredPatterns = [
    ['Remote vor dem Push aktualisieren', /git['\s\S]*fetch['\s\S]*--prune['\s\S]*origin/],
    ['Remote-Vergleich', /git['\s\S]*rev-list['\s\S]*--left-right['\s\S]*--count/],
    ['Branch-Prüfung', /branch --show-current/],
    ['Merge-Konflikt-Prüfung', /MERGE_HEAD/],
    ['Rebase-Prüfung', /rebase-merge/],
    ['Cherry-Pick-Prüfung', /CHERRY_PICK_HEAD/],
    ['Arbeitsbaum-Prüfung', /git status --porcelain=v1/],
    ['Whitespace-Prüfung', /git['\s\S]*diff['\s\S]*--check/],
    ['Testpflicht', /test:all/],
    ['Nicht-erzwungener Push', /git['\s\S]*push['\s\S]*origin['\s\S]*\$Branch/],
    ['Push-Verifikation', /git rev-parse \$remoteRef/],
    ['Bewusster Push-Schalter', /\[switch\]\$Push/]
];

for (const [label, pattern] of requiredPatterns) {
    assert.match(script, pattern, `Sicherheitsregel fehlt: ${label}`);
}

assert.ok(!/push['\s\S]*--force/.test(script), 'Der Veröffentlichungsablauf darf keinen Force-Push enthalten.');
assert.ok(packageJson.scripts && packageJson.scripts['release:check'], 'release:check fehlt in package.json.');
assert.ok(packageJson.scripts && packageJson.scripts['release:push'], 'release:push fehlt in package.json.');
assert.match(packageJson.scripts['release:check'], /publish\.ps1/);
assert.match(packageJson.scripts['release:push'], /publish\.ps1/);

console.log('Push-Sicherheits-Test: OK');