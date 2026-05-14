-- Bidirectional flashcards: each captured word becomes two user_words rows,
-- one for English -> Spanish recall and one for Spanish -> English recall.
-- Each direction tracks its own SRS state and progresses independently.

alter table public.user_words
  add column direction text not null default 'en_to_es'
  check (direction in ('es_to_en', 'en_to_es'));

-- Replace the unique constraint so the two directions can coexist.
alter table public.user_words
  drop constraint user_words_user_id_spanish_part_of_speech_key;

alter table public.user_words
  add constraint user_words_user_id_spanish_pos_direction_key
  unique (user_id, spanish, part_of_speech, direction);

-- Backfill: every existing en_to_es card gets a fresh-state es_to_en mirror.
-- Mirrors start with the same metadata but unreviewed SRS state (due now,
-- interval 0, ease 2.5) so the user actually exercises the new direction.
insert into public.user_words (
  user_id, spanish, english, part_of_speech,
  source_passage_id, source_sentence,
  srs_due, srs_interval, srs_ease, srs_repetitions,
  direction
)
select
  user_id, spanish, english, part_of_speech,
  source_passage_id, source_sentence,
  now(), 0, 2.5, 0,
  'es_to_en'
from public.user_words
where direction = 'en_to_es';
