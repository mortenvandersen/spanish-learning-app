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
const SENTENCE_END = /[.!?]/;

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m[1] !== undefined) out.push({ kind: 'word', text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: 'delim', text: m[2] });
  }
  return out;
}

/**
 * Return the sentence containing `body[offset]`, trimmed. Sentence boundaries
 * are `.`, `!`, or `?`. Leading whitespace after the previous boundary is
 * skipped so a Spanish question keeps its opening `¿` and an exclamation
 * keeps its `¡`.
 */
export function findSentenceAt(body: string, offset: number): string {
  if (offset < 0 || offset >= body.length) return '';

  let start = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (SENTENCE_END.test(body[i])) {
      start = i + 1;
      break;
    }
  }
  while (start < body.length && /\s/.test(body[start])) start++;

  let end = body.length - 1;
  for (let i = offset; i < body.length; i++) {
    if (SENTENCE_END.test(body[i])) {
      end = i;
      break;
    }
  }

  return body.slice(start, end + 1).trim();
}
