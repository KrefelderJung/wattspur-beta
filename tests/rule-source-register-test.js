'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const registerPath = path.join(root, 'docs', 'regelhinweise-quellenregister.md');
const rulesPath = path.join(root, 'js', 'messkonzept', 'rules.js');

assert.ok(fs.existsSync(registerPath), 'Das Quellenregister fehlt.');
assert.ok(fs.existsSync(rulesPath), 'Das Regelmodul fehlt.');

const register = fs.readFileSync(registerPath, 'utf8');
const rules = fs.readFileSync(rulesPath, 'utf8');

assert.ok(register.includes('**Stand der Quellenprüfung:** `2026-08-26`'),
    'Das Quellenregister braucht ein sichtbares Prüfdatum.');
assert.match(register, /source-register:start/);
assert.match(register, /source-register:end/);

const requiredRuleIds = [
    'MK-ASSET-002',
    'MK-ASSET-004',
    'MK-ASSET-005',
    'MK-ASSET-006',
    'MK-ASSET-008',
    'MK-ASSET-009',
    'MK-STEUVE-001',
    'MK-KWK-001',
    'MK-KWK-002',
    'MK-NSH-001',
    'MK-MISC-ENFG-022'
];

for (const ruleId of requiredRuleIds) {
    assert.ok(register.includes('`' + ruleId + '`'),
        `Quellenregister ohne Regel-ID ${ruleId}.`);
}

const allowedHosts = new Set([
    'www.bundesnetzagentur.de',
    'bundesnetzagentur.de',
    'www.bafa.de',
    'www.gesetze-im-internet.de',
    'www.clearingstelle-eeg-kwkg.de'
]);
const urls = [...register.matchAll(/https?:\/\/[^)\s]+/g)].map(match => match[0]);
assert.ok(urls.length >= requiredRuleIds.length,
    'Das Quellenregister enthält zu wenige offizielle Links.');

for (const rawUrl of urls) {
    const url = new URL(rawUrl);
    assert.ok(allowedHosts.has(url.hostname),
        `Nicht freigegebene Quellen-Domain im Register: ${url.hostname}`);
}

// Jede im Regelmodul sichtbare Quellen-URL muss im Register auftauchen.
const ruleUrls = [...rules.matchAll(/https?:\/\/[^'\s]+/g)].map(match => match[0]);
for (const ruleUrl of ruleUrls) {
    assert.ok(register.includes(ruleUrl),
        `Regel-URL fehlt im Quellenregister: ${ruleUrl}`);
}

assert.match(register, /keine technische, rechtliche oder abrechnungsseitige Freigabe/);
assert.match(register, /ersetzen keine Prüfung/);

console.log('Quellenregister-Test: OK');
