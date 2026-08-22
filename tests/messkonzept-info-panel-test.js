'use strict';

/* UI-Regressionstest für die lesbaren, mittig geöffneten Messkonzeptinfos. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const requirements = fs.readFileSync(path.join(ROOT, 'docs/messkonzept-info-panel-anforderungen.md'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(styles.includes('.mk-start-info-panel') && styles.includes('position: fixed') && styles.includes('left: 50%'), 'Messkonzept-Infoboxen müssen mittig positioniert werden');
assert(styles.includes('transform: translate(-50%, -50%)') && styles.includes('max-height: min(82vh, 44rem)'), 'Infoboxen brauchen eine viewport-sichere Begrenzung');
assert(styles.includes('.mk-start-info-columns > div') && styles.includes('.mk-start-info-columns li::before'), 'Vorteile und Hinweise brauchen eine visuelle Struktur');
assert(requirements.includes('fachlichen Texte und Quellenlinks bleiben unverändert'), 'Abnahmekriterium für unveränderte Fachinhalte fehlt');

console.log('Messkonzept-Infopanel-Test: OK');
