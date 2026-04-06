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
import { FxRateLedgerColumnDisclosure } from '@/app/holdings/[holdingId]/calculation/fx-rate-ledger-column-disclosure';
import { MatchingAcquisitionsDisclosure } from '@/app/holdings/[holdingId]/calculation/matching-acquisitions-disclosure';

const holdingRepository = new MongoHoldingRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();
const fxRateRepository = new MongoFxRateRepository();

type CalculationPageProps = {
  readonly params: Promise<{ holdingId: string }>;
};

export default async function HoldingCalculationPage({
  params,
}: CalculationPageProps): Promise<React.ReactElement> {
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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="text-sm text-neutral-600 no-print">
        <Link href="/" className="text-[var(--color-accent)] hover:underline">
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

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Capital gains calculation for {holding.symbol} holding
      </h1>

      <MatchingAcquisitionsDisclosure />
      <FxRateLedgerColumnDisclosure
        acquisitionRows={
          result !== null && calcError === null ? Object.values(result.fxByAcquisitionId) : undefined
        }
        disposalRows={
          result !== null && calcError === null ? Object.values(result.fxByDisposalId) : undefined
        }
      />

      {hasLedgerData ? (
        <>
          {calcError ? (
            <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 no-print">
              {calcError}
            </div>
          ) : null}

          {result !== null && calcError === null ? (
            <CalculationResultSections result={result} holdingSymbol={holding.symbol} />
          ) : null}
        </>
      ) : (
        <p className="mt-8 text-sm text-neutral-600">Add acquisitions or disposals to run a calculation.</p>
      )}
    </main>
  );
}
