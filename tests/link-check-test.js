'use strict';

/*
 * Wattspur – Link-Check
 *
 * Standardmäßig werden alle lokalen href-/src-Verweise geprüft. Mit
 * `--external` werden zusätzlich externe HTTP(S)-Adressen geprüft.
 * Externe Websites können den Zugriff blockieren oder kurzfristig ausfallen;
 * deshalb gehören diese Prüfungen in einen bewussten Release-Check und nicht
 * in jeden lokalen Entwicklungslauf.
 *
 * Aufruf:
 *   node tests/link-check-test.js
 *   node tests/link-check-test.js --external
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const checkExternal = process.argv.includes('--external');
const failures = [];
const warnings = [];
const localLinks = [];
const externalLinks = new Map();

function listRootHtmlFiles() {
    return fs.readdirSync(ROOT, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
        .map(entry => entry.name);
}

function isExternal(value) {
    return /^https?:\/\//i.test(value) || /^\/\//.test(value);
}

function cleanTarget(value) {
    return value.trim().split('#')[0].split('?')[0];
}

function isIgnored(value) {
    return !value
        || value.startsWith('#')
        || /^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(value);
}

function recordLocalLink(sourceFile, attribute, rawValue) {
    const target = cleanTarget(rawValue);
    if (!target) return;

    let decoded;
    try {
        decoded = decodeURIComponent(target);
    } catch {
        failures.push(`${sourceFile}: ungültige URL-Kodierung (${rawValue})`);
        return;
    }

    const sourceDirectory = path.dirname(path.join(ROOT, sourceFile));
    const resolved = path.resolve(sourceDirectory, decoded.replace(/^\//, ''));
    const relativeResolved = path.relative(ROOT, resolved);
    if (relativeResolved.startsWith('..') || path.isAbsolute(relativeResolved)) {
        failures.push(`${sourceFile}: Verweis zeigt außerhalb des Projekts (${rawValue})`);
        return;
    }

    localLinks.push({ sourceFile, attribute, rawValue, resolved });
    if (!fs.existsSync(resolved)) {
        failures.push(`${sourceFile}: lokales Ziel fehlt (${rawValue})`);
    }
}

function scanHtmlFiles() {
    const htmlFiles = listRootHtmlFiles();
    const attributePattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;

    htmlFiles.forEach(sourceFile => {
        const source = fs.readFileSync(path.join(ROOT, sourceFile), 'utf8');
        for (const match of source.matchAll(attributePattern)) {
            const rawValue = match[1].trim();
            if (isIgnored(rawValue)) continue;
            if (isExternal(rawValue)) {
                const normalized = rawValue.startsWith('//') ? `https:${rawValue}` : rawValue;
                if (!externalLinks.has(normalized)) externalLinks.set(normalized, []);
                externalLinks.get(normalized).push(`${sourceFile} (${match[0].split('=')[0]})`);
            } else {
                recordLocalLink(sourceFile, match[0].split('=')[0].trim(), rawValue);
            }
        }
    });
}

function requestUrl(url, method = 'HEAD', redirects = 0) {
    return new Promise(resolve => {
        if (redirects > 5) {
            resolve({ kind: 'error', message: 'zu viele Weiterleitungen' });
            return;
        }

        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            resolve({ kind: 'error', message: 'ungültige URL' });
            return;
        }

        const client = parsed.protocol === 'https:' ? https : http;
        const request = client.request(parsed, {
            method,
            timeout: 10000,
            headers: {
                'User-Agent': 'Wattspur-Link-Check/1.0',
                Accept: 'text/html,application/xhtml+xml,*/*;q=0.8'
            }
        }, response => {
            const status = response.statusCode || 0;
            const location = response.headers.location;
            response.resume();
            if (status >= 300 && status < 400 && location) {
                const redirected = new URL(location, parsed).toString();
                requestUrl(redirected, method, redirects + 1).then(resolve);
                return;
            }
            resolve({ kind: 'status', status, finalUrl: parsed.toString() });
        });

        request.on('timeout', () => request.destroy(new Error('Zeitüberschreitung')));
        request.on('error', error => resolve({ kind: 'error', message: error.message }));
        request.end();
    });
}

async function checkExternalLinks() {
    for (const [url, references] of externalLinks) {
        let result = await requestUrl(url, 'HEAD');
        if (result.kind === 'status' && [403, 405, 501].includes(result.status)) {
            result = await requestUrl(url, 'GET');
        }

        if (result.kind === 'error') {
            failures.push(`Externer Link nicht erreichbar: ${url} (${result.message}; verwendet in ${references.join(', ')})`);
        } else if (result.status >= 200 && result.status < 400) {
            console.log(`  OK ${result.status} ${url}`);
        } else if ([401, 403].includes(result.status)) {
            warnings.push(`Externer Link antwortet mit ${result.status} (Zugriff eingeschränkt): ${url}`);
        } else {
            failures.push(`Externer Link antwortet mit ${result.status}: ${url}`);
        }
    }
}

async function main() {
    scanHtmlFiles();
    if (checkExternal) await checkExternalLinks();

    if (warnings.length) {
        console.warn(`Link-Check: ${warnings.length} Hinweis(e)`);
        warnings.forEach(warning => console.warn(`- ${warning}`));
    }
    if (failures.length) {
        console.error(`Link-Check: FEHLER (${failures.length})`);
        failures.forEach(failure => console.error(`- ${failure}`));
        process.exitCode = 1;
        return;
    }

    const mode = checkExternal ? `${externalLinks.size} externe Links geprüft` : `${externalLinks.size} externe Links inventarisiert`;
    console.log(`Link-Check: OK (${localLinks.length} lokale Links, ${mode})`);
}

main().catch(error => {
    console.error(`Link-Check: unerwarteter Fehler (${error.message})`);
    process.exitCode = 1;
});

