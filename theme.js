/* Wattspur gemeinsamer Tag-/Nachtmodus.
 * Standard bleibt der bisherige Nachtmodus; die Auswahl wird nur lokal im Browser gespeichert.
 */
(function initializeWattspurTheme() {
    const storageKey = 'wattspur-theme';
    const root = document.documentElement;

    function readStoredTheme() {
        try {
            const stored = window.localStorage.getItem(storageKey);
            return stored === 'light' || stored === 'dark' ? stored : null;
        } catch (error) {
            return null;
        }
    }

    function getCurrentTheme() {
        return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function renderToggle(button, theme) {
        const isDark = theme === 'dark';
        button.innerHTML = isDark
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="19" height="19" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
        button.title = isDark ? 'Tagmodus aktivieren' : 'Nachtmodus aktivieren';
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-pressed', String(!isDark));
    }

    function updateToggleButtons(theme = getCurrentTheme()) {
        document.querySelectorAll('[data-theme-toggle]').forEach(button => renderToggle(button, theme));
    }

    function updateThemeColor(theme = getCurrentTheme()) {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) themeColorMeta.setAttribute('content', theme === 'light' ? '#e8eef3' : '#0f172a');
    }

    function applyTheme(theme, persist = true) {
        const nextTheme = theme === 'light' ? 'light' : 'dark';
        root.setAttribute('data-theme', nextTheme);
        updateThemeColor(nextTheme);
        if (persist) {
            try {
                window.localStorage.setItem(storageKey, nextTheme);
            } catch (error) {
                // Privater Browsing-Modus oder blockierter Speicher: Thema bleibt dennoch aktiv.
            }
        }
        updateToggleButtons(nextTheme);
        window.dispatchEvent(new CustomEvent('wattspur:themechange', {
            detail: { theme: nextTheme, isDark: nextTheme === 'dark' }
        }));
    }

    window.WattspurTheme = Object.freeze({
        get: getCurrentTheme,
        apply: theme => applyTheme(theme),
        toggle: () => applyTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark')
    });

    const storedTheme = readStoredTheme();
    if (storedTheme) applyTheme(storedTheme, false);
    else updateToggleButtons();

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-theme-toggle]');
        if (button) window.WattspurTheme.toggle();
    });
    document.addEventListener('DOMContentLoaded', () => {
        updateToggleButtons();
        updateThemeColor();
    });
})();
