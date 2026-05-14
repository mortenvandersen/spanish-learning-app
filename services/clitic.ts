/**
 * Clitic decomposition for Spanish verb forms with attached pronouns.
 *
 * Used as a fallback in services/dictionary.ts after a direct
 * inflections.surface_form lookup misses (see CLAUDE.md "Lookup pipeline order").
 */

export const ENCLITIC_PRONOUNS = [
  'me', 'te', 'se', 'lo', 'la', 'le',
  'nos', 'os', 'los', 'las', 'les',
] as const;

export type EncliticPronoun = typeof ENCLITIC_PRONOUNS[number];

export interface CliticDecomposition {
  base: string;
  clitics: EncliticPronoun[];
}

export function stripClitics(_token: string): CliticDecomposition | null {
  // TODO: implement.
  // 1. Try matching one or two trailing enclitic pronouns from ENCLITIC_PRONOUNS.
  // 2. Reverse the written-accent rule introduced by clitic attachment
  //    (e.g., dámelo -> da: drop the antepenult accent that became necessary
  //    once two extra syllables were attached).
  // 3. Return { base, clitics } when the token matches; null otherwise.
  return null;
}
