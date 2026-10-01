-- =====================================================================
-- Citizenship Test Study: database setup
-- Run this ONCE in Supabase: SQL Editor > New query > paste > Run.
-- Everything is prefixed "cit_" so it will not clash with other projects.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tables ----------
create table if not exists public.cit_students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  name_key text not null unique,
  grad_class int not null,
  pin_hash text not null,
  session_token uuid,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  xp int not null default 0,
  streak_days int not null default 0,
  last_active_date date,
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cit_question_stats (
  student_id uuid not null references public.cit_students(id) on delete cascade,
  question_id int not null,
  seen int not null default 0,
  correct int not null default 0,
  correct_streak int not null default 0,
  last_correct boolean,
  last_seen_at timestamptz,
  primary key (student_id, question_id)
);

create table if not exists public.cit_rounds (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.cit_students(id) on delete cascade,
  mode text not null,
  language text not null,
  total int not null,
  correct int not null,
  xp_earned int not null,
  created_at timestamptz not null default now()
);
create index if not exists cit_rounds_student_idx on public.cit_rounds(student_id, created_at desc);

create table if not exists public.cit_teacher_settings (
  id int primary key default 1 check (id = 1),
  pass_hash text not null
);

-- ---------- Lock the tables: nobody can read them directly ----------
alter table public.cit_students enable row level security;
alter table public.cit_question_stats enable row level security;
alter table public.cit_rounds enable row level security;
alter table public.cit_teacher_settings enable row level security;
revoke all on public.cit_students, public.cit_question_stats, public.cit_rounds, public.cit_teacher_settings from anon, authenticated;

