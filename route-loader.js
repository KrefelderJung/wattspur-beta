/* Lädt die statische Haupt-App hinter einem lesbaren Werkzeugpfad. */
(async function loadToolRoute() {
    const route = document.documentElement.dataset.route;
    const fallback = '../index.html';

    try {
        const response = await fetch(fallback, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        let markup = await response.text();
        markup = markup.replace(/<head(\s[^>]*)?>/i, match => `${match}\n    <base href="/">`);
        document.open();
        document.write(markup);
        document.close();
    } catch (error) {
        document.body.innerHTML = `
            <main style="font:16px system-ui;max-width:40rem;margin:4rem auto;padding:1rem">
                <h1>Wattspur konnte nicht geladen werden.</h1>
                <p>Bitte prüfen Sie die Internetverbindung und versuchen Sie es erneut.</p>
                <p><a href="${fallback}">Zur Werkzeugauswahl</a></p>
            </main>`;
        console.error('Tool-Route konnte nicht geladen werden', route, error);
    }
})();
