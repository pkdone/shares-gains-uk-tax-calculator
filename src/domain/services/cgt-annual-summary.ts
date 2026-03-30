import type {
  DisposalResult,
  RateTier,
  TaxYearSummary,
} from '@/domain/schemas/calculation';
import {
  CGT_MAIN_RATE_CHANGE_DATE,
  getAeaGbpForTaxYearLabel,
  getShareCgtRatePercent,
} from '@/domain/services/cgt-config';
import { DomainError } from '@/shared/errors/app-error';

function taxYearStartYear(taxYearLabel: string): number {
  const match = /^(\d{4})-\d{2}$/.exec(taxYearLabel);
  if (!match) {
    throw new DomainError('Expected tax year label like 2023-24');
  }

  return Number(match[1]);
}

function compareTaxYearLabels(a: string, b: string): number {
  return taxYearStartYear(a) - taxYearStartYear(b);
}

function roundMoney2dp(value: number): number {
  return Math.round(value * 100) / 100;
}

type SignedDisposalGain = {
  readonly eventDate: string;
  readonly gainOrLossGbp: number;
};

/**
 * Split net gains into pre / post 30 Oct 2024 buckets (for rate split). Losses are
 * applied proportionally across positive gain mass (see ADR-006).
 */
function splitNetIntoPrePostBands(params: {
  readonly taxYearLabel: string;
  readonly disposals: readonly SignedDisposalGain[];
}): { readonly netPre: number; readonly netPost: number } {
  const { taxYearLabel, disposals } = params;

  let pre = 0;
  let post = 0;
  let lossMag = 0;

  for (const d of disposals) {
    if (d.gainOrLossGbp > 0) {
      if (taxYearLabel === '2024-25') {
        if (d.eventDate < CGT_MAIN_RATE_CHANGE_DATE) {
          pre += d.gainOrLossGbp;
        } else {
          post += d.gainOrLossGbp;
        }
      } else if (taxYearStartYear(taxYearLabel) >= 2025) {
        post += d.gainOrLossGbp;
      } else {
        pre += d.gainOrLossGbp;
      }
    } else if (d.gainOrLossGbp < 0) {
      lossMag += -d.gainOrLossGbp;
    }
  }

  const gainMag = pre + post;
  if (lossMag > 0 && gainMag > 0) {
    pre -= (lossMag * pre) / gainMag;
    post -= (lossMag * post) / gainMag;
  }

  return { netPre: Math.max(0, pre), netPost: Math.max(0, post) };
}

function computeTaxForTaxableBands(params: {
  readonly tier: RateTier;
  readonly taxYearLabel: string;
  readonly taxablePre: number;
  readonly taxablePost: number;
}): { readonly cgtDueGbp: number; readonly rateBreakdown: TaxYearSummary['rateBreakdown'] } {
  const { tier, taxYearLabel, taxablePre, taxablePost } = params;

  if (taxYearLabel === '2024-25') {
    const ratePre = getShareCgtRatePercent({
      tier,
      disposalDateIso: '2024-04-06',
    });
    const ratePost = getShareCgtRatePercent({
      tier,
      disposalDateIso: '2024-10-30',
    });

    const taxPre = roundMoney2dp((taxablePre * ratePre) / 100);
    const taxPost = roundMoney2dp((taxablePost * ratePost) / 100);
    const rows: TaxYearSummary['rateBreakdown'] = [];
    if (taxablePre > 0) {
      rows.push({ ratePct: ratePre, gainsGbp: roundMoney2dp(taxablePre), taxGbp: taxPre });
    }

    if (taxablePost > 0) {
      rows.push({ ratePct: ratePost, gainsGbp: roundMoney2dp(taxablePost), taxGbp: taxPost });
    }

    return {
      cgtDueGbp: roundMoney2dp(taxPre + taxPost),
      rateBreakdown: rows,
    };
  }

  const isoDate =
    taxYearStartYear(taxYearLabel) >= 2025 ? '2025-04-06' : '2023-09-01';
  const ratePct = getShareCgtRatePercent({ tier, disposalDateIso: isoDate });
  const taxable = roundMoney2dp(taxablePre + taxablePost);
  const taxGbp = roundMoney2dp((taxable * ratePct) / 100);
  return {
    cgtDueGbp: taxGbp,
    rateBreakdown: taxable > 0 ? [{ ratePct, gainsGbp: taxable, taxGbp }] : [],
  };
}

/**
 * Annual tax-year summaries with brought-forward loss pool carried across years.
 */
