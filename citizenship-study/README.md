# Citizenship Test Study

Bilingual (English/Español) study game for the DPS Citizenship Test, with student logins (name + 4-digit PIN) and a teacher dashboard.

- Student site: your Vercel URL
- Teacher dashboard: your Vercel URL + `/#/teacher`

## Settings you can change
- `src/config.js`: passing score (default 70%), round sizes, XP per level, graduating classes
- `src/data/questions.js`: all 99 questions. Questions marked `dynamic: true` depend on who holds an office. Update them each year (English text, Spanish text, and the `answer` number).

## Database
Run `supabase/schema.sql`, then `supabase/set_teacher_passphrase.sql`, in the Supabase SQL Editor.
Vercel needs two environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
