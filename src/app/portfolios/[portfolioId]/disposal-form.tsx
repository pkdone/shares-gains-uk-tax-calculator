'use client';

import { useActionState } from 'react';

import { addDisposalAction, type FormActionState } from '@/app/portfolios/actions';

type DisposalFormProps = {
  readonly portfolioId: string;
};

export function DisposalForm({ portfolioId }: DisposalFormProps): React.ReactElement {
  const [state, action, pending] = useActionState<FormActionState | undefined, FormData>(
    addDisposalAction,
    undefined,
  );

  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <label className="text-sm text-neutral-700 sm:col-span-2">
        Symbol
        <input
          name="symbol"
          type="text"
          required
          maxLength={32}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          disabled={pending}
        />
      </label>
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
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          disabled={pending}
        />
      </label>
      <label className="text-sm text-neutral-700">
        Gross proceeds (£)
        <input
          name="grossProceedsGbp"
          type="number"
          required
          min="0"
          step="0.01"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          disabled={pending}
        />
      </label>
      <label className="text-sm text-neutral-700">
        Fees (£)
        <input
          name="feesGbp"
          type="number"
          required
          min="0"
          step="0.01"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          disabled={pending}
        />
      </label>
      <div className="sm:col-span-2">
        {state?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Add disposal'}
        </button>
      </div>
    </form>
  );
}
