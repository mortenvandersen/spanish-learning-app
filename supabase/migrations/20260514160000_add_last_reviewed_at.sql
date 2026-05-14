-- Track when each card was last reviewed so the Study dashboard can count
-- today's reviews. Null = never reviewed.

alter table public.user_words
  add column last_reviewed_at timestamptz;

create index user_words_last_reviewed_at_idx
  on public.user_words (user_id, last_reviewed_at);
