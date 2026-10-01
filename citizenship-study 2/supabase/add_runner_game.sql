-- =====================================================================
-- Citizenship Test Study: add Founders' Run game support
-- Run this ONCE in Supabase SQL Editor if you already ran 1_schema.sql before.
-- (If you are setting up from scratch, you do NOT need this file.)
-- =====================================================================

alter table public.cit_rounds add column if not exists score int;

-- The old 4-argument version must be removed so there is only one.
drop function if exists public.cit_record_round(uuid, text, text, jsonb);

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
        select r.mode, r.total, r.correct, r.xp_earned, r.score, r.created_at
        from public.cit_rounds r where r.student_id = s.id
        order by r.created_at desc limit 100) x), '[]'::json)
  );
end $$;

create or replace function public.cit_record_round(p_token uuid, p_mode text, p_language text, p_answers jsonb, p_score int default null)
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
  if p_mode not in ('quick', 'topic', 'missed', 'test', 'run') or p_language not in ('en', 'es') then
    return json_build_object('error', 'BAD_INPUT');
  end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 or jsonb_array_length(p_answers) > 200 then
    return json_build_object('error', 'BAD_INPUT');
  end if;

  select count(*), count(*) filter (where (e->>'c')::boolean)
    into v_total, v_correct
    from jsonb_array_elements(p_answers) e;

  v_xp := case when p_mode = 'test' then v_correct * 5
               when p_mode = 'run' then v_correct * 10
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

  insert into public.cit_rounds (student_id, mode, language, total, correct, xp_earned, score)
  values (s.id, p_mode, p_language, v_total, v_correct, v_xp,
          case when p_mode = 'run' then least(greatest(coalesce(p_score, 0), 0), 1000000) else null end);

  return json_build_object('xp_earned', v_xp, 'student', public.cit_student_json(s.id));
end $$;

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
             (select count(*) from public.cit_rounds r where r.student_id = s.id and r.mode = 'test') as tests_taken,
             (select max(r.score) from public.cit_rounds r where r.student_id = s.id and r.mode = 'run') as best_run,
             (select count(*) from public.cit_rounds r where r.student_id = s.id and r.mode = 'run') as runs_played
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
        select r.mode, r.language, r.total, r.correct, r.xp_earned, r.score, r.created_at
        from public.cit_rounds r where r.student_id = p_id
        order by r.created_at desc limit 30) x), '[]'::json)
  );
end $$;

grant execute on function public.cit_record_round(uuid, text, text, jsonb, int) to anon, authenticated;
