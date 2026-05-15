-- Distinguish manually-typed concept cards (single direction, custom
-- front/back text) from auto-captured vocabulary (translation pairs,
-- bidirectional). The 'concept' value is what the + Add word modal's
-- "Custom card" mode inserts.

alter table public.user_words
  add column card_type text not null default 'vocab'
  check (card_type in ('vocab', 'concept'));
