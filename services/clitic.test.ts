import { stripClitics } from './clitic';

describe('stripClitics', () => {
  it('returns null for tokens that do not match a clitic-suffix pattern', () => {
    expect(stripClitics('hablar')).toBeNull();
    expect(stripClitics('casa')).toBeNull();
    expect(stripClitics('')).toBeNull();
  });

  // TODO: fixture below is the contract from CLAUDE.md.
  // Forms confirmed in the bundled inflections table (direct lookup hits first,
  // strip is still expected to produce a valid decomposition for the popover):
  //   dámelo       -> { base: 'da',        clitics: ['me', 'lo'] }
  //   haciéndolo   -> { base: 'haciendo',  clitics: ['lo'] }
  //   háblame      -> { base: 'habla',     clitics: ['me'] }
  //   irse         -> { base: 'ir',        clitics: ['se'] }
  //
  // Forms NOT in the inflections table (strip is the only path to a hit):
  //   decírselo    -> { base: 'decir',     clitics: ['se', 'lo'] }
  //   levantarse   -> { base: 'levantar',  clitics: ['se'] }
  //   damelo       -> { base: 'da',        clitics: ['me', 'lo'] }  (unaccented input)
  //   haciendolo   -> { base: 'haciendo',  clitics: ['lo'] }        (unaccented input)
});
