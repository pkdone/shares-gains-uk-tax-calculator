'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { addDisposalAction, type FormActionState } from '@/app/holdings/actions';
import { buttonPrimaryClassName } from '@/app/ui/button-variants';

const priceUsd = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type DisposalFormProps = {
  readonly holdingId: string;
  readonly holdingSymbol: string;
  readonly onAfterSuccess?: () => void;
};

export function DisposalForm({ holdingId, holdingSymbol, onAfterSuccess }: DisposalFormProps): React.ReactElement {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormActionState | undefined, FormData>(
    addDisposalAction,
    undefined,
  );
  const wasPendingRef = useRef(false);

  const [quantityStr, setQuantityStr] = useState('');
  const [priceStr, setPriceStr] = useState('');

  const proceedsDisplay = useMemo((): string => {
    const q = Number(quantityStr);
    const p = Number(priceStr);
    if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p < 0) {
      return '—';
    }
    const v = Math.round(q * p * 100) / 100;
    return `$${priceUsd.format(v)}`;
  }, [quantityStr, priceStr]);

  useEffect(() => {
    if (wasPendingRef.current && !pending && state === undefined) {
      router.refresh();
      onAfterSuccess?.();
    }
    wasPendingRef.current = pending;
  }, [pending, state, router, onAfterSuccess]);

  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="holdingId" value={holdingId} />
      <p className="text-sm text-neutral-700 sm:col-span-2">
        Symbol: <span className="font-medium tabular-nums">{holdingSymbol}</span>
      </p>
      <label className="text-sm text-neutral-700">
        Event date (UTC)
        <input
          name="eventDate"
          type="date"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          disabled={pending}
        />
      </label>
      <label className="text-sm text-neutral-700">
        Quantity
        <input
          name="quantity"
          type="number"
          required
          min="0"
          step="any"
          value={quantityStr}
          onChange={(e) => {
            setQuantityStr(e.target.value);
          }}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          disabled={pending}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
        <label className="text-sm text-neutral-700">
          Price/share ($)
          <input
            name="pricePerShareUsd"
            type="number"
            required
            min="0"
            step="0.0001"
            value={priceStr}
            onChange={(e) => {
              setPriceStr(e.target.value);
            }}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            disabled={pending}
          />
        </label>
        <label className="text-sm text-neutral-700">
          Fees ($)
          <input
            name="feesUsd"
            type="number"
            required
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            disabled={pending}
          />
        </label>
      </div>
      <div className="text-sm text-neutral-700 sm:col-span-2">
        <span className="block">Gross proceeds ($)</span>
        <div
          className="mt-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm tabular-nums text-neutral-800"
          aria-live="polite"
        >
          {proceedsDisplay}
        </div>
      </div>
      <div className="border-t border-neutral-200 pt-4 sm:col-span-2">
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className={`mt-2 inline-flex items-center justify-center ${buttonPrimaryClassName}`}
          aria-busy={pending}
        >
          {pending ? 'Saving…' : 'Add disposal'}
        </button>
      </div>
    </form>
  );
}
