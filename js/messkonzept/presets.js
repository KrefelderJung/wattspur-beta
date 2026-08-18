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
            intro: 'Geeignet für eine Mieterstromgemeinschaft, in der alle Anschlussnutzer von der Erzeugungsanlage versorgt werden sollen.',
            advantages: Object.freeze([
                'Die Erzeugungsanlage und alle teilnehmenden Anschlussnutzer sind in einer gemeinsamen Skizze sichtbar.',
                'Mieterstromzähler bleiben je Nutzer zugeordnet und können später wieder als reguläre Netzanschlüsse berücksichtigt werden.',
                'Die Vorlage eignet sich als verständlicher Ausgangspunkt für PV- oder BHKW-Mieterstromgemeinschaften.'
            ]),
            cautions: Object.freeze([
                'Die nicht aktive Marktlokation der teilnehmenden Mieterstromzähler ist hier nur eine technische Modellannahme.',
                'Belieferung, Abrechnung und die konkrete Rolle der Zähler müssen mit Betreiber, Messstellenbetreiber, Netzbetreiber und Lieferant abgestimmt werden.',
                'Wenn ein Nutzer später wieder einen freien Lieferanten wählen soll, muss die Mess- und Abrechnungsstruktur angepasst werden.'
            ]),
            links: Object.freeze([])
        })
    });

    const CATALOG = Object.freeze([
        Object.freeze({
            id: 'single-household-pv',
            group: 'single',
            title: 'Haushalt + PV',
            summary: 'Ein gemeinsamer Zähler für Haushalt und PV.',
            flow: ['Haushalt', 'PV'],
            kind: 'single',
            assets: ['consumer', 'generation']
        }),
        Object.freeze({
            id: 'single-household-pv-storage',
            group: 'single',
            title: 'Haushalt + PV + Speicher',
            summary: 'Ein gemeinsamer Zähler für Haushalt, PV und Speicher.',
            flow: ['Haushalt', 'PV', 'Speicher'],
            kind: 'single',
            assets: ['consumer', 'generation', 'storage']
        }),
        Object.freeze({
            id: 'single-household-pv-storage-wallbox',
            group: 'single',
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
            title: 'Separater Wärmepumpenzähler',
            summary: 'Z1 Haushalt · Z2 Wärmepumpe',
            flow: ['Haushalt', 'Wärmepumpe'],
            kind: 'parallel',
            steuveType: 'Wärmepumpe',
            hint: PARALLEL_HINT
        }),
        Object.freeze({
            id: 'parallel-wallbox',
            group: 'parallel',
            title: 'Separater Wallboxzähler',
            summary: 'Z1 Haushalt · Z2 Wallbox',
            flow: ['Haushalt', 'Wallbox'],
            kind: 'parallel',
            steuveType: 'Wallbox',
            hint: PARALLEL_HINT
        }),
        Object.freeze({
            id: 'cascade-heatpump',
            group: 'cascade',
            title: 'Wärmepumpen-Kaskade',
            summary: 'Oben Wärmepumpe · dahinter Haushalt, PV und Speicher.',
            flow: ['Wärmepumpe', 'Haushalt', 'PV', 'Speicher'],
            kind: 'cascade',
            steuveType: 'Wärmepumpe'
        }),
        Object.freeze({
            id: 'cascade-wallbox',
            group: 'cascade',
            title: 'Wallbox-Kaskade',
            summary: 'Oben Wallbox · dahinter Haushalt, PV und Speicher.',
            flow: ['Wallbox', 'Haushalt', 'PV', 'Speicher'],
            kind: 'cascade',
            steuveType: 'Wallbox'
        }),
        Object.freeze({
            id: 'mieterstrom-d1',
            group: 'mieterstrom',
            title: 'MK D1: Mieterstromgemeinschaft',
            summary: 'Alle Anschlussnutzer werden von der Erzeugungsanlage versorgt.',
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
