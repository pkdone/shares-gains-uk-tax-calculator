'use client';

import { useActionState } from 'react';

import { createHoldingAction, type FormActionState } from '@/app/holdings/actions';

export function CreateHoldingForm(): React.ReactElement {
  const [state, action, pending] = useActionState<FormActionState | undefined, FormData>(
    createHoldingAction,
    undefined,
  );

  return (
    <form action={action} className="flex max-w-md flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <label className="text-sm font-medium text-neutral-800" htmlFor="holding-symbol">
        Stock symbol
      </label>
      <input
        id="holding-symbol"
        name="symbol"
        type="text"
        required
        maxLength={32}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm uppercase"
        placeholder="e.g. AAPL"
        disabled={pending}
      />
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create holding'}
      </button>
    </form>
  );
}
