import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { listPortfolioSymbols } from '@/application/calculation/list-portfolio-symbols';
import { runCalculationForSymbol } from '@/application/calculation/run-calculation-for-symbol';
import { rateTierSchema } from '@/domain/schemas/calculation';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { env } from '@/shared/config/env';
import { DomainError } from '@/shared/errors/app-error';

import { CalculationQueryForm } from '@/app/portfolios/[portfolioId]/calculation/calculation-query-form';
import { ScrollToCalculationResults } from '@/app/portfolios/[portfolioId]/calculation/scroll-to-calculation-results';

const money = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const portfolioRepository = new MongoPortfolioRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();
const fxRateRepository = new MongoFxRateRepository();

type CalculationPageProps = {
  readonly params: Promise<{ portfolioId: string }>;
  readonly searchParams: Promise<{
    readonly symbol?: string;
    readonly rateTier?: string;
    readonly bf?: string;
  }>;
};

export default async function PortfolioCalculationPage({
  params,
  searchParams,
}: CalculationPageProps): Promise<React.ReactElement> {
  const { portfolioId } = await params;
  const sp = await searchParams;

  const portfolio = await portfolioRepository.findByIdForUser(portfolioId, env.STUB_USER_ID);
  if (portfolio === null) {
    notFound();
  }

  const symbols = await listPortfolioSymbols({
    acquisitionRepository,
    disposalRepository,
    portfolioId,
    userId: env.STUB_USER_ID,
  });

  const symbolFromQuery = typeof sp.symbol === 'string' && sp.symbol.trim().length > 0 ? sp.symbol.trim() : '';
  const symbol = symbolFromQuery.length > 0 ? symbolFromQuery : (symbols[0] ?? '');

  const tierParsed = rateTierSchema.safeParse(sp.rateTier ?? 'additional');
  const rateTier = tierParsed.success ? tierParsed.data : 'additional';

  const bfRaw = sp.bf ?? '0';
  const broughtForwardLosses = Number.isFinite(Number.parseFloat(bfRaw))
    ? Math.max(0, Number.parseFloat(bfRaw))
    : 0;

  let calcError: string | null = null;
  let result: Awaited<ReturnType<typeof runCalculationForSymbol>> | null = null;

  if (symbol.length > 0) {
    try {
      result = await runCalculationForSymbol({
        portfolioRepository,
        acquisitionRepository,
        disposalRepository,
        fxRateRepository,
        input: {
          portfolioId,
          userId: env.STUB_USER_ID,
          symbol,
          rateTier,
          broughtForwardLosses,
        },
      });
    } catch (err) {
      calcError = err instanceof DomainError ? err.message : 'Calculation failed';
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="text-sm text-neutral-600">
        <Link href="/portfolios" className="text-[var(--color-accent)] hover:underline">
          Portfolios
        </Link>
        <span className="mx-2 text-neutral-400">/</span>
        <Link
          href={`/portfolios/${portfolioId}`}
          className="text-[var(--color-accent)] hover:underline"
        >
          {portfolio.name}
        </Link>
        <span className="mx-2 text-neutral-400">/</span>
        <span className="text-neutral-900">Calculation</span>
      </nav>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Capital gains calculation</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Section 104 pool only (same-day and 30-day matching in Milestone 6). USD vest imports use Bank of
        England XUDLUSS rates loaded by <code className="text-xs">npm run fetch:fx-rates</code>.
      </p>
      <p className="mt-2 text-xs text-amber-800">
        This application does not provide professional tax advice and could be wrong.
      </p>

      {symbols.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-600">Add acquisitions or disposals to run a calculation.</p>
      ) : (
        <>
          <div className="mt-8">
            <CalculationQueryForm
              portfolioId={portfolioId}
              symbols={symbols}
              currentSymbol={symbol}
              currentRateTier={rateTier}
              currentBf={broughtForwardLosses}
            />
          </div>

          <Suspense fallback={null}>
            <ScrollToCalculationResults />
          </Suspense>

          {calcError ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {calcError}
            </div>
          ) : null}

          {result !== null && calcError === null ? (
            <div id="calculation-results" className="mt-10 scroll-mt-6 space-y-10">
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
                        <th className="px-3 py-2 font-medium">Matching</th>
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
                          <td className="px-3 py-2">{row.matchingSource}</td>
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
          ) : null}
        </>
      )}
    </main>
  );
}
