import { resolveUsdPerGbpFromLookup } from '@/domain/services/fx-lookup';
import { DomainError } from '@/shared/errors/app-error';

describe('resolveUsdPerGbpFromLookup', () => {
  it('uses exact date when rate row matches event date', () => {
    const r = resolveUsdPerGbpFromLookup({
      eventDate: '2024-01-02',
      rate: { date: '2024-01-02', usdPerGbp: 1.2625 },
    });
    expect(r.usdPerGbp).toBe(1.2625);
    expect(r.rateDateUsed).toBe('2024-01-02');
    expect(r.usedFallback).toBe(false);
  });

  it('flags fallback when rate date is before event date', () => {
    const r = resolveUsdPerGbpFromLookup({
      eventDate: '2024-01-06',
      rate: { date: '2024-01-04', usdPerGbp: 1.27 },
    });
    expect(r.usedFallback).toBe(true);
    expect(r.rateDateUsed).toBe('2024-01-04');
  });

  it('throws when no rate is available', () => {
    expect(() =>
      resolveUsdPerGbpFromLookup({
        eventDate: '2010-01-01',
        rate: null,
      }),
    ).toThrow(DomainError);
  });
});
