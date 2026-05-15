import { getDeviceId } from './deviceId';
import { toError } from './errors';
import { getSupabase } from './supabase';

export async function listReadPassageIds(): Promise<string[]> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('passage_reads')
    .select('passage_id')
    .eq('user_id', userId);
  if (error) throw toError(error);
  return (data as { passage_id: string }[]).map(r => r.passage_id);
}

export async function markPassageRead(passageId: string): Promise<void> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { error } = await supabase
    .from('passage_reads')
    .insert({ user_id: userId, passage_id: passageId });
  // 23505 = unique_violation. Already marked — silently succeed.
  if (error && (error as { code?: string }).code !== '23505') {
    throw toError(error);
  }
}

export async function markPassageUnread(passageId: string): Promise<void> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { error } = await supabase
    .from('passage_reads')
    .delete()
    .eq('user_id', userId)
    .eq('passage_id', passageId);
  if (error) throw toError(error);
}
