-- Rate limit table for the tts Edge Function.
--
-- One row per client IP tracking request count within a rolling 1-hour window.
-- Only counted for ElevenLabs-bound calls (cache misses) — cache hits are free
-- and never increment the counter. This means a legit user replaying the same
-- passage can't be locked out by their own repeat plays.

create table public.tts_rate_limits (
  ip            text primary key,
  window_start  timestamptz not null default now(),
  request_count integer not null default 1
);

-- Atomic upsert: returns the count AFTER this request is recorded.
-- Caller compares against a limit to decide allow/deny.
create or replace function public.tts_rate_check(p_ip text)
returns integer
language plpgsql security definer
as $$
declare
  v_count integer;
  v_window_seconds constant integer := 3600;
begin
  insert into public.tts_rate_limits (ip, window_start, request_count)
  values (p_ip, now(), 1)
  on conflict (ip) do update set
    window_start = case
      when tts_rate_limits.window_start < now() - (v_window_seconds || ' seconds')::interval
        then now()
      else tts_rate_limits.window_start
    end,
    request_count = case
      when tts_rate_limits.window_start < now() - (v_window_seconds || ' seconds')::interval
        then 1
      else tts_rate_limits.request_count + 1
    end
  returning request_count into v_count;
  return v_count;
end;
$$;
