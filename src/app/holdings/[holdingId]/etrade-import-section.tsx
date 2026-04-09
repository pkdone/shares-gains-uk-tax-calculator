'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
  formatUsdPlainAmount,
  formatUsdPricePerShare,
} from '@/application/calculation/calculation-amount-format';
import {
  commitEtradeImportAction,
  previewEtradeImportAction,
  type EtradeImportCommitState,
  type EtradeImportPreviewState,
} from '@/app/holdings/import-actions';
import { buttonPrimaryClassName, buttonSecondaryClassName } from '@/app/ui/button-variants';
import { pricePerShare } from '@/domain/services/ledger-money';

type EtradeImportSectionProps = {
  readonly holdingId: string;
  readonly holdingSymbol: string;
  /** `card` = bordered panel with heading (default). `plain` = content only for use inside a modal shell. */
  readonly layout?: 'card' | 'plain';
  readonly onCommitSuccess?: () => void;
};

export function EtradeImportSection({
  holdingId,
  holdingSymbol,
  layout = 'card',
  onCommitSuccess,
}: EtradeImportSectionProps): React.ReactElement {
  const router = useRouter();
  const [previewState, previewAction, previewPending] = useActionState<
    EtradeImportPreviewState | undefined,
    FormData
  >(previewEtradeImportAction, undefined);
  const [commitState, commitAction, commitPending] = useActionState<
    EtradeImportCommitState | undefined,
    FormData
  >(commitEtradeImportAction, undefined);

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
        <h2 className="text-lg font-medium text-neutral-900">Import RSU vesting (E*Trade By Benefit Type)</h2>
      ) : null}
      <p className={`text-xs text-neutral-600 ${layout === 'card' ? 'mt-1' : ''}`}>
        Upload the &quot;By Benefit Type&quot; XLSX. Only rows for symbol <strong>{holdingSymbol}</strong> are
        imported into this holding. Other symbols are skipped; the preview lists how many rows were skipped per
        symbol.
      </p>

      <form action={previewAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="holdingId" value={holdingId} />
        <label className="text-sm text-neutral-700">
          XLSX file
          <input
            name="etradeFile"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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

      {ignoredSymbols !== undefined && ignoredSymbols.length > 0 && previewState?.error === undefined ? (
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

          <h3 className="mt-4 text-sm font-semibold text-neutral-800">Draft acquisitions (USD)</h3>
          <div className="mt-2 overflow-x-auto rounded-md border border-neutral-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Grant #</th>
                  <th className="px-3 py-2 font-medium">Vest period</th>
                  <th className="px-3 py-2 font-medium">Vested</th>
                  <th className="px-3 py-2 font-medium">For tax</th>
                  <th className="px-3 py-2 font-medium">Qty (net)</th>
                  <th className="px-3 py-2 font-medium">Price / share (USD)</th>
                  <th className="px-3 py-2 font-medium">Consideration (USD)</th>
                  <th className="px-3 py-2 font-medium">Fees USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {drafts.map((d) => (
                  <tr
                    key={`${d.eventDate}|${d.symbol}|${String(d.quantity)}|${d.grantNumber ?? ''}|${d.vestPeriod ?? ''}`}
                  >
                    <td className="px-3 py-2 tabular-nums">{d.eventDate}</td>
                    <td className="px-3 py-2">{d.symbol}</td>
                    <td className="px-3 py-2 text-neutral-600">
                      {d.grantNumber != null && d.grantNumber !== '' ? d.grantNumber : '—'}
                    </td>
                    <td className="px-3 py-2 text-neutral-600">
                      {d.vestPeriod != null && d.vestPeriod !== '' ? d.vestPeriod : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-neutral-600">
                      {d.grossVestedQuantity === undefined ? '—' : d.grossVestedQuantity}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-neutral-600">
                      {d.sharesTradedForTaxes === undefined ? '—' : d.sharesTradedForTaxes}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{d.quantity}</td>
                    <td className="px-3 py-2 tabular-nums text-neutral-700">
                      ${formatUsdPricePerShare(pricePerShare(d.considerationUsd, d.quantity))}
                    </td>
                    <td className="px-3 py-2 tabular-nums">${formatUsdPlainAmount(d.considerationUsd)}</td>
                    <td className="px-3 py-2 tabular-nums">${formatUsdPlainAmount(d.feesUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {(drafts === undefined || drafts.length === 0) && commitState?.error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {commitState.error}
        </p>
      ) : null}
    </section>
  );
}
