'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { addAcquisition } from '@/application/ledger/add-acquisition';
import { addDisposal } from '@/application/ledger/add-disposal';
import { createPortfolio } from '@/application/portfolio/create-portfolio';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';
import {
  createPortfolioFormSchema,
  formDataString,
  parseAcquisitionForm,
  parseDisposalForm,
} from '@/app/portfolios/form-parsing';
import { env } from '@/shared/config/env';
import { DomainError } from '@/shared/errors/app-error';

export type FormActionState = {
  readonly error?: string;
};

const portfolioRepo = new MongoPortfolioRepository();
const acquisitionRepo = new MongoShareAcquisitionRepository();
const disposalRepo = new MongoShareDisposalRepository();

export async function createPortfolioAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const parsed = createPortfolioFormSchema.safeParse({
    name: formData.get('name'),
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.name?.[0] ?? 'Invalid name';
    return { error: msg };
  }

  let portfolio;
  try {
    portfolio = await createPortfolio(portfolioRepo, {
      userId: env.STUB_USER_ID,
      name: parsed.data.name,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Failed to create portfolio' };
  }

  revalidatePath('/portfolios');
  revalidatePath(`/portfolios/${portfolio.id}`);
  redirect(`/portfolios/${portfolio.id}`);
}

export async function addAcquisitionAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const portfolioId = formDataString(formData, 'portfolioId');
  if (portfolioId.length < 1) {
    return { error: 'Missing portfolio' };
  }

  const parsed = parseAcquisitionForm(formData);
  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0] ?? Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: first ?? 'Invalid acquisition' };
  }

  try {
    await addAcquisition(portfolioRepo, acquisitionRepo, {
      ...parsed.data,
      portfolioId,
      userId: env.STUB_USER_ID,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Failed to add acquisition' };
  }

  revalidatePath(`/portfolios/${portfolioId}`);
  return undefined;
}

export async function addDisposalAction(
  _prevState: FormActionState | undefined,
  formData: FormData,
): Promise<FormActionState | undefined> {
  const portfolioId = formDataString(formData, 'portfolioId');
  if (portfolioId.length < 1) {
    return { error: 'Missing portfolio' };
  }

  const parsed = parseDisposalForm(formData);
  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0] ?? Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: first ?? 'Invalid disposal' };
  }

  try {
    await addDisposal(portfolioRepo, disposalRepo, {
      ...parsed.data,
      portfolioId,
      userId: env.STUB_USER_ID,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Failed to add disposal' };
  }

  revalidatePath(`/portfolios/${portfolioId}`);
  return undefined;
}
