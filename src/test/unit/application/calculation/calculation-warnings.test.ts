import { buildMaterialCalculationWarnings, mergeCalculationWarnings } from '@/application/calculation/calculation-warnings';
import type { CalculationLedgerLine } from '@/application/calculation/calculation-types';

describe('buildMaterialCalculationWarnings', () => {
  it('returns empty when nothing material applies', () => {
    const w = buildMaterialCalculationWarnings({
      ledgerLines: [],
      fxByAcquisitionId: {},
      fxByDisposalId: {},
    });

    expect(w).toHaveLength(0);
  });

  it('warns when a date has both acquisitions and disposals', () => {
    const ledgerLines: CalculationLedgerLine[] = [
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
      fxByAcquisitionId: {},
      fxByDisposalId: {},
    });

    expect(w.some((x) => x.includes('both acquisitions and disposals'))).toBe(true);
    expect(w.some((x) => x.includes('2024-06-01'))).toBe(true);
  });

  it('adds a concise FX fallback warning when any acquisition or disposal used a fallback rate', () => {
    const w = buildMaterialCalculationWarnings({
      ledgerLines: [],
      fxByAcquisitionId: {
        a1: {
          acquisitionId: 'a1',
          eventDate: '2024-01-15',
          usdPerGbp: 1.2,
          rateDateUsed: '2024-01-12',
          usedFallback: true,
        },
      },
      fxByDisposalId: {
        d1: {
          disposalId: 'd1',
          eventDate: '2024-03-20',
          usdPerGbp: 1.25,
          rateDateUsed: '2024-03-15',
          usedFallback: true,
        },
      },
    });

    expect(w).toHaveLength(1);
    expect(w[0]).toContain('At least one');
    expect(w[0]).toContain('orange');
    expect(w[0]).not.toContain('2024-01-15');
    expect(w[0]).not.toContain('2024-03-20');
    expect(w[0]).toContain('View FX applied');
  });
});

describe('mergeCalculationWarnings', () => {
  it('dedupes material warnings', () => {
    const merged = mergeCalculationWarnings(['Same', 'Same', 'Other']);
    expect(merged).toEqual(['Same', 'Other']);
  });
});
