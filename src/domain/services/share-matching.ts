import type { CalcEvent, DisposalResult, MatchingTranche, PoolSnapshot } from '@/domain/schemas/calculation';
import {
  addAcquisition,
  createEmptyPool,
  disposeFromPool,
  type Section104Pool,
} from '@/domain/services/section-104-pool';
import { roundMoney2dp } from '@/domain/value-objects/money';
import { ukTaxYearLabelFromDateOnly } from '@/domain/services/uk-tax-year';
import { DomainError } from '@/shared/errors/app-error';

type AcqAgg = { qty: number; cost: number };
type DispAgg = { qty: number; gross: number; fees: number };

/**
 * UTC calendar date arithmetic for ISO `YYYY-MM-DD` strings.
 */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * CG51560: aggregate all acquisitions on the same day and all disposals on the same day.
 */
export function aggregateAcquisitionsAndDisposals(events: readonly CalcEvent[]): {
  readonly acqByDate: Map<string, AcqAgg>;
  readonly dispByDate: Map<string, DispAgg>;
} {
  const acqByDate = new Map<string, AcqAgg>();
  const dispByDate = new Map<string, DispAgg>();

  for (const e of events) {
    if (e.kind === 'acquisition') {
      const d = e.data.eventDate;
      const cur = acqByDate.get(d) ?? { qty: 0, cost: 0 };
      acqByDate.set(d, {
        qty: cur.qty + e.data.quantity,
        cost: roundMoney2dp(cur.cost + e.data.totalCostGbp),
      });
    } else {
      const d = e.data.eventDate;
      const cur = dispByDate.get(d) ?? { qty: 0, gross: 0, fees: 0 };
      dispByDate.set(d, {
        qty: cur.qty + e.data.quantity,
        gross: roundMoney2dp(cur.gross + e.data.grossProceedsGbp),
        fees: roundMoney2dp(cur.fees + e.data.feesGbp),
      });
    }
  }

  return { acqByDate, dispByDate };
}

function cloneAcqState(acqByDate: Map<string, AcqAgg>): Map<string, AcqAgg> {
  const m = new Map<string, AcqAgg>();
  for (const [k, v] of acqByDate) {
    m.set(k, { qty: v.qty, cost: v.cost });
  }
  return m;
}

type Phase1Row = {
  readonly disp: DispAgg;
  readonly tranches: MatchingTranche[];
  readonly poolQty: number;
};

function runPhase1(acqRemaining: Map<string, AcqAgg>, dispByDate: Map<string, DispAgg>): Map<string, Phase1Row> {
  const byDate = new Map<string, Phase1Row>();
  const disposalDates = [...dispByDate.keys()].sort((a, b) => a.localeCompare(b));

  for (const d of disposalDates) {
    const disp = dispByDate.get(d);
    if (!disp) {
      continue;
    }

    let Q = disp.qty;
    const tranches: MatchingTranche[] = [];

    const same = acqRemaining.get(d);
    if (same && same.qty > 0 && Q > 0) {
      const take = Math.min(Q, same.qty);
      const cost =
        take === same.qty ? same.cost : roundMoney2dp((same.cost * take) / same.qty);
      tranches.push({
        source: 'same-day',
        quantity: take,
        allowableCostGbp: cost,
        acquisitionDate: d,
      });
      same.qty -= take;
      same.cost = roundMoney2dp(same.cost - cost);
      if (same.qty <= 0) {
        acqRemaining.delete(d);
      }
      Q -= take;
    }

    if (Q > 0) {
      const windowEnd = addDaysIso(d, 30);
      const candidates = [...acqRemaining.keys()]
        .filter((dt) => dt > d && dt <= windowEnd)
        .sort((a, b) => a.localeCompare(b));

      for (const dt of candidates) {
        if (Q <= 0) {
          break;
        }
        const st = acqRemaining.get(dt);
        if (!st || st.qty <= 0) {
          continue;
        }
        const take = Math.min(Q, st.qty);
        const cost =
          take === st.qty ? st.cost : roundMoney2dp((st.cost * take) / st.qty);
        tranches.push({
          source: 'thirty-day',
          quantity: take,
          allowableCostGbp: cost,
          acquisitionDate: dt,
        });
        st.qty -= take;
        st.cost = roundMoney2dp(st.cost - cost);
        if (st.qty <= 0) {
          acqRemaining.delete(dt);
        }
        Q -= take;
      }
    }

    const matchedQty = tranches.reduce((s, t) => s + t.quantity, 0);
    if (Math.abs(matchedQty + Q - disp.qty) > 1e-6) {
      throw new DomainError('Internal: same-day and 30-day matching must reconcile to disposal quantity');
    }

    byDate.set(d, { disp, tranches, poolQty: Q });
  }

  return byDate;
}

