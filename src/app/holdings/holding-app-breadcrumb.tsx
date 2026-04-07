import Link from 'next/link';
import type { ReactElement } from 'react';

type HoldingAppBreadcrumbProps = {
  readonly symbol: string;
};

/**
 * Breadcrumb for the app header on holding routes: Holdings → symbol (same on Ledger and Capital gains).
 */
export function HoldingAppBreadcrumb({ symbol }: HoldingAppBreadcrumbProps): ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg text-neutral-600">
        <li className="min-w-0 shrink">
          <Link href="/" className="text-[var(--color-accent)] hover:underline">
            Holdings
          </Link>
        </li>
        <li className="shrink-0 text-neutral-400" aria-hidden>
          /
        </li>
        <li className="min-w-0 shrink">
          <span className="font-medium text-neutral-900" aria-current="page">
            {symbol}
          </span>
        </li>
      </ol>
    </nav>
  );
}
