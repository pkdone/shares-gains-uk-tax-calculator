import { resolveBroughtForwardFromQueryAndPrefs } from '@/application/calculation/resolve-brought-forward';

describe('resolveBroughtForwardFromQueryAndPrefs', () => {
  it('uses stored value when there is no bf query', () => {
    expect(
      resolveBroughtForwardFromQueryAndPrefs({
        hasBfQuery: false,
        queryBfParsed: 99,
        storedBroughtForwardLossesGbp: 500,
      }),
    ).toBe(500);
  });

  it('uses query when present', () => {
    expect(
      resolveBroughtForwardFromQueryAndPrefs({
        hasBfQuery: true,
        queryBfParsed: 100,
        storedBroughtForwardLossesGbp: 500,
      }),
    ).toBe(100);
  });

  it('defaults to zero when stored is undefined', () => {
    expect(
      resolveBroughtForwardFromQueryAndPrefs({
        hasBfQuery: false,
        queryBfParsed: 0,
        storedBroughtForwardLossesGbp: undefined,
      }),
    ).toBe(0);
  });
});
