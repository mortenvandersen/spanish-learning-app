/**
 * Tokenize a passage body for the reader.
 *
 * Output alternates between `word` tokens (letter sequences, tappable for
 * dictionary lookup) and `delim` tokens (whitespace, punctuation, digits;
 * rendered as-is, not tappable). Accented letters and ñ stay inside words.
 */

export type Token =
  | { kind: 'word'; text: string }
  | { kind: 'delim'; text: string };

const TOKEN_RE = /(\p{L}[\p{L}\p{M}]*)|([^\p{L}\p{M}]+)/gu;

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m[1] !== undefined) out.push({ kind: 'word', text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: 'delim', text: m[2] });
  }
  return out;
}
