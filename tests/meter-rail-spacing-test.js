'use strict';

/* Regressionstest fuer die vertikale Rail-Geometrie.
 * Z1 -> Z2 darf keine kuerzere Sonderstrecke als Z2 -> Z3 besitzen.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const geometrySource = fs.readFileSync(path.join(ROOT, 'messkonzept-geometry.js'), 'utf8');
const renderSource = fs.readFileSync(path.join(ROOT, 'js/messkonzept/render.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(geometrySource, context, { filename: 'messkonzept-geometry.js' });
const constants = context.window.WattspurMesskonzeptGeometry?.constants;
assert(constants && constants.meterRailTopGapPx === 20, 'Der gemeinsame Unterzaehler-Abstand muss 20 px betragen');
assert(!Object.prototype.hasOwnProperty.call(constants, 'rootRailJunctionInsetPx'), 'Die alte Root-Sonderkorrektur darf nicht zurueckkehren');

const rootRuleMatch = stylesSource.match(/\.mk-meter-rail\.root-rail\s*>\s*\.mk-meter-rail\.meter-group-rail\s*\{([\s\S]*?)\}/);
assert(rootRuleMatch, 'Die Root-Unterrail-Regel fehlt');
assert(rootRuleMatch[1].includes('margin-top: var(--mk-meter-rail-top-gap-px, 16px);'), 'Z1 -> Z2 muss denselben Abstand wie tiefere Unterrails verwenden');
assert(!rootRuleMatch[1].includes('calc(') && !rootRuleMatch[1].includes('root-rail-junction-inset'), 'Die erste Unterrail darf nicht mehr kuerzer gerechnet werden');
assert(!renderSource.includes('--mk-root-rail-junction-inset-px'), 'Der Renderer darf keinen veralteten Root-Inset mehr ausgeben');

console.log('Meter-Rail-Abstand-Test: OK (Z1→Z2, Z2→Z3 und tiefere Ebenen standardisiert)');
