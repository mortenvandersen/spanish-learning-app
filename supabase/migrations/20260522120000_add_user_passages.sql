-- user_passages: per-device library of user-pasted reading material.
--
-- The "My library" mode on the Read tab lets the user paste arbitrary Spanish
-- text and save it for later. Each row is one saved paste, scoped to the
-- device-generated user_id. Treated as non-sensitive content under the v1
-- trust-the-client RLS model (see CLAUDE.md "Identity model").

create table public.user_passages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  title       text,
  body        text not null,
  added_at    timestamptz not null default now()
);

create index user_passages_user_id_idx on public.user_passages (user_id);
create index user_passages_user_id_added_at_idx
  on public.user_passages (user_id, added_at desc);

alter table public.user_passages enable row level security;

create policy "user_passages: anon full access"
  on public.user_passages
  for all
  to anon, authenticated
  using (true)
  with check (true);
