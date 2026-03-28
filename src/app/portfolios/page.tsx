import Link from 'next/link';

import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { env } from '@/shared/config/env';

import { CreatePortfolioForm } from '@/app/portfolios/create-portfolio-form';

export const dynamic = 'force-dynamic';

export default async function PortfoliosPage(): Promise<React.ReactElement> {
  const portfolioRepository = new MongoPortfolioRepository();
  const portfolios = await portfolioRepository.listByUser(env.STUB_USER_ID);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium text-[var(--color-accent)]">Manual ledger</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Portfolios</h1>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-neutral-600">
        Create a portfolio, then add acquisitions and disposals. Amounts are GBP only; no CGT calculation in this
        milestone.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-neutral-900">New portfolio</h2>
        <div className="mt-3">
          <CreatePortfolioForm />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-neutral-900">Your portfolios</h2>
        {portfolios.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">No portfolios yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {portfolios.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/portfolios/${p.id}`}
                  className="block px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs text-neutral-500">
        Stub user <code className="rounded bg-neutral-100 px-1">{env.STUB_USER_ID}</code>. Not professional tax
        advice.
      </p>
    </main>
  );
}