export function computeAnnualSummaries(params: {
  readonly disposalResults: readonly DisposalResult[];
  readonly rateTier: RateTier;
  readonly openingBroughtForwardLossesGbp: number;
}): readonly TaxYearSummary[] {
  const { disposalResults, rateTier, openingBroughtForwardLossesGbp } = params;

  if (openingBroughtForwardLossesGbp < 0 || !Number.isFinite(openingBroughtForwardLossesGbp)) {
    throw new DomainError('Opening brought-forward losses must be a non-negative finite number');
  }

  const byYear = new Map<string, SignedDisposalGain[]>();
  for (const d of disposalResults) {
    const list = byYear.get(d.taxYear);
    const entry: SignedDisposalGain = {
      eventDate: d.eventDate,
      gainOrLossGbp: d.gainOrLossGbp,
    };
    if (list === undefined) {
      byYear.set(d.taxYear, [entry]);
    } else {
      list.push(entry);
    }
  }

  const taxYears = [...byYear.keys()].sort(compareTaxYearLabels);
  const summaries: TaxYearSummary[] = [];

  let lossPoolGbp = openingBroughtForwardLossesGbp;

  for (const taxYear of taxYears) {
    const disposals = byYear.get(taxYear);
    if (disposals === undefined) {
      continue;
    }

    const net = roundMoney2dp(disposals.reduce((sum, d) => sum + d.gainOrLossGbp, 0));

    const aeaGbp = getAeaGbpForTaxYearLabel(taxYear);

    const totalGainsGbp = roundMoney2dp(
      disposals.reduce((sum, d) => sum + Math.max(0, d.gainOrLossGbp), 0),
    );
    const totalLossesGbp = roundMoney2dp(
      disposals.reduce((sum, d) => sum + Math.max(0, -d.gainOrLossGbp), 0),
    );

    if (net < 0) {
      lossPoolGbp = roundMoney2dp(lossPoolGbp + -net);
      summaries.push({
        taxYear,
        totalGainsGbp,
        totalLossesGbp,
        currentYearLossesAppliedGbp: totalLossesGbp,
        broughtForwardLossesAppliedGbp: 0,
        netGainsAfterLossesGbp: net,
        aeaGbp,
        taxableGainGbp: 0,
        cgtDueGbp: 0,
        lossesCarriedForwardGbp: roundMoney2dp(lossPoolGbp),
        rateBreakdown: [],
      });
      continue;
    }

    const bfUsed = roundMoney2dp(Math.min(lossPoolGbp, Math.max(0, net - aeaGbp)));
    const afterBf = roundMoney2dp(net - bfUsed);
    lossPoolGbp = roundMoney2dp(lossPoolGbp - bfUsed);

    const { netPre, netPost } = splitNetIntoPrePostBands({ taxYearLabel: taxYear, disposals });

    const splitSum = roundMoney2dp(netPre + netPost);
    if (Math.abs(splitSum - net) > 0.05) {
      throw new DomainError('Internal: pre/post net split does not reconcile to net gains');
    }

    let bandPost = netPost;
    let bandPre = netPre;

    let bfRemaining = bfUsed;
    const takePostBf = Math.min(bfRemaining, bandPost);
    bandPost = roundMoney2dp(bandPost - takePostBf);
    bfRemaining = roundMoney2dp(bfRemaining - takePostBf);

    const takePreBf = Math.min(bfRemaining, bandPre);
    bandPre = roundMoney2dp(bandPre - takePreBf);

    let aeaRemaining = aeaGbp;
    const aeaFromPost = Math.min(aeaRemaining, bandPost);
    bandPost = roundMoney2dp(bandPost - aeaFromPost);
    aeaRemaining -= aeaFromPost;

    const aeaFromPre = Math.min(aeaRemaining, bandPre);
    bandPre = roundMoney2dp(bandPre - aeaFromPre);

    const taxablePost = Math.max(0, bandPost);
    const taxablePre = Math.max(0, bandPre);

    const taxableGainGbp = roundMoney2dp(taxablePre + taxablePost);

    const taxableCheck = roundMoney2dp(Math.max(0, afterBf - aeaGbp));
    if (Math.abs(taxableGainGbp - taxableCheck) > 0.05) {
      throw new DomainError('Internal: taxable split does not reconcile to after-BF minus AEA');
    }

    const { cgtDueGbp, rateBreakdown } = computeTaxForTaxableBands({
      tier: rateTier,
      taxYearLabel: taxYear,
      taxablePre,
      taxablePost,
    });

    summaries.push({
      taxYear,
      totalGainsGbp,
      totalLossesGbp,
      currentYearLossesAppliedGbp: totalLossesGbp,
      broughtForwardLossesAppliedGbp: bfUsed,
      netGainsAfterLossesGbp: net,
      aeaGbp,
      taxableGainGbp,
      cgtDueGbp,
      lossesCarriedForwardGbp: roundMoney2dp(lossPoolGbp),
      rateBreakdown,
    });
  }

  return summaries;
}
