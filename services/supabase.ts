import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getDeviceId } from './deviceId';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Returns a memoised Supabase client. The client carries an `x-device-id`
 * header populated from `services/deviceId.ts` so requests are traceable
 * per device. RLS does not enforce against it in v1 (see CLAUDE.md
 * "Identity model").
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const deviceId = await getDeviceId();
      return createClient(url, anonKey, {
        auth: { persistSession: false },
        global: { headers: { 'x-device-id': deviceId } },
      });
    })();
  }
  return clientPromise;
}
