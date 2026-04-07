import { buildMaterialCalculationWarnings, mergeCalculationWarnings } from '@/application/calculation/calculation-warnings';
import type { LedgerLine } from '@/application/ledger/ledger-types';

describe('buildMaterialCalculationWarnings', () => {
  it('returns empty when nothing material applies', () => {
    const w = buildMaterialCalculationWarnings({
      ledgerLines: [],
    });

    expect(w).toHaveLength(0);
  });

  it('warns when a date has both acquisitions and disposals', () => {
    const ledgerLines: LedgerLine[] = [
      {
        kind: 'ACQUISITION',
        data: {
          id: 'a1',
          holdingId: 'h',
          userId: 'u',
          economicsKind: 'manual_usd',
          symbol: 'X',
          eventDate: '2024-06-01',
          quantity: 1,
          considerationUsd: 1,
          feesUsd: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        kind: 'DISPOSAL',
        data: {
          id: 'd1',
          holdingId: 'h',
          userId: 'u',
          symbol: 'X',
          eventDate: '2024-06-01',
          quantity: 1,
          grossProceedsUsd: 2,
          feesUsd: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];

    const w = buildMaterialCalculationWarnings({
      ledgerLines,
    });

    expect(w.some((x) => x.includes('both acquisitions and disposals'))).toBe(true);
    expect(w.some((x) => x.includes('2024-06-01'))).toBe(true);
  });

});

describe('mergeCalculationWarnings', () => {
  it('dedupes material warnings', () => {
    const merged = mergeCalculationWarnings(['Same', 'Same', 'Other']);
    expect(merged).toEqual(['Same', 'Other']);
  });
});
