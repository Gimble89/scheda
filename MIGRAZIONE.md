# Migrazione a Vite — procedura

Progetto pronto. Ti servono Node.js e un terminale. Sotto trovi la procedura,
poi cosa è cambiato davvero e cosa resta da fare.

---

## Prima di tutto: cosa NON ho potuto verificare

Va detto subito, perché cambia come affronti i passi qui sotto.

La mia sandbox ha la rete disattivata: `npm install` scarica Vite dal registro
npm e quindi **non ho potuto installarlo, né lanciare la build, né aprire l'app
in un browser**. Quello che ho verificato è:

- ogni file passa il controllo di sintassi come modulo ES (`node --check`)
- nessuna funzione risulta chiamata senza essere definita o importata
- nessun binding importato viene riassegnato (vietato nei moduli)
- il CSS diviso conserva l'ordine originale, quindi la cascata non cambia

Quello che **non** ho verificato è il comportamento a runtime. Il primo
`npm run dev` è il vero collaudo. Se qualcosa non parte, quasi certamente è una
delle due cose elencate in fondo, in "Se qualcosa non funziona".

---

## Passo 1 — Node.js

```bash
node --version
```

Serve la 18 o superiore. Se il comando non esiste, installa la versione LTS da
nodejs.org, poi riapri il terminale.

## Passo 2 — Metti a posto la cartella

Scompatta il progetto dove preferisci, ed entraci:

```bash
cd percorso/della/cartella/scheda-fullbody
```

**Copia le icone dal vecchio repo.** Non le avevo, quindi mancano:

```
public/icons/apple-touch-icon.png
public/icons/favicon-32.png
public/icons/favicon-192.png
public/icons/favicon-512.png
```

Tutto ciò che sta in `public/` finisce nella radice del sito così com'è. Se le
salti l'app funziona lo stesso, ma vedrai dei 404 in console e l'icona sulla
home del telefono sarà quella generica.

## Passo 3 — Installa e prova in locale

```bash
npm install
npm run dev
```

Apre `http://localhost:5173`. **Prova qui prima di pubblicare.** In `vite.config.js`
ho messo `host: true`, quindi il terminale stampa anche un indirizzo di rete tipo
`http://192.168.1.x:5173`: aprilo dal telefono collegato allo stesso wi-fi e
provi direttamente su iOS, che è dove l'app vive davvero.

Da controllare, in ordine di importanza:

1. l'app parte e mostra il giorno A
2. il login Supabase funziona e i dati si sincronizzano
3. i dropdown esercizio e superserie si aprono e chiudono
4. il timer di recupero suona
5. la chat con l'AI risponde (verifica la chiave Gemini, ora viaggia in un header)
6. l'import di una scheda da foto arriva all'anteprima
7. il logout ti chiede se cancellare la copia locale

Mentre `npm run dev` gira, ogni modifica ai file si ricarica da sola in un
istante. È il motivo principale per cui vale la pena avere fatto tutto questo.

## Passo 4 — Build di produzione

```bash
npm run build
npm run preview
```

`build` scrive in `dist/`. `preview` te lo serve come lo servirebbe GitHub Pages:
se funziona qui, funziona online.

## Passo 5 — Pubblica

Nel repo, sostituisci il vecchio `index.html` con questa struttura. `dist/` e
`node_modules/` sono già in `.gitignore`: **non vanno committati**, li costruisce
la Action.

```bash
git add -A
git commit -m "v25.0 — migrazione a Vite e correzioni di sicurezza"
git push
```

Poi, una volta sola, su GitHub: **Settings → Pages → Source: GitHub Actions**.

Da qui in avanti ogni `git push` su `main` ricostruisce e ripubblica da solo.
Non devi più lanciare `npm run build` a mano: quello serve solo se vuoi provare
in locale prima.

---

## Cosa è cambiato

### Struttura

```
index.html                 markup + CSP (109 righe, prima erano 6366)
src/
  main.js                  punto d'ingresso
  app.js                   nucleo applicativo (5599 righe)
  data/
    figures.js             le 14 figure SVG
    cues.js                i cue tecnici
    library.js             libreria esercizi, gruppi, default
    default-plan.js        la scheda A/B/C di partenza
  styles/
    index.css              importa gli altri
    base.css               variabili e reset
    layout.css             header, nav, barra
    exercise.css           card esercizio e superserie
    components.css         card, form, tabelle
    modal.css              modali e schermate
public/manifest.json       manifest PWA
vite.config.js
.github/workflows/deploy.yml
```

### Sulla divisione: è volutamente parziale

Onestà su questo punto, perché è la scelta di progetto più importante che ho
fatto e va capita.

Il file originale aveva **304 identificatori globali** che si chiamano fra loro
liberamente. Spezzarli in venti moduli significa costruire a mano un grafo di
import con centinaia di archi. Senza poter compilare né eseguire — e io non
posso, la rete è chiusa — la probabilità di consegnarti un'app rotta sarebbe
stata alta. Un import circolare o una variabile letta prima di essere
inizializzata non si vedono con un controllo di sintassi: si vedono a schermo
bianco.

Ho quindi estratto solo ciò che è **autosufficiente e verificabile**: i blocchi
di dati puri. Sono circa 350 righe che non dipendono da niente e che nessuno
tocca mai. Il resto resta in `app.js`, dove funziona esattamente come prima,
perché l'ordine di valutazione non è cambiato di una riga.

Il valore vero della migrazione, oggi, non è il numero di file. È:

