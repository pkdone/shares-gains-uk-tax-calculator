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
      className="flex w-full flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
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
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm uppercase"
        placeholder="e.g. NVDA"
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
        className={buttonPrimaryClassName}
      >
        {pending ? 'Creating…' : 'Create holding'}
      </button>
    </form>
  );
}
