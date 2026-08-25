'use strict';

/*
 * Wattspur – browserfreie Gesamttests
 *
 * Führt alle eigenständigen Node-Testdateien reproduzierbar aus. Der Runner
 * bleibt absichtlich ohne Abhängigkeiten, damit er lokal und in GitHub Actions
 * identisch funktioniert.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TEST_ROOT = __dirname;
const runnerName = path.basename(__filename);
const testFiles = fs.readdirSync(TEST_ROOT)
    .filter((file) => file.endsWith('.js') && file !== runnerName)
    .sort();

const failures = [];
for (const file of testFiles) {
    const result = spawnSync(process.execPath, [path.join(TEST_ROOT, file)], {
        cwd: path.resolve(TEST_ROOT, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });

    if (result.status !== 0) {
        failures.push(file);
        process.stdout.write(result.stdout || '');
        process.stderr.write(result.stderr || '');
        process.stderr.write(`\n[FAIL] ${file} (Exit-Code ${result.status ?? 'unbekannt'})\n`);
    }
}

if (failures.length > 0) {
    console.error(`Node-Test-Gate: FEHLER in ${failures.length} Testdatei(en): ${failures.join(', ')}`);
    process.exit(1);
}

console.log(`Node-Test-Gate: OK (${testFiles.length} Testdateien)`);
