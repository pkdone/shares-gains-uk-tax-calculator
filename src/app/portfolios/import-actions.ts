'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { commitEtradeByBenefitImport } from '@/application/import/commit-etrade-by-benefit-import';
import { previewEtradeByBenefitTypeImport } from '@/application/import/preview-etrade-by-benefit-type-import';
import { shareAcquisitionImportUsdSchema } from '@/domain/schemas/share-acquisition';
import { readXlsxForEtradeByBenefitTypeImport } from '@/infrastructure/import/read-xlsx-sheet';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { MongoPortfolioRepository } from '@/infrastructure/repositories/mongo-portfolio-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { DomainError } from '@/shared/errors/app-error';

const portfolioRepo = new MongoPortfolioRepository();
const acquisitionRepo = new MongoShareAcquisitionRepository();

export type EtradeImportPreviewState = {
  readonly error?: string;
  readonly drafts?: z.infer<typeof shareAcquisitionImportUsdSchema>[];
  readonly notices?: string[];
};

export async function previewEtradeImportAction(
  _prev: EtradeImportPreviewState | undefined,
  formData: FormData,
): Promise<EtradeImportPreviewState> {
  const portfolioId = formData.get('portfolioId');
  if (typeof portfolioId !== 'string' || portfolioId.length < 1) {
    return { error: 'Missing portfolio' };
  }

  const file = formData.get('etradeFile');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose an XLSX file to upload.' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return { error: 'Could not read file.' };
  }

  let grid: string[][];
  try {
    grid = readXlsxForEtradeByBenefitTypeImport(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to parse workbook';
    return { error: msg };
  }

  const { drafts, notices, errors } = previewEtradeByBenefitTypeImport(grid);
  if (errors.length > 0) {
    return {
      error: errors.join(' '),
      notices: notices.length > 0 ? [...notices] : undefined,
    };
  }

  if (drafts.length === 0) {
    return {
      error: 'No acquisitions to import.',
      notices: notices.length > 0 ? [...notices] : undefined,
    };
  }

  return {
    drafts: [...drafts],
    notices: notices.length > 0 ? [...notices] : undefined,
  };
}

export type EtradeImportCommitState = {
  readonly error?: string;
  readonly ok?: boolean;
};

export async function commitEtradeImportAction(
  _prev: EtradeImportCommitState | undefined,
  formData: FormData,
): Promise<EtradeImportCommitState> {
  const portfolioId = formData.get('portfolioId');
  const draftsJson = formData.get('draftsJson');
  if (typeof portfolioId !== 'string' || typeof draftsJson !== 'string') {
    return { error: 'Invalid request' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(draftsJson) as unknown;
  } catch {
    return { error: 'Invalid drafts payload' };
  }

  const draftsResult = z.array(shareAcquisitionImportUsdSchema).safeParse(parsed);
  if (!draftsResult.success) {
    return { error: 'Drafts failed validation' };
  }

  const userId = await requireVerifiedUserId();

  try {
    await commitEtradeByBenefitImport(portfolioRepo, acquisitionRepo, {
      portfolioId,
      userId,
      drafts: draftsResult.data,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Import failed' };
  }

  revalidatePath(`/portfolios/${portfolioId}`);
  return { ok: true };
}
