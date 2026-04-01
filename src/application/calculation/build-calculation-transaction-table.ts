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
};

export type CalculationTransactionLedgerDisposalRow = {
  readonly rowKind: 'ledger-disposal';
  readonly taxYearLabel: string;
  readonly eventDate: string;
  readonly disposalId: string;
  readonly quantity: number;
  readonly sterling: DisposalSterlingLine;
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
  readonly poolSharesAfter: number;
  readonly poolCostGbpAfter: number;
};

export type CalculationTransactionTableRow =
  | CalculationTransactionLedgerAcquisitionRow
  | CalculationTransactionLedgerDisposalRow
  | CalculationTransactionCgtDisposalSummaryRow
  | CalculationTransactionAcquisitionAggregateSummaryRow;

export type CalculationTransactionTableGroup = {
  readonly taxYearLabel: string;
  readonly rows: readonly CalculationTransactionTableRow[];
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

/**
 * Ledger lines in date order with CGT aggregate summary rows after each date’s ledger lines.
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

  const flatRows: CalculationTransactionTableRow[] = [];

  for (const date of dates) {
    const linesOnDate = sortedLines.filter((l) => l.data.eventDate === date);
    const taxYearLabel = ukTaxYearLabelFromDateOnly(date);

    for (const line of linesOnDate) {
      if (line.kind === 'ACQUISITION') {
        const sterling = calc.sterlingByAcquisitionId[line.data.id];
        if (sterling === undefined) {
          throw new Error(`Internal: missing sterling for acquisition ${line.data.id}`);
        }

        flatRows.push({
          rowKind: 'ledger-acquisition',
          taxYearLabel,
          eventDate: date,
          acquisitionId: line.data.id,
          quantity: line.data.quantity,
          sterling,
        });
      } else {
        const sterling = calc.sterlingByDisposalId[line.data.id];
        if (sterling === undefined) {
          throw new Error(`Internal: missing sterling for disposal ${line.data.id}`);
        }

        flatRows.push({
          rowKind: 'ledger-disposal',
          taxYearLabel,
          eventDate: date,
          disposalId: line.data.id,
          quantity: line.data.quantity,
          sterling,
        });
      }
    }

    const disposalResult = disposalResultByDate.get(date);
    if (disposalResult === undefined) {
      const acqCount = linesOnDate.filter((l) => l.kind === 'ACQUISITION').length;
      if (acqCount >= 2) {
        const acquisitionsOnDate = linesOnDate.filter((l) => l.kind === 'ACQUISITION');
        let totalQty = 0;
        let totalCost = 0;
        for (const l of acquisitionsOnDate) {
          if (l.kind !== 'ACQUISITION') {
            continue;
          }

          const st = calc.sterlingByAcquisitionId[l.data.id];
          if (st === undefined) {
            throw new Error(`Internal: missing sterling for acquisition ${l.data.id}`);
          }

          totalQty += l.data.quantity;
          totalCost += st.totalCostGbp;
        }

        const pool = poolSnapshotAfterAcquisitionForDate({ eventDate: date, output: calc.output });
        if (pool !== null) {
          flatRows.push({
            rowKind: 'acquisition-aggregate-summary',
            taxYearLabel,
            eventDate: date,
            totalQuantity: totalQty,
            totalCostGbp: totalCost,
            poolSharesAfter: pool.poolSharesAfter,
            poolCostGbpAfter: pool.poolCostGbpAfter,
          });
        }
      }
    } else {
      flatRows.push({
        rowKind: 'cgt-disposal-summary',
        taxYearLabel,
        eventDate: date,
        result: disposalResult,
      });
    }
  }

  const byYear = new Map<string, CalculationTransactionTableRow[]>();
  for (const row of flatRows) {
    const existing = byYear.get(row.taxYearLabel);
    if (existing === undefined) {
      byYear.set(row.taxYearLabel, [row]);
    } else {
      existing.push(row);
    }
  }

  const sortedYearLabels = [...byYear.keys()].sort((a, b) => a.localeCompare(b));
  return sortedYearLabels.map((taxYearLabel) => ({
    taxYearLabel,
    rows: byYear.get(taxYearLabel) ?? [],
  }));
}
