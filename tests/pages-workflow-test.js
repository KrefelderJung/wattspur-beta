'use strict';

/* Regressionstest für den expliziten GitHub-Pages-Workflow. */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const workflow = read('.github/workflows/pages.yml');
const requirements = read('docs/github-pages-deployment-anforderungen.md');
const failures = [];
const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

assert(workflow.includes('pages: write') && workflow.includes('id-token: write'),
    'Pages-Workflow muss die erforderlichen Schreib- und OIDC-Berechtigungen setzen');
assert(workflow.includes('actions/upload-pages-artifact@v4')
    && workflow.includes('actions/deploy-pages@v4'),
    'Pages-Workflow muss das offizielle Artefakt-/Deploy-Paar verwenden');
assert(workflow.includes('needs: build') && workflow.includes('name: github-pages'),
    'Deploy-Job muss vom Build abhängen und die github-pages-Umgebung verwenden');
assert(workflow.includes('workflow_dispatch') && workflow.includes('branches:')
    && workflow.includes('- main'),
    'Pages-Workflow muss Pushes auf main und manuellen Start unterstützen');
assert(requirements.includes('GitHub Actions') && requirements.includes('id-token: write'),
    'Pages-Anforderungen müssen die einmalige Quelleinstellung und Token-Berechtigung erklären');

if (failures.length) {
    console.error(`Pages-Workflow-Test: FEHLER (${failures.length})`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
} else {
    console.log('Pages-Workflow-Test: OK');
}
