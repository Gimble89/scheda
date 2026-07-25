# Scheda Full Body

App di allenamento A/B/C: tracciamento carichi, RIR, superserie, timer di
recupero, misure corporee, analisi AI e sincronizzazione cloud.

Offline-first: localStorage è il negozio primario, Supabase è uno specchio.

## Avvio

```bash
npm install
npm run dev      # sviluppo, con ricarica istantanea
npm run build    # produzione, scrive in dist/
npm run preview  # prova dist/ come lo servirebbe GitHub Pages
```

Procedura completa e note tecniche: **MIGRAZIONE.md**.
Analisi di sicurezza: **SECURITY.md**.

## Stack

Vanilla JS su Vite. Nessuna dipendenza a runtime: il bundle prodotto non carica
librerie. Vite serve solo in fase di sviluppo e build.

- **Dati**: localStorage + Supabase (REST via `fetch`, niente SDK)
- **AI**: Google Gemini (chiave dell'utente, in localStorage)
- **Audio**: Web Audio API
- **Hosting**: GitHub Pages, build automatica via GitHub Actions
