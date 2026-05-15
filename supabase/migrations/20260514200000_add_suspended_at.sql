-- Suspend (drop from rotation): non-null timestamp = card permanently removed
-- from the study queue and the dashboard. Reversible by clearing the column
-- via SQL; no in-app un-suspend in v1.

alter table public.user_words
  add column suspended_at timestamptz;

create index user_words_suspended_due_idx
  on public.user_words (user_id, srs_due)
  where suspended_at is null;

alter table public.conjugation_card_states
  add column suspended_at timestamptz;

create index conjugation_states_suspended_due_idx
  on public.conjugation_card_states (user_id, srs_due)
  where suspended_at is null;
