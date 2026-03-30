import type { CalcEvent, CalcInput, CalcOutput, DisposalResult, PoolSnapshot } from '@/domain/schemas/calculation';
import { calcInputSchema } from '@/domain/schemas/calculation';
import { computeAnnualSummaries } from '@/domain/services/cgt-annual-summary';
import {
  addAcquisition,
  createEmptyPool,
  disposeFromPool,
  roundMoney2dp,
  type Section104Pool,
} from '@/domain/services/section-104-pool';
import { ukTaxYearLabelFromDateOnly } from '@/domain/services/uk-tax-year';
import { DomainError } from '@/shared/errors/app-error';

function roundGainOrLossToSa108WholePounds(value: number): number {
  return Math.round(value);
}

function compareEvents(a: CalcEvent, b: CalcEvent): number {
  const dateCmp = a.data.eventDate.localeCompare(b.data.eventDate);
  if (dateCmp !== 0) {
    return dateCmp;
  }

  if (a.kind === b.kind) {
    return 0;
  }

  return a.kind === 'acquisition' ? -1 : 1;
}

function assertSortedEvents(events: readonly CalcEvent[]): CalcEvent[] {
  const sorted = [...events].sort(compareEvents);
  for (let i = 0; i < events.length; i += 1) {
    const orig = events[i];
    const exp = sorted[i];
    if (orig === undefined || exp === undefined) {
      throw new DomainError('Internal: event index out of range');
    }

    if (orig.kind !== exp.kind || orig.data.eventDate !== exp.data.eventDate) {
      throw new DomainError(
        'Calculation events must be sorted by event date (YYYY-MM-DD); acquisitions before disposals on the same day',
      );
    }
  }

  return sorted;
}

/**
 * Section 104 pool + annual CGT summaries for one symbol (GBP-only, pool-only matching).
 */
export function calculateGainsForSymbol(input: CalcInput): CalcOutput {
  const parsed = calcInputSchema.parse(input);
  const events = assertSortedEvents(parsed.events);

  const poolSnapshots: PoolSnapshot[] = [];
  const disposalResults: DisposalResult[] = [];

  let pool: Section104Pool = createEmptyPool();

  for (const event of events) {
    if (event.kind === 'acquisition') {
      const { quantity, totalCostGbp, eventDate } = event.data;
      pool = addAcquisition(pool, quantity, totalCostGbp);
      poolSnapshots.push({
        description: 'Acquisition added to Section 104 pool',
        eventDate,
        shares: pool.shares,
        costGbp: pool.costGbp,
      });
      continue;
    }

    const { quantity, grossProceedsGbp, feesGbp, eventDate } = event.data;
    const { allowableCostGbp, poolAfter } = disposeFromPool(pool, quantity);
    pool = poolAfter;

    const gainOrLossGbp = roundMoney2dp(grossProceedsGbp - allowableCostGbp - feesGbp);
    const roundedGainOrLossGbp = roundGainOrLossToSa108WholePounds(gainOrLossGbp);

    const disposal: DisposalResult = {
      eventDate,
      taxYear: ukTaxYearLabelFromDateOnly(eventDate),
      quantity,
      grossProceedsGbp,
      disposalFeesGbp: feesGbp,
      matchingSource: 'section-104-pool',
      allowableCostGbp,
      gainOrLossGbp,
      roundedGainOrLossGbp,
      poolSharesAfter: pool.shares,
      poolCostGbpAfter: pool.costGbp,
    };
    disposalResults.push(disposal);

    poolSnapshots.push({
      description: 'Disposal matched against Section 104 pool',
      eventDate,
      shares: pool.shares,
      costGbp: pool.costGbp,
    });
  }

  const taxYearSummaries = computeAnnualSummaries({
    disposalResults,
    rateTier: parsed.rateTier,
    openingBroughtForwardLossesGbp: parsed.broughtForwardLosses,
  });

  return {
    symbol: parsed.symbol,
    poolSnapshots,
    disposalResults,
    taxYearSummaries: [...taxYearSummaries],
  };
}
