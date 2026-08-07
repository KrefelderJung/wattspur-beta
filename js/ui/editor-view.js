/**
 * Editor View Module (js/ui/editor-view.js)
 * Pure UI rendering component for table editing of load profile points
 */

if (typeof window !== 'undefined') {
    if (typeof window.EditorView === 'undefined') {
        window.EditorView = {
            renderTable: function(containerId, dataset) {
                const container = document.getElementById(containerId);
                if (!container || !dataset || !dataset.data) return;

                const escapeFn = window.escapeHtml || function(s) { return s; };
                const dateStrFn = window.getLocalDateString || function(d) { return d.toISOString(); };

                let html = `
                    <table class="editor-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Zeitstempel</th>
                                <th>Leistung (kW)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                dataset.data.slice(0, 1000).forEach((item, idx) => {
                    const date = item.dateObj || new Date(item.timestamp || Date.now());
                    const timeLabel = `${dateStrFn(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    html += `
                        <tr data-index="${idx}">
                            <td>${idx + 1}</td>
                            <td>${escapeFn(timeLabel)}</td>
                            <td><input type="number" step="0.1" class="editor-kw-input" value="${item.kw !== undefined ? item.kw : (item.powerKw || 0)}" data-index="${idx}"></td>
                            <td><span class="status-badge status-${(item.status || 'VALID').toLowerCase()}">${escapeFn(item.status || 'VALID')}</span></td>
                        </tr>
                    `;
                });

                html += `</tbody></table>`;
                container.innerHTML = html;
            }
        };
    }
}
