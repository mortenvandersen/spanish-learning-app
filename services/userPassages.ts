import { getDeviceId } from './deviceId';
import { toError } from './errors';
import { getSupabase } from './supabase';
import type { UserPassage } from '@/types';

interface UserPassageRow {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  added_at: string;
}

function rowToUserPassage(r: UserPassageRow): UserPassage {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    body: r.body,
    addedAt: r.added_at,
  };
}

export async function listUserPassages(): Promise<UserPassage[]> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('user_passages')
    .select('id, user_id, title, body, added_at')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error) throw toError(error);
  return (data as UserPassageRow[]).map(rowToUserPassage);
}

export async function getUserPassage(id: string): Promise<UserPassage | null> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('user_passages')
    .select('id, user_id, title, body, added_at')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw toError(error);
  return data ? rowToUserPassage(data as UserPassageRow) : null;
}

export interface CreateUserPassageInput {
  title: string | null;
  body: string;
}

export async function createUserPassage(input: CreateUserPassageInput): Promise<UserPassage> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { data, error } = await supabase
    .from('user_passages')
    .insert({
      user_id: userId,
      title: input.title,
      body: input.body,
    })
    .select('id, user_id, title, body, added_at')
    .single();
  if (error) throw toError(error);
  return rowToUserPassage(data as UserPassageRow);
}

export async function deleteUserPassage(id: string): Promise<void> {
  const supabase = await getSupabase();
  const userId = await getDeviceId();
  const { error } = await supabase
    .from('user_passages')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw toError(error);
}
