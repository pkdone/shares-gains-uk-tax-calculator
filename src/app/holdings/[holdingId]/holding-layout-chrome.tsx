'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

type HoldingLayoutChromeProps = {
  readonly holdingId: string;
};

/**
 * Ledger / Capital Gains sub-navigation for a single holding (breadcrumbs live in AppHeader).
 */
export function HoldingLayoutChrome({ holdingId }: HoldingLayoutChromeProps): ReactElement {
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
    <header className="no-print mt-4">
      <nav aria-label="Holding views" className="flex gap-6 border-b border-neutral-200">
        <Link href={ledgerHref} className={tabClass(isLedger)} prefetch>
          Ledger
        </Link>
        <Link href={calculationHref} className={tabClass(isCalculation)} prefetch>
          Capital Gains
        </Link>
      </nav>
    </header>
  );
}
