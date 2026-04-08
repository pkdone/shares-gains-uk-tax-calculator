'use server';

import { addDisposal } from '@/application/ledger/add-disposal';
import { toFormActionError } from '@/app/holdings/action-error';
import { revalidateHoldingDetailAndCalculation } from '@/app/holdings/revalidate-holding-caches';
import type { FormActionState } from '@/app/holdings/types';
import { formDataString, parseDisposalForm } from '@/app/holdings/form-parsing';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';

import { disposalRepo, holdingRepo } from './repos';

export async function addDisposalAction(
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

  const parsed = parseDisposalForm(formData, holding.symbol);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first =
      flat.formErrors[0] ?? Object.values(flat.fieldErrors)[0]?.[0] ?? 'Invalid disposal';
    return {
      error: first,
      fieldErrors: flat.fieldErrors,
    };
  }

  try {
    await addDisposal(holdingRepo, disposalRepo, {
      ...parsed.data,
      holdingId,
      userId,
    });
  } catch (err) {
    return toFormActionError(err, 'Failed to add disposal');
  }

  revalidateHoldingDetailAndCalculation(holdingId);
  return undefined;
}
