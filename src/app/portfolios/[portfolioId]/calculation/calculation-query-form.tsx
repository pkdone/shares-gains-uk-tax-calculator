'use client';

import type { RateTier } from '@/domain/schemas/calculation';

type CalculationQueryFormProps = {
  readonly portfolioId: string;
  readonly symbols: readonly string[];
  readonly currentSymbol: string;
  readonly currentRateTier: RateTier;
  readonly currentBf: number;
};

export function CalculationQueryForm({
  portfolioId,
  symbols,
  currentSymbol,
  currentRateTier,
  currentBf,
}: CalculationQueryFormProps): React.ReactElement {
  const action = `/portfolios/${portfolioId}/calculation`;

  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="symbol" className="block text-xs font-medium text-neutral-600">
          Symbol
        </label>
        <select
          id="symbol"
          name="symbol"
          defaultValue={currentSymbol}
          className="mt-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="rateTier" className="block text-xs font-medium text-neutral-600">
          CGT rate tier
        </label>
        <select
          id="rateTier"
          name="rateTier"
          defaultValue={currentRateTier}
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
          defaultValue={currentBf}
          className="mt-1 w-36 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm tabular-nums"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Calculate
      </button>
    </form>
  );
}
