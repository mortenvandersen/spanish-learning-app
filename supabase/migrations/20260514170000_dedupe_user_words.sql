-- Dedupe user_words and re-assert the (user_id, spanish, part_of_speech,
-- direction) unique constraint. Earlier captures slipped duplicate rows in,
-- producing two cards in one direction; this migration cleans them up and
-- guarantees the constraint exists going forward.

-- Step 1: dedupe by (user_id, spanish, part_of_speech, direction). Keep the
-- earliest row in each group; the later inserts get dropped. SRS state on
-- the surviving row is whatever it had — the user can re-review it.
delete from public.user_words a
using public.user_words b
where a.user_id = b.user_id
  and a.spanish = b.spanish
  and a.part_of_speech = b.part_of_speech
  and a.direction = b.direction
  and (a.added_at > b.added_at or (a.added_at = b.added_at and a.id > b.id));

-- Step 2: drop any lingering 3-column unique constraint left over from the
-- original schema if the rename in 20260514150000 missed it.
do $$
declare
  cname text;
begin
  for cname in
    select conname from pg_constraint
    where conrelid = 'public.user_words'::regclass
      and contype = 'u'
      and array_length(conkey, 1) = 3
  loop
    execute format('alter table public.user_words drop constraint %I', cname);
  end loop;
end $$;

-- Step 3: ensure the 4-column unique constraint exists (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_words'::regclass
      and contype = 'u'
      and array_length(conkey, 1) = 4
  ) then
    alter table public.user_words
      add constraint user_words_user_id_spanish_pos_direction_key
      unique (user_id, spanish, part_of_speech, direction);
  end if;
end $$;
