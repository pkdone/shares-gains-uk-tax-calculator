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
              <strong>Sterling vs USD:</strong> CGT is calculated in sterling. USD amounts are shown in the ledger for
              reference only. Sterling conversions use Bank of England daily spot rates, so the USD figures shown here may
              not match broker statements or intraday execution prices exactly.
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
                  </button>{' '}
                  shows the rate date and rate used for each acquisition and disposal conversion.
                </>
              ) : (
                <span className="text-neutral-600">
                  These colours match the <strong>FX rate</strong> column in the results ledger. When a calculation has
                  run, use <strong className="text-neutral-700">View FX applied (USD)</strong> in this section to see the
                  rate date and rate used for each acquisition and disposal conversion.
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
