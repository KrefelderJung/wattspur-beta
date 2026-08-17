'use strict';

/* Regressionstest für das kleine Wallbox-Symbol in Palette und Messskizze. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexText = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const rendererText = fs.readFileSync(path.join(root, 'messkonzept.js'), 'utf8');
const displayText = fs.readFileSync(path.join(root, 'js/messkonzept/asset-display.js'), 'utf8');
const stylesText = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const chargeMarkup = 'mk-charge-symbol';
assert(indexText.includes(chargeMarkup) && indexText.includes('mk-charge-plug'), 'Die Palette muss das Wallbox-Symbol samt Stecker rendern.');
assert(displayText.includes(chargeMarkup) && displayText.includes('mk-charge-plug'), 'Die Messskizze muss das gleiche Wallbox-Symbol samt Stecker rendern.');
assert(indexText.includes('<svg class="mk-charge-symbol"') && displayText.includes('<svg class="mk-charge-symbol"'), 'Palette und Messskizze müssen dasselbe scharfe Vektor-Wallboxsymbol verwenden.');
assert(stylesText.includes('.mk-charge-cable') && stylesText.includes('.mk-charge-plug') && stylesText.includes('.mk-charge-pin') && stylesText.includes('.mk-charge-display'), 'Ladegerät, Kabel, Steckergehäuse und Kontaktstifte benötigen eigene SVG-Regeln.');
assert(indexText.includes('mk-charge-pin-dot') && displayText.includes('mk-charge-pin-dot') && stylesText.includes('.mk-charge-pin-dot'), 'Die beiden Kontaktstifte müssen im Stecker sichtbar markiert sein.');
assert(indexText.includes('mk-charge-bolt') && displayText.includes('mk-charge-bolt') && stylesText.includes('#facc15'), 'Der Wallbox-Ladebereich muss einen gelben Blitz enthalten.');
assert(indexText.includes('mk-charge-display') && displayText.includes('mk-charge-display'), 'Das Ladesymbol muss einen klar erkennbaren Ladebereich im Wallbox-Gehäuse besitzen.');
assert(!indexText.includes('mk-charge-status') && !displayText.includes('mk-charge-status'), 'Das alte unklare Statuslinien-Element darf nicht zurückkehren.');
assert(indexText.includes('viewBox="0 0 32 32"') && displayText.includes('viewBox="0 0 32 32"') && stylesText.includes('width: 25px') && stylesText.includes('height: 25px'), 'Das Vektorsymbol muss eine größere, klare Größe besitzen.');
assert(stylesText.includes('stroke-width: 2.4') && stylesText.includes('stroke-width: 0.6') && stylesText.includes('overflow: visible') && stylesText.includes('.mk-zone-assets.simple-mode .mk-asset-icon .mk-charge-symbol'), 'Blitz, Kontakte, Kabel und Stecker dürfen im kleinen Objektfeld nicht abgeschnitten werden.');
assert(indexText.includes('M24 28.7v2.8m4-2.8v2.8') && displayText.includes('M24 28.7v2.8m4-2.8v2.8'), 'Der Stecker muss zwei klar sichtbare Kontaktstifte nach außen führen.');

console.log('Wallbox-Symbol-Test: OK (Palette, Objekt, Kabel, Steckergehäuse und Kontaktstifte geprüft)');
