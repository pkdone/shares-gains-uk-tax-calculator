'use client';

import type { ReactElement } from 'react';
import { useId, useRef, useState } from 'react';

import type { FxAppliedToAcquisition, FxAppliedToDisposal } from '@/application/calculation/calculation-types';

import { FxAppliedModal } from '@/app/holdings/[holdingId]/calculation/fx-applied-dialog';
import { FxRateLedgerLegendBody } from '@/app/holdings/[holdingId]/calculation/fx-rate-ledger-legend-body';

export type FxRateLedgerColumnDisclosureProps = {
  /** When set with `disposalRows`, enables the FX applied modal from this panel. */
  readonly acquisitionRows?: readonly FxAppliedToAcquisition[];
  readonly disposalRows?: readonly FxAppliedToDisposal[];
};

/**
 * Collapsible key for FX rate colours in the results ledger. Closed by default.
 */
export function FxRateLedgerColumnDisclosure({
  acquisitionRows,
  disposalRows,
}: FxRateLedgerColumnDisclosureProps): ReactElement {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const hasFxModal =
    acquisitionRows !== undefined && disposalRows !== undefined;

  const openModal = (): void => {
    dialogRef.current?.showModal();
  };

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
              <strong>Sterling vs USD:</strong> CGT amounts are computed in sterling using this app’s Bank of England
              daily spot series and the rules summarised in this panel. USD amounts in the ledger are for reference only and may
              not match your broker’s statement or intraday rates.
            </p>
            <p className="mt-3 text-sm text-neutral-700">
              {hasFxModal ? (
                <>
                  These colours match the <strong>FX rate</strong> column in the results ledger.{' '}
                  <button
                    type="button"
                    className="text-[var(--color-accent)] underline hover:opacity-90"
                    onClick={openModal}
                  >
                    View FX applied (USD)
                  </button>
                  <span className="text-neutral-600">
                    {' '}
                    opens a full table of the rate date and value used for each acquisition and disposal conversion.
                  </span>
                </>
              ) : (
                <span className="text-neutral-600">
                  When a calculation has run, the <strong>FX rate</strong> column in the calculation results uses these
                  colours, and you can open the full rate table from the link in this section.
                </span>
              )}
            </p>
            {hasFxModal ? (
              <FxAppliedModal
                ref={dialogRef}
                acquisitionRows={acquisitionRows}
                disposalRows={disposalRows}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
