import { clozeAnswers, renderCloze } from './cloze';

describe('renderCloze', () => {
  it('substitutes hint on the front and answer on the back', () => {
    const { front, back } = renderCloze('ella está {{c1::siendo::¿ser?}} (vigilada)');
    expect(front).toBe('ella está [¿ser?] (vigilada)');
    expect(back).toBe('ella está siendo (vigilada)');
  });

  it('falls back to ____ when no hint is provided', () => {
    const { front, back } = renderCloze('El verbo es {{c1::ser}}');
    expect(front).toBe('El verbo es ____');
    expect(back).toBe('El verbo es ser');
  });

  it('handles multiple cloze markers independently', () => {
    const { front, back } = renderCloze('{{c1::yo::Y}} {{c2::soy::S}} feliz');
    expect(front).toBe('[Y] [S] feliz');
    expect(back).toBe('yo soy feliz');
  });

  it('passes prompts with no cloze through unchanged', () => {
    const { front, back } = renderCloze('plain text');
    expect(front).toBe('plain text');
    expect(back).toBe('plain text');
  });
});

describe('clozeAnswers', () => {
  it('extracts all answers in order', () => {
    expect(clozeAnswers('{{c1::yo::Y}} {{c2::soy::S}} {{c3::feliz}}')).toEqual([
      'yo',
      'soy',
      'feliz',
    ]);
  });

  it('returns [] when there are no clozes', () => {
    expect(clozeAnswers('nothing here')).toEqual([]);
  });
});
