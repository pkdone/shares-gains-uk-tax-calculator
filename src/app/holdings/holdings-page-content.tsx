import Link from 'next/link';

import { CreateHoldingForm } from '@/app/holdings/create-holding-form';
import { HoldingDeleteButton } from '@/app/holdings/holding-delete-button';
import { SignOutButton } from '@/app/sign-out-button';
import type { Holding } from '@/domain/schemas/holding';

type HoldingsPageContentProps = {
  readonly holdings: readonly Holding[];
};

/**
 * Shared holdings list and create-holding UI for `/` and (via redirect) `/holdings`.
 */
export function HoldingsPageContent({ holdings }: HoldingsPageContentProps): React.ReactElement {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium text-[var(--color-accent)]">Manual ledger</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Holdings</h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-pretty text-sm leading-relaxed text-neutral-600">
          Each holding is one stock symbol. Add acquisitions and disposals for that symbol. Amounts are USD in the
          ledger; CGT uses sterling on the calculation page.
        </p>
        <SignOutButton />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-neutral-900">New holding</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Enter a ticker (e.g. AAPL). It will be stored and shown in uppercase.
        </p>
        <div className="mt-3">
          <CreateHoldingForm />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-neutral-900">Your holdings</h2>
        {holdings.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">No holdings yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {holdings.map((h) => (
              <li key={h.id}>
                <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50">
                  <Link
                    href={`/holdings/${h.id}`}
                    className="min-w-0 flex-1 text-sm font-medium text-neutral-900"
                  >
                    {h.symbol}
                  </Link>
                  <HoldingDeleteButton holdingId={h.id} symbol={h.symbol} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs text-neutral-500">Not professional tax advice.</p>
    </main>
  );
}
