/*
 * Mieterstromobjekte – kleiner Modelltest
 *
 * Der Konfigurator hat bewusst keinen eigenen Mieterstrommodus. Zwei
 * Palette-Objekte ergänzen lediglich neutrale Metadaten an der bestehenden
 * Messlogik: Nutzer (gesamter Haushalt) und ein nicht teilnehmender Zähler.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const context = { console };
context.window = context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/messkonzept/model.js'), 'utf8'), context);

const model = context.window.WattspurMesskonzeptModel;
if (!model?.createState || !model?.addAsset) throw new Error('Das Messkonzept-Modell ist nicht verfügbar.');

const state = model.createState();
if (Object.prototype.hasOwnProperty.call(state, 'mieterstrom')) {
    throw new Error('Ein eigener Mieterstrommodus darf nicht mehr im Zustand angelegt werden.');
}

const user = model.addAsset(state, 'consumer', 'single-main', '', '', { mieterstromObject: 'user' });
if (user?.name !== 'Nutzer 1' || user.mieterstromObject !== 'user') {
    throw new Error('Der Mieterstrom-Nutzer muss als Haushalt markiert und benannt werden.');
}

const meter = model.addAsset(state, 'meter', 'single-main', '', '', {
    targetAssetId: user.id,
    mieterstromObject: 'external-meter'
}, () => null);
if (!meter || meter.mieterstromObject !== 'external-meter' || meter.mieterstromParticipation !== 'excluded' || meter.marketLocationStatus !== 'inactive') {
    throw new Error('Der ausgeschlossene Mieterstromzähler braucht neutrale technische Statusfelder.');
}
if (user.meterId !== meter.id) throw new Error('Der Mieterstromzähler muss die bestehende Anlagen-Zähler-Zuordnung nutzen.');

console.log('Mieterstrom-Objekte-Test: OK (zwei Palette-Objekte, kein eigener Modus)');
