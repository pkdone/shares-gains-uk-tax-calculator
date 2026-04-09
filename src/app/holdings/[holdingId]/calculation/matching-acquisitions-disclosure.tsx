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
              These rules apply to every acquisition and disposal for this holding, including vesting, buys and sells.
              Under HMRC rules, shares of the same class in the same company are usually grouped into a Section 104
              pool, where allowable cost is averaged unless same-day or 30-day matching applies. For RSU vesting
              events, the acquisition cost used for CGT is the vest-date market value in sterling.
            </p>
            <p className="mt-3 text-neutral-800">
              <strong>How results are shown below:</strong> entries are grouped by tax year and then by calendar date.
              For each date, the ledger appears first, followed by the outcomes for that date. USD columns are shown for
              reference only; CGT calculations use sterling. Where several acquisitions occur on the same day, they are
              grouped for matching before the Section 104 pool is updated. The pool position shown beneath the ledger is
              the position after that step.
            </p>
            <p className="mt-3 text-neutral-800">
              <strong>Display order is not matching order:</strong> entries are shown in calendar order for readability,
              but disposals are matched using HMRC identification rules, not the visual order of the table.
            </p>
            <p className="mt-3 text-neutral-800">
              For each disposal, matching is applied in this order:
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-neutral-800">
              <li>
                <strong>Same day</strong> — acquisitions on the same calendar day as the disposal.
              </li>
              <li>
                <strong>30-day rule</strong> — acquisitions in the 30 calendar days after the disposal. Earlier
                acquisitions are not matched under this rule.
              </li>
              <li>
                <strong>Section 104 pool</strong> — any remaining quantity is matched against the running pooled holding
                using average allowable cost.
              </li>
            </ol>
            <p className="mt-3 text-neutral-800">
              The same-day and 30-day rules can produce a different gain or loss than if the shares had been matched only
              against the Section 104 pool.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
