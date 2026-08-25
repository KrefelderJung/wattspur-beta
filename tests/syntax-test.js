'use strict';

/* Prüft jede projektinterne JavaScript-Datei ohne Ausführung des Codes. */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const files = [];

function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'Backup' || entry.name === 'node_modules') continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) collect(absolute);
        else if (entry.isFile() && entry.name.endsWith('.js')) files.push(absolute);
    }
}

collect(ROOT);
for (const file of files.sort()) {
    const result = spawnSync(process.execPath, ['--check', file], {
        cwd: ROOT,
        encoding: 'utf8'
    });
    if (result.status !== 0) {
        failures.push(path.relative(ROOT, file));
        process.stderr.write(result.stderr || result.stdout || `${file}: Syntaxfehler\n`);
    }
}

if (failures.length > 0) {
    console.error(`Syntax-Gate: FEHLER in ${failures.length} Datei(en): ${failures.join(', ')}`);
    process.exit(1);
}

console.log(`Syntax-Gate: OK (${files.length} JavaScript-Dateien)`);
