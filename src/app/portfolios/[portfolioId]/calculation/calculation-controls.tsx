'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { RateTier } from '@/domain/schemas/calculation';

import { savePortfolioCalculationPrefs } from '@/app/portfolios/[portfolioId]/calculation/actions';

type CalculationControlsProps = {
  readonly portfolioId: string;
  readonly symbols: readonly string[];
  readonly currentSymbol: string;
  readonly currentRateTier: RateTier;
  readonly currentBf: number;
  readonly registeredForSelfAssessment: boolean;
};

export function CalculationControls({
  portfolioId,
  symbols,
  currentSymbol,
  currentRateTier,
  currentBf,
  registeredForSelfAssessment,
}: CalculationControlsProps): React.ReactElement {
  const router = useRouter();
  const [pendingSave, startSave] = useTransition();
  const [symbol, setSymbol] = useState(currentSymbol);
  const [rateTier, setRateTier] = useState<RateTier>(currentRateTier);
  const [bf, setBf] = useState(String(currentBf));
  const [sa, setSa] = useState(registeredForSelfAssessment);

  function runCalculate(): void {
    const q = new URLSearchParams();
    q.set('symbol', symbol);
    q.set('rateTier', rateTier);
    q.set('bf', bf);
    router.push(`/portfolios/${portfolioId}/calculation?${q.toString()}`);
  }

  function saveDefaults(): void {
    const n = Math.max(0, Number.parseFloat(bf) || 0);
    startSave(() => {
      void (async () => {
        await savePortfolioCalculationPrefs(portfolioId, n, sa);
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="symbol" className="block text-xs font-medium text-neutral-600">
            Symbol
          </label>
          <select
            id="symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
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

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
        <p className="font-medium text-neutral-800">Saved defaults</p>
        <p className="mt-1 text-xs text-neutral-600">
          Stored in your portfolio. The URL can still override brought-forward for one-off runs.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={sa}
            onChange={(e) => setSa(e.target.checked)}
            className="rounded border-neutral-300"
          />
          <span>I am registered for Self Assessment (needed for the £50,000 proceeds rule from 2023–24)</span>
        </label>
        <button
          type="button"
          disabled={pendingSave}
          onClick={saveDefaults}
          className="mt-3 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
        >
          {pendingSave ? 'Saving…' : 'Save defaults'}
        </button>
      </div>
    </div>
  );
}
