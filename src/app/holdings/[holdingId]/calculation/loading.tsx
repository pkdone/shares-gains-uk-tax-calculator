import type { ReactElement } from 'react';

/**
 * Shown during client navigation while the calculation RSC runs (DB + CGT engine).
 */
export default function HoldingCalculationLoading(): ReactElement {
  return (
    <div className="no-print">
      <p className="mt-6 text-sm font-medium text-neutral-700">Running capital gains calculation…</p>
      <div className="mt-4 animate-pulse space-y-6" aria-hidden>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-8 max-w-md flex-1 rounded bg-neutral-200" />
          <div className="h-10 w-44 shrink-0 rounded-md bg-neutral-200" />
        </div>
        <div className="h-12 rounded-lg border border-neutral-200 bg-neutral-50" />
        <div className="h-12 rounded-lg border border-neutral-200 bg-neutral-50" />
        <div className="flex gap-2 border-b border-neutral-200 pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 w-14 rounded bg-neutral-200" />
          ))}
        </div>
        <div className="rounded-lg bg-neutral-100 p-4">
          <div className="h-6 w-2/3 max-w-sm rounded bg-neutral-200" />
          <div className="mt-4 h-32 rounded bg-white" />
        </div>
      </div>
    </div>
  );
}
