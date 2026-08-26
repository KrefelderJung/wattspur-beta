'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requirements = fs.readFileSync(path.join(root, 'docs', 'modul-groessenbudget-anforderungen.md'), 'utf8');
const budgets = {
    'js/messkonzept/export.js': 90000,
    'js/messkonzept/annotations.js': 65000,
    'js/messkonzept/layout.js': 45000,
    'js/messkonzept/rules.js': 45000,
    'js/messkonzept/drag-drop.js': 45000,
    'js/messkonzept/canvas-renderer.js': 45000,
    'js/messkonzept/model.js': 35000
};

assert(requirements.includes('Warnschwelle') && requirements.includes('Regressionstest'),
    'Das Modulgrößenbudget muss als Architekturregel dokumentiert sein');

const violations = Object.entries(budgets).flatMap(([relativePath, budget]) => {
    const filePath = path.join(root, relativePath);
    assert(fs.existsSync(filePath), `Budgetdatei fehlt: ${relativePath}`);
    const size = fs.statSync(filePath).size;
    return size > budget ? [`${relativePath}: ${size} Bytes > ${budget} Bytes`] : [];
});

assert.deepStrictEqual(violations, [], `Modulgrößenbudget überschritten:\n${violations.join('\n')}`);
console.log('Modulgrößenbudget-Test: OK');
