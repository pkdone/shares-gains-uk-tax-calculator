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
    matchingSource: 'section-104-pool',
    allowableCostGbp: 0,
    gainOrLossGbp,
    roundedGainOrLossGbp: Math.round(gainOrLossGbp),
    poolSharesAfter: 0,
    poolCostGbpAfter: 0,
  };
}

describe('computeAnnualSummaries', () => {
  it('applies brought-forward losses only down to AEA', () => {
    const summaries = computeAnnualSummaries({
      disposalResults: [
        disposalStub({
          eventDate: '2023-06-01',
          taxYear: '2023-24',
          gainOrLossGbp: 10_000,
        }),
      ],
      rateTier: 'higher',
      openingBroughtForwardLossesGbp: 8000,
    });

    const s = summaries[0];
    expect(s?.broughtForwardLossesAppliedGbp).toBe(4000);
    // After BF, £6,000 remains which is fully covered by AEA for 2023-24.
    expect(s?.taxableGainGbp).toBe(0);
  });

  it('carries net loss year into loss pool', () => {
    const summaries = computeAnnualSummaries({
      disposalResults: [
        disposalStub({
          eventDate: '2023-06-01',
          taxYear: '2023-24',
          gainOrLossGbp: -5000,
        }),
      ],
      rateTier: 'higher',
      openingBroughtForwardLossesGbp: 1000,
    });

    const s = summaries[0];
    expect(s?.netGainsAfterLossesGbp).toBe(-5000);
    expect(s?.lossesCarriedForwardGbp).toBe(6000);
  });

  it('splits 2024-25 rates between pre and post 30 Oct 2024 disposals', () => {
    const summaries = computeAnnualSummaries({
      disposalResults: [
        disposalStub({
          eventDate: '2024-06-01',
          taxYear: '2024-25',
          gainOrLossGbp: 50_000,
        }),
        disposalStub({
          eventDate: '2024-11-01',
          taxYear: '2024-25',
          gainOrLossGbp: 50_000,
        }),
      ],
      rateTier: 'higher',
      openingBroughtForwardLossesGbp: 0,
    });

    const s = summaries.find((x) => x.taxYear === '2024-25');
    expect(s?.rateBreakdown.length).toBe(2);
    const rates = s?.rateBreakdown.map((r) => r.ratePct).sort((a, b) => a - b);
    expect(rates).toEqual([20, 24]);
  });

  it('carries forward unused loss pool across tax years', () => {
    const summaries = computeAnnualSummaries({
      disposalResults: [
        disposalStub({
          eventDate: '2022-06-01',
          taxYear: '2022-23',
          gainOrLossGbp: -10_000,
        }),
        disposalStub({
          eventDate: '2023-06-01',
          taxYear: '2023-24',
          gainOrLossGbp: 5000,
        }),
      ],
      rateTier: 'higher',
      openingBroughtForwardLossesGbp: 0,
    });

    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.lossesCarriedForwardGbp).toBe(10_000);
    expect(summaries[1]?.broughtForwardLossesAppliedGbp).toBe(0);
    expect(summaries[1]?.taxableGainGbp).toBe(0);
  });
});