- **la CSP diventa applicabile.** Con il JavaScript inline avrebbe richiesto
  `unsafe-inline`, che la rende decorativa. Con un bundle esterno morde davvero.
- **`npm run dev` con ricarica istantanea**, che rende possibile la Fase 2.
- **il deploy automatico**, che toglie un passaggio manuale a ogni rilascio.

### Fase 2 — come continuare la divisione

Da fare quando vuoi, un pezzo per volta, con `npm run dev` aperto. La regola è
una sola: **un modulo alla volta, si prova, si committa.** Mai due insieme.

Ordine consigliato, dal più isolato al più intrecciato:

1. `src/utils/format.js` — `fmt`, `esc`, `round`, `ago`, `cleanTxt`, `cleanNum`
2. `src/core/storage.js` — l'oggetto `store` e le chiavi di localStorage
3. `src/features/timer.js` — timer di recupero e cronometro seduta
4. `src/features/body.js` — misure corporee e grafici
5. `src/features/ai/gemini.js` — `askGemini`, `gemKey`, `gemModel`
6. `src/core/supabase.js` — accesso e sincronizzazione
7. `src/ui/render.js` — il ciclo di rendering, per ultimo perché tocca tutto

Metodo pratico per ognuno: sposti le funzioni nel nuovo file, aggiungi `export`,
metti l'`import` in cima ad `app.js`, salvi. Se la pagina si ricarica e funziona,
committa. Se compare un errore in console, `Ctrl+Z` e capisci prima di riprovare.

---

## Le correzioni di sicurezza applicate

| # | Cosa | Dove |
|---|------|------|
| 1 | `esc()` neutralizza anche `<` `>` `&` `'` | `app.js`, funzione `esc` |
| 2 | Escape delle etichette nell'anteprima patch AI | `previewPatch` |
| 3 | Chiave Gemini in header `x-goog-api-key`, non più in query string | `askGemini`, import da foto |
| 4 | Email personale rimossa dal sorgente, ruolo letto da `owner_roles` | `refreshOwnerRole` |
| 5 | Il logout può cancellare schede, misure e chiave dal dispositivo | `logoutCloud` |
| 6 | `img src` accetta solo `https:` e `data:image/` | `safeImg` |
| 7 | Il backup esportato non contiene più la chiave API | export in impostazioni |
| 8 | Validazione di forma su ogni scheda importata | `validateDays` |
| 9 | Content-Security-Policy attiva | `index.html` |

Il numero 1 è quello che contava. La vecchia `esc()` fermava solo le virgolette,
quindi un `<img src=x onerror=...>` scritto sulla foto di una scheda passava
attraverso l'OCR, finiva nel nome dell'esercizio e veniva eseguito dal browser —
con il token Supabase a portata di mano in localStorage.

### Una cosa che era già a posto

`applyChatPatch` non applica niente da solo: passa da `previewPatch`, che mostra
ogni modifica con la sua spunta e richiede un click esplicito su "Applica". La
protezione contro il prompt injection quindi c'era già ed è quella giusta. Ho
solo aggiunto l'escape sulle etichette, che venivano dal testo dell'AI e finivano
in `innerHTML` senza filtro.

---

## Se qualcosa non funziona

**Schermata bianca al primo `npm run dev`.** Apri la console del browser. Se
leggi `Cannot access 'X' before initialization`, è una costante letta prima di
essere valutata: è l'unico effetto collaterale plausibile dello spostamento dei
blocchi dati. Si risolve spostando l'`import` o la definizione. Mandami il
messaggio esatto e ti dico dove.

**Qualcosa viene bloccato dalla CSP.** In console leggi `Refused to ... because
it violates the following Content Security Policy directive`. Vuol dire che
l'app contatta un dominio che non ho previsto. Aggiungilo alla direttiva giusta
in `index.html`. Se ti blocca la strada e hai fretta, puoi togliere tutto il
meta tag della CSP: l'app torna a funzionare come prima e perdi solo quello
strato di difesa, non gli altri otto.

**404 sulle icone.** Mancano i file in `public/icons/`, vedi Passo 2.

**La Action fallisce con `npm ci`.** Serve `package-lock.json` committato. Lo
genera `npm install` al Passo 3: assicurati di averlo aggiunto al commit.

---

## Ancora aperto

**La sincronizzazione della chiave Gemini.** Non l'ho toccata perché è una tua
decisione. Oggi, con l'opzione attiva, la chiave finisce in chiaro nel blob su
Supabase. Con RLS chiusa — e ora lo è — il rischio è basso, ma il beneficio è
minimo: reinserirla a mano sul secondo dispositivo sono venti secondi. Se vuoi,
tolgo l'opzione o la cifro con una passphrase.

**I dati corporei nei prompt.** Peso, percentuale di grasso e circonferenze
finiscono nel contesto inviato a Google. È implicito nell'usare Gemini e non è
un difetto, ma sono dati sanitari e il piano gratuito di AI Studio prevede il
loro uso per migliorare i modelli. Se preferisci, escludo la sezione corporea
dai prompt e lascio all'AI solo forza e volumi.

**La storia del repo.** Se in passato hai committato qualcosa e poi l'hai tolto,
resta nei commit precedenti: io vedo solo il file di oggi. Vale un
`git log -p | grep -iE "eyJ|AIza|service_role"` — cinque minuti.

---

*Versione 25.0 — build preparata senza accesso a rete, collaudo runtime da fare
al Passo 3.*
