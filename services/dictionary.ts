/**
 * Spanish dictionary lookup over the bundled SQLite asset
 * (content/dictionary/spanish-dictionary.db).
 *
 * Pipeline (CLAUDE.md "Lookup pipeline order"):
 *   normalize -> direct inflections.surface_form lookup
 *             -> clitic-strip fallback (services/clitic.ts) + retry
 *             -> lemmas table lookup
 *             -> light suffix-stripping heuristic
 *             -> null
 */

import type { LookupResult } from '@/types';

export function normalizeToken(token: string): string {
  return token.toLowerCase().normalize('NFC');
}

export async function lookup(_token: string): Promise<LookupResult | null> {
  // TODO: implement against the bundled SQLite asset via expo-sqlite.
  return null;
}
