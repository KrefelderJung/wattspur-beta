'use strict';

/* Regressionstest für die schwebende Zoomsteuerung im Messkonzept-Editor. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'js/messkonzept/canvas-renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const zoomActions = [...index.matchAll(/data-mk-zoom="([^"]+)"/g)].map(match => match[1]);
assert(zoomActions.length === 3, 'Die drei kompakten Zoomaktionen müssen genau einmal im Editor vorhanden sein');
assert(new Set(zoomActions).size === 3 && ['fit', 'in', 'out'].every(action => zoomActions.includes(action)), 'Verkleinern, Einpassen und Vergrößern fehlen');
assert(index.includes('title="Ansicht einpassen"') && index.includes('class="mk-fit-icon"'), 'Der mittlere Button braucht ein verständliches Einpassen-Symbol und einen Tooltip');
assert(index.indexOf('mk-canvas-zoom-controls') < index.indexOf('mk-canvas-stage-host'), 'Zoomsteuerung muss vor der Bühnenfläche im Canvas liegen');
assert(renderer.includes("querySelector('.mk-canvas-stage-host')") && renderer.includes('renderTarget.innerHTML'), 'Renderläufe dürfen die stabile Zoomsteuerung nicht entfernen');
assert(styles.includes('position: absolute') && styles.includes('pointer-events: auto')
    && styles.includes('backdrop-filter: blur')
    && styles.includes('gap: 0')
    && styles.includes('::before')
    && styles.includes('width: 1px')
    && styles.includes('min-width: 1.9rem')
    && styles.includes('min-height: 1.7rem')
    && styles.includes('line-height: 0')
    && styles.includes('display: block')
    && styles.includes('.mk-canvas-zoom-button.mk-zoom-fit'), 'Overlay-Zoomsteuerung braucht eine kompakte horizontale und bedienbare Fläche');

console.log('Canvas-Zoom-Controls-Test: OK');
