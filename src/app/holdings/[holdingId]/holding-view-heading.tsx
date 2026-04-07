'use client';

import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

type HoldingViewHeadingProps = {
  readonly symbol: string;
};

/**
 * Page title for a holding: symbol plus current sub-view (ledger vs capital gains).
 */
export function HoldingViewHeading({ symbol }: HoldingViewHeadingProps): ReactElement {
  const pathname = usePathname();
  const isCalculation = pathname.endsWith('/calculation');
  const suffix = isCalculation ? 'Capital gains' : 'Ledger';

  return (
    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
      {symbol} — {suffix}
    </h1>
  );
}
