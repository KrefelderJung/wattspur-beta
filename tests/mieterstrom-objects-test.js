/*
 * Mieterstromobjekte – kleiner Modelltest
 *
 * Der Konfigurator hat bewusst keinen eigenen Mieterstrommodus. Zwei
 * Palette-Objekte ergänzen lediglich neutrale Metadaten an der bestehenden
 * Messlogik: Nutzer (gesamter Haushalt) und ein teilnehmender Mieterstromzähler.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const context = { console };
context.window = context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/messkonzept/model.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/messkonzept/identifiers.js'), 'utf8'), context);

const model = context.window.WattspurMesskonzeptModel;
if (!model?.createState || !model?.addAsset) throw new Error('Das Messkonzept-Modell ist nicht verfügbar.');

const state = model.createState();
if (Object.prototype.hasOwnProperty.call(state, 'mieterstrom')) {
    throw new Error('Ein eigener Mieterstrommodus darf nicht mehr im Zustand angelegt werden.');
}

const user = model.addAsset(state, 'consumer', 'single-main', '', '', { mieterstromObject: 'user' });
if (user?.name !== 'Mieterstromnutzer 1' || user.mieterstromObject !== 'user') {
    throw new Error('Der Mieterstrom-Nutzer muss als Haushalt markiert und benannt werden.');
}
const user2 = model.addAsset(state, 'consumer', 'single-main', '', '', { mieterstromObject: 'user' });
const consumer = model.addAsset(state, 'consumer', 'single-main');
const consumer2 = model.addAsset(state, 'consumer', 'single-main');
if (user2?.name !== 'Mieterstromnutzer 2' || consumer?.name !== 'Sonstiger Verbraucher 1' || consumer2?.name !== 'Sonstiger Verbraucher 2') {
    throw new Error('Nutzer und Verbraucher müssen getrennt laufend nummeriert werden.');
}
const identifiers = context.window.WattspurMesskonzeptIdentifiers.createIdentifierController({ getState: () => state });
if (identifiers.getConsumerAssetNumber(user) !== 1 || identifiers.getConsumerAssetNumber(user2) !== 2 || identifiers.getConsumerAssetNumber(consumer) !== 1 || identifiers.getConsumerAssetNumber(consumer2) !== 2) {
    throw new Error('Nutzer und Verbraucher müssen in der Skizze mit stabilen Nummern erscheinen.');
}

const meter = model.addAsset(state, 'meter', 'single-main', '', '', {
    targetAssetId: user.id,
    mieterstromObject: 'external-meter'
}, () => null);
if (!meter || meter.mieterstromObject !== 'external-meter' || meter.mieterstromParticipation !== 'excluded' || meter.marketLocationStatus !== 'inactive') {
    throw new Error('Der teilnehmende Mieterstromzähler braucht neutrale technische Statusfelder.');
}
if (user.meterId !== meter.id) throw new Error('Der Mieterstromzähler muss die bestehende Anlagen-Zähler-Zuordnung nutzen.');

console.log('Mieterstrom-Objekte-Test: OK (zwei Palette-Objekte, kein eigener Modus)');
