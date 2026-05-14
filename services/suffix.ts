/**
 * Light suffix-stripping heuristic for the lookup pipeline.
 *
 * Returns base-form candidates for a surface token that didn't hit the
 * lemmas or inflections tables directly. Each candidate is meant to be
 * retried as a bare lemma lookup — if any matches, the user has a
 * translation; if none do, the lookup returns null.
 *
 * Conservative on purpose: a minimum base length guard prevents nonsense
 * matches (`mente` -> ``), and the candidates set is small enough that
 * we never produce a fan-out that swamps the lookup.
 */

const MIN_BASE_LENGTH = 3;
const DIMINUTIVE_SUFFIXES = ['itos', 'itas', 'illos', 'illas', 'ito', 'ita', 'illo', 'illa'] as const;

export function suffixCandidates(token: string): string[] {
  const out: string[] = [];

  // Adverbs in -mente attach to the feminine form of an adjective.
  // `rápidamente` -> base `rápida`; also try `rápido` (the masculine lemma).
  // `fácilmente`  -> base `fácil` directly.
  if (token.endsWith('mente') && token.length - 5 >= MIN_BASE_LENGTH) {
    const base = token.slice(0, -5);
    out.push(base);
    if (base.endsWith('a')) out.push(base.slice(0, -1) + 'o');
  }

  // Diminutives. Bases for nouns/adjectives typically end in -o/-a/-e;
  // we try all three since we can't guess gender from the inflected form.
  for (const suffix of DIMINUTIVE_SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= MIN_BASE_LENGTH) {
      const base = token.slice(0, -suffix.length);
      out.push(base + 'o', base + 'a', base + 'e');
      break;
    }
  }

  // Plural fallback. Most plurals are already covered by the inflections
  // table, but rarer compounds and proper-name-shaped plurals fall through.
  if (token.endsWith('es') && token.length - 2 >= MIN_BASE_LENGTH) {
    out.push(token.slice(0, -2));
  } else if (token.endsWith('s') && token.length - 1 >= MIN_BASE_LENGTH) {
    out.push(token.slice(0, -1));
  }

  return out;
}
