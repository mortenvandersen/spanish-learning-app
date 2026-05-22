import { toError } from './errors';
import { getSupabase } from './supabase';

export type Dialect = 'castilian' | 'mexican';
export type Style = 'teacher' | 'conversational' | 'fast';

export const MAX_TTS_TEXT_LENGTH = 5000;

export interface TtsResult {
  url: string;
  cached: boolean;
}

/**
 * Calls the `tts` Edge Function to generate (or fetch from cache) an MP3
 * for the given Spanish text in the selected voice cell. The function is
 * deployed with `--no-verify-jwt`, so the publishable anon key is enough
 * for the underlying supabase-js client to reach it.
 */
export async function generateTts(input: {
  text: string;
  dialect: Dialect;
  style: Style;
}): Promise<TtsResult> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke('tts', {
    body: input,
  });
  if (error) throw toError(error);
  if (!data || typeof (data as { url?: unknown }).url !== 'string') {
    throw new Error('TTS response missing url');
  }
  return data as TtsResult;
}
