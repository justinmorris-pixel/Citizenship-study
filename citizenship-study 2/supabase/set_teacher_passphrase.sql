-- Run this AFTER schema.sql.
-- 1) Replace CHANGE-THIS-PASSPHRASE with your own passphrase (keep the quotes).
--    Use something long, like three random words. This is what you type at /#/teacher.
-- 2) Click Run. You can run it again any time to change the passphrase.

insert into public.cit_teacher_settings (id, pass_hash)
values (1, extensions.crypt('CHANGE-THIS-PASSPHRASE', extensions.gen_salt('bf')))
on conflict (id) do update set pass_hash = excluded.pass_hash;