-- ---------- Helper functions (not callable from the website) ----------
create or replace function public.cit_norm(t text) returns text
language sql immutable as $$
  select lower(regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g'))
$$;

create or replace function public.cit_student_json(p_id uuid) returns json
language sql security definer set search_path = public, extensions as $$
  select json_build_object(
    'id', s.id, 'first_name', s.first_name, 'last_name', s.last_name,
    'grad_class', s.grad_class, 'xp', s.xp, 'streak_days', s.streak_days,
    'last_active_date', s.last_active_date)
  from public.cit_students s where s.id = p_id
$$;

create or replace function public.cit_is_teacher(p_pass text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select coalesce((select t.pass_hash = extensions.crypt(coalesce(p_pass, ''), t.pass_hash)
                   from public.cit_teacher_settings t where t.id = 1), false)
$$;

revoke execute on function public.cit_norm(text) from public, anon, authenticated;
revoke execute on function public.cit_student_json(uuid) from public, anon, authenticated;
revoke execute on function public.cit_is_teacher(text) from public, anon, authenticated;

-- ---------- Student functions ----------
create or replace function public.cit_register(p_first text, p_last text, p_class int, p_pin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_first text := regexp_replace(trim(coalesce(p_first, '')), '\s+', ' ', 'g');
  v_last text := regexp_replace(trim(coalesce(p_last, '')), '\s+', ' ', 'g');
  v_token uuid;
begin
  if length(v_first) < 1 or length(v_last) < 1 or length(v_first) > 40 or length(v_last) > 40 then
    return json_build_object('error', 'NAME_REQUIRED');
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return json_build_object('error', 'PIN_FORMAT');
  end if;
  if p_class is null or p_class < 2026 or p_class > 2040 then
    return json_build_object('error', 'BAD_CLASS');
  end if;
  if exists (select 1 from public.cit_students where name_key = public.cit_norm(v_first || ' ' || v_last)) then
    return json_build_object('error', 'NAME_TAKEN');
  end if;
  insert into public.cit_students (first_name, last_name, name_key, grad_class, pin_hash, session_token, last_active_at)
  values (v_first, v_last, public.cit_norm(v_first || ' ' || v_last), p_class,
          extensions.crypt(p_pin, extensions.gen_salt('bf')), gen_random_uuid(), now())
  returning session_token into v_token;
  return json_build_object('token', v_token);
end $$;

create or replace function public.cit_login(p_first text, p_last text, p_pin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  s public.cit_students;
  v_token uuid;
begin
  select * into s from public.cit_students
   where name_key = public.cit_norm(coalesce(p_first, '') || ' ' || coalesce(p_last, ''));
  if not found then
    return json_build_object('error', 'BAD_LOGIN');
  end if;
  if s.locked_until is not null and s.locked_until > now() then
    return json_build_object('error', 'LOCKED');
  end if;
  if s.pin_hash <> extensions.crypt(coalesce(p_pin, ''), s.pin_hash) then
    update public.cit_students set
      failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '10 minutes' else locked_until end
    where id = s.id;
    return json_build_object('error', case when s.failed_attempts + 1 >= 5 then 'LOCKED' else 'BAD_LOGIN' end);
  end if;
  update public.cit_students set
    failed_attempts = 0, locked_until = null,
    session_token = coalesce(session_token, gen_random_uuid()),
    last_active_at = now()
  where id = s.id
  returning session_token into v_token;
  return json_build_object('token', v_token);
end $$;

create or replace function public.cit_get_progress(p_token uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare s public.cit_students;
begin
  select * into s from public.cit_students where session_token = p_token;
  if not found then
    return json_build_object('error', 'NO_SESSION');
  end if;
  return json_build_object(
    'student', public.cit_student_json(s.id),
    'stats', coalesce((select json_agg(json_build_object(
        'question_id', q.question_id, 'seen', q.seen, 'correct', q.correct,
        'correct_streak', q.correct_streak, 'last_correct', q.last_correct))
      from public.cit_question_stats q where q.student_id = s.id), '[]'::json),
    'rounds', coalesce((select json_agg(x) from (
        select r.mode, r.total, r.correct, r.xp_earned, r.created_at
        from public.cit_rounds r where r.student_id = s.id
        order by r.created_at desc limit 100) x), '[]'::json)
  );
end $$;

create or replace function public.cit_record_round(p_token uuid, p_mode text, p_language text, p_answers jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  s public.cit_students;
  v record;
  v_total int;
  v_correct int;
  v_xp int;
  v_today date := (now() at time zone 'America/Chicago')::date;
  v_streak int;
begin
  select * into s from public.cit_students where session_token = p_token;
  if not found then
    return json_build_object('error', 'NO_SESSION');
  end if;
  if p_mode not in ('quick', 'topic', 'missed', 'test') or p_language not in ('en', 'es') then
    return json_build_object('error', 'BAD_INPUT');
  end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 or jsonb_array_length(p_answers) > 200 then
    return json_build_object('error', 'BAD_INPUT');
  end if;

  select count(*), count(*) filter (where (e->>'c')::boolean)
    into v_total, v_correct
    from jsonb_array_elements(p_answers) e;

  v_xp := case when p_mode = 'test' then v_correct * 5
               else v_correct * 10 + case when v_total >= 5 and v_correct = v_total then 25 else 0 end end;

  for v in
    select (e->>'q')::int as q, (e->>'c')::boolean as c
    from jsonb_array_elements(p_answers) e
    where (e->>'q')::int between 1 and 500
  loop
    insert into public.cit_question_stats
      (student_id, question_id, seen, correct, correct_streak, last_correct, last_seen_at)
    values (s.id, v.q, 1, case when v.c then 1 else 0 end, case when v.c then 1 else 0 end, v.c, now())
    on conflict (student_id, question_id) do update set
      seen = public.cit_question_stats.seen + 1,
      correct = public.cit_question_stats.correct + case when v.c then 1 else 0 end,
      correct_streak = case when v.c then public.cit_question_stats.correct_streak + 1 else 0 end,
      last_correct = v.c,
      last_seen_at = now();
  end loop;

  if s.last_active_date = v_today then
    v_streak := s.streak_days;
  elsif s.last_active_date = v_today - 1 then
    v_streak := s.streak_days + 1;
  else
    v_streak := 1;
  end if;

  update public.cit_students set
    xp = xp + v_xp, streak_days = v_streak,
    last_active_date = v_today, last_active_at = now()
  where id = s.id;

  insert into public.cit_rounds (student_id, mode, language, total, correct, xp_earned)
  values (s.id, p_mode, p_language, v_total, v_correct, v_xp);

  return json_build_object('xp_earned', v_xp, 'student', public.cit_student_json(s.id));
end $$;

-- ---------- Teacher functions (need the teacher passphrase) ----------
create or replace function public.cit_dashboard(p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.cit_is_teacher(p_pass) then
    return json_build_object('error', 'BAD_PASS');
  end if;
  return json_build_object('students', coalesce((
    select json_agg(row_to_json(t) order by t.last_name, t.first_name) from (
      select s.id, s.first_name, s.last_name, s.grad_class, s.xp, s.streak_days,
             s.last_active_at, s.created_at,
             (select count(*) from public.cit_rounds r where r.student_id = s.id) as rounds_count,
             coalesce((select sum(q.seen) from public.cit_question_stats q where q.student_id = s.id), 0) as seen,
             coalesce((select sum(q.correct) from public.cit_question_stats q where q.student_id = s.id), 0) as correct,
             (select count(*) from public.cit_question_stats q where q.student_id = s.id and q.correct_streak >= 2) as mastered,
             (select max(round(100.0 * r.correct / r.total)) from public.cit_rounds r where r.student_id = s.id and r.mode = 'test') as best_test,
             (select count(*) from public.cit_rounds r where r.student_id = s.id and r.mode = 'test') as tests_taken
      from public.cit_students s
    ) t), '[]'::json));
end $$;

create or replace function public.cit_student_detail(p_pass text, p_id uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.cit_is_teacher(p_pass) then
    return json_build_object('error', 'BAD_PASS');
  end if;
  return json_build_object(
    'student', public.cit_student_json(p_id),
    'stats', coalesce((select json_agg(json_build_object(
        'question_id', q.question_id, 'seen', q.seen, 'correct', q.correct,
        'correct_streak', q.correct_streak, 'last_correct', q.last_correct))
      from public.cit_question_stats q where q.student_id = p_id), '[]'::json),
    'rounds', coalesce((select json_agg(x) from (
        select r.mode, r.language, r.total, r.correct, r.xp_earned, r.created_at
        from public.cit_rounds r where r.student_id = p_id
        order by r.created_at desc limit 30) x), '[]'::json)
  );
end $$;

create or replace function public.cit_reset_pin(p_pass text, p_id uuid, p_pin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.cit_is_teacher(p_pass) then
    return json_build_object('error', 'BAD_PASS');
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return json_build_object('error', 'PIN_FORMAT');
  end if;
  update public.cit_students set
    pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
    failed_attempts = 0, locked_until = null, session_token = gen_random_uuid()
  where id = p_id;
  return json_build_object('ok', true);
end $$;

create or replace function public.cit_delete_student(p_pass text, p_id uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.cit_is_teacher(p_pass) then
    return json_build_object('error', 'BAD_PASS');
  end if;
  delete from public.cit_students where id = p_id;
  return json_build_object('ok', true);
end $$;

-- ---------- Allow the website to call the public functions ----------
grant execute on function public.cit_register(text, text, int, text) to anon, authenticated;
grant execute on function public.cit_login(text, text, text) to anon, authenticated;
grant execute on function public.cit_get_progress(uuid) to anon, authenticated;
grant execute on function public.cit_record_round(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.cit_dashboard(text) to anon, authenticated;
grant execute on function public.cit_student_detail(text, uuid) to anon, authenticated;
grant execute on function public.cit_reset_pin(text, uuid, text) to anon, authenticated;
grant execute on function public.cit_delete_student(text, uuid) to anon, authenticated;
