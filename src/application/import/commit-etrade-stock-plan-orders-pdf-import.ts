import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { ShareDisposalPdfImportDraft } from '@/domain/schemas/share-disposal';

import { computeEtradeDisposalImportFingerprint } from '@/application/import/hash-etrade-disposal-import-fingerprint';
import { requireHoldingForUser } from '@/application/holding/require-holding';
import { DomainError } from '@/shared/errors/app-error';

export async function commitEtradeStockPlanOrdersPdfImport(
  holdingRepository: HoldingRepository,
  disposalRepository: ShareDisposalRepository,
  input: {
    readonly holdingId: string;
    readonly userId: string;
    readonly drafts: readonly ShareDisposalPdfImportDraft[];
  },
): Promise<{ readonly inserted: number; readonly skippedDuplicates: number }> {
  if (input.drafts.length === 0) {
    throw new DomainError('Nothing to import');
  }

  const holding = await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  const holdingSymbolUpper = holding.symbol.trim().toUpperCase();

  const payloads: {
    readonly draft: ShareDisposalPdfImportDraft;
    readonly fingerprint: string;
  }[] = [];

  for (const d of input.drafts) {
    if (d.symbol.trim().toUpperCase() !== holdingSymbolUpper) {
      throw new DomainError('Import drafts must match this holding symbol.');
    }
    const fingerprint = computeEtradeDisposalImportFingerprint({
      holdingId: input.holdingId,
      eventDate: d.eventDate,
      quantity: d.quantity,
      grossProceedsUsd: d.grossProceedsUsd,
      feesUsd: d.feesUsd,
      firstOrderExecutedRaw: d.firstOrderExecutedRaw,
    });
    payloads.push({ draft: d, fingerprint });
  }

  const fingerprints = payloads.map((p) => p.fingerprint);
  const existing = await disposalRepository.findExistingImportFingerprints(
    input.holdingId,
    input.userId,
    fingerprints,
  );

  const toInsert = payloads.filter((p) => !existing.has(p.fingerprint));
  const skippedDuplicates = payloads.length - toInsert.length;

  if (toInsert.length === 0) {
    return { inserted: 0, skippedDuplicates };
  }

  const inserted = await disposalRepository.insertManyPdfImportBatch(
    input.holdingId,
    input.userId,
    toInsert.map((p) => ({
      symbol: p.draft.symbol,
      eventDate: p.draft.eventDate,
      quantity: p.draft.quantity,
      grossProceedsUsd: p.draft.grossProceedsUsd,
      feesUsd: p.draft.feesUsd,
      importSourceFingerprint: p.fingerprint,
    })),
  );

  return { inserted, skippedDuplicates };
}
