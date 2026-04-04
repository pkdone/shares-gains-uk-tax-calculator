'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';

import { deleteHoldingAction, type FormActionState } from '@/app/holdings/actions';

type HoldingDeleteButtonProps = {
  readonly holdingId: string;
  readonly symbol: string;
};

export function HoldingDeleteButton({ holdingId, symbol }: HoldingDeleteButtonProps): React.ReactElement {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState<FormActionState | undefined, FormData>(
    deleteHoldingAction,
    undefined,
  );
  const wasPendingRef = useRef(false);
  const [submissionAttempted, setSubmissionAttempted] = useState(false);

  useEffect(() => {
    if (wasPendingRef.current && !pending && state === undefined) {
      dialogRef.current?.close();
      router.push('/');
      router.refresh();
    }
    wasPendingRef.current = pending;
  }, [pending, state, router]);

  const onOpen = (): void => {
    setSubmissionAttempted(false);
    dialogRef.current?.showModal();
  };

  const onCancel = (): void => {
    dialogRef.current?.close();
  };

  const onBackdropPointerDown = (event: React.PointerEvent<HTMLDialogElement>): void => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
        onClick={onOpen}
      >
        Delete holding
      </button>

      <dialog
        ref={dialogRef}
        className="w-[min(100vw-2rem,26rem)] max-w-none rounded-lg border border-neutral-200 bg-white p-0 shadow-lg backdrop:bg-black/40"
        onPointerDown={onBackdropPointerDown}
        aria-labelledby="holding-delete-title"
      >
        <form
          action={formAction}
          className="flex flex-col"
          onSubmit={() => {
            setSubmissionAttempted(true);
          }}
        >
          <input type="hidden" name="holdingId" value={holdingId} />

          <div className="border-b border-neutral-200 px-4 py-3">
            <h2 id="holding-delete-title" className="text-base font-medium text-neutral-900">
              Delete this holding?
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              This will permanently delete <span className="font-medium text-neutral-900">{symbol}</span> and all
              ledger data for it (acquisitions and disposals). This cannot be undone.
            </p>
            {submissionAttempted && state?.error !== undefined ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {state.error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 px-4 py-3">
            <button
              type="button"
              autoFocus
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
            >
              {pending ? 'Deleting…' : 'Delete holding and data'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
