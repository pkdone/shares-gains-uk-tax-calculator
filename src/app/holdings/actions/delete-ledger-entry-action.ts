'use server';

import { deleteLedgerEntry } from '@/application/ledger/delete-ledger-entry';
import { toFormActionError } from '@/app/holdings/action-error';
import { revalidateHoldingDetailAndCalculation } from '@/app/holdings/revalidate-holding-caches';
import type { FormActionState } from '@/app/holdings/types';
import { deleteLedgerEntryFormSchema } from '@/app/holdings/form-parsing';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';

import { acquisitionRepo, disposalRepo, holdingRepo } from './repos';

export async function deleteLedgerEntryAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const parsed = deleteLedgerEntryFormSchema.safeParse({
    holdingId: formData.get('holdingId'),
    kind: formData.get('kind'),
    entryId: formData.get('entryId'),
  });

  if (!parsed.success) {
    const first =
      parsed.error.flatten().formErrors[0] ??
      Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: first ?? 'Invalid request' };
  }

  const { holdingId, kind, entryId } = parsed.data;

  const userId = await requireVerifiedUserId();

  try {
    await deleteLedgerEntry(holdingRepo, acquisitionRepo, disposalRepo, {
      holdingId,
      userId,
      kind,
      entryId,
    });
  } catch (err) {
    return toFormActionError(err, 'Failed to delete entry');
  }

  revalidateHoldingDetailAndCalculation(holdingId);
  return undefined;
}
