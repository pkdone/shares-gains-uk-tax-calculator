import type { ReactElement } from 'react';

import type { SuccessfulHoldingCalculation } from '@/application/calculation/calculation-types';
import { buildCalculationTransactionTableModel } from '@/application/calculation/build-calculation-transaction-table';
import type { MatchingSource } from '@/domain/schemas/calculation';

const money = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

type CalculationResultSectionsProps = {
  readonly result: SuccessfulHoldingCalculation;
};

export function CalculationResultSections({
  result,
}: CalculationResultSectionsProps): ReactElement {
  const groups = buildCalculationTransactionTableModel(result);

  return (
    <div id="calculation-results" className="mt-10 scroll-mt-6 space-y-10">
      <section>
        <h2 className="text-lg font-medium text-neutral-900">Warnings</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-neutral-700">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-neutral-900">Transaction and pool history</h2>
        <p className="mt-2 max-w-3xl text-xs text-neutral-600">
          Ledger lines show each recorded entry in sterling. Where the CGT engine combines entries on the same date, a
          CGT summary row shows identification, allowable cost, gain or loss, and pool position after that date’s
          processing.
        </p>

        {groups.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">No events.</p>
        ) : (
          <div className="mt-4 space-y-8">
            {groups.map((group) => (
              <div key={group.taxYearLabel}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Tax year {group.taxYearLabel}
                </h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-neutral-700">
                      <tr>
                        <th className="px-3 py-2 font-medium">Row</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Qty</th>
                        <th className="px-3 py-2 font-medium">Gross (£)</th>
                        <th className="px-3 py-2 font-medium">Fees (£)</th>
                        <th className="px-3 py-2 font-medium">Total / net (£)</th>
                        <th className="px-3 py-2 font-medium">Allowable cost (£)</th>
                        <th className="px-3 py-2 font-medium">Gain/loss (£)</th>
                        <th className="px-3 py-2 font-medium">Rounded (£)</th>
                        <th className="px-3 py-2 font-medium">Pool shares</th>
                        <th className="px-3 py-2 font-medium">Pool cost (£)</th>
                        <th className="px-3 py-2 font-medium">Matching</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {group.rows.map((row) => {
                        if (row.rowKind === 'ledger-acquisition') {
                          const { sterling } = row;
                          return (
                            <tr key={`acq-${row.acquisitionId}`}>
                              <td className="px-3 py-2 text-neutral-800">Acquisition</td>
                              <td className="px-3 py-2 tabular-nums">{row.eventDate}</td>
                              <td className="px-3 py-2 tabular-nums">{row.quantity}</td>
                              <td className="px-3 py-2 tabular-nums">£{money.format(sterling.grossConsiderationGbp)}</td>
                              <td className="px-3 py-2 tabular-nums">£{money.format(sterling.feesGbp)}</td>
                              <td className="px-3 py-2 tabular-nums font-medium">
                                £{money.format(sterling.totalCostGbp)}
                              </td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                            </tr>
                          );
                        }

                        if (row.rowKind === 'ledger-disposal') {
                          const { sterling } = row;
                          const net = sterling.grossProceedsGbp - sterling.feesGbp;
                          return (
                            <tr key={`disp-${row.disposalId}`}>
                              <td className="px-3 py-2 text-neutral-800">Disposal</td>
                              <td className="px-3 py-2 tabular-nums">{row.eventDate}</td>
                              <td className="px-3 py-2 tabular-nums">{row.quantity}</td>
                              <td className="px-3 py-2 tabular-nums">£{money.format(sterling.grossProceedsGbp)}</td>
                              <td className="px-3 py-2 tabular-nums">£{money.format(sterling.feesGbp)}</td>
                              <td className="px-3 py-2 tabular-nums font-medium">£{money.format(net)}</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                            </tr>
                          );
                        }

                        if (row.rowKind === 'acquisition-aggregate-summary') {
                          return (
                            <tr
                              key={`acq-sum-${row.eventDate}`}
                              className="bg-neutral-50/80"
                            >
                              <td className="px-3 py-2 font-medium text-neutral-900">
                                CGT — combined acquisitions
                              </td>
                              <td className="px-3 py-2 tabular-nums">{row.eventDate}</td>
                              <td className="px-3 py-2 tabular-nums">{row.totalQuantity}</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 tabular-nums font-medium">
                                £{money.format(row.totalCostGbp)}
                              </td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 text-neutral-400">—</td>
                              <td className="px-3 py-2 tabular-nums">{row.poolSharesAfter}</td>
                              <td className="px-3 py-2 tabular-nums">£{money.format(row.poolCostGbpAfter)}</td>
                              <td className="px-3 py-2 text-xs text-neutral-600">
                                Pool after adding unmatched portion to Section 104 (same-day combined)
                              </td>
                            </tr>
                          );
                        }

                        const r = row.result;
                        return (
                          <tr
                            key={`cgt-${r.eventDate}`}
                            className="bg-neutral-50/80"
                          >
                            <td className="px-3 py-2 font-medium text-neutral-900">CGT summary</td>
                            <td className="px-3 py-2 tabular-nums">{r.eventDate}</td>
                            <td className="px-3 py-2 tabular-nums">{r.quantity}</td>
                            <td className="px-3 py-2 tabular-nums">£{money.format(r.grossProceedsGbp)}</td>
                            <td className="px-3 py-2 tabular-nums">£{money.format(r.disposalFeesGbp)}</td>
                            <td className="px-3 py-2 tabular-nums font-medium">
                              £{money.format(r.grossProceedsGbp - r.disposalFeesGbp)}
                            </td>
                            <td className="px-3 py-2 tabular-nums">£{money.format(r.allowableCostGbp)}</td>
                            <td className="px-3 py-2 tabular-nums">£{money.format(r.gainOrLossGbp)}</td>
                            <td className="px-3 py-2 tabular-nums">{r.roundedGainOrLossGbp}</td>
                            <td className="px-3 py-2 tabular-nums">{r.poolSharesAfter}</td>
                            <td className="px-3 py-2 tabular-nums">£{money.format(r.poolCostGbpAfter)}</td>
                            <td className="px-3 py-2 align-top text-neutral-800">
                              <table className="w-full min-w-[12rem] border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-neutral-200 text-neutral-600">
                                    <th className="py-1 pr-2 text-left font-medium">Source</th>
                                    <th className="py-1 pr-2 text-right font-medium">Qty</th>
                                    <th className="py-1 text-right font-medium">Allowable (£)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.matchingBreakdown.map((t) => (
                                    <tr key={`${t.source}-${t.quantity}-${t.allowableCostGbp}`}>
                                      <td className="py-1 pr-2">{formatMatchingSourceLabel(t.source)}</td>
                                      <td className="py-1 pr-2 text-right tabular-nums">{t.quantity}</td>
                                      <td className="py-1 text-right tabular-nums">
                                        £{money.format(t.allowableCostGbp)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-neutral-900">Tax year summaries (this holding only)</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Net figures are capital gains and losses (chargeable gains mechanics) for this holding only. Your final CGT
          liability may differ if you have other disposals, allowable losses brought forward, reliefs, or a different
          CGT rate position for the tax year.
        </p>
        <div className="mt-3 space-y-6">
          {result.output.taxYearSummaries.map((y) => (
            <div
              key={y.taxYear}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm"
            >
              <h3 className="font-semibold text-neutral-900">{y.taxYear}</h3>
              <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Total gains</dt>
                  <dd className="tabular-nums">£{money.format(y.totalGainsGbp)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Total losses</dt>
                  <dd className="tabular-nums">£{money.format(y.totalLossesGbp)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-neutral-500">Net (gains − losses)</dt>
                  <dd className="tabular-nums">£{money.format(y.netGainsGbp)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        {result.output.taxYearSummaries.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No tax year summaries (no disposals).</p>
        ) : null}
      </section>
    </div>
  );
}
