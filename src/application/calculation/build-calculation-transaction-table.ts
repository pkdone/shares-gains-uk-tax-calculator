import {
  aggregateAcquisitionMatchingAttribution,
  type AcquisitionMatchingAttribution,
} from '@/application/calculation/acquisition-matching-attribution';
import type {
  AcquisitionSterlingLine,
  DisposalSterlingLine,
  SuccessfulHoldingCalculation,
} from '@/application/calculation/calculation-types';
import { compareLedgerLines } from '@/application/ledger/ledger-line-order';
import type { LedgerLine } from '@/application/ledger/ledger-types';
import type { CalcEvent, DisposalResult } from '@/domain/schemas/calculation';
import { computeMatchingOutput } from '@/domain/services/share-matching';
import { roundMoney2dp } from '@/domain/value-objects/money';
import { ukTaxYearLabelFromDateOnly, ukTaxYearStartDateFromLabel } from '@/domain/services/uk-tax-year';

export type CalculationTransactionLedgerAcquisitionRow = {
  readonly rowKind: 'ledger-acquisition';
  readonly taxYearLabel: string;
  readonly eventDate: string;
  readonly acquisitionId: string;
  readonly quantity: number;
  readonly sterling: AcquisitionSterlingLine;
  /** Gross consideration per share in USD (broker-style; same basis as sterling gross/quantity). */
  readonly pricePerShareUsd: number;
  /** Total USD cost (gross consideration + fees). */
  readonly combinedUsd: number;
  /** USD per 1 GBP (BoE XUDLUSS) when FX applied to this row; omitted when not applicable. */
  readonly fxRate?: number;
  /** When `fxRate` is set: BoE rate date equals event date (false) vs earlier published date (true). */
  readonly fxUsedFallback?: boolean;
};

export type CalculationTransactionLedgerDisposalRow = {
  readonly rowKind: 'ledger-disposal';
  readonly taxYearLabel: string;
  readonly eventDate: string;
  readonly disposalId: string;
  readonly quantity: number;
  readonly sterling: DisposalSterlingLine;
  /** Gross proceeds per share in USD before fees. */
  readonly pricePerShareUsd: number;
  /** Net USD proceeds (gross − fees). */
  readonly combinedUsd: number;
  /** USD per 1 GBP when FX applied to this row; omitted when not applicable. */
  readonly fxRate?: number;
  /** When `fxRate` is set: BoE rate date equals event date (false) vs earlier published date (true). */
  readonly fxUsedFallback?: boolean;
};

export type CalculationTransactionCgtDisposalSummaryRow = {
  readonly rowKind: 'cgt-disposal-summary';
  readonly taxYearLabel: string;
  readonly eventDate: string;
  readonly result: DisposalResult;
};

export type CalculationTransactionAcquisitionAggregateSummaryRow = {
  readonly rowKind: 'acquisition-aggregate-summary';
  readonly taxYearLabel: string;
  readonly eventDate: string;
  readonly totalQuantity: number;
  readonly totalCostGbp: number;
  /** Number of acquisition ledger lines aggregated for this date. */
  readonly acquisitionLineCount: number;
  /** Present when the engine recorded an Section 104 pool snapshot after adding unmatched acquisitions. */
  readonly poolSharesAfter?: number;
  readonly poolCostGbpAfter?: number;
  /** Same-day / 30-day identification vs pool net; omitted when nothing was matched off this date. */
  readonly acquisitionMatching?: AcquisitionMatchingAttribution;
};

export type CalculationTransactionLedgerRow =
  | CalculationTransactionLedgerAcquisitionRow
  | CalculationTransactionLedgerDisposalRow;

export type CalculationTransactionOutcomeRow =
  | CalculationTransactionAcquisitionAggregateSummaryRow
  | CalculationTransactionCgtDisposalSummaryRow;

/**
 * One calendar date within a tax year: ledger lines (acquisitions then disposals), then outcome row(s)
 * (pool after acquisitions, then CGT disposal summary when applicable).
 */
export type CalculationTransactionDateBlock = {
  readonly eventDate: string;
  readonly taxYearLabel: string;
  readonly ledgerRows: readonly CalculationTransactionLedgerRow[];
  readonly outcomes: readonly CalculationTransactionOutcomeRow[];
};

export type CalculationTransactionTableGroup = {
  readonly taxYearLabel: string;
  readonly dateBlocks: readonly CalculationTransactionDateBlock[];
  /**
   * Sum of {@link DisposalResult.gainOrLossGbp} for disposals in this tax year (this holding only).
   * Acquisition-only years are zero.
   */
  readonly totalNetRealisedGainOrLossGbp: number;
  /** Section 104 pool immediately before the first day of this UK tax year (6 April), after prior-year events. */
  readonly openingPoolShares: number;
  readonly openingPoolCostGbp: number;
};

