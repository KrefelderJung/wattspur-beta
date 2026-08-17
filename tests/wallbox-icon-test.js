'use strict';

/* Regressionstest für das kleine Wallbox-Symbol in Palette und Messskizze. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexText = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const rendererText = fs.readFileSync(path.join(root, 'messkonzept.js'), 'utf8');
const stylesText = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const chargeMarkup = 'mk-charge-symbol';
assert(indexText.includes(chargeMarkup) && indexText.includes('mk-charge-plug'), 'Die Palette muss das Wallbox-Symbol samt Stecker rendern.');
assert(rendererText.includes(chargeMarkup) && rendererText.includes('mk-charge-plug'), 'Die Messskizze muss das gleiche Wallbox-Symbol samt Stecker rendern.');
assert(indexText.includes('<svg class="mk-charge-symbol"') && rendererText.includes('<svg class="mk-charge-symbol"'), 'Palette und Messskizze müssen dasselbe scharfe Vektor-Wallboxsymbol verwenden.');
assert(stylesText.includes('.mk-charge-cable') && stylesText.includes('.mk-charge-plug') && stylesText.includes('.mk-charge-pin') && stylesText.includes('.mk-charge-display'), 'Ladegerät, Kabel, Steckergehäuse und Kontaktstifte benötigen eigene SVG-Regeln.');
assert(indexText.includes('mk-charge-display') && rendererText.includes('mk-charge-display'), 'Das Ladesymbol muss einen klar erkennbaren Ladebereich im Wallbox-Gehäuse besitzen.');
assert(!indexText.includes('mk-charge-status') && !rendererText.includes('mk-charge-status'), 'Das alte unklare Statuslinien-Element darf nicht zurückkehren.');
assert(indexText.includes('viewBox="0 0 32 32"') && rendererText.includes('viewBox="0 0 32 32"') && stylesText.includes('width: 22px') && stylesText.includes('height: 22px'), 'Das Vektorsymbol muss eine klare, kompakte Größe besitzen.');
assert(stylesText.includes('stroke-width: 1.8') && stylesText.includes('overflow: visible') && stylesText.includes('.mk-zone-assets.simple-mode .mk-asset-icon .mk-charge-symbol'), 'Kabel und Stecker dürfen im kleinen Objektfeld nicht abgeschnitten werden.');

console.log('Wallbox-Symbol-Test: OK (Palette, Objekt, Kabel, Steckergehäuse und Kontaktstifte geprüft)');
