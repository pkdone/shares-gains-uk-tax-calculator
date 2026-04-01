import { buildMaterialCalculationWarnings, mergeCalculationWarnings } from '@/application/calculation/calculation-warnings';
import type { CalculationLedgerLine } from '@/application/calculation/calculation-types';
import type { CalcOutput } from '@/domain/schemas/calculation';

function emptyOutput(overrides: Partial<CalcOutput> = {}): CalcOutput {
  return {
    symbol: 'X',
    poolSnapshots: [],
    disposalResults: [],
    taxYearSummaries: [],
    ...overrides,
  };
}

describe('buildMaterialCalculationWarnings', () => {
  it('warns when multiple ledger lines share a date', () => {
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
        kind: 'ACQUISITION',
        data: {
          id: 'a2',
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
    ];

    const w = buildMaterialCalculationWarnings({
      ledgerLines,
      output: emptyOutput(),
      fxByAcquisitionId: {},
      fxByDisposalId: {},
    });

    expect(w.some((x) => x.includes('more than one ledger line'))).toBe(true);
  });

  it('warns on FX fallback', () => {
    const w = buildMaterialCalculationWarnings({
      ledgerLines: [],
      output: emptyOutput(),
      fxByAcquisitionId: {
        a1: {
          acquisitionId: 'a1',
          eventDate: '2024-01-01',
          usdPerGbp: 1.2,
          rateDateUsed: '2024-01-01',
          usedFallback: true,
        },
      },
      fxByDisposalId: {},
    });

    expect(w.some((x) => x.includes('fallback'))).toBe(true);
  });
});

describe('mergeCalculationWarnings', () => {
  it('prepends static interpretation warnings', () => {
    const merged = mergeCalculationWarnings(['Dynamic only']);
    expect(merged.length).toBeGreaterThan(1);
    expect(merged[0]).toContain('date order');
    expect(merged).toContain('Dynamic only');
  });
});
