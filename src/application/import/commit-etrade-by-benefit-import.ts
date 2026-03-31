import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareAcquisitionImportUsd } from '@/domain/schemas/share-acquisition';
import { DomainError } from '@/shared/errors/app-error';

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

  const holding = await holdingRepository.findByIdForUser(input.holdingId, input.userId);
  if (holding === null) {
    throw new DomainError('Holding not found');
  }

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
