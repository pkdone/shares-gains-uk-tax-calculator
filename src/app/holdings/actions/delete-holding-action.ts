'use server';

import { deleteHolding } from '@/application/holding/delete-holding';
import { formatZodErrorMessage, toFormActionError } from '@/app/holdings/action-error';
import { revalidateHoldingSurfaces } from '@/app/holdings/revalidate-holding-caches';
import type { FormActionState } from '@/app/holdings/types';
import { deleteHoldingFormSchema } from '@/app/holdings/form-parsing';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { runMongoTransaction } from '@/infrastructure/persistence/mongo-transaction';

import { acquisitionRepo, disposalRepo, holdingRepo } from './repos';

export async function deleteHoldingAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const parsed = deleteHoldingFormSchema.safeParse({
    holdingId: formData.get('holdingId'),
  });

  if (!parsed.success) {
    return { error: formatZodErrorMessage(parsed.error, 'Invalid request') };
  }

  const { holdingId } = parsed.data;
  const userId = await requireVerifiedUserId();

  try {
    await deleteHolding(runMongoTransaction, holdingRepo, acquisitionRepo, disposalRepo, {
      holdingId,
      userId,
    });
  } catch (err) {
    return toFormActionError(err, 'Failed to delete holding');
  }

  revalidateHoldingSurfaces(holdingId);
  return undefined;
}
