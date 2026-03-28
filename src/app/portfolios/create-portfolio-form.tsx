'use client';

import { useActionState } from 'react';

import { createPortfolioAction, type FormActionState } from '@/app/portfolios/actions';

export function CreatePortfolioForm(): React.ReactElement {
  const [state, action, pending] = useActionState<FormActionState | undefined, FormData>(
    createPortfolioAction,
    undefined,
  );

  return (
    <form action={action} className="flex max-w-md flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <label className="text-sm font-medium text-neutral-800" htmlFor="portfolio-name">
        Portfolio name
      </label>
      <input
        id="portfolio-name"
        name="name"
        type="text"
        required
        maxLength={200}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        placeholder="e.g. Main RSU holding"
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
        {pending ? 'Creating…' : 'Create portfolio'}
      </button>
    </form>
  );
}
