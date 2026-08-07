/**
 * Navigation Controller Module (js/ui/navigation-controller.js)
 * Manages tab switching, active view states, and navigation event listeners
 */

if (typeof window !== 'undefined') {
    if (typeof window.NavigationController === 'undefined') {
        window.NavigationController = {
            init: function() {
                const navButtons = document.querySelectorAll('.nav-btn[data-tab]');
                navButtons.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const targetTab = btn.getAttribute('data-tab');
                        if (targetTab) {
                            window.NavigationController.switchTab(targetTab);
                        }
                    });
                });
            },

            switchTab: function(tabName) {
                const tabs = document.querySelectorAll('.tab-content');
                tabs.forEach(t => t.style.display = 'none');

                const target = document.getElementById(`tab-${tabName}`) || document.getElementById(tabName);
                if (target) {
                    target.style.display = 'block';
                }

                const navButtons = document.querySelectorAll('.nav-btn[data-tab]');
                navButtons.forEach(btn => {
                    if (btn.getAttribute('data-tab') === tabName) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                if (window.AppState) {
                    window.AppState.setActiveView(tabName);
                }
            }
        };
    }
}
