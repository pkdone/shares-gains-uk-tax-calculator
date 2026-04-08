import type { ReactElement } from 'react';

import type { AcquisitionMatchingAttribution } from '@/application/calculation/acquisition-matching-attribution';
import type {
  CalculationTransactionAcquisitionAggregateSummaryRow,
  CalculationTransactionCgtDisposalSummaryRow,
  CalculationTransactionDateBlock,
  CalculationTransactionLedgerAcquisitionRow,
  CalculationTransactionLedgerDisposalRow,
  CalculationTransactionOutcomeRow,
  CalculationTransactionTableGroup,
} from '@/application/calculation/build-calculation-transaction-table';
import type { MatchingSource } from '@/domain/schemas/calculation';

const money = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fxRateCellClassName(params: {
  readonly fxRate: number | undefined;
  readonly fxUsedFallback: boolean | undefined;
}): string {
  const { fxRate, fxUsedFallback } = params;
  if (fxRate === undefined) {
    return 'text-neutral-800';
  }

  if (fxUsedFallback === false) {
    return 'text-green-700';
  }

  if (fxUsedFallback === true) {
    return 'text-orange-600';
  }

  return 'text-neutral-800';
}

function formatMatchingSourceLabel(source: MatchingSource): string {
  switch (source) {
    case 'same-day':
      return 'Same day';
    case 'thirty-day':
      return '30-day';
    case 'section-104-pool':
      return 'Section 104 pool';
  }
}

function formatAvgCostPerShareGbp(poolShares: number, poolCostGbp: number): string {
  if (poolShares <= 0 || !Number.isFinite(poolCostGbp)) {
    return '—';
  }

  return `£${money.format(poolCostGbp / poolShares)}`;
}

function taxYearNetGainLossTextClassName(netGbp: number): string {
  if (netGbp > 0) {
    return 'text-green-800';
  }

  if (netGbp < 0) {
    return 'text-red-800';
  }

  return 'text-neutral-800';
}

function acquisitionMatchingFallbackNote(row: CalculationTransactionAcquisitionAggregateSummaryRow): string {
  const q = row.totalQuantity;
  const costLabel = money.format(row.totalCostGbp);
  const poolSentence = `All ${q} shares (£${costLabel}) from this date were added to the Section 104 pool. No same-day or 30-day identification (HMRC matching rules) applied to these acquisitions.`;
  if (row.acquisitionLineCount > 1) {
    return `Several acquisition entries on this date are listed separately in the ledger for this date; this summary aggregates their sterling totals. ${poolSentence}`;
  }

  return poolSentence;
}

function sortedThirtyDayByDisposal(m: AcquisitionMatchingAttribution) {
  return [...m.thirtyDayByDisposal].sort((a, b) => a.disposalDate.localeCompare(b.disposalDate));
}

function AcquisitionMatchingDetail(params: {
  readonly m: AcquisitionMatchingAttribution;
  readonly eventDate: string;
}): ReactElement {
  const { m, eventDate } = params;
  const thirtyRows = sortedThirtyDayByDisposal(m);

  return (
    <div className="ml-0.5 space-y-4 border-l-2 border-neutral-200 pl-3 text-neutral-800">
      {m.sameDayQuantity > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Same-day identification</p>
          <p className="mt-1.5 text-xs text-neutral-600">
            Matched to disposal(s) on <span className="font-medium text-neutral-800">{eventDate}</span>:{' '}
            <span className="tabular-nums">{m.sameDayQuantity}</span> shares, £{money.format(m.sameDayCostGbp)}{' '}
            allowable cost. These shares do not increase the Section 104 pool (they are identified against that
            disposal).
          </p>
        </div>
      ) : null}
      {m.thirtyDayQuantity > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">30-day identification</p>
          <p className="mt-1.5 text-xs text-neutral-600">
            Matched to earlier disposal(s) under the bed-and-breakfast (30-day) rule. Those shares and their acquisition
            cost are treated as sold by those disposals, so they do not increase the pool.
          </p>
          <table className="mt-2 w-full max-w-lg border-collapse border border-neutral-200 bg-white text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-800">
                <th className="py-1.5 pl-2 pr-3 font-medium">Earlier disposal date</th>
                <th className="py-1.5 pr-3 text-right font-medium">Shares taken</th>
                <th className="py-1.5 pr-2 text-right font-medium">Allowable (£)</th>
              </tr>
            </thead>
            <tbody>
              {thirtyRows.map((r) => (
                <tr key={`${r.disposalDate}-${r.quantity}-${r.allowableCostGbp}`} className="border-b border-neutral-100">
                  <td className="py-1.5 pl-2 pr-3 tabular-nums">{r.disposalDate}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{r.quantity}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">£{money.format(r.allowableCostGbp)}</td>
                </tr>
              ))}
              <tr className="bg-neutral-50/90 font-medium text-neutral-900">
                <td className="py-1.5 pl-2 pr-3">Total (30-day)</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{m.thirtyDayQuantity}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">£{money.format(m.thirtyDayCostGbp)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      <div>
        <p className="text-[11px] font-semibold leading-snug text-neutral-600">Net increase to Section 104 pool</p>
        <p className="mt-1.5 text-xs text-neutral-600">
          Unmatched portion after identification:{' '}
          <span className="tabular-nums font-medium text-neutral-900">{m.netToPoolQuantity}</span> shares, £
          {money.format(m.netToPoolCostGbp)}. This is what the pool totals in this acquisition summary include from this
          date.
        </p>
      </div>
    </div>
  );
}

