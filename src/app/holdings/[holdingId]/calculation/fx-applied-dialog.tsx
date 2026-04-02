'use client';

import { forwardRef, useCallback } from 'react';

import type { FxAppliedToAcquisition, FxAppliedToDisposal } from '@/application/calculation/calculation-types';

export type FxAppliedModalProps = {
  readonly acquisitionRows: readonly FxAppliedToAcquisition[];
  readonly disposalRows: readonly FxAppliedToDisposal[];
};

/**
 * Modal listing BoE XUDLUSS rates used for USD→GBP conversions. Open with `ref.current?.showModal()`.
 */
export const FxAppliedModal = forwardRef<HTMLDialogElement, FxAppliedModalProps>(
  function FxAppliedModal({ acquisitionRows, disposalRows }, ref): React.ReactElement {
    const onBackdropPointerDown = useCallback((event: React.PointerEvent<HTMLDialogElement>): void => {
      if (event.target === event.currentTarget) {
        event.currentTarget.close();
      }
    }, []);

    return (
      <dialog
        ref={ref}
        className="w-[min(100vw-2rem,56rem)] max-w-none rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="fx-applied-dialog-title"
      >
        <div className="flex max-h-[min(90vh,48rem)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3">
            <h2 id="fx-applied-dialog-title" className="text-lg font-medium text-neutral-900">
              FX applied (USD to GBP)
            </h2>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              onClick={(e) => {
                e.currentTarget.closest('dialog')?.close();
              }}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 space-y-6 overflow-y-auto px-4 py-3">
            <section>
              <h3 className="text-sm font-semibold text-neutral-900">Acquisitions (import USD)</h3>
              {acquisitionRows.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-600">
                  None — only manual USD acquisitions for this symbol, or no acquisitions.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-neutral-700">
                      <tr>
                        <th className="px-3 py-2 font-medium">Event date</th>
                        <th className="px-3 py-2 font-medium">XUDLUSS (USD per £1)</th>
                        <th className="px-3 py-2 font-medium">Rate date used</th>
                        <th className="px-3 py-2 font-medium">Fallback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {acquisitionRows.map((row) => (
                        <tr key={row.acquisitionId}>
                          <td className="px-3 py-2 tabular-nums">{row.eventDate}</td>
                          <td className="px-3 py-2 tabular-nums">{row.usdPerGbp.toFixed(4)}</td>
                          <td className="px-3 py-2 tabular-nums">{row.rateDateUsed}</td>
                          <td className="px-3 py-2">{row.usedFallback ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-neutral-900">Disposals</h3>
              {disposalRows.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-600">No disposals for this symbol.</p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-neutral-700">
                      <tr>
                        <th className="px-3 py-2 font-medium">Event date</th>
                        <th className="px-3 py-2 font-medium">XUDLUSS (USD per £1)</th>
                        <th className="px-3 py-2 font-medium">Rate date used</th>
                        <th className="px-3 py-2 font-medium">Fallback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {disposalRows.map((row) => (
                        <tr key={row.disposalId}>
                          <td className="px-3 py-2 tabular-nums">{row.eventDate}</td>
                          <td className="px-3 py-2 tabular-nums">{row.usdPerGbp.toFixed(4)}</td>
                          <td className="px-3 py-2 tabular-nums">{row.rateDateUsed}</td>
                          <td className="px-3 py-2">{row.usedFallback ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </dialog>
    );
  },
);
