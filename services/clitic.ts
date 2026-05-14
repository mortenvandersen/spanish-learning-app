/**
 * Clitic decomposition for Spanish verb forms with attached pronouns.
 *
 * Used as a fallback in services/dictionary.ts after a direct
 * inflections.surface_form lookup misses (see CLAUDE.md "Lookup pipeline order").
 *
 * Pattern recognised:
 *   <verb stem> + (one or two enclitic pronouns)
 *
 * The function does NOT verify that the resulting stem is a real Spanish
 * verb form — that is the dictionary's job. We just produce a plausible
 * decomposition and let the lookup decide.
 *
 * Acute accents introduced by clitic attachment (`dámelo`, `haciéndolo`,
 * `hablándome`) are stripped from the returned base, since the inflection
 * table almost always stores the unaccented imperative/gerund/infinitive.
 * The rare case where an accent is INHERENT to the lemma (`oír`) is left
 * to the upstream pipeline: direct `inflections.surface_form` lookup runs
 * first and catches those before this function is called.
 */

export const ENCLITIC_PRONOUNS = [
  'me', 'te', 'se', 'lo', 'la', 'le',
  'nos', 'os', 'los', 'las', 'les',
] as const;

export type EncliticPronoun = (typeof ENCLITIC_PRONOUNS)[number];

const IO_PRONOUNS = ['me', 'te', 'se', 'nos', 'os'] as const;
const DO_PRONOUNS = ['lo', 'la', 'los', 'las'] as const;

const SINGLE_SORTED: readonly EncliticPronoun[] = [...ENCLITIC_PRONOUNS].sort(
  (a, b) => b.length - a.length,
);

const MIN_STEM_LENGTH = 2;

export interface CliticDecomposition {
  base: string;
  clitics: EncliticPronoun[];
}

const ACUTE_MAP: Record<string, string> = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
};

function deAccent(s: string): string {
  return s.replace(/[áéíóú]/g, c => ACUTE_MAP[c] ?? c);
}

export function stripClitics(token: string): CliticDecomposition | null {
  const t = token.normalize('NFC').toLowerCase();
  if (t.length < MIN_STEM_LENGTH + 2) return null;

  // Two-clitic match: IO + DO, longest valid suffix wins.
  for (const io of IO_PRONOUNS) {
    for (const dop of DO_PRONOUNS) {
      const suffix = io + dop;
      if (t.endsWith(suffix)) {
        const stem = t.slice(0, -suffix.length);
        if (stem.length >= MIN_STEM_LENGTH) {
          return { base: deAccent(stem), clitics: [io, dop] };
        }
      }
    }
  }

  // Single-clitic match: longest first so `los` wins over `lo`.
  for (const clitic of SINGLE_SORTED) {
    if (t.endsWith(clitic)) {
      const stem = t.slice(0, -clitic.length);
      if (stem.length >= MIN_STEM_LENGTH) {
        return { base: deAccent(stem), clitics: [clitic] };
      }
    }
  }

  return null;
}
