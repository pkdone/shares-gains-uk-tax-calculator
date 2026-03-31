'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { RateTier } from '@/domain/schemas/calculation';

type CalculationControlsProps = {
  readonly holdingId: string;
  readonly holdingSymbol: string;
  readonly currentRateTier: RateTier;
  readonly currentBf: number;
};

export function CalculationControls({
  holdingId,
  holdingSymbol,
  currentRateTier,
  currentBf,
}: CalculationControlsProps): React.ReactElement {
  const router = useRouter();
  const [rateTier, setRateTier] = useState<RateTier>(currentRateTier);
  const [bf, setBf] = useState(String(currentBf));

  function runCalculate(): void {
    const q = new URLSearchParams();
    q.set('symbol', holdingSymbol);
    q.set('rateTier', rateTier);
    q.set('bf', bf);
    router.push(`/holdings/${holdingId}/calculation?${q.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <p className="block text-xs font-medium text-neutral-600">Symbol</p>
        <p className="mt-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium tabular-nums text-neutral-900">
          {holdingSymbol}
        </p>
      </div>
      <div>
        <label htmlFor="rateTier" className="block text-xs font-medium text-neutral-600">
          CGT rate tier
        </label>
        <select
          id="rateTier"
          value={rateTier}
          onChange={(e) => setRateTier(e.target.value as RateTier)}
          className="mt-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="basic">Basic</option>
          <option value="higher">Higher</option>
          <option value="additional">Additional</option>
        </select>
      </div>
      <div>
        <label htmlFor="bf" className="block text-xs font-medium text-neutral-600">
          Brought-forward losses (£)
        </label>
        <input
          id="bf"
          name="bf"
          type="number"
          min={0}
          step="0.01"
          value={bf}
          onChange={(e) => setBf(e.target.value)}
          className="mt-1 w-36 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm tabular-nums"
        />
      </div>
      <button
        type="button"
        onClick={runCalculate}
        className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Calculate
      </button>
    </div>
  );
}
