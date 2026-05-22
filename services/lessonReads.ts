import { getDeviceId } from './deviceId';
import { toError } from './errors';
import { getSupabase } from './supabase';

export async function listReadLessonSlugs(): Promise<string[]> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('lesson_reads')
    .select('lesson_slug')
    .eq('user_id', userId);
  if (error) throw toError(error);
  return (data as { lesson_slug: string }[]).map(r => r.lesson_slug);
}

export async function markLessonRead(slug: string): Promise<void> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { error } = await supabase
    .from('lesson_reads')
    .insert({ user_id: userId, lesson_slug: slug });
  // 23505 = unique_violation. Already marked — silently succeed.
  if (error && (error as { code?: string }).code !== '23505') {
    throw toError(error);
  }
}

export async function markLessonUnread(slug: string): Promise<void> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { error } = await supabase
    .from('lesson_reads')
    .delete()
    .eq('user_id', userId)
    .eq('lesson_slug', slug);
  if (error) throw toError(error);
}
