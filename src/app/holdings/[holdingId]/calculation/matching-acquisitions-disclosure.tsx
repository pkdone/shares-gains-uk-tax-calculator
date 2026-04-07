'use client';

import type { ReactElement } from 'react';
import { useId, useState } from 'react';

/**
 * Collapsible help for HMRC matching rules (same-day, 30-day, Section 104 pool). Closed by default.
 */
export function MatchingAcquisitionsDisclosure(): ReactElement {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const headingId = useId();

  return (
    <section className="mt-8 no-print">
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
          <span className="font-semibold text-neutral-900">Matching acquisitions and disposals rules</span>
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
            <p className="text-neutral-600">
              These rules apply to every acquisition and disposal for this holding (e.g. vesting, buys, sells). Under
              HMRC, the Section 104 pool is the pooled holding of shares of the same class in the same company, where
              allowable costs are averaged until same-day or 30-day identification applies.
            </p>
            <p className="mt-3 text-neutral-800">
              <strong>How each date appears below:</strong> Results are grouped by tax year, then by calendar date. For
              each date, the <strong>ledger</strong> comes first (USD columns are for reference; sterling is what feeds
              CGT), then <strong>outcomes</strong> underneath—pool position and CGT summaries for that date. Several
              acquisitions on the same day are aggregated for matching before the Section 104 pool is updated; the pool
              outcome under the ledger is the position <em>after</em> that step.
            </p>
            <p className="mt-3 text-neutral-800">
              <strong>Date order vs matching order:</strong> the table is sorted by calendar date for readability. The
              engine does <em>not</em> process disposals in that visual order. For each disposal it applies HMRC
              identification in a fixed sequence: same-day acquisitions, then acquisitions in the 30 calendar days{' '}
              <em>after</em> that disposal, then the Section 104 pool—regardless of where those acquisition dates appear
              in the list.
            </p>
            <p className="mt-3 text-neutral-800">
              <strong>Matching</strong> means HMRC <strong>identification</strong>: for each disposal, which lots of
              shares the disposal is treated as selling against. The order is:
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-neutral-800">
              <li>
                <strong>Same day</strong> — acquisitions on the same calendar day as the disposal (HMRC same-day rule),
                before the Section 104 pool.
              </li>
              <li>
                <strong>30-day</strong> — acquisitions in the 30 calendar days <em>after</em> the disposal
                (bed-and-breakfast / 30-day rule). This can produce a different gain or loss than if the shares had
                come only from the pool. Acquisitions that occurred <em>before</em> the disposal are not in this bucket
                for that sale.
              </li>
              <li>
                <strong>Section 104 pool</strong> — whatever quantity is left is matched against the running pooled
                holding (including average cost).
              </li>
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
