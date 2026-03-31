import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { resolveBroughtForwardFromQuery } from '@/application/calculation/resolve-brought-forward';
import { runCalculationForHoldingSymbol } from '@/application/calculation/run-calculation-for-symbol';
import { rateTierSchema } from '@/domain/schemas/calculation';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { DomainError } from '@/shared/errors/app-error';

import {
  CalculationResultSections,
  rateTierToLabel,
} from '@/app/holdings/[holdingId]/calculation/calculation-result-sections';
import { CalculationControls } from '@/app/holdings/[holdingId]/calculation/calculation-controls';
import { FxAppliedDialog } from '@/app/holdings/[holdingId]/calculation/fx-applied-dialog';
import { ScrollToCalculationResults } from '@/app/holdings/[holdingId]/calculation/scroll-to-calculation-results';

const holdingRepository = new MongoHoldingRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();
const fxRateRepository = new MongoFxRateRepository();

type CalculationPageProps = {
  readonly params: Promise<{ holdingId: string }>;
  readonly searchParams: Promise<{
    readonly symbol?: string;
    readonly rateTier?: string;
    readonly bf?: string;
  }>;
};

export default async function HoldingCalculationPage({
  params,
  searchParams,
}: CalculationPageProps): Promise<React.ReactElement> {
  const { holdingId } = await params;
  const sp = await searchParams;

  const userId = await requireVerifiedUserId();

  const holding = await holdingRepository.findByIdForUser(holdingId, userId);
  if (holding === null) {
    notFound();
  }

  const [acquisitions, disposals] = await Promise.all([
    acquisitionRepository.listByHoldingForUser(holdingId, userId),
    disposalRepository.listByHoldingForUser(holdingId, userId),
  ]);
  const hasLedgerData = acquisitions.length > 0 || disposals.length > 0;

  const hasBfQuery = typeof sp.bf === 'string' && sp.bf.trim() !== '';
  const bfParsed = Number.parseFloat(sp.bf ?? '0');
  const broughtForwardLosses = resolveBroughtForwardFromQuery({
    hasBfQuery,
    queryBfParsed: bfParsed,
  });

  const symbolFromQuery = typeof sp.symbol === 'string' && sp.symbol.trim().length > 0 ? sp.symbol.trim() : '';
  const symbol =
    symbolFromQuery.length > 0 ? symbolFromQuery.toUpperCase() : holding.symbol;

  const tierParsed = rateTierSchema.safeParse(sp.rateTier ?? 'additional');
  const rateTier = tierParsed.success ? tierParsed.data : 'additional';

  let calcError: string | null = null;
  let result: Awaited<ReturnType<typeof runCalculationForHoldingSymbol>> | null = null;

  if (hasLedgerData && symbol === holding.symbol) {
    try {
      result = await runCalculationForHoldingSymbol({
        holdingRepository,
        acquisitionRepository,
        disposalRepository,
        fxRateRepository,
        input: {
          holdingId,
          userId,
          rateTier,
          broughtForwardLosses,
        },
      });
    } catch (err) {
      calcError = err instanceof DomainError ? err.message : 'Calculation failed';
    }
  } else if (hasLedgerData && symbol !== holding.symbol) {
    calcError = 'Symbol does not match this holding.';
  }

  const exportQuery = new URLSearchParams();
  exportQuery.set('symbol', holding.symbol);
  exportQuery.set('rateTier', rateTier);
  exportQuery.set('bf', String(broughtForwardLosses));

  const exportSuffix = exportQuery.toString();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="text-sm text-neutral-600 no-print">
        <Link href="/holdings" className="text-[var(--color-accent)] hover:underline">
          Holdings
        </Link>
        <span className="mx-2 text-neutral-400">/</span>
        <Link
          href={`/holdings/${holdingId}`}
          className="text-[var(--color-accent)] hover:underline"
        >
          {holding.symbol}
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

      {hasLedgerData ? (
        <>
          <div className="mt-8 no-print">
            <CalculationControls
              key={`${symbol}|${rateTier}|${broughtForwardLosses}`}
              holdingId={holdingId}
              holdingSymbol={holding.symbol}
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
                  href={`/holdings/${holdingId}/computation-pack?${exportSuffix}`}
                >
                  Open computation pack (print)
                </Link>
                <a
                  className="text-[var(--color-accent)] underline"
                  href={`/holdings/${holdingId}/disposals-export?${exportSuffix}`}
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
      ) : (
        <p className="mt-8 text-sm text-neutral-600">Add acquisitions or disposals to run a calculation.</p>
      )}
    </main>
  );
}
