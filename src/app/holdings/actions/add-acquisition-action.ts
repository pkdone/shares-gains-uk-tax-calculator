'use server';

import { addAcquisition } from '@/application/ledger/add-acquisition';
import { toFormActionError } from '@/app/holdings/action-error';
import { revalidateHoldingDetailAndCalculation } from '@/app/holdings/revalidate-holding-caches';
import type { FormActionState } from '@/app/holdings/types';
import { formDataString, parseAcquisitionForm } from '@/app/holdings/form-parsing';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';

import { acquisitionRepo, holdingRepo } from './repos';

export async function addAcquisitionAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const holdingId = formDataString(formData, 'holdingId');
  if (holdingId.length < 1) {
    return { error: 'Missing holding' };
  }

  const userId = await requireVerifiedUserId();
  const holding = await holdingRepo.findByIdForUser(holdingId, userId);
  if (holding === null) {
    return { error: 'Holding not found' };
  }

  const parsed = parseAcquisitionForm(formData, holding.symbol);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first =
      flat.formErrors[0] ?? Object.values(flat.fieldErrors)[0]?.[0] ?? 'Invalid acquisition';
    return {
      error: first,
      fieldErrors: flat.fieldErrors,
    };
  }

  try {
    await addAcquisition(holdingRepo, acquisitionRepo, {
      ...parsed.data,
      holdingId,
      userId,
    });
  } catch (err) {
    return toFormActionError(err, 'Failed to add acquisition');
  }

  revalidateHoldingDetailAndCalculation(holdingId);
  return undefined;
}
