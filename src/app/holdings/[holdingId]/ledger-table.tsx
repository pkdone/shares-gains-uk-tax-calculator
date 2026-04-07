'use client';

import { useRouter } from 'next/navigation';
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { LedgerTaxYearGroup } from '@/application/ledger/ledger-types';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import {
  netDisposalProceedsUsd,
  pricePerShare,
  totalAcquisitionCostUsd,
} from '@/domain/services/ledger-money';

import { deleteLedgerEntriesBulkAction } from '@/app/holdings/actions';
import type { FormActionState } from '@/app/holdings/types';

const money = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const priceUsd = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function acquisitionGrantCell(a: ShareAcquisition): ReactNode {
  if (a.economicsKind === 'manual_usd') {
    return <em className="italic">(manual)</em>;
  }
  if (a.grantNumber != null && a.grantNumber !== '') {
    return a.grantNumber;
  }
  return '—';
}

type LedgerLineKind = 'ACQUISITION' | 'DISPOSAL';

function selectionKey(kind: LedgerLineKind, entryId: string): string {
  return `${kind}:${entryId}`;
}

function parseSelectionKey(key: string): { readonly kind: LedgerLineKind; readonly entryId: string } {
  const colon = key.indexOf(':');
  if (colon <= 0) {
    throw new Error('Invalid selection key');
  }
  const kind = key.slice(0, colon);
  const entryId = key.slice(colon + 1);
  if (kind !== 'ACQUISITION' && kind !== 'DISPOSAL') {
    throw new Error('Invalid selection kind');
  }
  return { kind, entryId };
}

function entriesPayloadFromKeys(keys: ReadonlySet<string>): Array<{ kind: LedgerLineKind; entryId: string }> {
  return Array.from(keys, (k) => parseSelectionKey(k));
}

type HoldingLedgerTableProps = {
  readonly holdingId: string;
  readonly byTaxYear: readonly LedgerTaxYearGroup[];
  readonly totalAcquisitionsUsd: number;
  readonly totalDisposalsUsd: number;
  readonly differenceUsd: number;
};

