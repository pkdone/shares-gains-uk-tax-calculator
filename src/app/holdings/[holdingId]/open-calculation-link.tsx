'use client';

import Link, { useLinkStatus } from 'next/link';
import type { ReactElement } from 'react';

type OpenCalculationLinkProps = {
  readonly holdingId: string;
};

function OpenCalculationLinkLabel(): ReactElement {
  const { pending } = useLinkStatus();
  return (
    <span className="inline-flex items-center justify-center gap-2" aria-busy={pending}>
      {pending ? (
        <span
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden
        />
      ) : null}
      <span>{pending ? 'Opening calculation…' : 'Open capital gains calculation'}</span>
    </span>
  );
}

/**
 * Primary navigation to the holding calculation page, with pending feedback while the RSC loads.
 */
export function OpenCalculationLink({ holdingId }: OpenCalculationLinkProps): ReactElement {
  return (
    <Link
      href={`/holdings/${holdingId}/calculation`}
      prefetch
      className="inline-flex min-h-[40px] min-w-[12rem] items-center justify-center rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
    >
      <OpenCalculationLinkLabel />
    </Link>
  );
}
