import { findSentenceAt, tokenize } from './tokenize';

describe('tokenize', () => {
  it('alternates word and delimiter tokens', () => {
    expect(tokenize('Hola, ¿qué tal?')).toEqual([
      { kind: 'word', text: 'Hola' },
      { kind: 'delim', text: ', ¿' },
      { kind: 'word', text: 'qué' },
      { kind: 'delim', text: ' ' },
      { kind: 'word', text: 'tal' },
      { kind: 'delim', text: '?' },
    ]);
  });

  it('keeps accented letters and ñ inside words', () => {
    expect(tokenize('Año mañana después')).toEqual([
      { kind: 'word', text: 'Año' },
      { kind: 'delim', text: ' ' },
      { kind: 'word', text: 'mañana' },
      { kind: 'delim', text: ' ' },
      { kind: 'word', text: 'después' },
    ]);
  });

  it('groups digits and other non-letters into the surrounding delimiter', () => {
    expect(tokenize('año 2024')).toEqual([
      { kind: 'word', text: 'año' },
      { kind: 'delim', text: ' 2024' },
    ]);
  });

  it('handles leading and trailing whitespace and punctuation', () => {
    expect(tokenize('  ¡Hola!  ')).toEqual([
      { kind: 'delim', text: '  ¡' },
      { kind: 'word', text: 'Hola' },
      { kind: 'delim', text: '!  ' },
    ]);
  });

  it('returns [] for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('findSentenceAt', () => {
  const body = 'Hola. ¿Cómo estás? Bien, gracias.';

  it('returns the sentence containing the offset', () => {
    expect(findSentenceAt(body, 0)).toBe('Hola.');           // 'H' in Hola
    expect(findSentenceAt(body, 8)).toBe('¿Cómo estás?');    // 'ó' in Cómo
    expect(findSentenceAt(body, 19)).toBe('Bien, gracias.'); // 'B' in Bien
  });

  it('preserves Spanish opening punctuation as part of the next sentence', () => {
    const tokens = tokenize(body);
    const wordIdx = tokens.findIndex(t => t.kind === 'word' && t.text === 'estás');
    expect(wordIdx).toBeGreaterThan(0);
    const offset = tokens.slice(0, wordIdx).reduce((sum, t) => sum + t.text.length, 0);
    expect(findSentenceAt(body, offset)).toBe('¿Cómo estás?');
  });

  it('returns the whole body when there is no terminal punctuation', () => {
    expect(findSentenceAt('Sin punto final', 4)).toBe('Sin punto final');
  });

  it('returns empty for out-of-range offsets', () => {
    expect(findSentenceAt('', 0)).toBe('');
    expect(findSentenceAt('hi', 10)).toBe('');
  });
});
