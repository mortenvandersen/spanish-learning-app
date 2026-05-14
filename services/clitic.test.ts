import { stripClitics } from './clitic';

describe('stripClitics', () => {
  describe('returns null', () => {
    it('for plain non-clitic tokens', () => {
      expect(stripClitics('hablar')).toBeNull();
      expect(stripClitics('casa')).toBeNull();
      expect(stripClitics('libro')).toBeNull();
    });

    it('for tokens too short to host both a stem and a clitic', () => {
      expect(stripClitics('')).toBeNull();
      expect(stripClitics('me')).toBeNull();
      expect(stripClitics('lo')).toBeNull();
      expect(stripClitics('nos')).toBeNull();
      expect(stripClitics('alo')).toBeNull(); // 1-char stem after `lo`
    });
  });

  describe('single-clitic stripping', () => {
    it('strips a monosyllabic imperative without an added accent', () => {
      expect(stripClitics('dame')).toEqual({ base: 'da', clitics: ['me'] });
      expect(stripClitics('dale')).toEqual({ base: 'da', clitics: ['le'] });
      expect(stripClitics('vente')).toEqual({ base: 'ven', clitics: ['te'] });
    });

    it('strips an infinitive + clitic', () => {
      expect(stripClitics('verlo')).toEqual({ base: 'ver', clitics: ['lo'] });
      expect(stripClitics('hablarme')).toEqual({ base: 'hablar', clitics: ['me'] });
      expect(stripClitics('irse')).toEqual({ base: 'ir', clitics: ['se'] });
      expect(stripClitics('levantarse')).toEqual({ base: 'levantar', clitics: ['se'] });
    });

    it('strips an imperative + clitic, removing the accent introduced by attachment', () => {
      expect(stripClitics('háblame')).toEqual({ base: 'habla', clitics: ['me'] });
      expect(stripClitics('cógelo')).toEqual({ base: 'coge', clitics: ['lo'] });
    });

    it('strips a gerund + clitic, removing the accent introduced by attachment', () => {
      expect(stripClitics('hablándome')).toEqual({ base: 'hablando', clitics: ['me'] });
      expect(stripClitics('haciéndolo')).toEqual({ base: 'haciendo', clitics: ['lo'] });
      expect(stripClitics('levantándose')).toEqual({ base: 'levantando', clitics: ['se'] });
    });
  });

  describe('two-clitic stripping (IO + DO)', () => {
    it('strips IO + DO from imperatives', () => {
      expect(stripClitics('dámelo')).toEqual({ base: 'da', clitics: ['me', 'lo'] });
      expect(stripClitics('díselo')).toEqual({ base: 'di', clitics: ['se', 'lo'] });
    });

    it('strips IO + DO from infinitives', () => {
      expect(stripClitics('decírselo')).toEqual({ base: 'decir', clitics: ['se', 'lo'] });
    });

    it('strips IO + DO from gerunds', () => {
      expect(stripClitics('dándomelo')).toEqual({ base: 'dando', clitics: ['me', 'lo'] });
    });

    it('handles unaccented variants common in informal writing', () => {
      expect(stripClitics('damelo')).toEqual({ base: 'da', clitics: ['me', 'lo'] });
      expect(stripClitics('decirselo')).toEqual({ base: 'decir', clitics: ['se', 'lo'] });
      expect(stripClitics('haciendolo')).toEqual({ base: 'haciendo', clitics: ['lo'] });
    });
  });

  describe('normalization', () => {
    it('lowercases the input', () => {
      expect(stripClitics('DÁMELO')).toEqual({ base: 'da', clitics: ['me', 'lo'] });
    });

    it('treats NFC and NFD inputs identically', () => {
      const nfd = 'dámelo'; // d + a + combining acute + melo
      expect(stripClitics(nfd)).toEqual({ base: 'da', clitics: ['me', 'lo'] });
    });
  });
});
