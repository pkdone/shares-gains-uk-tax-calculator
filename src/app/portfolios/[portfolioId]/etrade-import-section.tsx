'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
  commitEtradeImportAction,
  previewEtradeImportAction,
  type EtradeImportCommitState,
  type EtradeImportPreviewState,
} from '@/app/portfolios/import-actions';

type EtradeImportSectionProps = {
  readonly portfolioId: string;
};

const usd = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function EtradeImportSection({ portfolioId }: EtradeImportSectionProps): React.ReactElement {
  const router = useRouter();
  const [previewState, previewAction, previewPending] = useActionState(
    previewEtradeImportAction,
    undefined as EtradeImportPreviewState | undefined,
  );
  const [commitState, commitAction, commitPending] = useActionState(
    commitEtradeImportAction,
    undefined as EtradeImportCommitState | undefined,
  );

  useEffect(() => {
    if (commitState?.ok === true) {
      router.refresh();
    }
  }, [commitState, router]);

  const drafts = previewState?.drafts;
  const notices = previewState?.notices;

  return (
    <section className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-4">
      <h2 className="text-lg font-medium text-neutral-900">Import RSU vesting (E*Trade By Benefit Type)</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Upload the &quot;By Benefit Type&quot; XLSX. Preview drafts, then commit. Values are stored in USD; GBP
        conversion is Milestone 5. Section 104 calculations (Milestone 4) use GBP only — imported USD rows stay
        out of the engine until then.
      </p>

      <form action={previewAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="portfolioId" value={portfolioId} />
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
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
        >
          {previewPending ? 'Reading…' : 'Preview import'}
        </button>
      </form>

      {previewState?.error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {previewState.error}
        </p>
      ) : null}

      {notices !== undefined && notices.length > 0 ? (
        <ul className="mt-3 list-inside list-disc text-sm text-neutral-600">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      {drafts !== undefined && drafts.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-neutral-800">Draft acquisitions (USD)</h3>
          <div className="mt-2 overflow-x-auto rounded-md border border-neutral-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Gross USD</th>
                  <th className="px-3 py-2 font-medium">Fees USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {drafts.map((d, index) => (
                  <tr key={`draft-${String(index)}`}>
                    <td className="px-3 py-2 tabular-nums">{d.eventDate}</td>
                    <td className="px-3 py-2">{d.symbol}</td>
                    <td className="px-3 py-2 tabular-nums">{d.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">${usd.format(d.grossConsiderationUsd)}</td>
                    <td className="px-3 py-2 tabular-nums">${usd.format(d.feesUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={commitAction} className="mt-4">
            <input type="hidden" name="portfolioId" value={portfolioId} />
            <input type="hidden" name="draftsJson" value={JSON.stringify(drafts)} />
            <button
              type="submit"
              disabled={commitPending}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {commitPending ? 'Saving…' : 'Commit import'}
            </button>
          </form>
        </div>
      ) : null}

      {commitState?.error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {commitState.error}
        </p>
      ) : null}
    </section>
  );
}
