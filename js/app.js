/**
 * Application Entry Point (js/app.js)
 * Clean modular initializer (Sprint 7)
 */

function initializeApp() {
    console.log('[Lastgang Tool] Initializing modular application v2026.07.24...');

    if (window.NavigationController) {
        window.NavigationController.init();
    }

    if (window.DashboardController) {
        window.DashboardController.updateDashboard();
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('[Service Worker] Registered:', reg.scope))
            .catch(err => console.warn('[Service Worker] Registration skipped:', err));
    }
}

if (typeof window !== 'undefined') {
    window.initializeApp = initializeApp;
    document.addEventListener('DOMContentLoaded', initializeApp);
}
