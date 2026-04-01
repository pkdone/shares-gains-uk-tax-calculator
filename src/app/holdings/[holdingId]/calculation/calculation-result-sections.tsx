import type { SuccessfulHoldingCalculation } from '@/application/calculation/calculation-types';
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
}: CalculationResultSectionsProps): React.ReactElement {
  return (
    <div id="calculation-results" className="mt-10 scroll-mt-6 space-y-10">
      <section>
        <h2 className="text-lg font-medium text-neutral-900">Warnings</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-neutral-900">Pool roll-forward</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-2 font-medium">Step</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Shares</th>
                <th className="px-3 py-2 font-medium">Pool cost (£)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {result.output.poolSnapshots.map((row) => (
                <tr key={`${row.description}|${row.eventDate}|${row.shares}|${row.costGbp}`}>
                  <td className="px-3 py-2 text-neutral-800">{row.description}</td>
                  <td className="px-3 py-2 tabular-nums">{row.eventDate}</td>
                  <td className="px-3 py-2 tabular-nums">{row.shares}</td>
                  <td className="px-3 py-2 tabular-nums">£{money.format(row.costGbp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-neutral-900">Disposals</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Tax year</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Proceeds (£)</th>
                <th className="px-3 py-2 font-medium">Fees (£)</th>
                <th className="px-3 py-2 font-medium">Matching breakdown</th>
                <th className="px-3 py-2 font-medium">Allowable cost (£)</th>
                <th className="px-3 py-2 font-medium">Gain/loss (£)</th>
                <th className="px-3 py-2 font-medium">Rounded (£)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {result.output.disposalResults.map((row) => (
                <tr key={`${row.eventDate}-${row.quantity}-${row.grossProceedsGbp}`}>
                  <td className="px-3 py-2 tabular-nums">{row.eventDate}</td>
                  <td className="px-3 py-2">{row.taxYear}</td>
                  <td className="px-3 py-2 tabular-nums">{row.quantity}</td>
                  <td className="px-3 py-2 tabular-nums">£{money.format(row.grossProceedsGbp)}</td>
                  <td className="px-3 py-2 tabular-nums">£{money.format(row.disposalFeesGbp)}</td>
                  <td className="px-3 py-2 text-neutral-800">
                    <ul className="list-inside list-disc space-y-1 text-xs">
                      {row.matchingBreakdown.map((t) => (
                        <li key={`${t.source}-${t.quantity}-${t.allowableCostGbp}`}>
                          {formatMatchingSourceLabel(t.source)}: {t.quantity} sh @ £
                          {money.format(t.allowableCostGbp)} allowable
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2 tabular-nums">£{money.format(row.allowableCostGbp)}</td>
                  <td className="px-3 py-2 tabular-nums">£{money.format(row.gainOrLossGbp)}</td>
                  <td className="px-3 py-2 tabular-nums">{row.roundedGainOrLossGbp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.output.disposalResults.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No disposals for this symbol.</p>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-medium text-neutral-900">Tax year summaries (this holding only)</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Net figures sum gains and losses from disposals in this app for this symbol. They are not your full Self
          Assessment position for the year.
        </p>
        <div className="mt-3 space-y-6">
          {result.output.taxYearSummaries.map((y) => (
            <div
              key={y.taxYear}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm"
            >
              <h3 className="font-semibold text-neutral-900">{y.taxYear}</h3>
              {y.taxYear === '2024-25' ? (
                <p className="mt-2 text-xs text-amber-900">
                  Main CGT rates for shares changed on 30 October 2024. Disposals on or after that date use the
                  new rates in HMRC guidance. This table does not compute tax due.
                </p>
              ) : null}
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
