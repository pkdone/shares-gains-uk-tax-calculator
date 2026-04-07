'use server';

import { redirect } from 'next/navigation';

import { createHolding } from '@/application/holding/create-holding';
import { toFormActionError } from '@/app/holdings/action-error';
import { revalidateAfterCreateHolding } from '@/app/holdings/revalidate-holding-caches';
import type { FormActionState } from '@/app/holdings/types';
import { createHoldingFormSchema } from '@/app/holdings/form-parsing';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';

import { holdingRepo } from './repos';

export async function createHoldingAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const parsed = createHoldingFormSchema.safeParse({
    symbol: formData.get('symbol'),
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.symbol?.[0] ?? 'Invalid symbol';
    return { error: msg };
  }

  const userId = await requireVerifiedUserId();

  let holding;
  try {
    holding = await createHolding(holdingRepo, {
      userId,
      symbol: parsed.data.symbol,
    });
  } catch (err) {
    return toFormActionError(err, 'Failed to create holding');
  }

  revalidateAfterCreateHolding(holding.id);
  redirect(`/holdings/${holding.id}`);
}
