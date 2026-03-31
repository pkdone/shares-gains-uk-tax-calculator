import { resolveBroughtForwardFromQuery } from '@/application/calculation/resolve-brought-forward';

describe('resolveBroughtForwardFromQuery', () => {
  it('returns zero when there is no bf query', () => {
    expect(
      resolveBroughtForwardFromQuery({
        hasBfQuery: false,
        queryBfParsed: 99,
      }),
    ).toBe(0);
  });

  it('uses query when present', () => {
    expect(
      resolveBroughtForwardFromQuery({
        hasBfQuery: true,
        queryBfParsed: 100,
      }),
    ).toBe(100);
  });

  it('defaults to zero when query is not finite', () => {
    expect(
      resolveBroughtForwardFromQuery({
        hasBfQuery: true,
        queryBfParsed: Number.NaN,
      }),
    ).toBe(0);
  });
});
