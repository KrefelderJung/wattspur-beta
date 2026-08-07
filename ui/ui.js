// ui/ui.js - UI Modal & Controller Module (Single Source of Truth for Modals)

function showAgnesInfoModal(type) {
    const modal = document.getElementById('agnes-info-modal');
    if (!modal) return;
    
    const titleEl = modal.querySelector('.modal-title');
    const contentEl = modal.querySelector('.modal-body-content');
    if (!titleEl || !contentEl) return;

    let title = 'Erklärung: Kapazitätsbestellung (Beta)';
    let bodyHtml = '';
    
    if (type === 'general') {
        title = 'Kapazitätsbestellung (Beta): Rechenweg und Grenzen';
        bodyHtml = `
            <div style="padding: 0.8rem; border-left: 4px solid var(--warning-color); border-radius: var(--radius-sm); background: rgba(245, 158, 11, 0.09);">
                <strong>Experimentelle Szenariorechnung:</strong> Das Modell ist keine verbindliche AgNes-, Abrechnungs- oder BNetzA-Vorgabe. AgNes befindet sich noch im Festlegungsverfahren. Preisparameter und Mindestbuchung sind Annahmen und müssen vor einer betrieblichen Nutzung fachlich geprüft werden.
            </div>
            <p>
                Die Berechnung sucht innerhalb der eingegebenen Parameter die Bestellleistung <strong>K<sub>opt</sub></strong> mit den geringsten modellierten Gesamtkosten. Sie zeigt damit ein mögliches Szenario – keine Empfehlung zum Vertragsabschluss.
            </p>
            <h4 style="margin: 0.8rem 0 0.25rem 0; color: var(--text-main); font-size: 0.9rem; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 0.2rem;">
                1. Verwendete Kostenformel
            </h4>
            <p>
                Für jede untersuchte Bestellleistung K werden Kapazitätskosten, Arbeit innerhalb der Kapazität und Arbeit oberhalb der Kapazität addiert:
            </p>
            <div style="font-family: monospace; font-size: 0.8rem; background: var(--surface-hover); padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin: 0.5rem 0; line-height: 1.5;">
                <strong>Netzkosten(K) = K &middot; KP + E<sub>AP1</sub>(K) &middot; (AP<sub>1</sub> / 100) + E<sub>AP2</sub>(K) &middot; (AP<sub>2</sub> / 100)</strong>
            </div>

            <h4 style="margin: 1rem 0 0.25rem 0; color: var(--text-main); font-size: 0.9rem; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 0.2rem;">
                2. Modellierte Untergrenze
            </h4>
            <p>
                Ohne eigene Eingabe verwendet die Beta eine Untergrenze von 10&nbsp;% der Jahreshöchstlast. Das ist eine <strong>Modellannahme</strong>, kein bestätigter gesetzlicher Mindestwert. Über das Feld „Mindestbuchung“ kann eine andere Untergrenze in kW geprüft werden.
            </p>
            <div style="font-family: monospace; font-size: 0.8rem; background: var(--surface-hover); padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin: 0.5rem 0; line-height: 1.5;">
                <strong>Untere Suchgrenze K<sub>min</sub> = eigene Eingabe oder 10&nbsp;% &middot; P<sub>max</sub></strong>
            </div>
            <h4 style="margin: 1rem 0 0.25rem 0; color: var(--text-main); font-size: 0.9rem; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 0.2rem;">
                3. Offizieller Bezug
            </h4>
            <p>
                Der veröffentlichte AgNes-Zwischenstand beschreibt für Großverbraucher einen Kapazitätspreis und einen Preisaufschlag bei Überschreitung. Die konkrete Ausgestaltung ist noch nicht abgeschlossen. Quellenstand dieser Beta: 27.05.2026.
                <a href="https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260527_Agnes.html" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color);">Quelle bei der Bundesnetzagentur öffnen</a>
            </p>
        `;
    } else if (type === 'duration') {
        const isMulti = document.getElementById('agnes-timeframe-multi')?.classList.contains('active');
        title = isMulti ? 'Erklärung: Mehrjährige Jahresdauerlinie' : 'Erklärung: Jahresdauerlinie';
        bodyHtml = `
            <p>
                Dieses Diagramm visualisiert die gemessenen Leistungswerte absteigend sortiert vom höchsten zum niedrigsten Wert.
            </p>
        `;
    } else if (type === 'cost') {
        title = 'Erklärung: Netzkosten-Kurve';
        bodyHtml = `
            <p>
                Dieses Diagramm veranschaulicht die jährlichen Netzentgelte in Abhängigkeit von Ihrer gewählten Bestellkapazität.
            </p>
        `;
    } else if (type === 'matrix') {
        title = 'Erklärung: Jahresvergleich & Kostenrisiken';
        bodyHtml = `
            <p>
                Die mehrjährige Analyse hilft Ihnen, eine wirtschaftlich robuste Bestellleistung für unvorhersehbare Jahre zu finden.
            </p>
        `;
    }
    
    titleEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--primary-color)" stroke-width="2.5" style="margin-right: 0.5rem; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        ${title}
    `;
    if (bodyHtml) contentEl.innerHTML = bodyHtml;
    modal.classList.remove('hidden');
}

function closeAgnesInfoModal() {
    const modal = document.getElementById('agnes-info-modal');
    if (modal) modal.classList.add('hidden');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showAgnesInfoModal, closeAgnesInfoModal };
}
