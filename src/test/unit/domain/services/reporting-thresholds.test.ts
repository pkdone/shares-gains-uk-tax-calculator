import type { TaxYearSummary } from '@/domain/schemas/calculation';
import {
  aggregateDisposalProceedsByTaxYear,
  assessReportingNeed,
  getLegacyProceedsReportingThresholdGbp,
  MODERN_PROCEEDS_REPORTING_THRESHOLD_GBP,
  sumTaxableGainGbpForTaxYearAcrossSymbols,
  usesModernProceedsReportingRule,
} from '@/domain/services/reporting-thresholds';

function summaryStub(taxYear: string, taxableGainGbp: number): TaxYearSummary {
  return {
    taxYear,
    totalGainsGbp: 0,
    totalLossesGbp: 0,
    currentYearLossesAppliedGbp: 0,
    broughtForwardLossesAppliedGbp: 0,
    netGainsAfterLossesGbp: 0,
    aeaGbp: 0,
    taxableGainGbp,
    cgtDueGbp: 0,
    lossesCarriedForwardGbp: 0,
    rateBreakdown: [],
  };
}

describe('usesModernProceedsReportingRule', () => {
  it('is false for 2022-23 and earlier', () => {
    expect(usesModernProceedsReportingRule('2022-23')).toBe(false);
    expect(usesModernProceedsReportingRule('2016-17')).toBe(false);
  });

  it('is true from 2023-24 onward', () => {
    expect(usesModernProceedsReportingRule('2023-24')).toBe(true);
    expect(usesModernProceedsReportingRule('2024-25')).toBe(true);
  });
});

describe('getLegacyProceedsReportingThresholdGbp', () => {
  it('is four times the AEA', () => {
    expect(getLegacyProceedsReportingThresholdGbp('2022-23')).toBe(4 * 12_300);
    expect(getLegacyProceedsReportingThresholdGbp('2023-24')).toBe(4 * 6000);
  });
});

describe('aggregateDisposalProceedsByTaxYear', () => {
  it('groups by UK tax year', () => {
    const out = aggregateDisposalProceedsByTaxYear([
      { eventDate: '2023-05-01', grossProceedsGbp: 100 },
      { eventDate: '2024-01-10', grossProceedsGbp: 50 },
      { eventDate: '2024-04-10', grossProceedsGbp: 25 },
    ]);
    expect(out['2023-24']).toBe(150);
    expect(out['2024-25']).toBe(25);
  });
});

describe('sumTaxableGainGbpForTaxYearAcrossSymbols', () => {
  it('sums taxable gains for the tax year across symbols', () => {
    const sum = sumTaxableGainGbpForTaxYearAcrossSymbols({
      taxYear: '2023-24',
      perSymbolSummaries: [[summaryStub('2023-24', 100)], [summaryStub('2023-24', 200)]],
    });
    expect(sum).toBe(300);
  });
});

describe('assessReportingNeed', () => {
  it('fires legacy proceeds rule when proceeds exceed 4×AEA', () => {
    const a = assessReportingNeed({
      taxYearLabel: '2022-23',
      totalDisposalProceedsGbp: 50_000,
      registeredForSelfAssessment: false,
      portfolioSumTaxableGainGbp: 0,
    });
    expect(a.likelyNeedsReporting).toBe(true);
    expect(a.reasons.some((r) => r.includes('legacy threshold'))).toBe(true);
  });

  it('does not apply £50k rule when not registered for SA', () => {
    const a = assessReportingNeed({
      taxYearLabel: '2023-24',
      totalDisposalProceedsGbp: MODERN_PROCEEDS_REPORTING_THRESHOLD_GBP + 1,
      registeredForSelfAssessment: false,
      portfolioSumTaxableGainGbp: 0,
    });
    expect(a.likelyNeedsReporting).toBe(false);
  });

  it('applies £50k rule when registered for SA', () => {
    const a = assessReportingNeed({
      taxYearLabel: '2023-24',
      totalDisposalProceedsGbp: MODERN_PROCEEDS_REPORTING_THRESHOLD_GBP + 1,
      registeredForSelfAssessment: true,
      portfolioSumTaxableGainGbp: 0,
    });
    expect(a.likelyNeedsReporting).toBe(true);
  });

  it('flags positive portfolio taxable gain sum', () => {
    const a = assessReportingNeed({
      taxYearLabel: '2024-25',
      totalDisposalProceedsGbp: 0,
      registeredForSelfAssessment: false,
      portfolioSumTaxableGainGbp: 1,
    });
    expect(a.likelyNeedsReporting).toBe(true);
    expect(a.reasons.some((r) => r.includes('taxable gains'))).toBe(true);
  });
});
