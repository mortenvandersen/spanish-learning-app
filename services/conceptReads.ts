import { getDeviceId } from './deviceId';
import { toError } from './errors';
import { getSupabase } from './supabase';

export async function listReadConceptIds(): Promise<string[]> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('concept_reads')
    .select('concept_id')
    .eq('user_id', userId);
  if (error) throw toError(error);
  return (data as { concept_id: string }[]).map(r => r.concept_id);
}

export async function markConceptRead(conceptId: string): Promise<void> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { error } = await supabase
    .from('concept_reads')
    .insert({ user_id: userId, concept_id: conceptId });
  // 23505 = unique_violation. Already marked — silently succeed.
  if (error && (error as { code?: string }).code !== '23505') {
    throw toError(error);
  }
}

export async function markConceptUnread(conceptId: string): Promise<void> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { error } = await supabase
    .from('concept_reads')
    .delete()
    .eq('user_id', userId)
    .eq('concept_id', conceptId);
  if (error) throw toError(error);
}
