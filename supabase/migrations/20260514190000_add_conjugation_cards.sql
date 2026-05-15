-- Conjugation deck. Two tables: shared content (conjugation_cards, like
-- passages) and per-device SRS state (conjugation_card_states, like
-- user_words). The state table is empty until the user "releases" cards.

create table public.conjugation_cards (
  id          uuid primary key default gen_random_uuid(),
  sequence    integer not null,    -- Anki deck order; drives release order
  prompt      text not null,       -- cloze template, e.g. "ella está {{c1::siendo::¿ser?}}"
  notes       text,                -- grammar context, optional
  tags        text[] not null default '{}',
  verb        text,                -- extracted infinitive, useful for future filtering
  created_at  timestamptz not null default now(),
  unique (sequence)
);

create index conjugation_cards_sequence_idx on public.conjugation_cards (sequence);
create index conjugation_cards_verb_idx     on public.conjugation_cards (verb);

alter table public.conjugation_cards enable row level security;

create policy "conjugation_cards: anon read"
  on public.conjugation_cards
  for select
  to anon, authenticated
  using (true);
-- No write policy: content is loaded via SQL editor / service role.

create table public.conjugation_card_states (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null,
  conjugation_card_id  uuid not null references public.conjugation_cards(id) on delete cascade,
  released_at          timestamptz not null default now(),
  srs_due              timestamptz not null,
  srs_interval         integer not null default 0,
  srs_ease             real not null default 2.5,
  srs_repetitions      integer not null default 0,
  last_reviewed_at     timestamptz,
  unique (user_id, conjugation_card_id)
);

create index conjugation_card_states_user_idx     on public.conjugation_card_states (user_id);
create index conjugation_card_states_user_due_idx on public.conjugation_card_states (user_id, srs_due);

alter table public.conjugation_card_states enable row level security;

create policy "conjugation_card_states: anon full access"
  on public.conjugation_card_states
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Server-side release: insert state rows for the next p_count unreleased
-- cards (by sequence), skipping any the user already has state for.
-- Returns the number of rows actually released. SECURITY INVOKER (default)
-- — the call runs with the calling role's privileges, matching the rest of
-- the v1 trust-the-client identity model.
create or replace function public.release_conjugation_cards(p_user_id uuid, p_count integer)
returns integer
language plpgsql
as $$
declare
  v_released integer;
begin
  insert into public.conjugation_card_states (
    user_id, conjugation_card_id, srs_due, srs_interval, srs_ease, srs_repetitions
  )
  select
    p_user_id, cc.id, now(), 0, 2.5, 0
  from public.conjugation_cards cc
  where not exists (
    select 1 from public.conjugation_card_states ccs
    where ccs.user_id = p_user_id
      and ccs.conjugation_card_id = cc.id
  )
  order by cc.sequence asc
  limit p_count;

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

-- Allow anon to call the function (matches the trust-the-client policy).
grant execute on function public.release_conjugation_cards(uuid, integer) to anon, authenticated;
