'use server';

import { deleteLedgerEntriesBulk } from '@/application/ledger/delete-ledger-entries-bulk';
import { formatZodErrorMessage, toFormActionError } from '@/app/holdings/action-error';
import { bulkDeleteLedgerEntriesRowsSchema } from '@/app/holdings/form-parsing';
import { revalidateHoldingDetailAndCalculation } from '@/app/holdings/revalidate-holding-caches';
import type { FormActionState } from '@/app/holdings/types';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { runMongoTransaction } from '@/infrastructure/persistence/mongo-transaction';

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
    return { error: formatZodErrorMessage(rowsParsed.error, 'Invalid entries') };
  }

  const userId = await requireVerifiedUserId();
  const entries = rowsParsed.data;

  try {
    await deleteLedgerEntriesBulk(runMongoTransaction, holdingRepo, acquisitionRepo, disposalRepo, {
      holdingId,
      userId,
      entries,
    });
  } catch (err) {
    revalidateHoldingDetailAndCalculation(holdingId);
    return toFormActionError(err, 'Failed to delete one or more entries');
  }

  revalidateHoldingDetailAndCalculation(holdingId);
  return undefined;
}
