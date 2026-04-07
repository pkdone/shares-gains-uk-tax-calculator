import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';
import { requireHoldingForUser } from '@/application/holding/require-holding';
import { DomainError } from '@/domain/errors/domain-error';

export async function commitEtradeByBenefitImport(
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  input: {
    readonly holdingId: string;
    readonly userId: string;
    readonly drafts: readonly ShareAcquisitionImportUsd[];
  },
): Promise<{ readonly count: number }> {
  if (input.drafts.length === 0) {
    throw new DomainError('Nothing to import');
  }

  const holding = await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  for (const d of input.drafts) {
    if (d.symbol !== holding.symbol) {
      throw new DomainError('Import drafts must match this holding symbol.');
    }
  }

  const { inserted, updated } = await acquisitionRepository.upsertImportUsdBatch(
    input.holdingId,
    input.userId,
    input.drafts,
  );
  return { count: inserted + updated };
}
