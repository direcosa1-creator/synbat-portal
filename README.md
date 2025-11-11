# SynBat v8.1 Online

## Setup rapido
- Supabase: crea progetto, esegui lo schema SQL (tabelle + RLS + Storage bucket `docs`).
- .env.local: compila chiavi Supabase e SMTP (se vuoi le email da /api/sendMail).
- Dev: `npm install && npm run dev`
- Deploy: importa il repo su Vercel e imposta le variabili ambiente.
