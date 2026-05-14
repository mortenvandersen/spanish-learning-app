-- v1 schema for the Spanish Learning App.
--
-- Identity model: no auth in v1. Each device generates a UUID on first launch
-- (stored in expo-secure-store via services/deviceId.ts) and that UUID is the
-- user_id on every user_words row. The app sets an x-device-id header on every
-- Supabase request for diagnostic purposes; RLS does NOT enforce against it in
-- v1 (acceptable per CLAUDE.md "Identity model" — 2-user personal app).

-- ---------------------------------------------------------------------------
-- passages: admin-curated reading content, shared across all users.
-- ---------------------------------------------------------------------------
create table public.passages (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  level       text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.passages enable row level security;

create policy "passages: anon read"
  on public.passages
  for select
  to anon, authenticated
  using (true);

-- Curation (inserts/updates) happens via the Supabase dashboard or the
-- service-role key. No public write policy.

-- ---------------------------------------------------------------------------
-- user_words: per-device captured words with SRS state.
-- ---------------------------------------------------------------------------
create table public.user_words (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  spanish             text not null,
  english             text not null,
  part_of_speech      text not null,
  source_passage_id   uuid references public.passages(id) on delete set null,
  source_sentence     text,
  added_at            timestamptz not null default now(),
  srs_due             timestamptz not null,
  srs_interval        integer not null default 1,
  srs_ease            real not null default 2.5,
  srs_repetitions     integer not null default 0,
  unique (user_id, spanish, part_of_speech)
);

create index user_words_user_id_idx     on public.user_words (user_id);
create index user_words_user_id_due_idx on public.user_words (user_id, srs_due);

alter table public.user_words enable row level security;

-- v1 trust-the-client policy. The anon key + a device-supplied user_id is the
-- only check. All app queries must filter by user_id (services/userWords.ts).
-- Anyone with the anon key could spoof a user_id; this is the documented
-- trade-off for shipping without auth. Swap to a stricter policy when auth
-- is introduced.
create policy "user_words: anon full access"
  on public.user_words
  for all
  to anon, authenticated
  using (true)
  with check (true);