function buildDisposalResult(params: {
  readonly eventDate: string;
  readonly disp: DispAgg;
  readonly matchingBreakdown: MatchingTranche[];
  readonly pool: Section104Pool;
}): DisposalResult {
  const { eventDate, disp, matchingBreakdown, pool } = params;
  const totalAllowable = roundMoney2dp(
    matchingBreakdown.reduce((s, t) => s + t.allowableCostGbp, 0),
  );
  const gainOrLossGbp = roundMoney2dp(disp.gross - totalAllowable - disp.fees);
  return {
    eventDate,
    taxYear: ukTaxYearLabelFromDateOnly(eventDate),
    quantity: disp.qty,
    grossProceedsGbp: disp.gross,
    disposalFeesGbp: disp.fees,
    matchingBreakdown,
    allowableCostGbp: totalAllowable,
    gainOrLossGbp,
    roundedGainOrLossGbp: Math.round(gainOrLossGbp),
    poolSharesAfter: pool.shares,
    poolCostGbpAfter: pool.costGbp,
  };
}

/**
 * HMRC identification order: same-day, 30-day, then Section 104 pool. GBP-only.
 */
export function computeMatchingOutput(events: readonly CalcEvent[]): {
  readonly poolSnapshots: PoolSnapshot[];
  readonly disposalResults: DisposalResult[];
  /** Pool state after processing all events (Section 104 pool, GBP cost 2dp). */
  readonly finalPool: { readonly shares: number; readonly costGbp: number };
} {
  const { acqByDate, dispByDate } = aggregateAcquisitionsAndDisposals(events);
  const acqRemaining = cloneAcqState(acqByDate);
  const phase1ByDate = runPhase1(acqRemaining, dispByDate);

  const allDates = [...new Set([...acqByDate.keys(), ...dispByDate.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );

  let pool = createEmptyPool();
  const poolSnapshots: PoolSnapshot[] = [];
  const disposalResults: DisposalResult[] = [];

  for (const d of allDates) {
    const acq = acqRemaining.get(d);
    if (acq && acq.qty > 0) {
      pool = addAcquisition(pool, acq.qty, acq.cost);
      poolSnapshots.push({
        description: 'Acquisition added to Section 104 pool (unmatched portion)',
        eventDate: d,
        shares: pool.shares,
        costGbp: pool.costGbp,
      });
    }

    const pd = phase1ByDate.get(d);
    if (!pd) {
      continue;
    }

    const { disp, tranches, poolQty } = pd;

    if (poolQty > 0) {
      const { allowableCostGbp, poolAfter } = disposeFromPool(pool, poolQty);
      pool = poolAfter;

      const poolTranche: MatchingTranche = {
        source: 'section-104-pool',
        quantity: poolQty,
        allowableCostGbp,
      };
      const matchingBreakdown = [...tranches, poolTranche];
      disposalResults.push(
        buildDisposalResult({ eventDate: d, disp, matchingBreakdown, pool }),
      );

      poolSnapshots.push({
        description: 'Disposal matched against Section 104 pool (remainder after same-day and 30-day)',
        eventDate: d,
        shares: pool.shares,
        costGbp: pool.costGbp,
      });
    } else if (tranches.length > 0) {
      disposalResults.push(buildDisposalResult({ eventDate: d, disp, matchingBreakdown: tranches, pool }));
    } else {
      throw new DomainError(
        'Disposal has no matching tranches and no pool quantity — invalid disposal',
      );
    }
  }

  return {
    poolSnapshots,
    disposalResults,
    finalPool: { shares: pool.shares, costGbp: pool.costGbp },
  };
}
