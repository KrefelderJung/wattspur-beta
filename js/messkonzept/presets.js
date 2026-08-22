/*
 * Wattspur Messkonzept: verständliche Startvorlagen
 *
 * Dieses Modul enthält ausschließlich Katalogdaten. Es kennt weder DOM noch
 * Layoutkoordinaten. Die eigentliche Zustandsbildung übernimmt
 * preset-loader.js. Dadurch bleiben Bezeichnungen, Kurztexte und fachliche
 * Gruppierung an einer Stelle nachvollziehbar.
 */
(function exposeMesskonzeptPresets(global) {
    'use strict';

    const PARALLEL_HINT = 'Eine Wallbox/Wärmepumpe kann ohne zusätzliche Mess- und Steuertechnik in der Parallelmessung nicht gezielt mit PV-Strom versorgt werden.';

    // Kurze, freiwillig aufklappbare Orientierungshilfen für die drei
    // Messkonzept-Gruppen. Die Texte sind bewusst keine Tarif- oder
    // Genehmigungszusage; die konkrete Ausgestaltung muss vor Ort geprüft
    // werden. Quellen bleiben zentral am jeweiligen Hinweis hinterlegt.
    const GROUP_INFO = Object.freeze({
        single: Object.freeze({
            intro: 'Geeignet, wenn Haushalt und Anlagen gemeinsam über einen Zähler gemessen werden sollen. Ein typisches Beispiel ist die Kombination aus Haushalt und PV.',
            advantages: Object.freeze([
                'Einfacher Aufbau mit nur einem Messpunkt.',
                'Für diesen Aufbau ist kein Umbau für einen zweiten Zähler nötig.',
                'PV-Strom kann innerhalb der Anlage grundsätzlich gemeinsam genutzt werden; die technische Auslegung entscheidet.',
                'Kein zusätzliches Messentgelt für einen zweiten Zähler.'
            ]),
            cautions: Object.freeze([
                'Ein Wärmepumpen- oder Wallbox-Tarif ist ein Produkt des gewählten Energieversorgers. Bei gemeinsamer Messung wird er selten angeboten; häufig verlangt der Lieferant dafür einen eigenen Zählpunkt.',
                'Die Netzentgeltreduzierung nach § 14a EnWG kann bei gemeinsamer Messung über Modul 1 und optional Modul 3 geprüft werden. Modul 2 setzt einen separaten Zählpunkt voraus.',
                'Die Wärmepumpenprivilegierung nach § 22 EnFG setzt für die Umlagebefreiung einen eigenen Zählpunkt und weitere gesetzliche Voraussetzungen voraus.',
                'Der Hausanschluss muss die Gesamtleistung trotzdem aufnehmen können; ein Umbau kann im Einzelfall nötig werden.',
                'Erweiterungen sollten vor dem Umbau mit Fachbetrieb und Netzbetreiber abgestimmt werden.'
            ]),
            links: Object.freeze([
                Object.freeze({ label: 'BNetzA: § 14a EnWG', href: 'https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500' }),
                Object.freeze({ label: 'Wärmepumpenprivilegierung nach § 22 EnFG', href: 'https://www.gesetze-im-internet.de/enfg/__22.html' })
            ])
        }),
        parallel: Object.freeze({
            intro: 'Geeignet, wenn Wärmepumpe oder Wallbox getrennt vom Haushaltsstrom gemessen werden sollen.',
            advantages: Object.freeze([
                'Der Verbrauch der steuerbaren Anlage ist eindeutig getrennt messbar.',
                'Ein separater Zählpunkt schafft die Voraussetzung, Modul 2 nach § 14a EnWG zu wählen.',
                'Ein passender Wärmepumpen- oder Wallboxtarif kann beim Lieferanten gezielter angefragt werden; ein Preisvorteil ist nicht automatisch garantiert.',
                'Eine separate Messung kann die Voraussetzungen für eine günstigere Konzessionsabgabe schaffen, zum Beispiel bei einer Einstufung als Sondervertragskunde.'
            ]),
            cautions: Object.freeze([
                'Umbau, zweiter Zähler und zusätzliche Messentgelte können anfallen.',
                PARALLEL_HINT,
                'Die Wärmepumpenprivilegierung nach § 22 EnFG setzt für die Umlagebefreiung einen eigenen Zählpunkt und weitere gesetzliche Voraussetzungen voraus.',
                'Die konkrete Konzessionsabgabe hängt von Liefervertrag, Messung und Ort ab; eine günstigere Einstufung ist möglich, aber nicht automatisch garantiert.'
            ]),
            links: Object.freeze([
                Object.freeze({ label: 'BNetzA: § 14a-FAQ', href: 'https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500' }),
                Object.freeze({ label: 'Wärmepumpenprivilegierung nach § 22 EnFG', href: 'https://www.gesetze-im-internet.de/enfg/__22.html' }),
                Object.freeze({ label: 'KAV: Konzessionsabgaben', href: 'https://www.gesetze-im-internet.de/kav/BJNR000120992.html' })
            ])
        }),
        cascade: Object.freeze({
            intro: 'Geeignet, wenn Wärmepumpe oder Wallbox separat gemessen, aber weiterhin durch PV-Strom mitversorgt werden sollen.',
            advantages: Object.freeze([
                'Steuerbare Verbrauchseinrichtungen nach § 14a EnWG können in der Kaskade über einen eigenen Zählpunkt von der Netzentgeltreduzierung nach Modul 2 profitieren.',
                'Bei einer Wärmepumpe kann die Umlagebefreiung nach § 22 EnFG geprüft werden, wenn ein eigener Zählpunkt und die weiteren Voraussetzungen erfüllt sind.',
                'PV-Strom kann im gemeinsamen Stromfluss auch die Wärmepumpe oder Wallbox versorgen; die separate Messung bleibt erhalten.',
                'Eine günstigere Konzessionsabgabe kann geprüft werden, wenn die Anlage als Sondervertragskunde eingestuft wird.'
            ]),
            cautions: Object.freeze([
                'Planung, Verdrahtung und Abrechnung sind deutlich komplexer.',
                'Die Abrechnung arbeitet mit Differenzbildung: Bezug an Z1 minus Bezug an Z2 ergibt den rechnerischen Verbrauch des Bereichs hinter Z2. Messwerte und Zuständigkeiten müssen abgestimmt sein.',
                'Zusätzliche Zähler, Messentgelte und Abstimmungen mit Netzbetreiber und Lieferant können anfallen.',
                'PV-Strom und Tarifvorteile hängen von der konkreten Verdrahtung, Messung und technischen Auslegung ab.'
            ]),
            links: Object.freeze([
                Object.freeze({ label: 'BNetzA: § 14a-FAQ', href: 'https://www.bundesnetzagentur.de/DE/Vportal/Energie/SteuerbareVBE/artikel.html?nn=877500' }),
                Object.freeze({ label: 'Wärmepumpenprivilegierung nach § 22 EnFG', href: 'https://www.gesetze-im-internet.de/enfg/__22.html' }),
                Object.freeze({ label: 'KAV: Konzessionsabgaben', href: 'https://www.gesetze-im-internet.de/kav/BJNR000120992.html' })
            ])
        }),
        mieterstrom: Object.freeze({
            intro: 'Mieterstrom beschreibt die Versorgung von Bewohnern mit Strom aus einer Erzeugungsanlage im Gebäude oder im Quartier. Der Strom wird dabei ohne Nutzung des öffentlichen Netzes an teilnehmende Nutzer geliefert.',
            advantages: Object.freeze([
                'Für den vor Ort gelieferten Strom können Netzentgelte, netzseitige Umlagen, Stromsteuer und Konzessionsabgabe entfallen.',
                'Belieferung und Abrechnung können über einen Mieterstromlieferanten gebündelt werden.',
                'Für geeignete Solaranlagen kann der Betreiber neben der Einspeisevergütung einen Mieterstromzuschlag erhalten.'
            ]),
            cautions: Object.freeze([
                'Die Teilnahme ist freiwillig. Vertrag, Belieferung und Abrechnung müssen vorab verständlich geregelt werden.',
                'Messstellenbetrieb, Messkosten und mögliche Anpassungen am Zählerplatz müssen mit den Beteiligten abgestimmt werden.',
                'Die konkrete Markt- und Messlokationsführung ist mit Messstellenbetreiber und Netzbetreiber abzustimmen.',
                'Soll ein Nutzer später wieder regulär von einem freien Lieferanten beliefert werden, müssen Zuordnung und Abrechnung angepasst werden.',
                'Die Mieterstromabrechnung erfolgt getrennt und nicht einfach über die Nebenkostenabrechnung.'
            ]),
            links: Object.freeze([
                Object.freeze({ label: 'BNetzA: Mieterstrom', href: 'https://www.bundesnetzagentur.de/DE/Vportal/Energie/Vertragsarten/Mieterstrom/start.html' }),
                Object.freeze({ label: '§ 21 EEG: Mieterstromzuschlag', href: 'https://www.gesetze-im-internet.de/eeg_2014/__21.html' }),
                Object.freeze({ label: 'BNetzA: Messstellenkosten', href: 'https://www.bundesnetzagentur.de/DE/Vportal/Energie/Metering/_faq/Kosten_table.html?r=1' })
            ])
        })
    });

    const CATALOG = Object.freeze([
        Object.freeze({
            id: 'single-household-pv',
            group: 'single',
            modelCode: 'MK A2',
            modelName: 'Überschusseinspeisung',
            title: 'Haushalt + PV',
            summary: 'Ein gemeinsamer Zähler für Haushalt und PV.',
            flow: ['Haushalt', 'PV'],
            kind: 'single',
            assets: ['consumer', 'generation']
        }),
        Object.freeze({
            id: 'single-household-pv-storage',
            group: 'single',
            modelCode: 'MK C1',
            modelName: 'Überschusseinspeisung mit gemeinsamer Messung',
            title: 'Haushalt + PV + Speicher',
            summary: 'Ein gemeinsamer Zähler für Haushalt, PV und Speicher.',
            flow: ['Haushalt', 'PV', 'Speicher'],
            kind: 'single',
            assets: ['consumer', 'generation', 'storage']
        }),
        Object.freeze({
            id: 'single-household-pv-storage-wallbox',
            group: 'single',
            modelCode: 'MK C1',
            modelName: 'Überschusseinspeisung mit gemeinsamer Messung',
            title: 'Haushalt + PV + Speicher + Wallbox',
            summary: 'Ein gemeinsamer Zähler für den häufigen Komplettfall.',
            flow: ['Haushalt', 'PV', 'Speicher', 'Wallbox'],
            kind: 'single',
            assets: ['consumer', 'generation', 'storage', 'steuve'],
            steuveType: 'Wallbox'
        }),
        Object.freeze({
            id: 'single-household-pv-storage-heatpump',
            group: 'single',
            modelCode: 'MK C1',
            modelName: 'Überschusseinspeisung mit gemeinsamer Messung',
            title: 'Haushalt + PV + Speicher + Wärmepumpe',
            summary: 'Ein gemeinsamer Zähler für Haushalt, PV, Speicher und Wärmepumpe.',
            flow: ['Haushalt', 'PV', 'Speicher', 'Wärmepumpe'],
            kind: 'single',
            assets: ['consumer', 'generation', 'storage', 'steuve'],
            steuveType: 'Wärmepumpe'
        }),
        Object.freeze({
            id: 'parallel-heatpump',
            group: 'parallel',
            modelCode: 'MK Z1b',
            modelName: 'Steuerbare Verbrauchseinrichtung ohne weitere Verbraucher',
            title: 'Separater Wärmepumpenzähler',
            summary: 'Haushalt und Wärmepumpe werden getrennt gemessen.',
            flow: ['Haushalt', 'Wärmepumpe'],
            kind: 'parallel',
            steuveType: 'Wärmepumpe',
            hint: PARALLEL_HINT
        }),
        Object.freeze({
            id: 'parallel-wallbox',
            group: 'parallel',
            modelCode: 'MK Z1b',
            modelName: 'Steuerbare Verbrauchseinrichtung ohne weitere Verbraucher',
            title: 'Separater Wallboxzähler',
            summary: 'Haushalt und Wallbox werden getrennt gemessen.',
            flow: ['Haushalt', 'Wallbox'],
            kind: 'parallel',
            steuveType: 'Wallbox',
            hint: PARALLEL_HINT
        }),
        Object.freeze({
            id: 'cascade-heatpump',
            group: 'cascade',
            modelCode: 'MK C3',
            modelName: 'Überschusseinspeisung mit Kaskadenmessung',
            title: 'Wärmepumpen-Kaskade',
            summary: 'Oben Wärmepumpe · dahinter Haushalt, PV und Speicher.',
            flow: ['Wärmepumpe', 'Haushalt', 'PV', 'Speicher'],
            kind: 'cascade',
            steuveType: 'Wärmepumpe'
        }),
        Object.freeze({
            id: 'cascade-wallbox',
            group: 'cascade',
            modelCode: 'MK C3',
            modelName: 'Überschusseinspeisung mit Kaskadenmessung',
            title: 'Wallbox-Kaskade',
            summary: 'Oben Wallbox · dahinter Haushalt, PV und Speicher.',
            flow: ['Wallbox', 'Haushalt', 'PV', 'Speicher'],
            kind: 'cascade',
            steuveType: 'Wallbox'
        }),
        Object.freeze({
            id: 'mieterstrom-d1',
            group: 'mieterstrom',
            modelCode: 'MK D1',
            modelName: 'Selbstversorgergemeinschaft',
            title: 'Mieterstromgemeinschaft',
            summary: 'Alle Anschlussnutzer werden von der Erzeugungsanlage versorgt.',
            showSummary: true,
            flow: ['PV', 'Mieterstromnutzer'],
            kind: 'mieterstrom',
            energyCarrier: 'PV',
            userCount: 4
        })
    ]);

    function getCatalog() {
        return CATALOG.map(entry => ({ ...entry, flow: [...entry.flow], assets: entry.assets ? [...entry.assets] : undefined }));
    }

    function getById(id) {
        return CATALOG.find(entry => entry.id === id) || null;
    }

    function getGroupInfo(group) {
        return GROUP_INFO[group] || null;
    }

    global.WattspurMesskonzeptPresets = Object.freeze({
        parallelHint: PARALLEL_HINT,
        getCatalog,
        getById,
        getGroupInfo
    });
}(window));
