import type { ReactElement } from 'react';

/**
 * Shared copy for the ledger FX rate column colour key (green = same-day rate date, orange = fallback).
 */
/**
 * Compact legend for tables where the FX rate column uses green/orange colouring.
 */
export function FxRateLedgerLegendInline(): ReactElement {
  return (
    <div
      className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-neutral-100 pb-2 text-[11px] text-neutral-600"
      role="note"
    >
      <span className="font-medium text-neutral-700">FX rate column:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-green-700" aria-hidden />
        <span>Same-day BoE rate date</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-orange-600" aria-hidden />
        <span>Earlier published rate (e.g. weekend/holiday)</span>
      </span>
    </div>
  );
}

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
