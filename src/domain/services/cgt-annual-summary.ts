import type { DisposalResult, TaxYearSummary } from '@/domain/schemas/calculation';

function roundMoney2dp(value: number): number {
  return Math.round(value * 100) / 100;
}

function compareTaxYearLabels(a: string, b: string): number {
  const ma = /^(\d{4})-\d{2}$/.exec(a);
  const mb = /^(\d{4})-\d{2}$/.exec(b);
  if (ma === null || mb === null) {
    return a.localeCompare(b);
  }

  return Number(ma[1]) - Number(mb[1]);
}

/**
 * Per tax year: sums of gains and losses from this holding’s disposals only.
 * Does not apply AEA, brought-forward losses, or CGT rates — those are outside this holding scope.
 */
export function computeAnnualSummaries(params: {
  readonly disposalResults: readonly DisposalResult[];
}): readonly TaxYearSummary[] {
  const { disposalResults } = params;

  const byYear = new Map<
    string,
    { readonly gains: number; readonly losses: number }
  >();

  for (const d of disposalResults) {
    const existing = byYear.get(d.taxYear);
    const gain = d.gainOrLossGbp;
    if (gain >= 0) {
      if (existing === undefined) {
        byYear.set(d.taxYear, { gains: gain, losses: 0 });
      } else {
        byYear.set(d.taxYear, {
          gains: roundMoney2dp(existing.gains + gain),
          losses: existing.losses,
        });
      }
    } else {
      const lossMag = -gain;
      if (existing === undefined) {
        byYear.set(d.taxYear, { gains: 0, losses: lossMag });
      } else {
        byYear.set(d.taxYear, {
          gains: existing.gains,
          losses: roundMoney2dp(existing.losses + lossMag),
        });
      }
    }
  }

  const taxYears = [...byYear.keys()].sort(compareTaxYearLabels);
  const summaries: TaxYearSummary[] = [];

  for (const taxYear of taxYears) {
    const row = byYear.get(taxYear);
    if (row === undefined) {
      continue;
    }

    const totalGainsGbp = roundMoney2dp(row.gains);
    const totalLossesGbp = roundMoney2dp(row.losses);
    const netGainsGbp = roundMoney2dp(totalGainsGbp - totalLossesGbp);

    summaries.push({
      taxYear,
      totalGainsGbp,
      totalLossesGbp,
      netGainsGbp,
    });
  }

  return summaries;
}
