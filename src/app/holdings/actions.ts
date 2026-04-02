'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { addAcquisition } from '@/application/ledger/add-acquisition';
import { addDisposal } from '@/application/ledger/add-disposal';
import { deleteLedgerEntry } from '@/application/ledger/delete-ledger-entry';
import { deleteHolding } from '@/application/holding/delete-holding';
import { createHolding } from '@/application/holding/create-holding';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import {
  createHoldingFormSchema,
  deleteHoldingFormSchema,
  deleteLedgerEntryFormSchema,
  formDataString,
  parseAcquisitionForm,
  parseDisposalForm,
} from '@/app/holdings/form-parsing';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { DomainError } from '@/shared/errors/app-error';

export type FormActionState = {
  readonly error?: string;
};

const holdingRepo = new MongoHoldingRepository();
const acquisitionRepo = new MongoShareAcquisitionRepository();
const disposalRepo = new MongoShareDisposalRepository();

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
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Failed to create holding' };
  }

  revalidatePath('/');
  revalidatePath('/holdings');
  revalidatePath(`/holdings/${holding.id}`);
  redirect(`/holdings/${holding.id}`);
}

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
    const first = parsed.error.flatten().formErrors[0] ?? Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: first ?? 'Invalid acquisition' };
  }

  try {
    await addAcquisition(holdingRepo, acquisitionRepo, {
      ...parsed.data,
      holdingId,
      userId,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Failed to add acquisition' };
  }

  revalidatePath(`/holdings/${holdingId}`);
  return undefined;
}

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
    const first = parsed.error.flatten().formErrors[0] ?? Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: first ?? 'Invalid disposal' };
  }

  try {
    await addDisposal(holdingRepo, disposalRepo, {
      ...parsed.data,
      holdingId,
      userId,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Failed to add disposal' };
  }

  revalidatePath(`/holdings/${holdingId}`);
  return undefined;
}

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
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Failed to delete entry' };
  }

  revalidatePath(`/holdings/${holdingId}`);
  return undefined;
}

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
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Failed to delete holding' };
  }

  revalidatePath('/');
  revalidatePath('/holdings');
  revalidatePath(`/holdings/${holdingId}`);
  return undefined;
}
