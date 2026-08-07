/**
 * Quality View Module (js/ui/quality-view.js)
 * Renders data quality traffic lights, completeness badges, and warning lists
 */

if (typeof window !== 'undefined') {
    if (typeof window.QualityView === 'undefined') {
        window.QualityView = {
            renderTrafficLight: function(qualityClass, containerId = 'quality-traffic-light') {
                const el = document.getElementById(containerId);
                if (!el) return;

                const status = qualityClass || 'GREEN';
                let color = '#10B981'; // Green
                let label = 'Sehr gut';
                if (status === 'YELLOW') { color = '#F59E0B'; label = 'Bedingt geeignet'; }
                else if (status === 'RED') { color = '#EF4444'; label = 'Nicht ausreichend'; }

                el.innerHTML = `
                    <div style="display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border-radius:20px; background:${color}20; border:1px solid ${color};">
                        <span style="width:10px; height:10px; border-radius:50%; background:${color};"></span>
                        <span style="font-weight:600; color:${color}; font-size:0.9rem;">${label}</span>
                    </div>
                `;
            },

            renderQualityReport: function(qualityResult, containerId = 'quality-report-container') {
                const container = document.getElementById(containerId);
                if (!container || !qualityResult) return;

                const escapeFn = window.escapeHtml || function(s) { return s; };
                const warningsHtml = (qualityResult.warnings || []).map(w => `<li style="color:#F59E0B;">⚠️ ${escapeFn(w)}</li>`).join('');
                const errorsHtml = (qualityResult.errors || []).map(e => `<li style="color:#EF4444;">❌ ${escapeFn(e)}</li>`).join('');

                container.innerHTML = `
                    <div class="quality-summary-card">
                        <h4>Datenqualität & Abdeckung</h4>
                        <p>Abdeckung: <strong>${Math.round((qualityResult.completenessRatio || 0) * 100)} %</strong></p>
                        <p>Gültige Intervalle: ${qualityResult.validIntervals} / ${qualityResult.expectedIntervals}</p>
                        ${warningsHtml || errorsHtml ? `<ul class="quality-log-list">${warningsHtml}${errorsHtml}</ul>` : '<p style="color:#10B981;">Keine Datenfehler erkannt.</p>'}
                    </div>
                `;
            }
        };
    }
}
