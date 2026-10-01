# Citizenship Test Study

Bilingual (English/Español) study game for the DPS Citizenship Test, with student logins (name + 4-digit PIN), a teacher dashboard, and a runner game (Founders' Run).

- Student site: your Vercel URL
- Teacher dashboard: your Vercel URL + `/#/teacher`

## Settings you can change
- `src/config.js`: passing score (default 70%), round sizes, XP per level, graduating classes, how often question gates appear in Founders' Run
- `src/data/questions.js`: all 99 questions. Questions marked `dynamic: true` depend on who holds an office. Update them each year (English text, Spanish text, and the `answer` number).
- `src/game/draw.js`: the runners (HEROES list) and the monuments in the background
- `src/game/runner.js`: game speed, jump height, obstacle sizes

## Database
Fresh setup: run `supabase/schema.sql`, then `supabase/set_teacher_passphrase.sql`, in the Supabase SQL Editor.
Already ran an older schema.sql? Run `supabase/add_runner_game.sql` once instead of re-running schema.sql.
Vercel needs two environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
