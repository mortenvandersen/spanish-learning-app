-- Add per-passage read marker to user_passages. Mirrors the All/Unread/Read
-- filtering already available for featured passages via passage_reads, but
-- folded directly into user_passages since the row is already per-user.
-- NULL = unread, timestamp = when the user marked it read.

alter table public.user_passages
  add column read_at timestamptz;
