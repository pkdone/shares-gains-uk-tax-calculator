import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { listPortfolioSymbols } from '@/application/calculation/list-portfolio-symbols';
import { resolveBroughtForwardFromQuery } from '@/application/calculation/resolve-brought-forward';
import { runCalculationForSymbol } from '@/application/calculation/run-calculation-for-symbol';
import { rateTierSchema } from '@/domain/schemas/calculation';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { DomainError } from '@/shared/errors/app-error';

import {
  CalculationResultSections,
  rateTierToLabel,
} from '@/app/portfolios/[portfolioId]/calculation/calculation-result-sections';
import { CalculationControls } from '@/app/portfolios/[portfolioId]/calculation/calculation-controls';
import { FxAppliedDialog } from '@/app/portfolios/[portfolioId]/calculation/fx-applied-dialog';
import { ScrollToCalculationResults } from '@/app/portfolios/[portfolioId]/calculation/scroll-to-calculation-results';

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

  const userId = await requireVerifiedUserId();

  const portfolio = await portfolioRepository.findByIdForUser(portfolioId, userId);
  if (portfolio === null) {
    notFound();
  }

  const symbols = await listPortfolioSymbols({
    acquisitionRepository,
    disposalRepository,
    portfolioId,
    userId,
  });

  const hasBfQuery = typeof sp.bf === 'string' && sp.bf.trim() !== '';
  const bfParsed = Number.parseFloat(sp.bf ?? '0');
  const broughtForwardLosses = resolveBroughtForwardFromQuery({
    hasBfQuery,
    queryBfParsed: bfParsed,
  });

  const symbolFromQuery = typeof sp.symbol === 'string' && sp.symbol.trim().length > 0 ? sp.symbol.trim() : '';
  const symbol = symbolFromQuery.length > 0 ? symbolFromQuery : (symbols[0] ?? '');

  const tierParsed = rateTierSchema.safeParse(sp.rateTier ?? 'additional');
  const rateTier = tierParsed.success ? tierParsed.data : 'additional';

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
          userId,
          symbol,
          rateTier,
          broughtForwardLosses,
        },
      });
    } catch (err) {
      calcError = err instanceof DomainError ? err.message : 'Calculation failed';
    }
  }

  const exportQuery = new URLSearchParams();
  if (symbol.length > 0) {
    exportQuery.set('symbol', symbol);
  }

  exportQuery.set('rateTier', rateTier);
  exportQuery.set('bf', String(broughtForwardLosses));

  const exportSuffix = exportQuery.toString();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="text-sm text-neutral-600 no-print">
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
      <p className="mt-2 text-xs text-amber-800">
        This application does not provide professional tax advice and could be wrong.
      </p>

      <section className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm no-print">
        <h2 className="font-semibold text-neutral-900">RSU timing (plain English)</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-neutral-800">
          <li>
            <strong>Same-day vest and sell:</strong> the disposal is matched first against shares acquired on the
            same day (HMRC same-day rule), before the Section 104 pool.
          </li>
          <li>
            <strong>Sell, then vest within 30 days:</strong> the disposal can match shares acquired in the 30
            days <em>after</em> the disposal (bed and breakfast / 30-day rule), which can differ from selling
            pool shares.
          </li>
          <li>
            <strong>Vest, then sell within 30 days:</strong> the 30-day rule matches <em>acquisitions after</em>{' '}
            a disposal. A vest before your sale does not automatically fall into that 30-day bucket for that
            sale.
          </li>
        </ul>
      </section>

      {symbols.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-600">Add acquisitions or disposals to run a calculation.</p>
      ) : (
        <>
          <div className="mt-8 no-print">
            <CalculationControls
              key={`${symbol}|${rateTier}|${broughtForwardLosses}`}
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
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 no-print">
              {calcError}
            </div>
          ) : null}

          {result !== null && calcError === null ? (
            <>
              <div className="mt-6 flex flex-wrap gap-4 text-sm no-print">
                <Link
                  className="text-[var(--color-accent)] underline"
                  href={`/portfolios/${portfolioId}/computation-pack?${exportSuffix}`}
                >
                  Open computation pack (print)
                </Link>
                <a
                  className="text-[var(--color-accent)] underline"
                  href={`/portfolios/${portfolioId}/disposals-export?${exportSuffix}`}
                  download
                >
                  Download disposals CSV
                </a>
                <FxAppliedDialog rows={Object.values(result.fxByAcquisitionId)} />
              </div>
              <CalculationResultSections result={result} rateTierLabel={rateTierToLabel(rateTier)} />
            </>
          ) : null}
        </>
      )}
    </main>
  );
}
