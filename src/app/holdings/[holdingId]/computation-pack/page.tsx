import Link from 'next/link';
import { notFound } from 'next/navigation';

import { runCalculationForHoldingSymbol } from '@/application/calculation/run-calculation-for-symbol';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { DomainError } from '@/shared/errors/app-error';

import { CalculationResultSections } from '@/app/holdings/[holdingId]/calculation/calculation-result-sections';

const holdingRepository = new MongoHoldingRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();
const fxRateRepository = new MongoFxRateRepository();

type ComputationPackPageProps = {
  readonly params: Promise<{ holdingId: string }>;
};

export default async function ComputationPackPage({
  params,
}: ComputationPackPageProps): Promise<React.ReactElement> {
  const { holdingId } = await params;

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

  let calcError: string | null = null;
  let result: Awaited<ReturnType<typeof runCalculationForHoldingSymbol>> | null = null;

  if (hasLedgerData) {
    try {
      result = await runCalculationForHoldingSymbol({
        holdingRepository,
        acquisitionRepository,
        disposalRepository,
        fxRateRepository,
        input: {
          holdingId,
          userId,
        },
      });
    } catch (err) {
      calcError = err instanceof DomainError ? err.message : 'Calculation failed';
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 print:max-w-none print:px-4 print:py-4">
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
        <Link
          href={`/holdings/${holdingId}/calculation`}
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
        <p className="mt-2 text-xs text-neutral-600">
          Holding-level gains and losses only — not overall CGT liability. Not professional tax advice.
        </p>
      </header>

      <div className="mt-6 hidden print:block">
        <h1 className="text-xl font-semibold">Computation pack — {holding.symbol}</h1>
        <p className="mt-1 text-sm text-neutral-800">
          Holding-level gains and losses only — not overall CGT liability for any year.
        </p>
      </div>

      {hasLedgerData ? null : (
        <p className="mt-8 text-sm text-neutral-600 no-print">Nothing to print — add ledger data first.</p>
      )}

      {calcError ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {calcError}
        </div>
      ) : null}

      {result !== null && calcError === null ? (
        <CalculationResultSections result={result} />
      ) : null}
    </main>
  );
}
