/**
 * Parse the Anki cloze syntax `{{cN::answer::hint}}` into front and back
 * strings. Front shows `[hint]` (or `____` if no hint); back shows `answer`.
 * Multiple clozes per prompt are supported — each substituted independently.
 */

const CLOZE_RE = /\{\{c\d+::([^}]+)\}\}/g;

export interface ClozeRender {
  front: string;
  back: string;
}

export function renderCloze(prompt: string): ClozeRender {
  const front = prompt.replace(CLOZE_RE, (_, body: string) => {
    const parts = body.split('::');
    const hint = parts.length > 1 ? parts.slice(1).join('::') : '';
    return hint ? `[${hint}]` : '____';
  });
  const back = prompt.replace(CLOZE_RE, (_, body: string) => body.split('::')[0]);
  return { front, back };
}

/** Pull the answer(s) from a cloze prompt — useful for text-to-speech. */
export function clozeAnswers(prompt: string): string[] {
  const out: string[] = [];
  for (const m of prompt.matchAll(CLOZE_RE)) {
    out.push(m[1].split('::')[0]);
  }
  return out;
}
