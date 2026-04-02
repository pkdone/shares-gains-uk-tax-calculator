import type { ReactElement } from 'react';

/**
 * Shared copy for the ledger FX rate column colour key (green = same-day rate date, orange = fallback).
 */
export function FxRateLedgerLegendBody(): ReactElement {
  return (
    <ul className="space-y-1.5 text-neutral-700">
      <li className="flex gap-2">
        <span
          className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-sm bg-green-700"
          aria-hidden
        />
        <span>
          <span className="font-medium text-green-800">Green</span> — Bank of England rate whose{' '}
          <span className="whitespace-nowrap">rate date</span> is the same calendar day as the transaction.
        </span>
      </li>
      <li className="flex gap-2">
        <span
          className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-sm bg-orange-600"
          aria-hidden
        />
        <span>
          <span className="font-medium text-orange-700">Orange</span> — an earlier published BoE rate was used (e.g.
          weekend or bank holiday).
        </span>
      </li>
    </ul>
  );
}
