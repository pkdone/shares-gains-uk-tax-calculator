import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getLedgerForPortfolio } from '@/application/ledger/get-ledger-for-portfolio';
import {
  netDisposalProceedsGbp,
  totalAcquisitionCostGbp,
  totalAcquisitionCostUsd,
} from '@/domain/services/ledger-money';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import { env } from '@/shared/config/env';

import { AcquisitionForm } from '@/app/portfolios/[portfolioId]/acquisition-form';
import { DisposalForm } from '@/app/portfolios/[portfolioId]/disposal-form';
import { EtradeImportSection } from '@/app/portfolios/[portfolioId]/etrade-import-section';

const money = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const portfolioRepository = new MongoPortfolioRepository();
const acquisitionRepository = new MongoShareAcquisitionRepository();
const disposalRepository = new MongoShareDisposalRepository();

type PortfolioDetailPageProps = {
  readonly params: Promise<{ portfolioId: string }>;
};

export default async function PortfolioDetailPage({
  params,
}: PortfolioDetailPageProps): Promise<React.ReactElement> {
  const { portfolioId } = await params;

  const portfolio = await portfolioRepository.findByIdForUser(portfolioId, env.STUB_USER_ID);
  if (portfolio === null) {
    notFound();
  }

  const ledger = await getLedgerForPortfolio(
    portfolioRepository,
    acquisitionRepository,
    disposalRepository,
    { portfolioId, userId: env.STUB_USER_ID },
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <nav className="text-sm text-neutral-600">
        <Link href="/portfolios" className="text-[var(--color-accent)] hover:underline">
          Portfolios
        </Link>
        <span className="mx-2 text-neutral-400">/</span>
        <span className="text-neutral-900">{portfolio.name}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{portfolio.name}</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Ledger uses UTC date-only fields, grouped by UK tax year (6 April–5 April). Manual entries are GBP;
        E*Trade vest imports are USD until FX (Milestone 5).
      </p>

      <div className="mt-10">
        <EtradeImportSection portfolioId={portfolioId} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-medium text-neutral-900">Add acquisition</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Total cost for display = gross consideration + fees.
          </p>
          <div className="mt-4">
            <AcquisitionForm portfolioId={portfolioId} />
          </div>
        </section>
        <section>
          <h2 className="text-lg font-medium text-neutral-900">Add disposal</h2>
          <p className="mt-1 text-xs text-neutral-500">Net proceeds for display = gross proceeds − fees.</p>
          <div className="mt-4">
            <DisposalForm portfolioId={portfolioId} />
          </div>
        </section>
      </div>

      <section className="mt-14">
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
                        <th className="px-3 py-2 font-medium">Qty</th>
                        <th className="px-3 py-2 font-medium">Gross</th>
                        <th className="px-3 py-2 font-medium">Fees</th>
                        <th className="px-3 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {group.lines.map((line) =>
                        line.kind === 'ACQUISITION' ? (
                          <tr key={line.data.id}>
                            <td className="px-3 py-2 text-neutral-800">
                              {line.data.economicsKind === 'import_usd' ? 'Acquisition (USD)' : 'Acquisition'}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-neutral-800">{line.data.eventDate}</td>
                            <td className="px-3 py-2">{line.data.symbol}</td>
                            <td className="px-3 py-2 tabular-nums">{line.data.quantity}</td>
                            {line.data.economicsKind === 'manual_gbp' ? (
                              <>
                                <td className="px-3 py-2 tabular-nums">
                                  £{money.format(line.data.grossConsiderationGbp)}
                                </td>
                                <td className="px-3 py-2 tabular-nums">£{money.format(line.data.feesGbp)}</td>
                                <td className="px-3 py-2 tabular-nums font-medium">
                                  £
                                  {money.format(
                                    totalAcquisitionCostGbp(
                                      line.data.grossConsiderationGbp,
                                      line.data.feesGbp,
                                    ),
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 tabular-nums">
                                  ${money.format(line.data.grossConsiderationUsd)}
                                </td>
                                <td className="px-3 py-2 tabular-nums">${money.format(line.data.feesUsd)}</td>
                                <td className="px-3 py-2 tabular-nums font-medium">
                                  ${money.format(
                                    totalAcquisitionCostUsd(
                                      line.data.grossConsiderationUsd,
                                      line.data.feesUsd,
                                    ),
                                  )}{' '}
                                  <span className="text-xs font-normal text-neutral-500">(FX pending)</span>
                                </td>
                              </>
                            )}
                          </tr>
                        ) : (
                          <tr key={line.data.id}>
                            <td className="px-3 py-2 text-neutral-800">Disposal</td>
                            <td className="px-3 py-2 tabular-nums text-neutral-800">{line.data.eventDate}</td>
                            <td className="px-3 py-2">{line.data.symbol}</td>
                            <td className="px-3 py-2 tabular-nums">{line.data.quantity}</td>
                            <td className="px-3 py-2 tabular-nums">£{money.format(line.data.grossProceedsGbp)}</td>
                            <td className="px-3 py-2 tabular-nums">£{money.format(line.data.feesGbp)}</td>
                            <td className="px-3 py-2 tabular-nums font-medium">
                              £
                              {money.format(
                                netDisposalProceedsGbp(line.data.grossProceedsGbp, line.data.feesGbp),
                              )}
                            </td>
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
