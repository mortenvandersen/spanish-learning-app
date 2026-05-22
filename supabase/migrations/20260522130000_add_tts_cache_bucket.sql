-- Public storage bucket for ElevenLabs-generated TTS MP3s.
--
-- Cache key = sha256(voice_id + speed + text). The tts Edge Function writes
-- here using the service-role key; clients only read via the public URL.
-- Audio content is non-sensitive (Spanish language audio of user-pasted text).

insert into storage.buckets (id, name, public)
values ('tts-cache', 'tts-cache', true)
on conflict (id) do nothing;