export function HoldingLedgerTable({
  holdingId,
  byTaxYear,
  totalAcquisitionsUsd,
  totalDisposalsUsd,
  differenceUsd,
}: HoldingLedgerTableProps): ReactElement {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState | undefined, FormData>(
    deleteLedgerEntriesBulkAction,
    undefined,
  );
  const wasPendingRef = useRef(false);
  const [submissionAttempted, setSubmissionAttempted] = useState(false);

  useEffect(() => {
    if (wasPendingRef.current && !pending && state === undefined) {
      dialogRef.current?.close();
      setSelected(new Set());
      router.refresh();
    }
    wasPendingRef.current = pending;
  }, [pending, state, router]);

  const toggleKey = (key: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const setGroupSelection = (group: LedgerTaxYearGroup, selectAll: boolean): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const line of group.lines) {
        const key =
          line.kind === 'ACQUISITION'
            ? selectionKey('ACQUISITION', line.data.id)
            : selectionKey('DISPOSAL', line.data.id);
        if (selectAll) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  };

  const groupAllSelected = (group: LedgerTaxYearGroup): boolean => {
    if (group.lines.length === 0) {
      return false;
    }
    return group.lines.every((line) =>
      selected.has(
        line.kind === 'ACQUISITION'
          ? selectionKey('ACQUISITION', line.data.id)
          : selectionKey('DISPOSAL', line.data.id),
      ),
    );
  };

  const openBulkDialog = (): void => {
    setSubmissionAttempted(false);
    dialogRef.current?.showModal();
  };

  const onCancelBulk = (): void => {
    dialogRef.current?.close();
  };

  const onBackdropPointerDown = (event: PointerEvent<HTMLDialogElement>): void => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  };

  return (
    <>
      {byTaxYear.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">No events yet.</p>
      ) : (
        <div className="mt-4 space-y-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={selected.size === 0}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
              onClick={openBulkDialog}
            >
              {selected.size === 0 ? 'Delete selected' : `Delete selected (${String(selected.size)})`}
            </button>
          </div>

          <dialog
            ref={dialogRef}
            className="w-[min(100vw-2rem,28rem)] max-w-none rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
            onPointerDown={onBackdropPointerDown}
            aria-labelledby="ledger-bulk-delete-title"
          >
            <form
              action={formAction}
              className="flex flex-col"
              onSubmit={() => {
                setSubmissionAttempted(true);
              }}
            >
              <input type="hidden" name="holdingId" value={holdingId} />
              <input
                type="hidden"
                name="entries"
                value={JSON.stringify(entriesPayloadFromKeys(selected))}
              />

              <div className="border-b border-neutral-200 px-4 py-3">
                <h2 id="ledger-bulk-delete-title" className="text-base font-medium text-neutral-900">
                  Delete selected ledger entries?
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  This will permanently delete {String(selected.size)}{' '}
                  {selected.size === 1 ? 'row' : 'rows'} from this holding. This cannot be undone.
                </p>
                {submissionAttempted && state?.error !== undefined ? (
                  <p className="mt-2 text-sm text-red-700" role="alert">
                    {state.error}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 px-4 py-3">
                <button
                  type="button"
                  autoFocus
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                  onClick={onCancelBulk}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || selected.size === 0}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                >
                  {pending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </form>
          </dialog>

          {byTaxYear.map((group) => (
            <div key={group.taxYearLabel}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Tax year {group.taxYearLabel}
              </h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#ededed] text-neutral-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Grant #</th>
                      <th className="px-3 py-2 text-left font-medium">Vest period</th>
                      <th className="px-3 py-2 text-right font-medium">Vested</th>
                      <th className="px-3 py-2 text-right font-medium">For tax</th>
                      <th className="px-3 py-2 text-right font-medium">Qty (net)</th>
                      <th className="px-3 py-2 text-right font-medium">Price / share</th>
                      <th className="px-3 py-2 text-right font-medium">Consideration / proceeds</th>
                      <th className="px-3 py-2 text-right font-medium">Fees</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-center font-medium">
                        <div className="flex flex-col items-center gap-1 normal-case">
                          <span className="text-xs font-medium">Select</span>
                          <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-normal">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-neutral-300"
                              checked={groupAllSelected(group)}
                              onChange={(e) => {
                                setGroupSelection(group, e.target.checked);
                              }}
                              aria-label={`Select all entries for tax year ${group.taxYearLabel}`}
                            />
                            <span className="hidden sm:inline" aria-hidden>
                              All
                            </span>
                          </label>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {group.lines.map((line) =>
                      line.kind === 'ACQUISITION' ? (
                        <tr key={line.data.id}>
                          <td className="px-3 py-2 text-neutral-800">Acquisition (USD)</td>
                          <td className="px-3 py-2 tabular-nums text-neutral-800">{line.data.eventDate}</td>
                          <td className="px-3 py-2 text-neutral-600">{acquisitionGrantCell(line.data)}</td>
                          <td className="px-3 py-2 text-neutral-600">
                            {line.data.vestPeriod != null && line.data.vestPeriod !== ''
                              ? line.data.vestPeriod
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                            {line.data.economicsKind === 'import_usd' &&
                            line.data.grossVestedQuantity !== undefined
                              ? line.data.grossVestedQuantity
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                            {line.data.economicsKind === 'import_usd' &&
                            line.data.sharesTradedForTaxes !== undefined
                              ? line.data.sharesTradedForTaxes
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{line.data.quantity}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                            $
                            {priceUsd.format(
                              pricePerShare(line.data.considerationUsd, line.data.quantity),
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            ${money.format(line.data.considerationUsd)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">${money.format(line.data.feesUsd)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            $
                            {money.format(
                              totalAcquisitionCostUsd(
                                line.data.considerationUsd,
                                line.data.feesUsd,
                              ),
                            )}
                          </td>
                          <td className="px-3 py-2 text-center align-middle">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-neutral-300"
                              checked={selected.has(selectionKey('ACQUISITION', line.data.id))}
                              onChange={() => {
                                toggleKey(selectionKey('ACQUISITION', line.data.id));
                              }}
                              aria-label={`Select acquisition on ${line.data.eventDate} (${line.data.id}) for removal`}
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr key={line.data.id} className="text-red-800">
                          <td className="px-3 py-2">Disposal</td>
                          <td className="px-3 py-2 tabular-nums">{line.data.eventDate}</td>
                          <td className="px-3 py-2 text-red-700/80">—</td>
                          <td className="px-3 py-2 text-red-700/80">—</td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-700/80">—</td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-700/80">—</td>
                          <td className="px-3 py-2 text-right tabular-nums">{line.data.quantity}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            $
                            {priceUsd.format(
                              pricePerShare(line.data.grossProceedsUsd, line.data.quantity),
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">${money.format(line.data.grossProceedsUsd)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">${money.format(line.data.feesUsd)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            $
                            {money.format(
                              netDisposalProceedsUsd(line.data.grossProceedsUsd, line.data.feesUsd),
                            )}
                          </td>
                          <td className="px-3 py-2 text-center align-middle">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-neutral-300"
                              checked={selected.has(selectionKey('DISPOSAL', line.data.id))}
                              onChange={() => {
                                toggleKey(selectionKey('DISPOSAL', line.data.id));
                              }}
                              aria-label={`Select disposal on ${line.data.eventDate} (${line.data.id}) for removal`}
                            />
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div className="mt-8 rounded-xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50 to-white px-4 py-3 shadow-sm ring-1 ring-neutral-200/50">
            <h3 className="text-sm font-semibold text-neutral-900">Ledger totals (USD)</h3>
            <dl className="mt-2 max-w-lg divide-y divide-neutral-100 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
                <dt className="text-neutral-600">Total acquisitions (incl. fees)</dt>
                <dd className="tabular-nums font-semibold text-neutral-900">
                  ${money.format(totalAcquisitionsUsd)}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
                <dt className="text-neutral-600">Total disposals (net of fees)</dt>
                <dd className="tabular-nums font-semibold text-red-800">
                  ${money.format(totalDisposalsUsd)}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
                <dt className="font-medium text-neutral-800">Difference</dt>
                <dd className="tabular-nums font-semibold text-neutral-900">
                  ${money.format(differenceUsd)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
