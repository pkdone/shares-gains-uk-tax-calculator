import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { buildCalculationTransactionTableModel } from '@/application/calculation/build-calculation-transaction-table';
import { runCalculationForHoldingSymbol } from '@/application/calculation/run-calculation-for-symbol';
import {
  fxRateRepository,
  holdingRepository,
  shareAcquisitionRepository as acquisitionRepository,
  shareDisposalRepository as disposalRepository,
} from '@/infrastructure/repositories/composition-root';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { logInfo } from '@/shared/app-logger';
import { DomainError } from '@/domain/errors/domain-error';

import { holdingCalculationCacheTag } from '@/app/holdings/holding-calculation-cache-tag';
import { CalculationExportProvider } from '@/app/holdings/[holdingId]/calculation/calculation-export-context';
import { CalculationResultSections } from '@/app/holdings/[holdingId]/calculation/calculation-result-sections';
import { FxRateLedgerColumnDisclosure } from '@/app/holdings/[holdingId]/calculation/fx-rate-ledger-column-disclosure';
import { MatchingAcquisitionsDisclosure } from '@/app/holdings/[holdingId]/calculation/matching-acquisitions-disclosure';

type HoldingCalculationBodyProps = {
  readonly holdingId: string;
};

/**
 * Heavy calculation subtree: DB reads, FX + CGT engine, PDF table model. Wrapped in Suspense on the page.
 */
export async function HoldingCalculationBody({ holdingId }: HoldingCalculationBodyProps): Promise<ReactElement> {
  const userId = await requireVerifiedUserId();

  const holding = await holdingRepository.findByIdForUser(holdingId, userId);
  if (holding === null) {
    notFound();
  }

  const pipelineStartMs = Date.now();

  const [acquisitions, disposals] = await Promise.all([
    acquisitionRepository.listByHoldingForUser(holdingId, userId),
    disposalRepository.listByHoldingForUser(holdingId, userId),
  ]);
  const hasLedgerData = acquisitions.length > 0 || disposals.length > 0;

  let calcError: string | null = null;
  let result: Awaited<ReturnType<typeof runCalculationForHoldingSymbol>> | null = null;

  if (hasLedgerData) {
    try {
      const runCached = unstable_cache(
        async () =>
          runCalculationForHoldingSymbol({
            holdingRepository,
            acquisitionRepository,
            disposalRepository,
            fxRateRepository,
            input: {
              holdingId,
              userId,
            },
          }),
        // Bump version when cached payload shape or warning rules change (invalidates stale entries).
        ['holding-calculation-v2', holdingId, userId],
        { tags: [holdingCalculationCacheTag(holdingId)] },
      );
      result = await runCached();
    } catch (err) {
      calcError = err instanceof DomainError ? err.message : 'Calculation failed';
    }
  }

  logInfo(
    `Holding calculation pipeline: holdingId=${holdingId} totalMs=${String(Date.now() - pipelineStartMs)} acquisitions=${String(acquisitions.length)} disposals=${String(disposals.length)}`,
  );

  const transactionTableGroups =
    result !== null && calcError === null ? buildCalculationTransactionTableModel(result) : [];

  return (
    <div className="no-print w-full min-w-0">
      <CalculationExportProvider>
        <div className="mb-8 mt-6 min-w-0 w-full space-y-4">
          <MatchingAcquisitionsDisclosure />
          <FxRateLedgerColumnDisclosure
            acquisitionRows={
              result !== null && calcError === null ? Object.values(result.fxByAcquisitionId) : undefined
            }
            disposalRows={
              result !== null && calcError === null ? Object.values(result.fxByDisposalId) : undefined
            }
          />
        </div>

        {hasLedgerData ? (
          <>
            {calcError ? (
              <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 no-print">
                {calcError}
              </div>
            ) : null}

            {result !== null && calcError === null ? (
              <CalculationResultSections
                result={result}
                holdingSymbol={holding.symbol}
                groups={transactionTableGroups}
              />
            ) : null}
          </>
        ) : (
          <p className="mt-8 text-sm text-neutral-600">Add acquisitions or disposals to run a calculation.</p>
        )}
      </CalculationExportProvider>
    </div>
  );
}
