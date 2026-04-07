import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { buildCalculationTransactionTableModel } from '@/application/calculation/build-calculation-transaction-table';
import { runCalculationForHoldingSymbol } from '@/application/calculation/run-calculation-for-symbol';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { logInfo } from '@/shared/app-logger';
import { DomainError } from '@/shared/errors/app-error';

import { CalculationPageTitleAndExport } from '@/app/holdings/[holdingId]/calculation/calculation-page-title-and-export';
import { CalculationPdfExportProvider } from '@/app/holdings/[holdingId]/calculation/calculation-pdf-export-context';
import { CalculationResultSections } from '@/app/holdings/[holdingId]/calculation/calculation-result-sections';
import { FxRateLedgerColumnDisclosure } from '@/app/holdings/[holdingId]/calculation/fx-rate-ledger-column-disclosure';
import { MatchingAcquisitionsDisclosure } from '@/app/holdings/[holdingId]/calculation/matching-acquisitions-disclosure';

const holdingRepository = new MongoHoldingRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();
const fxRateRepository = new MongoFxRateRepository();

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

  logInfo(
    `Holding calculation pipeline: holdingId=${holdingId} totalMs=${String(Date.now() - pipelineStartMs)} acquisitions=${String(acquisitions.length)} disposals=${String(disposals.length)}`,
  );

  const transactionTableGroups =
    result !== null && calcError === null ? buildCalculationTransactionTableModel(result) : [];

  return (
    <div className="no-print">
      <CalculationPdfExportProvider>
        <CalculationPageTitleAndExport holdingSymbol={holding.symbol} groups={transactionTableGroups} />

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
      </CalculationPdfExportProvider>
    </div>
  );
}
