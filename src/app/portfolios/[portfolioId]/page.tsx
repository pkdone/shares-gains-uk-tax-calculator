import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

import { getLedgerForPortfolio } from '@/application/ledger/get-ledger-for-portfolio';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import {
  netDisposalProceedsUsd,
  pricePerShare,
  totalAcquisitionCostUsd,
} from '@/domain/services/ledger-money';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';

import { LedgerEntryDelete } from '@/app/portfolios/[portfolioId]/ledger-entry-delete';
import { PortfolioLedgerActions } from '@/app/portfolios/[portfolioId]/portfolio-ledger-actions';

const money = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const priceUsd = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const portfolioRepository = new MongoPortfolioRepository();
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

type PortfolioDetailPageProps = {
  readonly params: Promise<{ portfolioId: string }>;
};

export default async function PortfolioDetailPage({
  params,
}: PortfolioDetailPageProps): Promise<ReactElement> {
  const { portfolioId } = await params;

  const userId = await requireVerifiedUserId();

  const portfolio = await portfolioRepository.findByIdForUser(portfolioId, userId);
  if (portfolio === null) {
    notFound();
  }

  const ledger = await getLedgerForPortfolio(
    portfolioRepository,
    acquisitionRepository,
    disposalRepository,
    { portfolioId, userId },
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <nav className="text-sm text-neutral-600">
        <Link href="/portfolios" className="text-[var(--color-accent)] hover:underline">
          Portfolios
        </Link>
        <span className="mx-2 text-neutral-400">/</span>
        <span className="text-neutral-900">{portfolio.name}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{portfolio.name}</h1>

      <p className="mt-4">
        <Link
          href={`/portfolios/${portfolioId}/calculation`}
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          Open capital gains calculation
        </Link>
      </p>

      <div className="mt-10">
        <PortfolioLedgerActions portfolioId={portfolioId} />
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
                    <thead className="bg-neutral-50 text-neutral-700">
                      <tr>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Symbol</th>
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
                            <td className="px-3 py-2">{line.data.symbol}</td>
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
                              portfolioId={portfolioId}
                              kind="ACQUISITION"
                              entryId={line.data.id}
                            />
                          </tr>
                        ) : (
                          <tr key={line.data.id}>
                            <td className="px-3 py-2 text-neutral-800">Disposal</td>
                            <td className="px-3 py-2 tabular-nums text-neutral-800">{line.data.eventDate}</td>
                            <td className="px-3 py-2">{line.data.symbol}</td>
                            <td className="px-3 py-2 text-neutral-600">
                              <em className="italic">(manual)</em>
                            </td>
                            <td className="px-3 py-2 text-neutral-500">—</td>
                            <td className="px-3 py-2 text-neutral-500">—</td>
                            <td className="px-3 py-2 text-neutral-500">—</td>
                            <td className="px-3 py-2 tabular-nums">{line.data.quantity}</td>
                            <td className="px-3 py-2 tabular-nums text-neutral-700">
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
                              portfolioId={portfolioId}
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
          </div>
        )}
      </section>
    </main>
  );
}
