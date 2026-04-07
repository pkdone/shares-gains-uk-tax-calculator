'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

type HoldingAppBreadcrumbProps = {
  readonly holdingId: string;
  readonly symbol: string;
};

/**
 * Path-aware breadcrumb for the app header: Holdings → symbol (and → Calculation on that route).
 */
export function HoldingAppBreadcrumb({ holdingId, symbol }: HoldingAppBreadcrumbProps): ReactElement {
  const pathname = usePathname();
  const ledgerHref = `/holdings/${holdingId}`;
  const calculationHref = `${ledgerHref}/calculation`;
  const isCalculation = pathname === calculationHref;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600">
        <li className="min-w-0 shrink">
          <Link href="/" className="text-[var(--color-accent)] hover:underline">
            Holdings
          </Link>
        </li>
        <li className="shrink-0 text-neutral-400" aria-hidden>
          /
        </li>
        <li className="min-w-0 shrink">
          {isCalculation ? (
            <Link href={ledgerHref} className="text-[var(--color-accent)] hover:underline" prefetch>
              {symbol}
            </Link>
          ) : (
            <span className="font-medium text-neutral-900" aria-current="page">
              {symbol}
            </span>
          )}
        </li>
        {isCalculation ? (
          <>
            <li className="shrink-0 text-neutral-400" aria-hidden>
              /
            </li>
            <li className="min-w-0 shrink font-medium text-neutral-900" aria-current="page">
              Calculation
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
