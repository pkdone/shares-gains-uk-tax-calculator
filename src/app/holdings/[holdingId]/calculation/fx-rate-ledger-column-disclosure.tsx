'use client';

import type { ReactElement } from 'react';
import { useId, useState } from 'react';

import { FxRateLedgerLegendBody } from '@/app/holdings/[holdingId]/calculation/fx-rate-ledger-legend-body';

/**
 * Collapsible key for FX rate colours in the results ledger. Closed by default.
 */
export function FxRateLedgerColumnDisclosure(): ReactElement {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const headingId = useId();

  return (
    <section className="mt-0 no-print">
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm shadow-sm">
        <button
          type="button"
          id={headingId}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen((v) => !v);
          }}
        >
          <span className="font-semibold text-neutral-900">Daily FX rates applied</span>
          <span
            className="shrink-0 select-none text-lg leading-none text-neutral-500 tabular-nums"
            aria-hidden
          >
            {open ? '−' : '+'}
          </span>
        </button>
        {open ? (
          <div
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            className="border-t border-neutral-200 bg-neutral-50/80 px-4 pb-4 pt-3"
          >
            <FxRateLedgerLegendBody />
            <p className="mt-3 text-sm text-neutral-700">
              <strong>Sterling vs USD:</strong> CGT is calculated in sterling. USD amounts are shown in the ledger for
              reference only. Sterling conversions use Bank of England daily spot rates, so the USD figures shown here may
              not match broker statements or intraday execution prices exactly.
            </p>
            <p className="mt-3 text-sm text-neutral-700">
              These colours match the <strong>FX rate</strong> column in the results ledger.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