function buildCalcEventsFromSuccessfulHoldingCalculation(
  calc: SuccessfulHoldingCalculation,
): readonly CalcEvent[] {
  const sorted = [...calc.ledgerLines].sort(compareLedgerLines);
  const events: CalcEvent[] = [];
  for (const line of sorted) {
    if (line.kind === 'ACQUISITION') {
      const st = calc.sterlingByAcquisitionId[line.data.id];
      if (st === undefined) {
        throw new Error(`Internal: missing sterling for acquisition ${line.data.id}`);
      }

      events.push({
        kind: 'acquisition',
        data: {
          eventDate: line.data.eventDate,
          quantity: line.data.quantity,
          totalCostGbp: st.totalCostGbp,
        },
      });
    } else {
      const st = calc.sterlingByDisposalId[line.data.id];
      if (st === undefined) {
        throw new Error(`Internal: missing sterling for disposal ${line.data.id}`);
      }

      events.push({
        kind: 'disposal',
        data: {
          eventDate: line.data.eventDate,
          quantity: line.data.quantity,
          grossProceedsGbp: st.grossProceedsGbp,
          feesGbp: st.feesGbp,
        },
      });
    }
  }

  return events;
}

function openingPoolAtTaxYearStart(
  events: readonly CalcEvent[],
  taxYearLabel: string,
): { readonly shares: number; readonly costGbp: number } {
  const start = ukTaxYearStartDateFromLabel(taxYearLabel);
  const prior = events.filter((e) => e.data.eventDate < start);
  if (prior.length === 0) {
    return { shares: 0, costGbp: 0 };
  }

  return computeMatchingOutput(prior).finalPool;
}

function poolSnapshotAfterAcquisitionForDate(params: {
  readonly eventDate: string;
  readonly output: SuccessfulHoldingCalculation['output'];
}): { readonly poolSharesAfter: number; readonly poolCostGbpAfter: number } | null {
  const { eventDate, output } = params;
  const snap = output.poolSnapshots.find(
    (s) =>
      s.eventDate === eventDate &&
      s.description.includes('Acquisition added to Section 104 pool (unmatched portion)'),
  );
  if (snap === undefined) {
    return null;
  }

  return { poolSharesAfter: snap.shares, poolCostGbpAfter: snap.costGbp };
}

function pushAcquisitionLedgerRow(params: {
  readonly calc: SuccessfulHoldingCalculation;
  readonly line: Extract<LedgerLine, { kind: 'ACQUISITION' }>;
  readonly taxYearLabel: string;
  readonly eventDate: string;
  readonly into: CalculationTransactionLedgerRow[];
}): void {
  const { calc, line, taxYearLabel, eventDate, into } = params;
  const sterling = calc.sterlingByAcquisitionId[line.data.id];
  if (sterling === undefined) {
    throw new Error(`Internal: missing sterling for acquisition ${line.data.id}`);
  }

  const fxAcq = calc.fxByAcquisitionId[line.data.id];
  const a = line.data;
  const pricePerShareUsd = a.considerationUsd / a.quantity;
  const combinedUsd = a.considerationUsd + a.feesUsd;
  into.push({
    rowKind: 'ledger-acquisition',
    taxYearLabel,
    eventDate,
    acquisitionId: line.data.id,
    quantity: line.data.quantity,
    sterling,
    pricePerShareUsd,
    combinedUsd,
    ...(fxAcq === undefined
      ? {}
      : { fxRate: fxAcq.usdPerGbp, fxUsedFallback: fxAcq.usedFallback }),
  });
}

function pushDisposalLedgerRow(params: {
  readonly calc: SuccessfulHoldingCalculation;
  readonly line: Extract<LedgerLine, { kind: 'DISPOSAL' }>;
  readonly taxYearLabel: string;
  readonly eventDate: string;
  readonly into: CalculationTransactionLedgerRow[];
}): void {
  const { calc, line, taxYearLabel, eventDate, into } = params;
  const sterling = calc.sterlingByDisposalId[line.data.id];
  if (sterling === undefined) {
    throw new Error(`Internal: missing sterling for disposal ${line.data.id}`);
  }

  const fxDisp = calc.fxByDisposalId[line.data.id];
  const d = line.data;
  const pricePerShareUsd = d.grossProceedsUsd / d.quantity;
  const combinedUsd = d.grossProceedsUsd - d.feesUsd;
  into.push({
    rowKind: 'ledger-disposal',
    taxYearLabel,
    eventDate,
    disposalId: line.data.id,
    quantity: line.data.quantity,
    sterling,
    pricePerShareUsd,
    combinedUsd,
    ...(fxDisp === undefined
      ? {}
      : { fxRate: fxDisp.usdPerGbp, fxUsedFallback: fxDisp.usedFallback }),
  });
}

