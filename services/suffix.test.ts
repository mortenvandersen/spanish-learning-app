import { suffixCandidates } from './suffix';

describe('suffixCandidates', () => {
  describe('-mente adverbs', () => {
    it('strips -mente and toggles feminine to masculine', () => {
      const c = suffixCandidates('rápidamente');
      expect(c).toContain('rápida');
      expect(c).toContain('rápido');
    });

    it('keeps the base as-is for adjectives that are gender-invariant', () => {
      expect(suffixCandidates('fácilmente')).toContain('fácil');
    });
  });

  describe('diminutives', () => {
    it('strips -ita and offers o/a/e endings', () => {
      const c = suffixCandidates('manita');
      expect(c).toContain('mano');
      expect(c).toContain('mana');
      expect(c).toContain('mane');
    });

    it('strips -ito plurally as -itos', () => {
      const c = suffixCandidates('libritos');
      expect(c).toContain('libro');
    });

    it('only matches one diminutive suffix per token (longest wins)', () => {
      const c = suffixCandidates('casillas');
      expect(c).toContain('casa');
    });
  });

  describe('plurals', () => {
    it('strips -s after a vowel', () => {
      expect(suffixCandidates('libros')).toContain('libro');
    });

    it('strips -es after a consonant', () => {
      expect(suffixCandidates('flores')).toContain('flor');
    });
  });

  describe('guards', () => {
    it('returns [] for tokens too short to strip safely', () => {
      expect(suffixCandidates('mente')).toEqual([]);
      expect(suffixCandidates('los')).toEqual([]);
      expect(suffixCandidates('')).toEqual([]);
    });

    it('returns [] for tokens with no recognised suffix', () => {
      expect(suffixCandidates('hablar')).toEqual([]);
      expect(suffixCandidates('agua')).toEqual([]);
    });
  });
});
