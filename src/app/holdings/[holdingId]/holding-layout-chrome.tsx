'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

type HoldingLayoutChromeProps = {
  readonly holdingId: string;
  readonly symbol: string;
};

/**
 * Breadcrumb and Ledger / Capital gains sub-navigation for a single holding.
 */
export function HoldingLayoutChrome({ holdingId, symbol }: HoldingLayoutChromeProps): ReactElement {
  const pathname = usePathname();
  const ledgerHref = `/holdings/${holdingId}`;
  const calculationHref = `/holdings/${holdingId}/calculation`;
  const isLedger = pathname === ledgerHref;
  const isCalculation = pathname === calculationHref;

  const tabClass = (active: boolean): string =>
    [
      'inline-flex items-center border-b-2 px-1 pb-2 text-sm font-medium transition-colors',
      active
        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
        : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900',
    ].join(' ');

  return (
    <header className="no-print">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-600">
        <Link href="/" className="text-[var(--color-accent)] hover:underline">
          Holdings
        </Link>
        <span className="mx-2 text-neutral-400">/</span>
        <Link href={ledgerHref} className="text-[var(--color-accent)] hover:underline" prefetch>
          {symbol}
        </Link>
        {isCalculation ? (
          <>
            <span className="mx-2 text-neutral-400">/</span>
            <span className="text-neutral-900">Calculation</span>
          </>
        ) : null}
      </nav>

      <nav aria-label="Holding views" className="mt-4 flex gap-6 border-b border-neutral-200">
        <Link href={ledgerHref} className={tabClass(isLedger)} prefetch>
          Ledger
        </Link>
        <Link href={calculationHref} className={tabClass(isCalculation)} prefetch>
          Capital gains
        </Link>
      </nav>
    </header>
  );
}
