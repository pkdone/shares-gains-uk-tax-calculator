import { aggregateAcquisitionMatchingAttribution } from '@/application/calculation/acquisition-matching-attribution';
import type { DisposalResult } from '@/domain/schemas/calculation';

describe('aggregateAcquisitionMatchingAttribution', () => {
  it('returns null when no same-day or 30-day tranches reference the acquisition date', () => {
    const disposalResults: DisposalResult[] = [
      {
        eventDate: '2023-03-31',
        taxYear: '2023-24',
        quantity: 77,
        grossProceedsGbp: 14199.29,
        disposalFeesGbp: 0,
        matchingBreakdown: [
          {
            source: 'thirty-day',
            quantity: 77,
            allowableCostGbp: 14518.15,
            acquisitionDate: '2023-04-01',
          },
        ],
        allowableCostGbp: 14518.15,
        gainOrLossGbp: -318.86,
        roundedGainOrLossGbp: -319,
        poolSharesAfter: 3329,
        poolCostGbpAfter: 711267.05,
      },
    ];

    expect(
      aggregateAcquisitionMatchingAttribution({
        acquisitionDate: '2023-04-02',
        grossQuantity: 10,
        grossCostGbp: 100,
        disposalResults,
      }),
    ).toBeNull();
  });

  it('aggregates 30-day identification and net-to-pool figures for a later acquisition date', () => {
    const disposalResults: DisposalResult[] = [
      {
        eventDate: '2023-03-31',
        taxYear: '2023-24',
        quantity: 77,
        grossProceedsGbp: 14199.29,
        disposalFeesGbp: 0,
        matchingBreakdown: [
          {
            source: 'thirty-day',
            quantity: 77,
            allowableCostGbp: 14518.15,
            acquisitionDate: '2023-04-01',
          },
        ],
        allowableCostGbp: 14518.15,
        gainOrLossGbp: -318.86,
        roundedGainOrLossGbp: -319,
        poolSharesAfter: 3329,
        poolCostGbpAfter: 711267.05,
      },
    ];

    const a = aggregateAcquisitionMatchingAttribution({
      acquisitionDate: '2023-04-01',
      grossQuantity: 211,
      grossCostGbp: 39783.51,
      disposalResults,
    });

    expect(a).not.toBeNull();
    expect(a?.sameDayQuantity).toBe(0);
    expect(a?.thirtyDayQuantity).toBe(77);
    expect(a?.thirtyDayCostGbp).toBe(14518.15);
    expect(a?.thirtyDayByDisposal).toEqual([
      { disposalDate: '2023-03-31', quantity: 77, allowableCostGbp: 14518.15 },
    ]);
    expect(a?.netToPoolQuantity).toBe(134);
    expect(a?.netToPoolCostGbp).toBe(25265.36);
  });

  it('sums same-day identification on the acquisition date', () => {
    const disposalResults: DisposalResult[] = [
      {
        eventDate: '2020-06-01',
        taxYear: '2020-21',
        quantity: 50,
        grossProceedsGbp: 600,
        disposalFeesGbp: 0,
        matchingBreakdown: [
          { source: 'same-day', quantity: 50, allowableCostGbp: 500, acquisitionDate: '2020-06-01' },
        ],
        allowableCostGbp: 500,
        gainOrLossGbp: 100,
        roundedGainOrLossGbp: 100,
        poolSharesAfter: 50,
        poolCostGbpAfter: 500,
      },
    ];

    const a = aggregateAcquisitionMatchingAttribution({
      acquisitionDate: '2020-06-01',
      grossQuantity: 100,
      grossCostGbp: 1000,
      disposalResults,
    });

    expect(a?.sameDayQuantity).toBe(50);
    expect(a?.sameDayCostGbp).toBe(500);
    expect(a?.thirtyDayQuantity).toBe(0);
    expect(a?.netToPoolQuantity).toBe(50);
    expect(a?.netToPoolCostGbp).toBe(500);
  });
});
