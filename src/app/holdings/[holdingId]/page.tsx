import { notFound } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

import { getLedgerForHolding } from '@/application/ledger/get-ledger-for-holding';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import {
  netDisposalProceedsUsd,
  pricePerShare,
  totalAcquisitionCostUsd,
} from '@/domain/services/ledger-money';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';

import { LedgerEntryDelete } from '@/app/holdings/[holdingId]/ledger-entry-delete';
import { HoldingLedgerActions } from '@/app/holdings/[holdingId]/holding-ledger-actions';
import { OpenCalculationLink } from '@/app/holdings/[holdingId]/open-calculation-link';

const money = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const priceUsd = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const holdingRepository = new MongoHoldingRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();

function acquisitionGrantCell(a: ShareAcquisition): ReactNode {
  if (a.economicsKind === 'manual_usd') {
    return <em className="italic">(manual)</em>;
  }
  if (a.grantNumber != null && a.grantNumber !== '') {
    return a.grantNumber;
  }
  return '—';
}

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

  let totalAcquisitionsUsd = 0;
  let totalDisposalsUsd = 0;
  for (const line of ledger.orderedLines) {
    if (line.kind === 'ACQUISITION') {
      totalAcquisitionsUsd += totalAcquisitionCostUsd(
        line.data.considerationUsd,
        line.data.feesUsd,
      );
    } else {
      totalDisposalsUsd += netDisposalProceedsUsd(
        line.data.grossProceedsUsd,
        line.data.feesUsd,
      );
    }
  }
  const differenceUsd = totalAcquisitionsUsd - totalDisposalsUsd;

  return (
    <>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{holding.symbol}</h1>

      <p className="mt-4">
        <OpenCalculationLink holdingId={holdingId} />
      </p>

      <div className="mt-10">
        <HoldingLedgerActions holdingId={holdingId} holdingSymbol={holding.symbol} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-neutral-900">Ledger</h2>
        {ledger.byTaxYear.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">No events yet.</p>
        ) : (
          <div className="mt-4 space-y-8">
            {ledger.byTaxYear.map((group) => (
              <div key={group.taxYearLabel}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Tax year {group.taxYearLabel}
                </h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#ededed] text-neutral-700">
                      <tr>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Grant #</th>
                        <th className="px-3 py-2 font-medium">Vest period</th>
                        <th className="px-3 py-2 font-medium">Vested</th>
                        <th className="px-3 py-2 font-medium">For tax</th>
                        <th className="px-3 py-2 font-medium">Qty (net)</th>
                        <th className="px-3 py-2 font-medium">Price / share</th>
                        <th className="px-3 py-2 font-medium">Consideration / proceeds</th>
                        <th className="px-3 py-2 font-medium">Fees</th>
                        <th className="px-3 py-2 font-medium">Total</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {group.lines.map((line) =>
                        line.kind === 'ACQUISITION' ? (
                          <tr key={line.data.id}>
                            <td className="px-3 py-2 text-neutral-800">Acquisition (USD)</td>
                            <td className="px-3 py-2 tabular-nums text-neutral-800">{line.data.eventDate}</td>
                            <td className="px-3 py-2 text-neutral-600">{acquisitionGrantCell(line.data)}</td>
                            <td className="px-3 py-2 text-neutral-600">
                              {line.data.vestPeriod != null && line.data.vestPeriod !== ''
                                ? line.data.vestPeriod
                                : '—'}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-neutral-600">
                              {line.data.economicsKind === 'import_usd' &&
                              line.data.grossVestedQuantity !== undefined
                                ? line.data.grossVestedQuantity
                                : '—'}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-neutral-600">
                              {line.data.economicsKind === 'import_usd' &&
                              line.data.sharesTradedForTaxes !== undefined
                                ? line.data.sharesTradedForTaxes
                                : '—'}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{line.data.quantity}</td>
                            <td className="px-3 py-2 tabular-nums text-neutral-700">
                              $
                              {priceUsd.format(
                                pricePerShare(line.data.considerationUsd, line.data.quantity),
                              )}
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              ${money.format(line.data.considerationUsd)}
                            </td>
                            <td className="px-3 py-2 tabular-nums">${money.format(line.data.feesUsd)}</td>
                            <td className="px-3 py-2 tabular-nums font-medium">
                              $
                              {money.format(
                                totalAcquisitionCostUsd(
                                  line.data.considerationUsd,
                                  line.data.feesUsd,
                                ),
                              )}
                            </td>
                            <LedgerEntryDelete
                              holdingId={holdingId}
                              kind="ACQUISITION"
                              entryId={line.data.id}
                            />
                          </tr>
                        ) : (
                          <tr key={line.data.id} className="text-red-800">
                            <td className="px-3 py-2">Disposal</td>
                            <td className="px-3 py-2 tabular-nums">{line.data.eventDate}</td>
                            <td className="px-3 py-2 text-red-700/80">—</td>
                            <td className="px-3 py-2 text-red-700/80">—</td>
                            <td className="px-3 py-2 text-red-700/80">—</td>
                            <td className="px-3 py-2 text-red-700/80">—</td>
                            <td className="px-3 py-2 tabular-nums">{line.data.quantity}</td>
                            <td className="px-3 py-2 tabular-nums">
                              $
                              {priceUsd.format(
                                pricePerShare(line.data.grossProceedsUsd, line.data.quantity),
                              )}
                            </td>
                            <td className="px-3 py-2 tabular-nums">${money.format(line.data.grossProceedsUsd)}</td>
                            <td className="px-3 py-2 tabular-nums">${money.format(line.data.feesUsd)}</td>
                            <td className="px-3 py-2 tabular-nums font-medium">
                              $
                              {money.format(
                                netDisposalProceedsUsd(line.data.grossProceedsUsd, line.data.feesUsd),
                              )}
                            </td>
                            <LedgerEntryDelete
                              holdingId={holdingId}
                              kind="DISPOSAL"
                              entryId={line.data.id}
                            />
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="mt-8 rounded-xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50 to-white px-4 py-3 shadow-sm ring-1 ring-neutral-200/50">
              <h3 className="text-sm font-semibold text-neutral-900">Ledger totals (USD)</h3>
              <dl className="mt-2 max-w-lg divide-y divide-neutral-100 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
                  <dt className="text-neutral-600">Total acquisitions (incl. fees)</dt>
                  <dd className="tabular-nums font-semibold text-neutral-900">
                    ${money.format(totalAcquisitionsUsd)}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
                  <dt className="text-neutral-600">Total disposals (net of fees)</dt>
                  <dd className="tabular-nums font-semibold text-red-800">
                    ${money.format(totalDisposalsUsd)}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
                  <dt className="font-medium text-neutral-800">Difference</dt>
                  <dd className="tabular-nums font-semibold text-neutral-900">
                    ${money.format(differenceUsd)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
