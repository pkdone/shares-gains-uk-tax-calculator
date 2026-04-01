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
import { FxAppliedDialog } from '@/app/holdings/[holdingId]/calculation/fx-applied-dialog';

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
      <p className="mt-2 max-w-3xl text-sm text-neutral-700">
        This app calculates capital gains and losses for the holdings you record here — not your overall CGT liability
        for a tax year.
      </p>
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
          {calcError ? (
            <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 no-print">
              {calcError}
            </div>
          ) : null}

          {result !== null && calcError === null ? (
            <>
              <div className="mt-8 flex flex-wrap gap-4 text-sm no-print">
                <Link
                  className="text-[var(--color-accent)] underline"
                  href={`/holdings/${holdingId}/computation-pack`}
                >
                  Open computation pack (print)
                </Link>
                <FxAppliedDialog rows={Object.values(result.fxByAcquisitionId)} />
              </div>
              <CalculationResultSections result={result} />
            </>
          ) : null}
        </>
      ) : (
        <p className="mt-8 text-sm text-neutral-600">Add acquisitions or disposals to run a calculation.</p>
      )}
    </main>
  );
}
