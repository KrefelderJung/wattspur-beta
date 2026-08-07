/**
 * Modal View Module (js/ui/modal-view.js)
 * Pure UI rendering for modals, dialogs, and toast notifications
 */

if (typeof window !== 'undefined') {
    if (typeof window.ModalView === 'undefined') {
        window.ModalView = {
            showToast: function(message, type = 'info') {
                const container = document.getElementById('toast-container');
                if (!container) return;

                const toast = document.createElement('div');
                toast.className = `toast toast-${type}`;
                
                let icon = '';
                switch(type) {
                    case 'success':
                        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
                        break;
                    case 'error':
                        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
                        break;
                    case 'warning':
                        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
                        break;
                    default:
                        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
                }
                
                toast.innerHTML = icon;
                const msgSpan = document.createElement('span');
                msgSpan.textContent = message;
                toast.appendChild(msgSpan);
                container.appendChild(toast);

                setTimeout(() => { toast.classList.add('show'); }, 10);
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => { toast.remove(); }, 300);
                }, 4000);
            },

            openModal: function(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) modal.style.display = 'block';
            },

            closeModal: function(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) modal.style.display = 'none';
            }
        };
    }
}