/**
 * Ledger lines and per-date outcomes grouped into chronological date blocks within each UK tax year.
 */
export function buildCalculationTransactionTableModel(
  calc: SuccessfulHoldingCalculation,
): readonly CalculationTransactionTableGroup[] {
  const calcEvents = buildCalcEventsFromSuccessfulHoldingCalculation(calc);
  const sortedLines = [...calc.ledgerLines].sort(compareLedgerLines);

  const dates = [...new Set(sortedLines.map((l) => l.data.eventDate))].sort((a, b) =>
    a.localeCompare(b),
  );

  const disposalResultByDate = new Map(
    calc.output.disposalResults.map((d) => [d.eventDate, d] as const),
  );

  const blocksByYear = new Map<string, CalculationTransactionDateBlock[]>();

  for (const date of dates) {
    const linesOnDate = sortedLines.filter((l) => l.data.eventDate === date);
    const taxYearLabel = ukTaxYearLabelFromDateOnly(date);
    const acquisitionLines = linesOnDate.filter(
      (l): l is Extract<LedgerLine, { kind: 'ACQUISITION' }> => l.kind === 'ACQUISITION',
    );
    const disposalLines = linesOnDate.filter(
      (l): l is Extract<LedgerLine, { kind: 'DISPOSAL' }> => l.kind === 'DISPOSAL',
    );

    const ledgerRows: CalculationTransactionLedgerRow[] = [];

    for (const line of acquisitionLines) {
      pushAcquisitionLedgerRow({
        calc,
        line,
        taxYearLabel,
        eventDate: date,
        into: ledgerRows,
      });
    }

    for (const line of disposalLines) {
      pushDisposalLedgerRow({
        calc,
        line,
        taxYearLabel,
        eventDate: date,
        into: ledgerRows,
      });
    }

    const outcomes: CalculationTransactionOutcomeRow[] = [];

    if (acquisitionLines.length > 0) {
      let totalQty = 0;
      let totalCost = 0;
      for (const line of acquisitionLines) {
        const st = calc.sterlingByAcquisitionId[line.data.id];
        if (st === undefined) {
          throw new Error(`Internal: missing sterling for acquisition ${line.data.id}`);
        }

        totalQty += line.data.quantity;
        totalCost += st.totalCostGbp;
      }

      const totalCostGbp = roundMoney2dp(totalCost);
      const acquisitionMatching = aggregateAcquisitionMatchingAttribution({
        acquisitionDate: date,
        grossQuantity: totalQty,
        grossCostGbp: totalCostGbp,
        disposalResults: calc.output.disposalResults,
      });

      const pool = poolSnapshotAfterAcquisitionForDate({ eventDate: date, output: calc.output });
      outcomes.push({
        rowKind: 'acquisition-aggregate-summary',
        taxYearLabel,
        eventDate: date,
        totalQuantity: totalQty,
        totalCostGbp,
        acquisitionLineCount: acquisitionLines.length,
        ...(pool === null
          ? {}
          : { poolSharesAfter: pool.poolSharesAfter, poolCostGbpAfter: pool.poolCostGbpAfter }),
        ...(acquisitionMatching === null ? {} : { acquisitionMatching }),
      });
    }

    const disposalResult = disposalResultByDate.get(date);
    if (disposalResult !== undefined) {
      outcomes.push({
        rowKind: 'cgt-disposal-summary',
        taxYearLabel,
        eventDate: date,
        result: disposalResult,
      });
    }

    const block: CalculationTransactionDateBlock = {
      eventDate: date,
      taxYearLabel,
      ledgerRows,
      outcomes,
    };

    const existing = blocksByYear.get(taxYearLabel);
    if (existing === undefined) {
      blocksByYear.set(taxYearLabel, [block]);
    } else {
      existing.push(block);
    }
  }

  const sortedYearLabels = [...blocksByYear.keys()].sort((a, b) => a.localeCompare(b));
  return sortedYearLabels.map((taxYearLabel) => {
    const dateBlocks = blocksByYear.get(taxYearLabel) ?? [];
    let totalNet = 0;
    for (const block of dateBlocks) {
      for (const outcome of block.outcomes) {
        if (outcome.rowKind === 'cgt-disposal-summary') {
          totalNet += outcome.result.gainOrLossGbp;
        }
      }
    }

    const opening = openingPoolAtTaxYearStart(calcEvents, taxYearLabel);

    return {
      taxYearLabel,
      dateBlocks,
      totalNetRealisedGainOrLossGbp: roundMoney2dp(totalNet),
      openingPoolShares: opening.shares,
      openingPoolCostGbp: roundMoney2dp(opening.costGbp),
    };
  });
}
