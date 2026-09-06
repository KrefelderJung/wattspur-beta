'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/messkonzept/annotations.js'), 'utf8');
const requirements = fs.readFileSync(path.join(ROOT, 'docs/edge-infobox-transformer-png-anforderungen.md'), 'utf8');

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(source.includes('function getPointerStagePosition'),
    'Infobox-Drag muss eine eigene Berechnung aus aktueller Bühnenposition und Griffpunkt besitzen');
assert(source.includes('pointerOffset:') && source.includes('active?.pointerOffset'),
    'Infobox-Drag muss den ursprünglichen Griffpunkt innerhalb der Karte beibehalten');
assert((source.match(/getPointerStagePosition\(event, activeDrag/g) || []).length >= 2,
    'Infobox-Drag muss nach der Arbeitsflächenerweiterung neu aus dem aktuellen stageRect berechnet werden');
assert(source.includes("layer.addEventListener('contextmenu'") && source.includes('event.preventDefault();'),
    'Ein aktiver Rechtsklick-Drag darf nicht vom nativen Kontextmenü unterbrochen werden');
assert(requirements.includes('kein') && requirements.includes('Transformator'),
    'Akzeptanzkriterien für den Edge-Infobox- und Transformator-Fix fehlen');

console.log('Annotation-Edge-Drag-Test: OK');
