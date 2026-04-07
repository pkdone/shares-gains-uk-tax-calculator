import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { computeLedgerUsdTotals } from '@/application/ledger/compute-ledger-usd-totals';
import { getLedgerForHolding } from '@/application/ledger/get-ledger-for-holding';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import {
  holdingRepository,
  shareAcquisitionRepository as acquisitionRepository,
  shareDisposalRepository as disposalRepository,
} from '@/infrastructure/repositories/composition-root';

import { HoldingLedgerActions } from '@/app/holdings/[holdingId]/holding-ledger-actions';
import { HoldingLedgerTable } from '@/app/holdings/[holdingId]/ledger-table';

type HoldingDetailPageProps = {
  readonly params: Promise<{ holdingId: string }>;
};

export default async function HoldingDetailPage({ params }: HoldingDetailPageProps): Promise<ReactElement> {
  const { holdingId } = await params;

  const userId = await requireVerifiedUserId();

  const holding = await holdingRepository.findByIdForUser(holdingId, userId);
  if (holding === null) {
    notFound();
  }

  const ledger = await getLedgerForHolding(
    holdingRepository,
    acquisitionRepository,
    disposalRepository,
    { holdingId, userId },
  );

  const { totalAcquisitionsUsd, totalDisposalsUsd, differenceUsd } = computeLedgerUsdTotals(ledger);

  return (
    <>
      <div className="mt-8">
        <HoldingLedgerActions holdingId={holdingId} holdingSymbol={holding.symbol} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-neutral-900">Entries by tax year</h2>
        <HoldingLedgerTable
          holdingId={holdingId}
          byTaxYear={ledger.byTaxYear}
          totalAcquisitionsUsd={totalAcquisitionsUsd}
          totalDisposalsUsd={totalDisposalsUsd}
          differenceUsd={differenceUsd}
        />
      </section>
    </>
  );
}
