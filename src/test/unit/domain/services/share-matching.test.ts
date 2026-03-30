import type { CalcEvent } from '@/domain/schemas/calculation';
import {
  addDaysIso,
  aggregateAcquisitionsAndDisposals,
  computeMatchingOutput,
} from '@/domain/services/share-matching';
import { DomainError } from '@/shared/errors/app-error';

describe('share-matching helpers', () => {
  it('addDaysIso adds UTC calendar days', () => {
    expect(addDaysIso('2023-05-01', 30)).toBe('2023-05-31');
    expect(addDaysIso('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('aggregates multiple acquisitions and disposals on the same day', () => {
    const events: CalcEvent[] = [
      { kind: 'acquisition', data: { eventDate: '2020-01-01', quantity: 40, totalCostGbp: 400 } },
      { kind: 'acquisition', data: { eventDate: '2020-01-01', quantity: 60, totalCostGbp: 600 } },
      { kind: 'disposal', data: { eventDate: '2020-01-01', quantity: 30, grossProceedsGbp: 300, feesGbp: 5 } },
      { kind: 'disposal', data: { eventDate: '2020-01-01', quantity: 20, grossProceedsGbp: 200, feesGbp: 3 } },
    ];
    const { acqByDate, dispByDate } = aggregateAcquisitionsAndDisposals(events);
    expect(acqByDate.get('2020-01-01')).toEqual({ qty: 100, cost: 1000 });
    expect(dispByDate.get('2020-01-01')).toEqual({ qty: 50, gross: 500, fees: 8 });
  });
});

describe('computeMatchingOutput', () => {
  it('matches same-day acquisition to disposal before pool', () => {
    const events: CalcEvent[] = [
      { kind: 'acquisition', data: { eventDate: '2020-01-01', quantity: 100, totalCostGbp: 1000 } },
      { kind: 'disposal', data: { eventDate: '2020-01-01', quantity: 50, grossProceedsGbp: 600, feesGbp: 0 } },
    ];
    const { disposalResults, poolSnapshots } = computeMatchingOutput(events);
    expect(disposalResults).toHaveLength(1);
    expect(disposalResults[0]?.matchingBreakdown).toEqual([
      { source: 'same-day', quantity: 50, allowableCostGbp: 500 },
    ]);
    expect(disposalResults[0]?.gainOrLossGbp).toBe(100);
    expect(poolSnapshots.some((s) => s.description.includes('unmatched'))).toBe(true);
  });

  it('applies 30-day matching before pool and FIFO by acquisition date', () => {
    const events: CalcEvent[] = [
      { kind: 'acquisition', data: { eventDate: '2020-01-01', quantity: 100, totalCostGbp: 1000 } },
      { kind: 'disposal', data: { eventDate: '2020-01-05', quantity: 100, grossProceedsGbp: 1200, feesGbp: 0 } },
      { kind: 'acquisition', data: { eventDate: '2020-01-10', quantity: 50, totalCostGbp: 600 } },
    ];
    const { disposalResults } = computeMatchingOutput(events);
    expect(disposalResults).toHaveLength(1);
    const br = disposalResults[0]?.matchingBreakdown ?? [];
    expect(br.some((t) => t.source === 'thirty-day' && t.quantity === 50)).toBe(true);
    expect(br.some((t) => t.source === 'section-104-pool' && t.quantity === 50)).toBe(true);
    expect(disposalResults[0]?.gainOrLossGbp).toBe(100);
  });

  it('gives earlier disposal priority for overlapping 30-day acquisitions', () => {
    const events: CalcEvent[] = [
      { kind: 'acquisition', data: { eventDate: '2020-01-01', quantity: 100, totalCostGbp: 1000 } },
      { kind: 'disposal', data: { eventDate: '2020-01-05', quantity: 30, grossProceedsGbp: 400, feesGbp: 0 } },
      { kind: 'disposal', data: { eventDate: '2020-01-06', quantity: 30, grossProceedsGbp: 400, feesGbp: 0 } },
      { kind: 'acquisition', data: { eventDate: '2020-01-10', quantity: 40, totalCostGbp: 400 } },
    ];
    const { disposalResults } = computeMatchingOutput(events);
    expect(disposalResults).toHaveLength(2);
    const d1 = disposalResults[0]?.matchingBreakdown.find((t) => t.source === 'thirty-day');
    const d2 = disposalResults[1]?.matchingBreakdown.find((t) => t.source === 'thirty-day');
    expect(d1?.quantity).toBe(30);
    expect(d2?.quantity).toBe(10);
  });

  it('throws when disposal cannot be matched (no pool, no same-day, no 30-day)', () => {
    const events: CalcEvent[] = [
      { kind: 'disposal', data: { eventDate: '2020-01-01', quantity: 10, grossProceedsGbp: 100, feesGbp: 0 } },
    ];
    expect(() => computeMatchingOutput(events)).toThrow(DomainError);
  });
});
