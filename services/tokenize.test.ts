import { tokenize } from './tokenize';

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
