-- Per-device "marked done" state for studyspanish.com lessons.
--
-- Lessons live in /content/lessons/ as markdown files (bundled into the app
-- via scripts/build-lessons-index.py); there is no `lessons` table to FK
-- against. We just store the slug as text. Same trust-the-client RLS as
-- concept_reads / passage_reads.

create table public.lesson_reads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  lesson_slug text not null,
  marked_at   timestamptz not null default now(),
  unique (user_id, lesson_slug)
);

create index lesson_reads_user_id_idx on public.lesson_reads (user_id);

alter table public.lesson_reads enable row level security;

create policy "lesson_reads: anon full access"
  on public.lesson_reads
  for all
  to anon, authenticated
  using (true)
  with check (true);
