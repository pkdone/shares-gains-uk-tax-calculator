'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
  commitEtradePdfDisposalImportAction,
  previewEtradePdfDisposalImportAction,
  type EtradePdfDisposalImportCommitState,
  type EtradePdfDisposalImportPreviewState,
} from '@/app/holdings/import-disposal-pdf-actions';
import { buttonPrimaryClassName, buttonSecondaryClassName } from '@/app/ui/button-variants';

type EtradePdfDisposalImportSectionProps = {
  readonly holdingId: string;
  readonly holdingSymbol: string;
  readonly layout?: 'card' | 'plain';
  readonly onCommitSuccess?: () => void;
};

const usd = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function EtradePdfDisposalImportSection({
  holdingId,
  holdingSymbol,
  layout = 'card',
  onCommitSuccess,
}: EtradePdfDisposalImportSectionProps): React.ReactElement {
  const router = useRouter();
  const [previewState, previewAction, previewPending] = useActionState<
    EtradePdfDisposalImportPreviewState | undefined,
    FormData
  >(previewEtradePdfDisposalImportAction, undefined);
  const [commitState, commitAction, commitPending] = useActionState<
    EtradePdfDisposalImportCommitState | undefined,
    FormData
  >(commitEtradePdfDisposalImportAction, undefined);

  useEffect(() => {
    if (commitState?.ok === true) {
      router.refresh();
      onCommitSuccess?.();
    }
  }, [commitState, router, onCommitSuccess]);

  const drafts = previewState?.drafts;
  const notices = previewState?.notices;
  const ignoredSymbols = previewState?.ignoredSymbols;

  const shellClassName =
    layout === 'card'
      ? 'rounded-lg border border-neutral-200 bg-neutral-50/80 p-4'
      : 'p-0';

  return (
    <section className={shellClassName}>
      {layout === 'card' ? (
        <h2 className="text-lg font-medium text-neutral-900">Import RSU disposals (E*Trade PDF)</h2>
      ) : null}
      <p className={`text-xs text-neutral-600 ${layout === 'card' ? 'mt-1' : ''}`}>
        Upload the Stock Plan Orders PDF (Executed, Sell Restricted Stock). Only rows for symbol{' '}
        <strong>{holdingSymbol}</strong> are imported; other symbols are listed as skipped when present.
      </p>

      <form action={previewAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="holdingId" value={holdingId} />
        <label className="text-sm text-neutral-700">
          PDF file
          <input
            name="etradePdfFile"
            type="file"
            accept=".pdf,application/pdf"
            required
            disabled={previewPending}
            className="mt-1 block w-full max-w-xs text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={previewPending}
          className={`inline-flex min-h-[40px] items-center justify-center gap-2 ${buttonSecondaryClassName}`}
          aria-busy={previewPending}
        >
          {previewPending ? (
            <span
              className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-neutral-400 border-t-[var(--color-accent)]"
              aria-hidden
            />
          ) : null}
          {previewPending ? 'Reading…' : 'Preview import'}
        </button>
      </form>

      {previewState?.error ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-red-600" role="alert">
            {previewState.error}
          </p>
          {ignoredSymbols !== undefined && ignoredSymbols.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p className="font-medium">Other symbols skipped</p>
              <ul className="mt-1 list-inside list-disc">
                {ignoredSymbols.map((row) => (
                  <li key={row.symbol}>
                    {row.symbol}: {row.count} row{row.count === 1 ? '' : 's'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {notices !== undefined && notices.length > 0 ? (
        <ul className="mt-3 list-inside list-disc text-sm text-neutral-600">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      {ignoredSymbols !== undefined &&
      ignoredSymbols.length > 0 &&
      previewState !== undefined &&
      previewState.error === undefined ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-medium">Other symbols skipped</p>
          <ul className="mt-1 list-inside list-disc">
            {ignoredSymbols.map((row) => (
              <li key={row.symbol}>
                {row.symbol}: {row.count} row{row.count === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {drafts !== undefined && drafts.length > 0 ? (
        <div className="mt-4">
          <form action={commitAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="holdingId" value={holdingId} />
            <input type="hidden" name="draftsJson" value={JSON.stringify(drafts)} />
            <button
              type="submit"
              disabled={commitPending}
              className={`inline-flex items-center justify-center ${buttonPrimaryClassName}`}
              aria-busy={commitPending}
            >
              {commitPending ? 'Saving…' : 'Commit import'}
            </button>
          </form>

          {commitState?.error ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {commitState.error}
            </p>
          ) : null}

          {commitState?.ok === true ? (
            <p className="mt-2 text-sm text-neutral-700" role="status">
              Imported {String(commitState.inserted ?? 0)} disposal(s)
              {commitState.skippedDuplicates !== undefined && commitState.skippedDuplicates > 0
                ? ` (${String(commitState.skippedDuplicates)} duplicate fingerprint(s) skipped)`
                : ''}
              .
            </p>
          ) : null}

          <h3 className="mt-4 text-sm font-semibold text-neutral-800">Draft disposals (USD)</h3>
          <div className="mt-2 overflow-x-auto rounded-md border border-neutral-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Gross proceeds (USD)</th>
                  <th className="px-3 py-2 font-medium">Fees (USD)</th>
                  <th className="px-3 py-2 font-medium">Order type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {drafts.map((d) => (
                  <tr
                    key={`${d.eventDate}|${d.symbol}|${String(d.quantity)}|${d.grossProceedsUsd}|${d.firstOrderExecutedRaw}`}
                  >
                    <td className="px-3 py-2 tabular-nums">{d.eventDate}</td>
                    <td className="px-3 py-2">{d.symbol}</td>
                    <td className="px-3 py-2 tabular-nums">{d.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">${usd.format(d.grossProceedsUsd)}</td>
                    <td className="px-3 py-2 tabular-nums">${usd.format(d.feesUsd)}</td>
                    <td className="px-3 py-2 text-neutral-600">{d.rawOrderType ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {(drafts === undefined || drafts.length === 0) && commitState?.error !== undefined ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {commitState.error}
        </p>
      ) : null}
    </section>
  );
}
