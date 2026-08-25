'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const interactionSource = fs.readFileSync(path.join(root, 'js', 'messkonzept', 'interaction.js'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'route-loader.js'), 'utf8');
const cleanRouteSource = fs.readFileSync(path.join(root, 'messkonzeptkonfigurator', 'index.html'), 'utf8');

assert(/id="btn-open-messkonzept-card"[^>]*href="messkonzeptkonfigurator\//.test(indexSource),
    'Startkarte muss auf die stabile Messkonzept-Route verlinken');
assert(!/bindClick\(['"]btn-open-messkonzept-card['"]/.test(interactionSource),
    'Die Startkarten-Navigation darf nicht durch einen In-Place-Klickhandler abgefangen werden');
assert(routeSource.includes("window.location.replace(`${fallback}#${route}`)"),
    'Der Route-Loader braucht einen file://-Fallback');
assert(/fetch\(fallback,\s*\{\s*cache:\s*['"]no-store['"]\s*\}\)/.test(routeSource),
    'Der Route-Loader muss die Hauptanwendung über eine aktuelle HTML-Anfrage laden');
assert(cleanRouteSource.includes('data-route="messkonzept"') && cleanRouteSource.includes('/messkonzeptkonfigurator/'),
    'Die Clean-Route braucht Route-Kennung und kanonische URL');

console.log('Clean-Route-Navigation-Test: OK');
