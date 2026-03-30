import type { TaxYearSummary } from '@/domain/schemas/calculation';
import { getAeaGbpForTaxYearLabel } from '@/domain/services/cgt-config';
import { ukTaxYearLabelFromDateOnly } from '@/domain/services/uk-tax-year';
import { DomainError } from '@/shared/errors/app-error';

/** From 2023–24 onward: HMRC proceeds reporting limit for Self Assessment (PRD Appendix 1). */
export const MODERN_PROCEEDS_REPORTING_THRESHOLD_GBP = 50_000;

/**
 * Pre-2023–24: use four times the annual exempt amount as the proceeds-based reporting trigger
 * (policy background; PRD Appendix 1).
 */
export function getLegacyProceedsReportingThresholdGbp(taxYearLabel: string): number {
  return 4 * getAeaGbpForTaxYearLabel(taxYearLabel);
}

function taxYearStartYear(taxYearLabel: string): number {
  const match = /^(\d{4})-\d{2}$/.exec(taxYearLabel);
  if (!match) {
    throw new DomainError('Expected tax year label like 2023-24');
  }

  const y = Number(match[1]);
  if (!Number.isFinite(y)) {
    throw new DomainError('Invalid tax year label');
  }

  return y;
}

/**
 * Tax years **2023–24 and later** use the £50,000 proceeds rule (with Self Assessment) per PRD.
 * Tax years **2022–23 and earlier** use the legacy 4×AEA proceeds concept.
 */
export function usesModernProceedsReportingRule(taxYearLabel: string): boolean {
  return taxYearStartYear(taxYearLabel) >= 2023;
}

export type ReportingNeedAssessment = {
  readonly taxYear: string;
  readonly totalDisposalProceedsGbp: number;
  readonly proceedsThresholdGbp: number;
  readonly proceedsThresholdDescription: string;
  readonly registeredForSelfAssessment: boolean;
  /** Sum of per-symbol `taxableGainGbp` from the engine (approximate; see ADR-010). */
  readonly portfolioSumTaxableGainGbp: number;
  readonly likelyNeedsReporting: boolean;
  readonly reasons: readonly string[];
};

/**
 * HMRC guidance for 2023–24+ links the £50,000 proceeds threshold to users registered for Self Assessment.
 * `registeredForSelfAssessment` must be supplied by the user; if false, the £50k proceeds rule is not applied.
 */
export function assessReportingNeed(params: {
  readonly taxYearLabel: string;
  readonly totalDisposalProceedsGbp: number;
  readonly registeredForSelfAssessment: boolean;
  readonly portfolioSumTaxableGainGbp: number;
}): ReportingNeedAssessment {
  const {
    taxYearLabel,
    totalDisposalProceedsGbp,
    registeredForSelfAssessment,
    portfolioSumTaxableGainGbp,
  } = params;

  const modern = usesModernProceedsReportingRule(taxYearLabel);
  const proceedsThresholdGbp = modern
    ? MODERN_PROCEEDS_REPORTING_THRESHOLD_GBP
    : getLegacyProceedsReportingThresholdGbp(taxYearLabel);

  const proceedsThresholdDescription = modern
    ? `£${MODERN_PROCEEDS_REPORTING_THRESHOLD_GBP.toLocaleString('en-GB')} total disposal proceeds (2023–24 onward, if registered for Self Assessment)`
    : `£${proceedsThresholdGbp.toLocaleString('en-GB')} total disposal proceeds (four times the annual exempt amount for ${taxYearLabel})`;

  const reasons: string[] = [];

  if (portfolioSumTaxableGainGbp > 0) {
    reasons.push(
      'This tool shows positive total taxable gains per symbol for this tax year (approximate; each line of stock applies the annual exempt amount separately in the calculator).',
    );
  }

  let proceedsRuleFires = false;
  if (modern) {
    if (registeredForSelfAssessment && totalDisposalProceedsGbp > MODERN_PROCEEDS_REPORTING_THRESHOLD_GBP) {
      proceedsRuleFires = true;
      reasons.push(
        `Total disposal proceeds exceed £${MODERN_PROCEEDS_REPORTING_THRESHOLD_GBP.toLocaleString('en-GB')} and you indicated you are registered for Self Assessment.`,
      );
    }
  } else if (totalDisposalProceedsGbp > proceedsThresholdGbp) {
    proceedsRuleFires = true;
    reasons.push(
      `Total disposal proceeds exceed the legacy threshold (four times the annual exempt amount for ${taxYearLabel}).`,
    );
  }

  const likelyNeedsReporting =
    proceedsRuleFires || portfolioSumTaxableGainGbp > 0;

  return {
    taxYear: taxYearLabel,
    totalDisposalProceedsGbp,
    proceedsThresholdGbp,
    proceedsThresholdDescription,
    registeredForSelfAssessment,
    portfolioSumTaxableGainGbp,
    likelyNeedsReporting,
    reasons,
  };
}

/**
 * Sum gross disposal proceeds per UK tax year across all lines of stock (portfolio-wide).
 */
export function aggregateDisposalProceedsByTaxYear(
  disposals: readonly { readonly eventDate: string; readonly grossProceedsGbp: number }[],
): Readonly<Record<string, number>> {
  const acc: Record<string, number> = {};
  for (const d of disposals) {
    const ty = ukTaxYearLabelFromDateOnly(d.eventDate);
    acc[ty] = (acc[ty] ?? 0) + d.grossProceedsGbp;
  }

  return acc;
}

/**
 * Sum `taxableGainGbp` for a given tax year across per-symbol summaries (approximate portfolio signal).
 */
export function sumTaxableGainGbpForTaxYearAcrossSymbols(params: {
  readonly taxYear: string;
  readonly perSymbolSummaries: readonly (readonly TaxYearSummary[])[];
}): number {
  const { taxYear, perSymbolSummaries } = params;
  let sum = 0;
  for (const summaries of perSymbolSummaries) {
    const row = summaries.find((s) => s.taxYear === taxYear);
    if (row !== undefined) {
      sum += row.taxableGainGbp;
    }
  }

  return sum;
}
