/**
 * Gemeinsame Download-Hilfen (js/shared/download.js)
 *
 * Neben dem eigentlichen Datei-Download stellt dieses Modul die gemeinsame
 * visuelle Download-Komponente für Lastgang- und Messkonzept-Exportbuttons
 * bereit. Die Fachlogik der jeweiligen Exporte bleibt in den Werkzeugen.
 */

function triggerDownload(content, fileName, mimeType = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const DOWNLOAD_ICON_MARKUP = `
    <svg class="ws-download-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3v11"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M5 20h14"></path>
    </svg>`;

function enhanceDownloadButton(button) {
    if (!button || button.dataset.downloadButtonEnhanced === 'true') return button;
    const label = button.dataset.downloadLabel || button.textContent.trim() || 'Download';
    const tooltip = button.dataset.downloadTooltip || button.title || `${label} herunterladen`;
    button.classList.add('ws-download-button');
    button.dataset.downloadButtonEnhanced = 'true';
    button.title = tooltip;
    button.setAttribute('aria-label', tooltip);
    button.innerHTML = `${DOWNLOAD_ICON_MARKUP}<span class="ws-download-button-label"></span>`;
    button.querySelector('.ws-download-button-label').textContent = label;
    return button;
}

function enhanceDownloadButtons(root = document) {
    root?.querySelectorAll?.('[data-download-button]').forEach(enhanceDownloadButton);
}

if (typeof window !== 'undefined') {
    const documentRef = typeof document !== 'undefined' ? document : null;
    window.triggerDownload = triggerDownload;
    window.WattspurDownloadButton = Object.freeze({
        enhance: enhanceDownloadButton,
        enhanceAll: enhanceDownloadButtons
    });
    if (documentRef?.readyState === 'loading') {
        documentRef.addEventListener('DOMContentLoaded', () => enhanceDownloadButtons(documentRef));
    } else {
        enhanceDownloadButtons(documentRef);
    }
}
