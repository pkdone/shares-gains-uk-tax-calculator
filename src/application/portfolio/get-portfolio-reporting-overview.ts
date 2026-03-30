import { runCalculationForSymbol } from '@/application/calculation/run-calculation-for-symbol';
import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { RateTier, TaxYearSummary } from '@/domain/schemas/calculation';
import {
  aggregateDisposalProceedsByTaxYear,
  assessReportingNeed,
  sumTaxableGainGbpForTaxYearAcrossSymbols,
  type ReportingNeedAssessment,
} from '@/domain/services/reporting-thresholds';

function compareTaxYearLabels(a: string, b: string): number {
  const ma = /^(\d{4})-\d{2}$/.exec(a);
  const mb = /^(\d{4})-\d{2}$/.exec(b);
  if (ma === null || mb === null) {
    return a.localeCompare(b);
  }

  return Number(ma[1]) - Number(mb[1]);
}

export type PortfolioReportingOverview = {
  readonly proceedsByTaxYear: Readonly<Record<string, number>>;
  readonly assessments: readonly ReportingNeedAssessment[];
  readonly dataQualityWarnings: readonly string[];
};

/**
 * Portfolio-wide proceeds by tax year plus per-year reporting threshold assessments.
 * Taxable-gain signals sum per-symbol engine outputs (approximate; see ADR-010).
 */
export async function getPortfolioReportingOverview(params: {
  readonly portfolioRepository: PortfolioRepository;
  readonly acquisitionRepository: ShareAcquisitionRepository;
  readonly disposalRepository: ShareDisposalRepository;
  readonly fxRateRepository: FxRateRepository;
  readonly portfolioId: string;
  readonly userId: string;
  readonly rateTier: RateTier;
  readonly broughtForwardLosses: number;
  readonly registeredForSelfAssessment: boolean;
  readonly symbols: readonly string[];
  readonly disposals: readonly { readonly eventDate: string; readonly grossProceedsGbp: number }[];
}): Promise<PortfolioReportingOverview> {
  const {
    portfolioRepository,
    acquisitionRepository,
    disposalRepository,
    fxRateRepository,
    portfolioId,
    userId,
    rateTier,
    broughtForwardLosses,
    registeredForSelfAssessment,
    symbols,
    disposals,
  } = params;

  if ((await portfolioRepository.findByIdForUser(portfolioId, userId)) === null) {
    return { proceedsByTaxYear: {}, assessments: [], dataQualityWarnings: ['Portfolio not found.'] };
  }

  const proceedsByTaxYear = aggregateDisposalProceedsByTaxYear(disposals);
  const dataQualityWarnings: string[] = [];

  if (symbols.length === 0) {
    dataQualityWarnings.push('No symbols in this portfolio — add acquisitions or disposals.');
  }

  const perSymbolSummaries: TaxYearSummary[][] = [];
  for (const symbol of symbols) {
    try {
      const { output } = await runCalculationForSymbol({
        portfolioRepository,
        acquisitionRepository,
        disposalRepository,
        fxRateRepository,
        input: {
          portfolioId,
          userId,
          symbol,
          rateTier,
          broughtForwardLosses,
        },
      });
      perSymbolSummaries.push(output.taxYearSummaries);
    } catch {
      dataQualityWarnings.push(
        `Could not compute ${symbol} for reporting hints — check FX rates and ledger data.`,
      );
    }
  }

  const taxYearSet = new Set<string>([...Object.keys(proceedsByTaxYear)]);
  for (const summaries of perSymbolSummaries) {
    for (const s of summaries) {
      taxYearSet.add(s.taxYear);
    }
  }

  const taxYears = [...taxYearSet].sort(compareTaxYearLabels);
  const assessments: ReportingNeedAssessment[] = [];

  for (const taxYear of taxYears) {
    const totalDisposalProceedsGbp = proceedsByTaxYear[taxYear] ?? 0;
    const portfolioSumTaxableGainGbp = sumTaxableGainGbpForTaxYearAcrossSymbols({
      taxYear,
      perSymbolSummaries,
    });

    assessments.push(
      assessReportingNeed({
        taxYearLabel: taxYear,
        totalDisposalProceedsGbp,
        registeredForSelfAssessment,
        portfolioSumTaxableGainGbp,
      }),
    );
  }

  return {
    proceedsByTaxYear,
    assessments,
    dataQualityWarnings,
  };
}