function LedgerTableRows({
  rows,
}: {
  readonly rows: readonly (
    | CalculationTransactionLedgerAcquisitionRow
    | CalculationTransactionLedgerDisposalRow
  )[];
}): ReactElement {
  return (
    <>
      {rows.map((row) => {
        if (row.rowKind === 'ledger-acquisition') {
          const { sterling } = row;
          return (
            <tr key={`acq-${row.acquisitionId}`}>
              <td className="px-2 py-1.5 text-neutral-800 sm:px-3 sm:py-2">Acquisition</td>
              <td className="px-2 py-1.5 tabular-nums sm:px-3">{row.eventDate}</td>
              <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">{row.quantity}</td>
              <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">{usdMoney.format(row.pricePerShareUsd)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">{usdMoney.format(row.combinedUsd)}</td>
              <td
                className={`px-2 py-1.5 text-right tabular-nums sm:px-3 ${fxRateCellClassName({
                  fxRate: row.fxRate,
                  fxUsedFallback: row.fxUsedFallback,
                })}`}
              >
                {row.fxRate === undefined ? '—' : row.fxRate.toFixed(4)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums font-medium sm:px-3">
                £{money.format(sterling.totalCostGbp)}
              </td>
            </tr>
          );
        }

        const { sterling } = row;
        const netGbp = sterling.grossProceedsGbp - sterling.feesGbp;
        const disposalCell = 'px-2 py-1.5 text-right tabular-nums text-red-800 sm:px-3';
        const disposalCellType = 'px-2 py-1.5 text-red-800 sm:px-3 sm:py-2';
        return (
          <tr key={`disp-${row.disposalId}`}>
            <td className={disposalCellType}>Disposal</td>
            <td className="px-2 py-1.5 tabular-nums text-red-800 sm:px-3">{row.eventDate}</td>
            <td className={disposalCell}>{row.quantity}</td>
            <td className={disposalCell}>{usdMoney.format(row.pricePerShareUsd)}</td>
            <td className={disposalCell}>{usdMoney.format(row.combinedUsd)}</td>
            <td
              className={`px-2 py-1.5 text-right tabular-nums sm:px-3 ${fxRateCellClassName({
                fxRate: row.fxRate,
                fxUsedFallback: row.fxUsedFallback,
              })}`}
            >
              {row.fxRate === undefined ? '—' : row.fxRate.toFixed(4)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums font-medium text-red-800 sm:px-3">
              £{money.format(netGbp)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function AcquisitionOutcomeSection({
  row,
}: {
  readonly row: CalculationTransactionAcquisitionAggregateSummaryRow;
}): ReactElement {
  const poolShares = row.poolSharesAfter;
  const poolCost = row.poolCostGbpAfter;
  const hasPool = poolShares !== undefined && poolCost !== undefined;

  return (
    <div className="rounded-md bg-white/90 px-3 py-2 ring-1 ring-neutral-200/45">
      <h4 className="text-xs font-medium text-neutral-700">CGT acquisition summary</h4>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-neutral-500">Shares (total)</dt>
          <dd className="tabular-nums font-medium text-neutral-900">{row.totalQuantity}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Total cost (£)</dt>
          <dd className="tabular-nums font-medium text-neutral-900">£{money.format(row.totalCostGbp)}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Pool shares</dt>
          <dd className="tabular-nums font-medium text-neutral-900">
            {hasPool ? poolShares : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Pool cost (£)</dt>
          <dd className="tabular-nums font-medium text-neutral-900">
            {hasPool ? `£${money.format(poolCost)}` : '—'}
          </dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <dt className="text-xs text-neutral-500">Avg cost/share (£)</dt>
          <dd className="tabular-nums font-medium text-neutral-900">
            {hasPool && poolShares !== undefined && poolCost !== undefined
              ? formatAvgCostPerShareGbp(poolShares, poolCost)
              : '—'}
          </dd>
        </div>
        <div className="mt-1.5 sm:col-span-2 lg:col-span-4">
          <dt className="text-xs font-semibold text-neutral-800">Matching</dt>
          <dd className="mt-1.5 text-xs text-neutral-600">
            {row.acquisitionMatching === undefined ? (
              acquisitionMatchingFallbackNote(row)
            ) : (
              <AcquisitionMatchingDetail m={row.acquisitionMatching} eventDate={row.eventDate} />
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function CgtDisposalOutcomeSection({
  row,
}: {
  readonly row: CalculationTransactionCgtDisposalSummaryRow;
}): ReactElement {
  const r = row.result;
  const summaryPricePerShare = r.grossProceedsGbp / r.quantity;
  const netProceeds = r.grossProceedsGbp - r.disposalFeesGbp;

  return (
    <div className="rounded-md bg-red-50/35 px-3 py-2 text-red-900 ring-1 ring-red-200/40">
      <h4 className="text-xs font-medium text-red-800">CGT disposal summary</h4>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-red-700/90">Shares (disposed)</dt>
          <dd className="tabular-nums font-medium text-red-900">{r.quantity}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Price/share (£)</dt>
          <dd className="tabular-nums font-medium text-red-900">£{money.format(summaryPricePerShare)}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Gross (£)</dt>
          <dd className="tabular-nums font-medium text-red-900">£{money.format(r.grossProceedsGbp)}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Fees (£)</dt>
          <dd className="tabular-nums font-medium text-red-900">£{money.format(r.disposalFeesGbp)}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Net proceeds (£)</dt>
          <dd className="tabular-nums font-medium text-red-900">£{money.format(netProceeds)}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Allowable cost (£)</dt>
          <dd className="tabular-nums font-medium text-red-900">£{money.format(r.allowableCostGbp)}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Gain/loss (£)</dt>
          <dd className="tabular-nums font-medium text-red-900">£{money.format(r.gainOrLossGbp)}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Pool shares</dt>
          <dd className="tabular-nums font-medium text-red-900">{r.poolSharesAfter}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Pool cost (£)</dt>
          <dd className="tabular-nums font-medium text-red-900">£{money.format(r.poolCostGbpAfter)}</dd>
        </div>
        <div>
          <dt className="text-xs text-red-700/90">Avg cost/share (£)</dt>
          <dd className="tabular-nums font-medium text-red-900">
            {formatAvgCostPerShareGbp(r.poolSharesAfter, r.poolCostGbpAfter)}
          </dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <dt className="text-xs font-semibold text-red-900">Matching</dt>
          <dd className="mt-1">
            <table className="w-full max-w-2xl border-collapse text-xs text-red-900">
              <thead>
                <tr className="border-b border-red-200 text-red-800">
                  <th className="py-1.5 pr-3 text-left font-medium">Source</th>
                  <th className="py-1.5 pr-3 text-left font-medium">Acq. lot date</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Shares</th>
                  <th className="py-1.5 text-right font-medium">Allowable (£)</th>
                </tr>
              </thead>
              <tbody>
                {r.matchingBreakdown.map((t) => (
                  <tr
                    key={`${t.source}-${t.acquisitionDate ?? 'pool'}-${t.quantity}-${t.allowableCostGbp}`}
                  >
                    <td className="py-1.5 pr-3">{formatMatchingSourceLabel(t.source)}</td>
                    <td className="py-1.5 pr-3 tabular-nums text-red-800/90">
                      {t.acquisitionDate ?? '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{t.quantity}</td>
                    <td className="py-1.5 text-right tabular-nums">£{money.format(t.allowableCostGbp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function OutcomeSections({
  outcomes,
}: {
  readonly outcomes: readonly CalculationTransactionOutcomeRow[];
}): ReactElement {
  const elements: ReactElement[] = [];
  for (const outcome of outcomes) {
    if (outcome.rowKind === 'acquisition-aggregate-summary') {
      elements.push(
        <AcquisitionOutcomeSection
          key={`acq-out-${outcome.eventDate}-${outcome.totalQuantity}-${outcome.totalCostGbp}`}
          row={outcome}
        />,
      );
      continue;
    }

    if (outcome.rowKind === 'cgt-disposal-summary') {
      elements.push(
        <CgtDisposalOutcomeSection
          key={`cgt-out-${outcome.result.eventDate}-${outcome.result.quantity}-${outcome.result.allowableCostGbp}`}
          row={outcome}
        />,
      );
    }
  }

  return <div className="space-y-3">{elements}</div>;
}

function DateBlockCard({ block }: { readonly block: CalculationTransactionDateBlock }): ReactElement {
  return (
    <div className="break-inside-avoid rounded-lg bg-white shadow-sm ring-1 ring-neutral-200/55">
      <div className="border-b border-neutral-200/60 bg-white/90 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Date</span>{' '}
        <span className="text-sm font-medium text-neutral-900">{block.eventDate}</span>
      </div>
      <div className="space-y-4 px-3 py-3">
        <div>
          <div className="w-full overflow-x-auto">
            <table className="w-full max-w-full text-sm">
              <thead className="bg-neutral-100/80 text-neutral-700">
                <tr>
                  <th className="px-2 py-2 text-left font-medium sm:px-3">Type</th>
                  <th className="px-2 py-2 text-left font-medium sm:px-3">Date</th>
                  <th className="px-2 py-2 text-right font-medium sm:px-3">Shares</th>
                  <th className="px-2 py-2 text-right font-medium sm:px-3">Price/share ($)</th>
                  <th className="px-2 py-2 text-right font-medium sm:px-3">Cost / net ($)</th>
                  <th className="px-2 py-2 text-right font-medium sm:px-3">FX rate</th>
                  <th className="px-2 py-2 text-right font-medium sm:px-3">Cost / net (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                <LedgerTableRows rows={block.ledgerRows} />
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md bg-neutral-50/70 py-2 pl-1 pr-0">
          <h3 className="px-2 text-sm font-semibold text-neutral-900">Outcomes</h3>
          <div className="mt-2 space-y-3 px-2">
            <OutcomeSections outcomes={block.outcomes} />
          </div>
        </div>
      </div>
    </div>
  );
}

type TaxYearPanelProps = {
  readonly group: CalculationTransactionTableGroup;
  readonly holdingSymbol: string;
};

/**
 * One tax year’s calculation content (summary, opening pool, date blocks). Used inside tab panels.
 */
export function TaxYearPanel({ group, holdingSymbol }: TaxYearPanelProps): ReactElement {
  return (
    <div className="rounded-xl bg-neutral-100/90 p-4 ring-1 ring-neutral-200/60 sm:p-5">
      <div className="border-b border-neutral-200/70 pb-3">
        <p className="mt-0 min-w-0 text-base text-neutral-800">
          <span className="text-neutral-600">
            Net realised gain/loss for {holdingSymbol} holding in GBP:{' '}
          </span>
          <span
            className={`text-lg font-bold tabular-nums tracking-tight ${taxYearNetGainLossTextClassName(
              group.totalNetRealisedGainOrLossGbp,
            )}`}
          >
            £{money.format(group.totalNetRealisedGainOrLossGbp)}
          </span>
        </p>
        <p className="mb-0 mt-3 text-xs text-neutral-600">
          Section 104 pool at the start of this tax year (6 April), after all earlier recorded events for this holding:
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-900">
          <li>
            <span className="text-neutral-600">Pool shares</span>
            <span className="tabular-nums font-medium text-neutral-900"> {group.openingPoolShares}</span>
          </li>
          <li>
            <span className="text-neutral-600">Pool cost (£)</span>
            <span className="tabular-nums font-medium text-neutral-900"> £{money.format(group.openingPoolCostGbp)}</span>
          </li>
          <li>
            <span className="text-neutral-600">Average cost/share (£)</span>
            <span className="tabular-nums font-medium text-neutral-900">
              {` ${formatAvgCostPerShareGbp(group.openingPoolShares, group.openingPoolCostGbp)}`}
            </span>
          </li>
        </ul>
      </div>
      <div className="mt-4 max-w-full space-y-4">
        {group.dateBlocks.map((block) => (
          <DateBlockCard key={block.eventDate} block={block} />
        ))}
      </div>
    </div>
  );
}
