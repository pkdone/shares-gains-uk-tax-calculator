'use server';

import { deleteHolding } from '@/application/holding/delete-holding';
import { toFormActionError } from '@/app/holdings/action-error';
import { revalidateHoldingSurfaces } from '@/app/holdings/revalidate-holding-caches';
import type { FormActionState } from '@/app/holdings/types';
import { deleteHoldingFormSchema } from '@/app/holdings/form-parsing';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';

import { acquisitionRepo, disposalRepo, holdingRepo } from './repos';

export async function deleteHoldingAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const parsed = deleteHoldingFormSchema.safeParse({
    holdingId: formData.get('holdingId'),
  });

  if (!parsed.success) {
    const first =
      parsed.error.flatten().formErrors[0] ??
      Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: first ?? 'Invalid request' };
  }

  const { holdingId } = parsed.data;
  const userId = await requireVerifiedUserId();

  try {
    await deleteHolding(holdingRepo, acquisitionRepo, disposalRepo, {
      holdingId,
      userId,
    });
  } catch (err) {
    return toFormActionError(err, 'Failed to delete holding');
  }

  revalidateHoldingSurfaces(holdingId);
  return undefined;
}
