/*
 * Wattspur Messkonzept – Vorlagen in echte Modellzustände übersetzen
 *
 * Der Loader kennt das Zustandsmodell, aber keine Oberfläche. Eine Vorlage
 * ist deshalb kein Bild und kein Sonderlayout: Sie erzeugt normale Anlagen,
 * Zähler und Elternbeziehungen, die danach wie jeder freie Entwurf editiert
 * oder gelöscht werden können.
 */
(function exposeMesskonzeptPresetLoader(global) {
    'use strict';

    function createPresetLoader(options = {}) {
        const model = options.model || global.WattspurMesskonzeptModel;
        const presets = options.presets || global.WattspurMesskonzeptPresets;
        const SINGLE_ZONE = 'single-main';

        function addAsset(state, type, config = {}) {
            const asset = model.createAsset(state, type, config.zone || SINGLE_ZONE, config.steuveType || '', config.energyCarrier || '', {
                mieterstromObject: config.mieterstromObject || ''
            });
            if (config.name) asset.name = config.name;
            if (config.meterId) asset.meterId = config.meterId;
            state.assets.push(asset);
            return asset;
        }

        function addCascade(state, steuveType) {
            const steuve = addAsset(state, 'steuve', { steuveType, name: steuveType });
            // Kaskadenvorlagen verwenden bewusst die gleiche fachliche Struktur
            // wie ein manuell hinter Z1 gesetzter Hauptstrang-Zähler: Z2 ist ein
            // Basiszähler unter Z1, nicht ein Inline-Zähler vor der Haushaltkarte.
            const meter = model.addAsset(
                state,
                'meter',
                SINGLE_ZONE,
                '',
                '',
                { parentBaseMeterIndex: 0, parentMeterId: '', keepEmptyRail: true }
            );
            if (!meter) throw new Error('Kaskaden-Vorlage konnte den Haushaltszähler nicht anlegen.');
            const household = addAsset(state, 'consumer', { name: 'Haushalt' });
            household.meterId = meter.id;
            const pv = addAsset(state, 'generation', { name: 'PV' });
            const storage = addAsset(state, 'storage', { name: 'Speicher' });
            pv.meterId = meter.id;
            storage.meterId = meter.id;
            return { steuve, household, meter, pv, storage };
        }

        function addMieterstromD1(state, definition) {
            const pv = addAsset(state, 'generation', {
                name: 'PV',
                energyCarrier: definition.energyCarrier || 'PV'
            });
            // Die D1-Skizze zeigt neben dem Bezugszähler einen eigenen
            // Erzeugungszähler. Er bleibt eine normale technische
            // Kennzeichnung und wird nicht als eigener Modus modelliert.
            pv.generationMeter = true;

            const users = [];
            const meters = [];
            const userCount = Math.max(1, Number(definition.userCount) || 4);
            for (let index = 1; index <= userCount; index += 1) {
                const user = addAsset(state, 'consumer', {
                    name: `Mieterstromnutzer ${index}`,
                    zone: 'single-main',
                    mieterstromObject: 'user'
                });
                const meter = model.addAsset(
                    state,
                    'meter',
                    'single-main',
                    '',
                    '',
                    { targetAssetId: user.id, mieterstromObject: 'external-meter' }
                );
                if (!meter) throw new Error(`Mieterstrom-Vorlage konnte ZN${index} nicht anlegen.`);
                meter.name = `Mieterstromzähler ${index}`;
                users.push(user);
                meters.push(meter);
            }
            return { pv, users, meters };
        }

        function buildPresetState(id) {
            const definition = presets.getById(id);
            if (!definition) throw new Error(`Unbekannte Messkonzept-Vorlage: ${id}`);
            const state = model.createState();
            state.mode = definition.kind === 'parallel' ? 'parallel' : 'single';
            state.cascadeLevels = definition.kind === 'parallel' ? 2 : 2;

            if (definition.kind === 'parallel') {
                addAsset(state, 'consumer', { zone: 'parallel-0', name: 'Haushalt' });
                addAsset(state, 'steuve', { zone: 'parallel-1', steuveType: definition.steuveType, name: definition.steuveType });
            } else if (definition.kind === 'cascade') {
                addCascade(state, definition.steuveType);
            } else if (definition.kind === 'mieterstrom') {
                addMieterstromD1(state, definition);
            } else {
                definition.assets.forEach(type => {
                    const config = { name: type === 'consumer' ? 'Haushalt' : type === 'generation' ? 'PV' : type === 'storage' ? 'Speicher' : definition.steuveType };
                    if (type === 'steuve') config.steuveType = definition.steuveType;
                    addAsset(state, type, config);
                });
            }
            return state;
        }

        function applyPreset(targetState, id) {
            const nextState = buildPresetState(id);
            Object.keys(nextState).forEach(key => {
                targetState[key] = model.clone ? model.clone(nextState[key]) : nextState[key];
            });
            return presets.getById(id);
        }

        return Object.freeze({ buildPresetState, applyPreset });
    }

    global.WattspurMesskonzeptPresetLoader = Object.freeze({ createPresetLoader });
}(window));
