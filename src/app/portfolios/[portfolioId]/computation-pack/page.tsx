import Link from 'next/link';
import { notFound } from 'next/navigation';

import { listPortfolioSymbols } from '@/application/calculation/list-portfolio-symbols';
import { resolveBroughtForwardFromQueryAndPrefs } from '@/application/calculation/resolve-brought-forward';
import { runCalculationForSymbol } from '@/application/calculation/run-calculation-for-symbol';
import { rateTierSchema } from '@/domain/schemas/calculation';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoPortfolioCalculationPrefsRepository } from '@/infrastructure/repositories/mongo-portfolio-calculation-prefs-repository';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { env } from '@/shared/config/env';
import { DomainError } from '@/shared/errors/app-error';

import {
  CalculationResultSections,
  rateTierToLabel,
} from '@/app/portfolios/[portfolioId]/calculation/calculation-result-sections';

const portfolioRepository = new MongoPortfolioRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();
const fxRateRepository = new MongoFxRateRepository();
const prefsRepository = new MongoPortfolioCalculationPrefsRepository();

type ComputationPackPageProps = {
  readonly params: Promise<{ portfolioId: string }>;
  readonly searchParams: Promise<{
    readonly symbol?: string;
    readonly rateTier?: string;
    readonly bf?: string;
  }>;
};

export default async function ComputationPackPage({
  params,
  searchParams,
}: ComputationPackPageProps): Promise<React.ReactElement> {
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

  const prefs = await prefsRepository.findByPortfolioForUser(portfolioId, env.STUB_USER_ID);
  const hasBfQuery = typeof sp.bf === 'string' && sp.bf.trim() !== '';
  const bfParsed = Number.parseFloat(sp.bf ?? '0');
  const broughtForwardLosses = resolveBroughtForwardFromQueryAndPrefs({
    hasBfQuery,
    queryBfParsed: bfParsed,
    storedBroughtForwardLossesGbp: prefs?.broughtForwardLossesGbp,
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
    <main className="mx-auto max-w-5xl px-6 py-12 print:max-w-none print:px-4 print:py-4">
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
        <Link
          href={`/portfolios/${portfolioId}/calculation`}
          className="text-[var(--color-accent)] hover:underline"
        >
          Calculation
        </Link>
        <span className="mx-2 text-neutral-400">/</span>
        <span className="text-neutral-900">Computation pack</span>
      </nav>

      <header className="mt-4 no-print">
        <h1 className="text-2xl font-semibold tracking-tight">Computation pack</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Use your browser’s Print dialog to save as PDF. This page omits navigation when printing.
        </p>
        <p className="mt-2 text-xs text-amber-800">
          Not professional tax advice. Verify figures against your records and HMRC guidance.
        </p>
      </header>

      <div className="mt-6 hidden print:block">
        <h1 className="text-xl font-semibold">Computation pack — {portfolio.name}</h1>
        <p className="mt-1 text-sm text-neutral-800">
          Symbol {symbol} · Brought-forward losses £{broughtForwardLosses.toFixed(2)}
        </p>
      </div>

      {symbol.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-600">Nothing to print — add ledger data first.</p>
      ) : null}

      {calcError ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {calcError}
        </div>
      ) : null}

      {result !== null && calcError === null ? (
        <CalculationResultSections result={result} rateTierLabel={rateTierToLabel(rateTier)} />
      ) : null}
    </main>
  );
}
