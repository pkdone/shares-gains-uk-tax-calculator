'use client';

import { useActionState } from 'react';

import { createHoldingAction } from '@/app/holdings/actions';
import type { FormActionState } from '@/app/holdings/types';
import { buttonPrimaryClassName } from '@/app/ui/button-variants';

export function CreateHoldingForm(): React.ReactElement {
  const [state, action, pending] = useActionState<FormActionState | undefined, FormData>(
    createHoldingAction,
    undefined,
  );

  return (
    <form
      action={action}
      className="inline-flex max-w-full flex-col items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
    >
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
        className="w-36 rounded-md border border-neutral-300 px-3 py-2 text-sm uppercase sm:w-40"
        placeholder="e.g. NVDA"
        disabled={pending}
      />
      {state?.error ? (
        <p className="max-w-xs text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={buttonPrimaryClassName}
      >
        {pending ? 'Creating…' : 'Create holding'}
      </button>
    </form>
  );
}
