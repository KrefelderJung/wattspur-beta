'use strict';

/* Statischer UI-Regressionstest für den gemeinsamen Rand der Bausteinleiste. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const paletteRule = css.match(/\.mk-palette-item\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert(paletteRule.includes('border: 1px solid color-mix(in srgb, var(--primary-color) 45%, var(--border-color))'), 'Bausteinleiste muss einen gemeinsamen blauen Grundrand verwenden');
assert(!css.includes('.mk-palette-items--mieterstrom .mk-palette-item {'), 'Mieterstromobjekte dürfen keine abweichende Grundrandregel behalten');
assert((html.match(/class="mk-palette-item(?:\s|"|--)/g) || []).length >= 10, 'Alle Messobjekte müssen als Palette-Buttons vorhanden sein');

console.log('Palette-Rand-Standard-Test: OK');
