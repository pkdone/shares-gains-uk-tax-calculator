import type {
  AcquisitionSterlingLine,
  CalculationLedgerLine,
  DisposalSterlingLine,
  SuccessfulHoldingCalculation,
} from '@/application/calculation/calculation-types';
import type { DisposalResult } from '@/domain/schemas/calculation';
import { ukTaxYearLabelFromDateOnly } from '@/domain/services/uk-tax-year';

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
};

function compareLedgerLines(a: CalculationLedgerLine, b: CalculationLedgerLine): number {
  const dateCmp = a.data.eventDate.localeCompare(b.data.eventDate);
  if (dateCmp !== 0) {
    return dateCmp;
  }

  const kindRank = (k: CalculationLedgerLine['kind']): number => (k === 'ACQUISITION' ? 0 : 1);
  const kindDiff = kindRank(a.kind) - kindRank(b.kind);
  if (kindDiff !== 0) {
    return kindDiff;
  }

  return a.data.id.localeCompare(b.data.id);
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
  readonly line: Extract<CalculationLedgerLine, { kind: 'ACQUISITION' }>;
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
  readonly line: Extract<CalculationLedgerLine, { kind: 'DISPOSAL' }>;
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
      (l): l is Extract<CalculationLedgerLine, { kind: 'ACQUISITION' }> => l.kind === 'ACQUISITION',
    );
    const disposalLines = linesOnDate.filter(
      (l): l is Extract<CalculationLedgerLine, { kind: 'DISPOSAL' }> => l.kind === 'DISPOSAL',
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

      const pool = poolSnapshotAfterAcquisitionForDate({ eventDate: date, output: calc.output });
      outcomes.push({
        rowKind: 'acquisition-aggregate-summary',
        taxYearLabel,
        eventDate: date,
        totalQuantity: totalQty,
        totalCostGbp: totalCost,
        acquisitionLineCount: acquisitionLines.length,
        ...(pool === null
          ? {}
          : { poolSharesAfter: pool.poolSharesAfter, poolCostGbpAfter: pool.poolCostGbpAfter }),
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
  return sortedYearLabels.map((taxYearLabel) => ({
    taxYearLabel,
    dateBlocks: blocksByYear.get(taxYearLabel) ?? [],
  }));
}
