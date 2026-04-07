'use server';

import { z } from 'zod';

import { commitEtradeStockPlanOrdersPdfImport } from '@/application/import/commit-etrade-stock-plan-orders-pdf-import';
import { buildEtradePdfDisposalImportPreview } from '@/application/import/preview-etrade-stock-plan-orders-pdf-import';
import { shareDisposalPdfImportDraftSchema } from '@/domain/schemas/share-disposal';
import { toFormActionError } from '@/app/holdings/action-error';
import { revalidateHoldingSurfaces } from '@/app/holdings/revalidate-holding-caches';
import { pdfBufferToText } from '@/infrastructure/import/pdf-buffer-to-text';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import {
  holdingRepository as holdingRepo,
  shareDisposalRepository as disposalRepo,
} from '@/infrastructure/repositories/composition-root';

export type EtradePdfDisposalImportPreviewState = {
  readonly error?: string;
  readonly drafts?: z.infer<typeof shareDisposalPdfImportDraftSchema>[];
  readonly notices?: string[];
  readonly ignoredSymbols?: ReadonlyArray<{ readonly symbol: string; readonly count: number }>;
  readonly skippedNonRestrictedStock?: number;
  readonly skippedNotExecuted?: number;
  readonly skippedUnparseable?: number;
  readonly alreadyImportedCount?: number;
};

export async function previewEtradePdfDisposalImportAction(
  _prev: EtradePdfDisposalImportPreviewState | undefined,
  formData: FormData,
): Promise<EtradePdfDisposalImportPreviewState> {
  const holdingId = formData.get('holdingId');
  if (typeof holdingId !== 'string' || holdingId.length < 1) {
    return { error: 'Missing holding' };
  }

  const userId = await requireVerifiedUserId();
  const holding = await holdingRepo.findByIdForUser(holdingId, userId);
  if (holding === null) {
    return { error: 'Holding not found' };
  }

  const file = formData.get('etradePdfFile');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a PDF file to upload.' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return { error: 'Could not read file.' };
  }

  let text: string;
  try {
    text = await pdfBufferToText(buffer);
  } catch {
    return { error: 'Could not read PDF text.' };
  }

  const disposals = await disposalRepo.listByHoldingForUser(holdingId, userId);
  const existingImportFingerprints = new Set<string>();
  for (const d of disposals) {
    if (d.importSourceFingerprint !== undefined) {
      existingImportFingerprints.add(d.importSourceFingerprint);
    }
  }

  const holdingSymbolUpper = holding.symbol.trim().toUpperCase();
  const preview = buildEtradePdfDisposalImportPreview({
    text,
    holdingId,
    holdingSymbolUpper,
    existingImportFingerprints,
  });

  if (preview.ok) {
    return {
      drafts: [...preview.drafts],
      notices: preview.notices.length > 0 ? [...preview.notices] : undefined,
      ignoredSymbols: preview.ignoredBySymbol.length > 0 ? preview.ignoredBySymbol : undefined,
      skippedNonRestrictedStock: preview.skippedNonRestrictedStock,
      skippedNotExecuted: preview.skippedNotExecuted,
      skippedUnparseable: preview.skippedUnparseable,
      alreadyImportedCount: preview.alreadyImportedCount,
    };
  }

  return {
    error: preview.error,
    ignoredSymbols: preview.ignoredBySymbol,
    notices: preview.notices === undefined ? undefined : [...preview.notices],
  };
}

export type EtradePdfDisposalImportCommitState = {
  readonly error?: string;
  readonly ok?: boolean;
  readonly inserted?: number;
  readonly skippedDuplicates?: number;
};

export async function commitEtradePdfDisposalImportAction(
  _prev: EtradePdfDisposalImportCommitState | undefined,
  formData: FormData,
): Promise<EtradePdfDisposalImportCommitState> {
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

  const draftsResult = z.array(shareDisposalPdfImportDraftSchema).safeParse(parsed);
  if (!draftsResult.success) {
    return { error: 'Drafts failed validation' };
  }

  const userId = await requireVerifiedUserId();

  try {
    const { inserted, skippedDuplicates } = await commitEtradeStockPlanOrdersPdfImport(
      holdingRepo,
      disposalRepo,
      {
        holdingId,
        userId,
        drafts: draftsResult.data,
      },
    );
    revalidateHoldingSurfaces(holdingId);
    return { ok: true, inserted, skippedDuplicates };
  } catch (err) {
    return toFormActionError(err, 'Import failed');
  }
}
