'use client';

import { useRouter } from 'next/navigation';

/**
 * Refreshes the server-rendered calculation (no query params; gains are for this holding only).
 */
export function CalculationControls(): React.ReactElement {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-end gap-4">
      <button
        type="button"
        onClick={() => {
          router.refresh();
        }}
        className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Calculate
      </button>
      <p className="max-w-xl text-xs text-neutral-600">
        Capital gains and losses (chargeable gains mechanics) for this holding only. Final CGT liability may differ
        with other disposals, brought-forward losses, reliefs, or your rate position — not estimated here.
      </p>
    </div>
  );
}
