'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

import { commitEtradeByBenefitImport } from '@/application/import/commit-etrade-by-benefit-import';
import { filterEtradeDraftsForHoldingSymbol } from '@/application/import/filter-etrade-drafts-for-holding-symbol';
import { previewEtradeByBenefitTypeImport } from '@/application/import/preview-etrade-by-benefit-type-import';
import { shareAcquisitionImportUsdSchema } from '@/domain/schemas/share-acquisition';
import { readXlsxForEtradeByBenefitTypeImport } from '@/infrastructure/import/read-xlsx-sheet';
import { holdingCalculationCacheTag } from '@/app/holdings/holding-calculation-cache-tag';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { DomainError } from '@/shared/errors/app-error';

const holdingRepo = new MongoHoldingRepository();
const acquisitionRepo = new MongoShareAcquisitionRepository();

export type EtradeImportPreviewState = {
  readonly error?: string;
  readonly drafts?: z.infer<typeof shareAcquisitionImportUsdSchema>[];
  readonly notices?: string[];
  /** Rows skipped because their symbol did not match this holding (symbol → count). */
  readonly ignoredSymbols?: ReadonlyArray<{ readonly symbol: string; readonly count: number }>;
};

export async function previewEtradeImportAction(
  _prev: EtradeImportPreviewState | undefined,
  formData: FormData,
): Promise<EtradeImportPreviewState> {
  const holdingId = formData.get('holdingId');
  if (typeof holdingId !== 'string' || holdingId.length < 1) {
    return { error: 'Missing holding' };
  }

  const userId = await requireVerifiedUserId();
  const holding = await holdingRepo.findByIdForUser(holdingId, userId);
  if (holding === null) {
    return { error: 'Holding not found' };
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

  const { matching, ignoredBySymbol } = filterEtradeDraftsForHoldingSymbol(drafts, holding.symbol);

  if (matching.length === 0) {
    return {
      error: 'No acquisitions match this holding symbol.',
      notices: notices.length > 0 ? [...notices] : undefined,
      ignoredSymbols: ignoredBySymbol.length > 0 ? ignoredBySymbol : undefined,
    };
  }

  return {
    drafts: [...matching],
    notices: notices.length > 0 ? [...notices] : undefined,
    ignoredSymbols: ignoredBySymbol.length > 0 ? ignoredBySymbol : undefined,
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
  const holdingId = formData.get('holdingId');
  const draftsJson = formData.get('draftsJson');
  if (typeof holdingId !== 'string' || typeof draftsJson !== 'string') {
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
    await commitEtradeByBenefitImport(holdingRepo, acquisitionRepo, {
      holdingId,
      userId,
      drafts: draftsResult.data,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : 'Import failed' };
  }

  revalidatePath('/');
  revalidatePath('/holdings');
  revalidatePath(`/holdings/${holdingId}`);
  revalidateTag(holdingCalculationCacheTag(holdingId));
  return { ok: true };
}
