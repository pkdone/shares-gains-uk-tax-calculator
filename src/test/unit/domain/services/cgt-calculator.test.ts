import { calculateGainsForSymbol } from '@/domain/services/cgt-calculator';
import { DomainError } from '@/shared/errors/app-error';

describe('calculateGainsForSymbol', () => {
  it('reproduces HS284 Example 3 (penny precision) with annual summary for 2023-24', () => {
    const result = calculateGainsForSymbol({
      symbol: 'LOBSTER',
      events: [
        {
          kind: 'acquisition',
          data: {
            eventDate: '2015-04-01',
            quantity: 1000,
            totalCostGbp: 4150,
          },
        },
        {
          kind: 'acquisition',
          data: {
            eventDate: '2018-09-01',
            quantity: 500,
            totalCostGbp: 2130,
          },
        },
        {
          kind: 'disposal',
          data: {
            eventDate: '2023-05-01',
            quantity: 700,
            grossProceedsGbp: 3360,
            feesGbp: 100,
          },
        },
        {
          kind: 'disposal',
          data: {
            eventDate: '2024-02-01',
            quantity: 400,
            grossProceedsGbp: 2080,
            feesGbp: 105,
          },
        },
      ],
    });

    expect(result.disposalResults).toHaveLength(2);

    const d1 = result.disposalResults[0];
    expect(d1?.matchingBreakdown).toEqual([
      { source: 'section-104-pool', quantity: 700, allowableCostGbp: 2930.67 },
    ]);
    expect(d1?.allowableCostGbp).toBe(2930.67);
    expect(d1?.gainOrLossGbp).toBe(329.33);
    expect(d1?.roundedGainOrLossGbp).toBe(329);
    expect(d1?.poolSharesAfter).toBe(800);
    expect(d1?.poolCostGbpAfter).toBe(3349.33);
    expect(d1?.taxYear).toBe('2023-24');

    const d2 = result.disposalResults[1];
    expect(d2?.matchingBreakdown).toEqual([
      { source: 'section-104-pool', quantity: 400, allowableCostGbp: 1674.67 },
    ]);
    expect(d2?.allowableCostGbp).toBe(1674.67);
    expect(d2?.gainOrLossGbp).toBe(300.33);
    expect(d2?.roundedGainOrLossGbp).toBe(300);
    expect(d2?.poolSharesAfter).toBe(400);
    // Remaining pool: 3349.33 - 1674.67 allowable = 1674.66 (2dp)
    expect(d2?.poolCostGbpAfter).toBe(1674.66);
    expect(d2?.taxYear).toBe('2023-24');

    const ty = result.taxYearSummaries.find((s) => s.taxYear === '2023-24');
    expect(ty).toBeDefined();
    expect(ty?.totalGainsGbp).toBe(629.66);
    expect(ty?.totalLossesGbp).toBe(0);
    expect(ty?.netGainsGbp).toBe(629.66);
  });

  it('throws when events are not sorted by date', () => {
    expect(() =>
      calculateGainsForSymbol({
        symbol: 'X',
        events: [
          {
            kind: 'disposal',
            data: {
              eventDate: '2024-01-01',
              quantity: 1,
              grossProceedsGbp: 100,
              feesGbp: 0,
            },
          },
          {
            kind: 'acquisition',
            data: {
              eventDate: '2023-01-01',
              quantity: 1,
              totalCostGbp: 50,
            },
          },
        ],
      }),
    ).toThrow(DomainError);
  });

  it('returns empty summaries when there are no disposals', () => {
    const result = calculateGainsForSymbol({
      symbol: 'X',
      events: [
        {
          kind: 'acquisition',
          data: {
            eventDate: '2020-01-01',
            quantity: 1,
            totalCostGbp: 100,
          },
        },
      ],
    });

    expect(result.disposalResults).toHaveLength(0);
    expect(result.taxYearSummaries).toHaveLength(0);
  });

  it('accepts empty events list', () => {
    const result = calculateGainsForSymbol({
      symbol: 'X',
      events: [],
    });

    expect(result.poolSnapshots).toHaveLength(0);
    expect(result.taxYearSummaries).toHaveLength(0);
  });

  it('uses same-day matching when acquisition and disposal share a date', () => {
    const result = calculateGainsForSymbol({
      symbol: 'X',
      events: [
        {
          kind: 'acquisition',
          data: { eventDate: '2020-06-01', quantity: 100, totalCostGbp: 1000 },
        },
        {
          kind: 'disposal',
          data: { eventDate: '2020-06-01', quantity: 50, grossProceedsGbp: 600, feesGbp: 0 },
        },
      ],
    });

    expect(result.disposalResults).toHaveLength(1);
    expect(result.disposalResults[0]?.matchingBreakdown[0]?.source).toBe('same-day');
    expect(result.disposalResults[0]?.gainOrLossGbp).toBe(100);
  });

  it('uses 30-day then pool when disposal precedes a forward acquisition', () => {
    const result = calculateGainsForSymbol({
      symbol: 'X',
      events: [
        {
          kind: 'acquisition',
          data: { eventDate: '2020-01-01', quantity: 100, totalCostGbp: 1000 },
        },
        {
          kind: 'disposal',
          data: { eventDate: '2020-01-05', quantity: 100, grossProceedsGbp: 1200, feesGbp: 0 },
        },
        {
          kind: 'acquisition',
          data: { eventDate: '2020-01-10', quantity: 50, totalCostGbp: 600 },
        },
      ],
    });

    const br = result.disposalResults[0]?.matchingBreakdown ?? [];
    expect(br.some((t) => t.source === 'thirty-day')).toBe(true);
    expect(br.some((t) => t.source === 'section-104-pool')).toBe(true);
    expect(result.disposalResults[0]?.gainOrLossGbp).toBe(100);
  });
});
