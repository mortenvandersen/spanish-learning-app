-- Per-device "I've read this passage" flag, for filtering and sorting on the
-- Read tab. Like user_words, this is device-keyed (no auth.users FK) and
-- uses the trust-the-client RLS policy documented in CLAUDE.md.

create table public.passage_reads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  passage_id  uuid not null references public.passages(id) on delete cascade,
  marked_at   timestamptz not null default now(),
  unique (user_id, passage_id)
);

create index passage_reads_user_id_idx on public.passage_reads (user_id);

alter table public.passage_reads enable row level security;

create policy "passage_reads: anon full access"
  on public.passage_reads
  for all
  to anon, authenticated
  using (true)
  with check (true);
