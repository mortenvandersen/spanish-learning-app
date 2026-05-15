-- Concepts: per-concept reference pages (e.g. grammar topics derived from
-- a podcast episode). Shared content like passages — content is loaded via
-- the SQL editor; users mark them done per-device like passage_reads.

create table public.concepts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  summary         text not null,        -- one-line teaser shown in the list
  body            text not null,        -- markdown
  source_url      text,                 -- citation link (studyspanish, OER, …)
  source_episode  text,                 -- e.g. "Coffee Break Spanish S3E40"
  created_at      timestamptz not null default now()
);

create index concepts_created_at_idx on public.concepts (created_at);

alter table public.concepts enable row level security;

create policy "concepts: anon read"
  on public.concepts
  for select
  to anon, authenticated
  using (true);
-- No public write policy: insert via SQL editor / service role.

create table public.concept_reads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  concept_id  uuid not null references public.concepts(id) on delete cascade,
  marked_at   timestamptz not null default now(),
  unique (user_id, concept_id)
);

create index concept_reads_user_id_idx on public.concept_reads (user_id);

alter table public.concept_reads enable row level security;

create policy "concept_reads: anon full access"
  on public.concept_reads
  for all
  to anon, authenticated
  using (true)
  with check (true);
