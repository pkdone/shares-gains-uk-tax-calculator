import type { DisposalResult } from '@/domain/schemas/calculation';
import { computeAnnualSummaries } from '@/domain/services/cgt-annual-summary';

function disposalStub(params: {
  readonly eventDate: string;
  readonly taxYear: string;
  readonly gainOrLossGbp: number;
}): DisposalResult {
  const { eventDate, taxYear, gainOrLossGbp } = params;
  return {
    eventDate,
    taxYear,
    quantity: 1,
    grossProceedsGbp: 0,
    disposalFeesGbp: 0,
    matchingBreakdown: [
      { source: 'section-104-pool', quantity: 1, allowableCostGbp: 0 },
    ],
    allowableCostGbp: 0,
    gainOrLossGbp,
    roundedGainOrLossGbp: Math.round(gainOrLossGbp),
    poolSharesAfter: 0,
    poolCostGbpAfter: 0,
  };
}

describe('computeAnnualSummaries', () => {
  it('aggregates gains and losses per tax year', () => {
    const summaries = computeAnnualSummaries({
      disposalResults: [
        disposalStub({
          eventDate: '2023-06-01',
          taxYear: '2023-24',
          gainOrLossGbp: 10_000,
        }),
        disposalStub({
          eventDate: '2023-09-01',
          taxYear: '2023-24',
          gainOrLossGbp: -2000,
        }),
      ],
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.taxYear).toBe('2023-24');
    expect(summaries[0]?.totalGainsGbp).toBe(10_000);
    expect(summaries[0]?.totalLossesGbp).toBe(2000);
    expect(summaries[0]?.netGainsGbp).toBe(8000);
  });

  it('returns multiple years sorted', () => {
    const summaries = computeAnnualSummaries({
      disposalResults: [
        disposalStub({ eventDate: '2024-01-01', taxYear: '2023-24', gainOrLossGbp: 100 }),
        disposalStub({ eventDate: '2025-01-01', taxYear: '2024-25', gainOrLossGbp: 50 }),
      ],
    });

    expect(summaries.map((s) => s.taxYear)).toEqual(['2023-24', '2024-25']);
  });
});
