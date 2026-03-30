import type { SuccessfulPortfolioCalculation } from '@/application/calculation/calculation-types';
import type { MatchingSource, RateTier } from '@/domain/schemas/calculation';

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

export function rateTierToLabel(tier: RateTier): string {
  switch (tier) {
    case 'basic':
      return 'Basic-rate';
    case 'higher':
      return 'Higher-rate';
    case 'additional':
      return 'Additional-rate';
  }
}

type CalculationResultSectionsProps = {
  readonly result: SuccessfulPortfolioCalculation;
  readonly rateTierLabel: string;
};

export function CalculationResultSections({
  result,
  rateTierLabel,
}: CalculationResultSectionsProps): React.ReactElement {
  return (
    <div id="calculation-results" className="mt-10 scroll-mt-6 space-y-10">
      <p className="text-sm text-neutral-700">
        <span className="font-medium">CGT band assumption:</span> {rateTierLabel} taxpayer (you selected this
        tier; the app does not compute your income tax band).
      </p>

      <section>
        <h2 className="text-lg font-medium text-neutral-900">FX applied (import USD acquisitions)</h2>
        {Object.keys(result.fxByAcquisitionId).length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">None — only manual GBP acquisitions for this symbol.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Event date</th>
                  <th className="px-3 py-2 font-medium">XUDLUSS (USD per £1)</th>
                  <th className="px-3 py-2 font-medium">Rate date used</th>
                  <th className="px-3 py-2 font-medium">Fallback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {Object.values(result.fxByAcquisitionId).map((row) => (
                  <tr key={row.acquisitionId}>
                    <td className="px-3 py-2 tabular-nums">{row.eventDate}</td>
                    <td className="px-3 py-2 tabular-nums">{row.usdPerGbp.toFixed(4)}</td>
                    <td className="px-3 py-2 tabular-nums">{row.rateDateUsed}</td>
                    <td className="px-3 py-2">{row.usedFallback ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
        <h2 className="text-lg font-medium text-neutral-900">Tax year summaries</h2>
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
                  new rates in this tool. HMRC published adjustment guidance for 2024–25 Self Assessment where
                  the return did not apply the split automatically.
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
                <div>
                  <dt className="text-neutral-500">Net after losses</dt>
                  <dd className="tabular-nums">£{money.format(y.netGainsAfterLossesGbp)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">AEA</dt>
                  <dd className="tabular-nums">£{money.format(y.aeaGbp)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Taxable gain</dt>
                  <dd className="tabular-nums">£{money.format(y.taxableGainGbp)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">CGT due</dt>
                  <dd className="tabular-nums">£{money.format(y.cgtDueGbp)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Losses carried forward</dt>
                  <dd className="tabular-nums">£{money.format(y.lossesCarriedForwardGbp)}</dd>
                </div>
              </dl>
              {y.rateBreakdown.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-neutral-500">Rate breakdown</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {y.rateBreakdown.map((r) => (
                      <li key={`${y.taxYear}-${r.ratePct}-${r.gainsGbp}-${r.taxGbp}`}>
                        {r.ratePct}% on £{money.format(r.gainsGbp)} → tax £{money.format(r.taxGbp)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
