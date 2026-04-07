'use server';

import { deleteLedgerEntry } from '@/application/ledger/delete-ledger-entry';
import { toFormActionError } from '@/app/holdings/action-error';
import { bulkDeleteLedgerEntriesRowsSchema } from '@/app/holdings/form-parsing';
import { revalidateHoldingDetailAndCalculation } from '@/app/holdings/revalidate-holding-caches';
import type { FormActionState } from '@/app/holdings/types';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';

import { acquisitionRepo, disposalRepo, holdingRepo } from './repos';

export async function deleteLedgerEntriesBulkAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const holdingIdRaw = formData.get('holdingId');
  const entriesRaw = formData.get('entries');

  if (typeof holdingIdRaw !== 'string' || typeof entriesRaw !== 'string') {
    return { error: 'Invalid request' };
  }

  const holdingId = holdingIdRaw.trim();
  if (holdingId.length === 0) {
    return { error: 'Invalid request' };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(entriesRaw) as unknown;
  } catch {
    return { error: 'Invalid entries payload' };
  }

  const rowsParsed = bulkDeleteLedgerEntriesRowsSchema.safeParse(parsedJson);
  if (!rowsParsed.success) {
    const first =
      rowsParsed.error.flatten().formErrors[0] ??
      Object.values(rowsParsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: first ?? 'Invalid entries' };
  }

  const userId = await requireVerifiedUserId();
  const entries = rowsParsed.data;

  for (const row of entries) {
    try {
      await deleteLedgerEntry(holdingRepo, acquisitionRepo, disposalRepo, {
        holdingId,
        userId,
        kind: row.kind,
        entryId: row.entryId,
      });
    } catch (err) {
      revalidateHoldingDetailAndCalculation(holdingId);
      return toFormActionError(err, 'Failed to delete one or more entries');
    }
  }

  revalidateHoldingDetailAndCalculation(holdingId);
  return undefined;
}
